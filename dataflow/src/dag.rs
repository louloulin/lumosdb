use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use uuid::Uuid;
use chrono::{DateTime, Utc};
use log::{info, error, debug, warn};
use crate::types::{JobConfig, JobStatus, DAGExecutionStatus, JobStats, ETLError};
use crate::config::ETLConfig;

/// DAG管理器，负责管理作业执行和状态
pub struct DAGManager {
    config: Option<ETLConfig>,
    executions: HashMap<String, ExecutionStatus>,
}

impl DAGManager {
    /// 创建新的DAG管理器
    pub fn new(config: ETLConfig) -> Result<Self, String> {
        // 验证DAG配置
        if let Err(e) = config.validate() {
            return Err(format!("配置无效: {}", e));
        }
        
        Ok(Self {
            config: Some(config),
            executions: HashMap::new(),
        })
    }
    
    /// 创建空的DAG管理器，等待后续配置
    pub fn empty() -> Self {
        Self {
            config: None,
            executions: HashMap::new(),
        }
    }
    
    /// 启动一个新的DAG执行
    pub fn start_execution(&mut self, execution_id: &str) -> Result<(), String> {
        // 验证是否有配置
        if self.config.is_none() {
            return Err("没有可用的DAG配置".to_string());
        }
        
        // 验证执行ID是否已存在
        if self.executions.contains_key(execution_id) {
            return Err(format!("执行ID已存在: {}", execution_id));
        }
        
        // 获取配置中的所有任务
        let config = self.config.as_ref().unwrap();
        
        // 创建执行记录
        let mut execution = ExecutionStatus {
            execution_id: execution_id.to_string(),
            start_time: Utc::now(),
            end_time: None,
            status: "running".to_string(),
            job_statuses: HashMap::new(),
            total_jobs: 0,
            completed_jobs: 0,
            failed_jobs: 0,
            skipped_jobs: 0,
        };
        
        // 初始化所有作业状态为Pending
        for job in &config.jobs {
            execution.job_statuses.insert(job.id.clone(), (JobStatus::Pending, None));
            execution.total_jobs += 1;
        }
        
        // 保存执行记录
        self.executions.insert(execution_id.to_string(), execution);
        
        info!("已启动新的DAG执行: {}", execution_id);
        Ok(())
    }
    
    /// 获取准备好执行的作业
    pub fn get_ready_jobs(&mut self, execution_id: &str) -> Vec<String> {
        // 检查执行ID是否存在
        if !self.executions.contains_key(execution_id) {
            warn!("执行ID不存在: {}", execution_id);
            return Vec::new();
        }
        
        // 获取当前执行记录
        let execution = self.executions.get(execution_id).unwrap();
        
        // 如果执行已完成，则没有准备好的作业
        if execution.status != "running" {
            return Vec::new();
        }
        
        // 获取配置
        let config = match &self.config {
            Some(cfg) => cfg,
            None => {
                warn!("没有可用的DAG配置");
                return Vec::new();
            }
        };
        
        // 检查哪些作业可以执行
        let mut ready_jobs = Vec::new();
        
        for job in &config.jobs {
            let job_id = &job.id;
            
            // 跳过不是Pending状态的作业
            if let Some((status, _)) = execution.job_statuses.get(job_id) {
                if *status != JobStatus::Pending {
                    continue;
                }
            } else {
                // 如果找不到作业状态，跳过
                continue;
            }
            
            // 检查依赖是否已完成
            let mut dependencies_met = true;
            
            if let Some(deps) = config.dag.as_ref().and_then(|dag| dag.dependencies.get(job_id)) {
                for dep_id in deps {
                    if let Some((status, _)) = execution.job_statuses.get(dep_id) {
                        // 只有依赖作业成功完成，才能继续
                        if *status != JobStatus::Success {
                            dependencies_met = false;
                            break;
                        }
                    } else {
                        // 如果找不到依赖作业的状态，则认为依赖未满足
                        dependencies_met = false;
                        break;
                    }
                }
            }
            
            // 如果所有依赖都已满足，则将作业添加到准备列表
            if dependencies_met {
                // 将状态更新为Running
                if let Some(execution) = self.executions.get_mut(execution_id) {
                    if let Some((status, _)) = execution.job_statuses.get_mut(job_id) {
                        *status = JobStatus::Running;
                    }
                }
                
                ready_jobs.push(job_id.clone());
            }
        }
        
        ready_jobs
    }
    
    /// 更新作业状态
    pub fn update_job_status(
        &mut self, 
        execution_id: &str, 
        job_id: &str, 
        status: JobStatus,
        stats: Option<JobStats>
    ) -> Result<(), String> {
        // 检查执行ID是否存在
        if !self.executions.contains_key(execution_id) {
            return Err(format!("执行ID不存在: {}", execution_id));
        }
        
        // 获取当前执行记录
        let execution = self.executions.get_mut(execution_id).unwrap();
        
        // 检查作业ID是否存在
        if !execution.job_statuses.contains_key(job_id) {
            return Err(format!("作业ID不存在: {}", job_id));
        }
        
        // 更新作业状态
        execution.job_statuses.insert(job_id.to_string(), (status.clone(), stats));
        
        // 更新完成/失败/跳过的作业计数
        match status {
            JobStatus::Success => execution.completed_jobs += 1,
            JobStatus::Failed => execution.failed_jobs += 1,
            JobStatus::Skipped => execution.skipped_jobs += 1,
            _ => {}
        }
        
        info!("已更新作业状态: {} - {} = {:?}", execution_id, job_id, status);
        Ok(())
    }
    
