use actix::prelude::*;
use log::{info, error, debug};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, RwLock};
use uuid::Uuid;
use chrono::{DateTime, Utc};

use crate::config::ETLConfig;
use crate::dag::DAGManager;
use crate::types::{ExecutionStatus, JobStatus, JobStats, ETLError};
use crate::actors::job::JobActor;
use crate::actors::messages::*;

/// DAG管理器Actor，负责调度和监控作业执行
pub struct DAGManagerActor {
    dag_manager: Arc<RwLock<DAGManager>>,
    job_actors: HashMap<String, Addr<JobActor>>,
    current_config: Arc<RwLock<Option<ETLConfig>>>,
}

impl DAGManagerActor {
    /// 创建新的DAG管理器Actor
    pub fn new(config: ETLConfig) -> Result<Self, ETLError> {
        // 验证配置
        if let Err(e) = config.validate() {
            return Err(ETLError::InvalidConfig(e));
        }
        
        // 创建DAG管理器
        let dag_manager = match DAGManager::new(config.clone()) {
            Ok(manager) => Arc::new(RwLock::new(manager)),
            Err(e) => return Err(ETLError::DAGError(e)),
        };
        
        Ok(Self {
            dag_manager,
            job_actors: HashMap::new(),
            current_config: Arc::new(RwLock::new(Some(config))),
        })
    }
    
    /// 使用空配置创建DAG管理器Actor
    pub fn with_empty_config() -> Result<Self, ETLError> {
        Ok(Self {
            dag_manager: Arc::new(RwLock::new(DAGManager::empty())),
            job_actors: HashMap::new(),
            current_config: Arc::new(RwLock::new(None)),
        })
    }
    
    /// 设置新的配置
    pub fn set_config(&mut self, config: ETLConfig) -> Result<(), ETLError> {
        // 验证配置
        if let Err(e) = config.validate() {
            return Err(ETLError::InvalidConfig(e));
        }
        
        // 创建新的DAG管理器
        let new_manager = match DAGManager::new(config.clone()) {
            Ok(manager) => manager,
            Err(e) => return Err(ETLError::DAGError(e)),
        };
        
        // 更新DAG管理器和配置
        {
            let mut manager = self.dag_manager.write().unwrap();
            *manager = new_manager;
            
            let mut config_writer = self.current_config.write().unwrap();
            *config_writer = Some(config);
        }
        
        // 清理旧的作业Actor
        self.job_actors.clear();
        
        Ok(())
    }
    
    /// 处理作业完成通知
    fn handle_job_completed(&mut self, msg: JobCompleted, ctx: &mut Context<Self>) {
        let execution_id = msg.execution_id.clone();
        let job_id = msg.job_id.clone();
        
        info!("收到作业完成通知: {} - {}, 状态: {:?}", execution_id, job_id, msg.status);
        
        // 更新作业状态
        {
            let mut manager = self.dag_manager.write().unwrap();
            if let Err(e) = manager.update_job_status(&execution_id, &job_id, msg.status.clone(), Some(msg.stats.clone())) {
                error!("更新作业状态失败: {}", e);
                return;
            }
        }
        
        // 如果作业失败或取消，则处理依赖关系
        if msg.status == JobStatus::Failed || msg.status == JobStatus::Cancelled {
            let mut manager = self.dag_manager.write().unwrap();
            // 根据失败策略处理后续任务
            manager.handle_job_result(&execution_id, &job_id, &msg.status);
        }
        
        // 获取下一批可执行的作业
        self.schedule_ready_jobs(&execution_id, ctx);
    }
    
