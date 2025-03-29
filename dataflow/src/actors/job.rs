use actix::prelude::*;
use std::time::{Duration, Instant};
use std::sync::Arc;
use chrono::Utc;
use log::{info, error, debug, warn};
use tokio::time::timeout;

use crate::types::{JobConfig, JobStatus, JobStats, ETLError};
use crate::actors::pipeline::{PipelineActor, StartPipeline, GetPipelineStats, StopPipeline};
use crate::actors::messages::*;

/// 任务Actor
pub struct JobActor {
    config: JobConfig,
    status: JobStatus,
    stats: JobStats,
    pipeline: Option<Addr<PipelineActor>>,
    dag_manager: Addr<crate::actors::dag_manager::DAGManagerActor>,
    execution_id: Option<String>,
    start_time: Option<Instant>,
    retry_count: u32,
}

impl JobActor {
    /// 创建新的任务Actor
    pub fn new(
        config: JobConfig, 
        dag_manager: Addr<crate::actors::dag_manager::DAGManagerActor>
    ) -> Result<Self, ETLError> {
        // 初始化任务统计信息
        let stats = JobStats {
            job_id: config.id.clone(),
            start_time: None,
            end_time: None,
            duration_ms: None,
            status: JobStatus::Pending,
            records_read: 0,
            records_written: 0,
            records_failed: 0,
            error: None,
            retry_count: 0,
        };
        
        Ok(Self {
            config,
            status: JobStatus::Pending,
            stats,
            pipeline: None,
            dag_manager,
            execution_id: None,
            start_time: None,
            retry_count: 0,
        })
    }
    
    /// 执行任务
    async fn execute_job(&mut self, execution_id: String) -> Result<(), String> {
        self.execution_id = Some(execution_id.clone());
        self.status = JobStatus::Running;
        self.start_time = Some(Instant::now());
        self.stats.start_time = Some(Utc::now());
        self.stats.status = JobStatus::Running;
        
        info!("开始执行任务: {} - {}", execution_id, self.config.id);
        
        // 创建管道Actor
        let pipeline = match PipelineActor::new(self.config.pipeline.clone()) {
            Ok(actor) => actor.start(),
            Err(e) => {
                error!("创建管道Actor失败: {}", e);
                self.stats.error = Some(format!("创建管道失败: {}", e));
                self.status = JobStatus::Failed;
                self.stats.status = JobStatus::Failed;
                self.stats.end_time = Some(Utc::now());
                if let Some(start) = self.start_time {
                    self.stats.duration_ms = Some(start.elapsed().as_millis() as u64);
                }
                
                // 通知DAG管理器任务失败
                self.dag_manager.do_send(JobCompleted {
                    execution_id,
                    job_id: self.config.id.clone(),
                    status: JobStatus::Failed,
                    stats: self.stats.clone(),
                });
                
                return Err(e.to_string());
            }
        };
        
        self.pipeline = Some(pipeline.clone());
        
        // 设置任务超时
        let timeout_duration = if let Some(timeout_secs) = self.config.timeout {
            Duration::from_secs(timeout_secs)
        } else {
            Duration::from_secs(3600) // 默认1小时
        };
        
        // 执行管道
        let start_result = match timeout(
            timeout_duration,
            pipeline.send(StartPipeline)
        ).await {
            Ok(result) => match result {
                Ok(r) => r,
                Err(e) => {
                    error!("发送StartPipeline消息失败: {}", e);
                    return Err(format!("发送StartPipeline消息失败: {}", e));
                }
            },
            Err(_) => {
                error!("任务执行超时: {}", self.config.id);
                self.stats.error = Some("任务执行超时".to_string());
                self.status = JobStatus::Failed;
                self.stats.status = JobStatus::Failed;
                self.stats.end_time = Some(Utc::now());
                if let Some(start) = self.start_time {
                    self.stats.duration_ms = Some(start.elapsed().as_millis() as u64);
                }
                
                // 通知管道停止
                if let Some(p) = &self.pipeline {
                    p.do_send(StopPipeline);
                }
                
                // 通知DAG管理器任务失败
                self.dag_manager.do_send(JobCompleted {
                    execution_id,
                    job_id: self.config.id.clone(),
                    status: JobStatus::Failed,
                    stats: self.stats.clone(),
                });
                
                return Err("任务执行超时".to_string());
            }
        };
        
        // 处理执行结果
        if let Err(e) = start_result {
            error!("管道执行失败: {}", e);
            self.stats.error = Some(format!("管道执行失败: {}", e));
            self.status = JobStatus::Failed;
            self.stats.status = JobStatus::Failed;
            
            // 如果配置了重试且未超过重试次数，则重试
            if self.should_retry() {
                self.retry_count += 1;
                self.stats.retry_count += 1;
                info!("重试任务({}/{}): {} - {}", self.retry_count, self.config.retry.count, execution_id, self.config.id);
                
                // 计算重试延迟
                let delay = self.calculate_retry_delay();
                tokio::time::sleep(Duration::from_secs(delay)).await;
                
                // 重新执行任务
                return self.execute_job(execution_id).await;
            }
            
            // 通知DAG管理器任务失败
            self.dag_manager.do_send(JobCompleted {
                execution_id,
                job_id: self.config.id.clone(),
                status: JobStatus::Failed,
                stats: self.stats.clone(),
            });
            
            return Err(e);
        }
        
        // 获取管道统计信息
        let pipeline_stats = match pipeline.send(GetPipelineStats).await {
            Ok(stats) => stats,
            Err(e) => {
                error!("获取管道统计信息失败: {}", e);
                JobStats {
                    job_id: self.config.id.clone(),
                    start_time: self.stats.start_time,
                    end_time: Some(Utc::now()),
                    duration_ms: if let Some(start) = self.start_time {
                        Some(start.elapsed().as_millis() as u64)
                    } else {
                        None
                    },
                    status: self.status,
                    records_read: 0,
                    records_written: 0,
                    records_failed: 0,
                    error: Some(format!("获取统计信息失败: {}", e)),
                    retry_count: self.stats.retry_count,
                }
            }
        };
        
        // 更新任务统计信息
        self.stats.end_time = Some(Utc::now());
        if let Some(start) = self.start_time {
            self.stats.duration_ms = Some(start.elapsed().as_millis() as u64);
        }
        self.stats.records_read = pipeline_stats.records_read;
        self.stats.records_written = pipeline_stats.records_written;
        self.stats.records_failed = pipeline_stats.records_failed;
        
        // 标记任务为成功完成
        self.status = JobStatus::Success;
        self.stats.status = JobStatus::Success;
        
        // 通知DAG管理器任务成功
        self.dag_manager.do_send(JobCompleted {
            execution_id,
            job_id: self.config.id.clone(),
            status: JobStatus::Success,
            stats: self.stats.clone(),
        });
        
        info!("任务执行成功: {} - {}", execution_id, self.config.id);
        Ok(())
    }
    