    /// 检查DAG执行是否已完成
    pub fn check_dag_completion(&mut self, execution_id: &str) -> Result<bool, String> {
        // 检查执行ID是否存在
        if !self.executions.contains_key(execution_id) {
            return Err(format!("执行ID不存在: {}", execution_id));
        }
        
        // 获取当前执行记录
        let execution = self.executions.get_mut(execution_id).unwrap();
        
        // 如果执行已经不是运行状态，则直接返回
        if execution.status != "running" {
            return Ok(true);
        }
        
        // 检查是否所有作业都已完成
        let mut all_completed = true;
        let mut has_failed = false;
        
        for (status, _) in execution.job_statuses.values() {
            if *status == JobStatus::Pending || *status == JobStatus::Running {
                all_completed = false;
                break;
            }
            
            if *status == JobStatus::Failed {
                has_failed = true;
            }
        }
        
        // 如果所有作业都已完成，则更新执行状态
        if all_completed {
            execution.end_time = Some(Utc::now());
            if has_failed {
                execution.status = "failed".to_string();
            } else {
                execution.status = "success".to_string();
            }
            
            info!("DAG执行已完成: {} - 状态: {}", execution_id, execution.status);
            return Ok(true);
        }
        
        Ok(false)
    }
    
    /// 获取执行状态
    pub fn get_execution_status(&self, execution_id: &str) -> Option<ExecutionStatus> {
        self.executions.get(execution_id).cloned()
    }
    
    /// 列出所有执行
    pub fn list_executions(&self) -> Vec<ExecutionStatus> {
        self.executions.values().cloned().collect()
    }
    
    /// 取消执行
    pub fn cancel_execution(&mut self, execution_id: &str) -> Result<(), String> {
        // 检查执行ID是否存在
        if !self.executions.contains_key(execution_id) {
            return Err(format!("执行ID不存在: {}", execution_id));
        }
        
        // 获取当前执行记录
        let execution = self.executions.get_mut(execution_id).unwrap();
        
        // 如果执行已经不是运行状态，则直接返回
        if execution.status != "running" {
            return Err(format!("执行已经是{}状态，无法取消", execution.status));
        }
        
        // 更新执行状态
        execution.status = "cancelled".to_string();
        execution.end_time = Some(Utc::now());
        
        // 将所有Pending或Running状态的作业更新为Cancelled
        for (status, _) in execution.job_statuses.values_mut() {
            if *status == JobStatus::Pending || *status == JobStatus::Running {
                *status = JobStatus::Cancelled;
            }
        }
        
        info!("已取消DAG执行: {}", execution_id);
        Ok(())
    }
    
    /// 获取作业依赖
    pub fn get_job_dependencies(&self, job_id: &str) -> Option<Vec<String>> {
        if let Some(config) = &self.config {
            if let Some(dag) = &config.dag {
                return dag.dependencies.get(job_id).cloned();
            }
        }
        
        None
    }
    
    /// 获取依赖于指定作业的作业列表
    pub fn get_dependent_jobs(&self, job_id: &str) -> Vec<String> {
        let mut dependent_jobs = Vec::new();
        
        if let Some(config) = &self.config {
            if let Some(dag) = &config.dag {
                for (dependent, dependencies) in &dag.dependencies {
                    if dependencies.contains(&job_id.to_string()) {
                        dependent_jobs.push(dependent.clone());
                    }
                }
            }
        }
        
        dependent_jobs
    }
    
    /// 处理作业执行结果，根据失败策略调整后续作业状态
    pub fn handle_job_result(&mut self, execution_id: &str, job_id: &str, status: &JobStatus) -> Result<(), String> {
        // 检查执行ID是否存在
        if !self.executions.contains_key(execution_id) {
            return Err(format!("执行ID不存在: {}", execution_id));
        }
        
        // 获取配置
        let config = match &self.config {
            Some(cfg) => cfg,
            None => return Err("没有可用的DAG配置".to_string()),
        };
        
        // 根据失败策略处理
        if *status == JobStatus::Failed {
            if let Some(dag) = &config.dag {
                match dag.failure_policy.as_str() {
                    "fail" => {
                        // 标记所有依赖的作业为Skipped
                        self.skip_dependent_jobs(execution_id, job_id)?;
                    }
                    "continue" => {
                        // 继续执行其他没有依赖的作业
                        debug!("作业失败，但继续执行其他作业: {} - {}", execution_id, job_id);
                    }
                    "retry" => {
                        // 重试逻辑应该在作业Actor中处理
                        debug!("作业失败，可能会根据配置重试: {} - {}", execution_id, job_id);
                    }
                    _ => {
                        warn!("未知的失败策略: {}", dag.failure_policy);
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// 标记所有依赖的作业为Skipped
    fn skip_dependent_jobs(&mut self, execution_id: &str, job_id: &str) -> Result<(), String> {
        // 获取所有依赖于该作业的作业
        let dependent_jobs = self.get_dependent_jobs(job_id);
        
        // 将这些作业标记为Skipped
        for dep_job_id in dependent_jobs {
            self.update_job_status(execution_id, &dep_job_id, JobStatus::Skipped, None)?;
            
            // 递归处理依赖于这个作业的其他作业
            self.skip_dependent_jobs(execution_id, &dep_job_id)?;
        }
        
        Ok(())
    }
} 