    /// 调度准备好的作业
    fn schedule_ready_jobs(&mut self, execution_id: &str, ctx: &mut Context<Self>) {
        let ready_jobs = {
            let mut manager = self.dag_manager.write().unwrap();
            manager.get_ready_jobs(execution_id)
        };
        
        if ready_jobs.is_empty() {
            debug!("没有准备好的作业: {}", execution_id);
            
            // 检查是否所有作业都已完成
            let mut manager = self.dag_manager.write().unwrap();
            if let Err(e) = manager.check_dag_completion(execution_id) {
                error!("检查DAG完成状态失败: {}", e);
            }
            
            return;
        }
        
        // 获取当前配置
        let config = {
            let config_reader = self.current_config.read().unwrap();
            match &*config_reader {
                Some(cfg) => cfg.clone(),
                None => {
                    error!("当前没有可用的配置");
                    return;
                }
            }
        };
        
        // 为每个准备好的作业创建作业Actor
        for job_id in ready_jobs {
            debug!("调度作业: {} - {}", execution_id, job_id);
            
            // 获取作业配置
            let job_config = match config.get_job(&job_id) {
                Some(cfg) => cfg.clone(),
                None => {
                    error!("找不到作业配置: {}", job_id);
                    continue;
                }
            };
            
            // 创建或获取作业Actor
            let job_actor = if let Some(actor) = self.job_actors.get(&job_id) {
                actor.clone()
            } else {
                // 创建新的作业Actor
                match JobActor::new(job_config, ctx.address()) {
                    Ok(actor) => {
                        let addr = actor.start();
                        self.job_actors.insert(job_id.clone(), addr.clone());
                        addr
                    },
                    Err(e) => {
                        error!("创建作业Actor失败: {}", e);
                        continue;
                    }
                }
            };
            
            // 发送执行消息
            job_actor.do_send(ExecuteJob {
                execution_id: execution_id.to_string(),
            });
        }
    }
}

impl Actor for DAGManagerActor {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        info!("DAG管理器Actor启动");
    }
}

/// 处理启动DAG执行消息
impl Handler<StartDAGExecution> for DAGManagerActor {
    type Result = ResponseFuture<Result<(), String>>;
    
    fn handle(&mut self, msg: StartDAGExecution, ctx: &mut Context<Self>) -> Self::Result {
        let execution_id = msg.execution_id.clone();
        let self_addr = ctx.address();
        
        info!("启动DAG执行: {}", execution_id);
        
        // 检查当前是否有配置
        let has_config = {
            let config_reader = self.current_config.read().unwrap();
            config_reader.is_some()
        };
        
        if !has_config {
            return Box::pin(async move {
                Err("没有可用的ETL配置".to_string())
            });
        }
        
        // 启动新的执行
        {
            let mut manager = self.dag_manager.write().unwrap();
            if let Err(e) = manager.start_execution(&execution_id) {
                error!("启动DAG执行失败: {}", e);
                return Box::pin(async move {
                    Err(e)
                });
            }
        }
        
        // 调度准备好的作业
        self.schedule_ready_jobs(&execution_id, ctx);
        
        Box::pin(async move {
            Ok(())
        })
    }
}

/// 处理取消DAG执行消息
impl Handler<CancelDAGExecution> for DAGManagerActor {
    type Result = bool;
    
    fn handle(&mut self, msg: CancelDAGExecution, _: &mut Context<Self>) -> Self::Result {
        let execution_id = msg.execution_id.clone();
        
        info!("取消DAG执行: {}", execution_id);
        
        // 取消执行
        let cancel_result = {
            let mut manager = self.dag_manager.write().unwrap();
            manager.cancel_execution(&execution_id)
        };
        
        if let Err(e) = cancel_result {
            error!("取消DAG执行失败: {}", e);
            return false;
        }
        
        // 向所有正在运行的作业发送取消消息
        for (job_id, actor) in &self.job_actors {
            actor.do_send(CancelJob);
        }
        
        true
    }
}

/// 处理获取DAG执行状态消息
impl Handler<GetDAGExecutionStatus> for DAGManagerActor {
    type Result = Option<ExecutionStatus>;
    
    fn handle(&mut self, msg: GetDAGExecutionStatus, _: &mut Context<Self>) -> Self::Result {
        let execution_id = msg.execution_id.clone();
        
        debug!("获取DAG执行状态: {}", execution_id);
        
        // 获取执行状态
        let manager = self.dag_manager.read().unwrap();
        manager.get_execution_status(&execution_id)
    }
}

/// 处理列出所有DAG执行消息
impl Handler<ListDAGExecutions> for DAGManagerActor {
    type Result = Vec<ExecutionStatus>;
    
    fn handle(&mut self, _: ListDAGExecutions, _: &mut Context<Self>) -> Self::Result {
        debug!("列出所有DAG执行");
        
        // 获取所有执行状态
        let manager = self.dag_manager.read().unwrap();
        manager.list_executions()
    }
}

/// 处理作业完成消息
impl Handler<JobCompleted> for DAGManagerActor {
    type Result = ();
    
    fn handle(&mut self, msg: JobCompleted, ctx: &mut Context<Self>) -> Self::Result {
        self.handle_job_completed(msg, ctx);
    }
} 