    /// 检查是否应该重试
    fn should_retry(&self) -> bool {
        self.config.retry.count > 0 && self.retry_count < self.config.retry.count
    }
    
    /// 计算重试延迟
    fn calculate_retry_delay(&self) -> u64 {
        let base_delay = self.config.retry.delay;
        
        // 如果配置了退避因子，则使用指数退避策略
        if let Some(factor) = self.config.retry.backoff_factor {
            let delay = (base_delay as f64 * factor.powf(self.retry_count as f64)) as u64;
            
            // 如果配置了最大延迟，则限制延迟不超过最大值
            if let Some(max_delay) = self.config.retry.max_delay {
                delay.min(max_delay)
            } else {
                delay
            }
        } else {
            // 否则使用固定延迟
            base_delay
        }
    }
}

impl Actor for JobActor {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        debug!("任务Actor启动: {}", self.config.id);
    }
    
    fn stopped(&mut self, _: &mut Self::Context) {
        debug!("任务Actor停止: {}", self.config.id);
    }
}

impl Handler<ExecuteJob> for JobActor {
    type Result = ResponseActFuture<Self, ()>;
    
    fn handle(&mut self, msg: ExecuteJob, _: &mut Context<Self>) -> Self::Result {
        let execution_id = msg.execution_id.clone();
        Box::pin(
            async move {
                let execution_id_clone = execution_id.clone();
                match self.execute_job(execution_id).await {
                    Ok(_) => debug!("任务执行完成: {}", execution_id_clone),
                    Err(e) => error!("任务执行失败: {} - {}", execution_id_clone, e),
                }
            }
            .into_actor(self)
        )
    }
}

impl Handler<CancelJob> for JobActor {
    type Result = ();
    
    fn handle(&mut self, _: CancelJob, _: &mut Context<Self>) -> Self::Result {
        if self.status == JobStatus::Running {
            info!("取消任务: {}", self.config.id);
            
            // 停止管道执行
            if let Some(pipeline) = &self.pipeline {
                pipeline.do_send(StopPipeline);
            }
            
            // 更新任务状态
            self.status = JobStatus::Cancelled;
            self.stats.status = JobStatus::Cancelled;
            self.stats.end_time = Some(Utc::now());
            if let Some(start) = self.start_time {
                self.stats.duration_ms = Some(start.elapsed().as_millis() as u64);
            }
            
            // 通知DAG管理器任务已取消
            if let Some(execution_id) = &self.execution_id {
                self.dag_manager.do_send(JobCompleted {
                    execution_id: execution_id.clone(),
                    job_id: self.config.id.clone(),
                    status: JobStatus::Cancelled,
                    stats: self.stats.clone(),
                });
            }
        }
    }
}

impl Handler<GetJobStatus> for JobActor {
    type Result = JobStatus;
    
    fn handle(&mut self, _: GetJobStatus, _: &mut Context<Self>) -> Self::Result {
        self.status
    }
} 