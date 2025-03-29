
# 基于Actix Actor的ETL系统实现（支持YAML配置和依赖管理）

下面是一个完整的ETL系统实现，支持YAML配置DAG和任务依赖：

## 目录结构

```
server/
  └── src/
      └── etl/
          ├── mod.rs              // 模块入口
          ├── types.rs            // 核心类型定义
          ├── config.rs           // YAML配置解析
          ├── dag.rs              // DAG依赖管理
          ├── actors/             // Actor实现
          │   ├── pipeline.rs     // 管道Actor
          │   ├── dag_manager.rs  // DAG管理Actor
          │   ├── job.rs          // ETL任务Actor
          │   ├── extractor.rs    // 提取Actor
          │   ├── transformer.rs  // 转换Actor
          │   └── loader.rs       // 加载Actor
          ├── sources/            // 数据源实现
          ├── sinks/              // 数据目标实现
          └── transformers/       // 转换器实现
```

## 1. ETL模块入口

```rust
// mod.rs
pub mod types;
pub mod config;
pub mod dag;
pub mod actors;
pub mod sources;
pub mod sinks;
pub mod transformers;

pub use config::ETLConfig;
pub use dag::DAGManager;
pub use types::{DataRecord, PipelineConfig, JobStatus};
```

## 2. 核心类型定义

```rust
// types.rs
use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::time::Duration;
use async_trait::async_trait;

// 数据记录表示
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataRecord {
    pub data: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub source: String,
    pub timestamp: DateTime<Utc>,
}

// ETL任务状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum JobStatus {
    Pending,
    Running,
    Success,
    Failed,
    Skipped,
    Cancelled,
}

// 任务配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobConfig {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub pipeline: PipelineConfig,
    pub depends_on: Vec<String>,  // 依赖的任务ID列表
    pub retry: RetryConfig,
    pub timeout: Option<u64>,  // 超时时间(秒)
    pub cron: Option<String>,  // 定时执行表达式
    pub enabled: bool,
}

// 重试配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    pub count: u32,
    pub delay: u64,  // 秒
    pub max_delay: Option<u64>,  // 秒
    pub backoff_factor: Option<f64>,
}

// 管道配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineConfig {
    pub source: SourceConfig,
    pub transformers: Vec<TransformerConfig>,
    pub sink: SinkConfig,
    pub batch_size: Option<usize>,
    pub parallelism: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceConfig {
    pub type_name: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransformerConfig {
    pub type_name: String,
    pub config: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SinkConfig {
    pub type_name: String,
    pub config: serde_json::Value,
}

// 任务执行统计信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobStats {
    pub job_id: String,
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub duration_ms: Option<u64>,
    pub status: JobStatus,
    pub records_read: u64,
    pub records_written: u64,
    pub records_failed: u64,
    pub error: Option<String>,
    pub retry_count: u32,
}

// DAG执行状态
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DAGExecutionStatus {
    pub dag_id: String,
    pub execution_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: Option<DateTime<Utc>>,
    pub status: JobStatus,
    pub job_statuses: HashMap<String, JobStatus>,
    pub job_stats: HashMap<String, JobStats>,
}

// 数据源接口
#[async_trait]
pub trait DataSource: Send + Sync {
    async fn open(&mut self) -> Result<(), String>;
    async fn close(&mut self) -> Result<(), String>;
    async fn extract(&mut self, options: HashMap<String, serde_json::Value>) -> Result<Vec<DataRecord>, String>;
    fn name(&self) -> String;
    fn metadata(&self) -> HashMap<String, serde_json::Value>;
}

// 数据目标接口
#[async_trait]
pub trait DataSink: Send + Sync {
    async fn open(&mut self) -> Result<(), String>;
    async fn close(&mut self) -> Result<(), String>;
    async fn load(&mut self, record: DataRecord) -> Result<(), String>;
    async fn batch_load(&mut self, records: Vec<DataRecord>) -> Result<(), String>;
    fn name(&self) -> String;
}

// 数据转换器接口
#[async_trait]
pub trait DataTransformer: Send + Sync {
    async fn transform(&self, record: DataRecord) -> Result<Vec<DataRecord>, String>;
    async fn transform_batch(&self, records: Vec<DataRecord>) -> Result<Vec<DataRecord>, String>;
    fn name(&self) -> String;
}
```

## 3. YAML配置解析器

```rust
// config.rs
use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use serde::{Deserialize, Serialize};
use crate::etl::types::{JobConfig, JobStatus, RetryConfig};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ETLConfig {
    pub version: String,
    pub name: String,
    pub description: Option<String>,
    pub jobs: HashMap<String, JobConfig>,
    // 定义DAG的执行顺序和依赖关系
    pub dag: DAGConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DAGConfig {
    pub name: String,
    pub description: Option<String>,
    // 定义任务执行顺序
    pub execution_order: Vec<String>,
    // 定义失败策略
    pub on_failure: FailurePolicy,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FailurePolicy {
    #[serde(rename = "continue")]
    Continue,
    #[serde(rename = "fail")]
    Fail,
    #[serde(rename = "retry")]
    Retry,
}

impl ETLConfig {
    pub fn from_file<P: AsRef<Path>>(path: P) -> Result<Self, String> {
        let path = path.as_ref();
        let mut file = File::open(path).map_err(|e| format!("无法打开配置文件: {}", e))?;
        
        let mut content = String::new();
        file.read_to_string(&mut content).map_err(|e| format!("读取配置文件失败: {}", e))?;
        
        Self::from_yaml(&content)
    }
    
    pub fn from_yaml(content: &str) -> Result<Self, String> {
        serde_yaml::from_str(content).map_err(|e| format!("解析YAML配置失败: {}", e))
    }
    
    // 验证DAG，确保没有循环依赖等问题
    pub fn validate(&self) -> Result<(), String> {
        // 检查任务ID的唯一性
        let mut job_ids = std::collections::HashSet::new();
        for id in self.jobs.keys() {
            if !job_ids.insert(id) {
                return Err(format!("重复的任务ID: {}", id));
            }
        }
        
        // 检查依赖关系，确保所有依赖的任务都存在
        for (job_id, job) in &self.jobs {
            for dep_id in &job.depends_on {
                if !self.jobs.contains_key(dep_id) {
                    return Err(format!("任务 {} 依赖不存在的任务: {}", job_id, dep_id));
                }
            }
        }
        
        // 检查循环依赖
        if let Err(cycle) = self.detect_cycles() {
            return Err(format!("检测到循环依赖: {:?}", cycle));
        }
        
        // 检查执行顺序中的任务都存在
        for job_id in &self.dag.execution_order {
            if !self.jobs.contains_key(job_id) {
                return Err(format!("执行顺序中包含不存在的任务: {}", job_id));
            }
        }
        
        Ok(())
    }
    
    // 检测DAG中的循环依赖
    fn detect_cycles(&self) -> Result<(), Vec<String>> {
        let mut visited = HashMap::new();
        let mut path = Vec::new();
        
        for job_id in self.jobs.keys() {
            if !visited.contains_key(job_id) {
                if let Err(cycle) = self.dfs_check_cycles(job_id, &mut visited, &mut path) {
                    return Err(cycle);
                }
            }
        }
        
        Ok(())
    }
    
    fn dfs_check_cycles(&self, 
                        job_id: &str, 
                        visited: &mut HashMap<String, bool>, 
                        path: &mut Vec<String>) -> Result<(), Vec<String>> {
        path.push(job_id.to_string());
        visited.insert(job_id.to_string(), true);
        
        if let Some(job) = self.jobs.get(job_id) {
            for dep_id in &job.depends_on {
                if !visited.contains_key(dep_id) {
                    if let Err(cycle) = self.dfs_check_cycles(dep_id, visited, path) {
                        return Err(cycle);
                    }
                } else if *visited.get(dep_id).unwrap() {
                    // 找到循环
                    let mut cycle = Vec::new();
                    let mut found = false;
                    
                    for &id in path.iter() {
                        if id == *dep_id {
                            found = true;
                        }
                        if found {
                            cycle.push(id.to_string());
                        }
                    }
                    cycle.push(dep_id.to_string());
                    
                    return Err(cycle);
                }
            }
        }
        
        visited.insert(job_id.to_string(), false);
        path.pop();
        
        Ok(())
    }
    
    // 获取任务的拓扑排序
    pub fn get_topological_order(&self) -> Result<Vec<String>, String> {
        let mut result = Vec::new();
        let mut visited = HashMap::new();
        let mut temp_visited = HashMap::new();
        
        for job_id in self.jobs.keys() {
            if !visited.contains_key(job_id) {
                self.dfs_topological_sort(job_id, &mut visited, &mut temp_visited, &mut result)?;
            }
        }
        
        // 结果需要反转，因为DFS是后序遍历
        result.reverse();
        Ok(result)
    }
    
    fn dfs_topological_sort(&self,
                            job_id: &str,
                            visited: &mut HashMap<String, bool>,
                            temp_visited: &mut HashMap<String, bool>,
                            result: &mut Vec<String>) -> Result<(), String> {
        if temp_visited.contains_key(job_id) {
            return Err(format!("检测到循环依赖，无法排序: {}", job_id));
        }
        
        if !visited.contains_key(job_id) {
            temp_visited.insert(job_id.to_string(), true);
            
            if let Some(job) = self.jobs.get(job_id) {
                for dep_id in &job.depends_on {
                    self.dfs_topological_sort(dep_id, visited, temp_visited, result)?;
                }
            }
            
            temp_visited.remove(job_id);
            visited.insert(job_id.to_string(), true);
            result.push(job_id.to_string());
        }
        
        Ok(())
    }
}
```

## 4. DAG管理实现

```rust
// dag.rs
use std::collections::{HashMap, HashSet};
use uuid::Uuid;
use chrono::Utc;
use tokio::sync::mpsc;
use crate::etl::types::{JobConfig, JobStatus, DAGExecutionStatus, JobStats};
use crate::etl::config::ETLConfig;

pub struct DAGManager {
    config: ETLConfig,
    executions: HashMap<String, DAGExecutionStatus>,
}

impl DAGManager {
    pub fn new(config: ETLConfig) -> Result<Self, String> {
        // 验证配置
        config.validate()?;
        
        Ok(Self {
            config,
            executions: HashMap::new(),
        })
    }
    
    // 启动新的DAG执行
    pub fn start_execution(&mut self) -> Result<String, String> {
        let execution_id = Uuid::new_v4().to_string();
        let dag_id = self.config.dag.name.clone();
        
        // 初始化所有任务为Pending状态
        let mut job_statuses = HashMap::new();
        for job_id in self.config.jobs.keys() {
            job_statuses.insert(job_id.clone(), JobStatus::Pending);
        }
        
        // 创建新的执行状态
        let execution = DAGExecutionStatus {
            dag_id,
            execution_id: execution_id.clone(),
            start_time: Utc::now(),
            end_time: None,
            status: JobStatus::Running,
            job_statuses,
            job_stats: HashMap::new(),
        };
        
        self.executions.insert(execution_id.clone(), execution);
        
        Ok(execution_id)
    }
    
    // 获取可以立即执行的任务（所有依赖已完成）
    pub fn get_ready_jobs(&self, execution_id: &str) -> Result<Vec<JobConfig>, String> {
        let execution = self.executions.get(execution_id)
            .ok_or_else(|| format!("找不到执行记录: {}", execution_id))?;
        
        let mut ready_jobs = Vec::new();
        
        for (job_id, job) in &self.config.jobs {
            // 检查任务是否为Pending状态
            if *execution.job_statuses.get(job_id).unwrap_or(&JobStatus::Pending) != JobStatus::Pending {
                continue;
            }
            
            // 检查所有依赖是否已成功完成
            let mut dependencies_met = true;
            for dep_id in &job.depends_on {
                let dep_status = execution.job_statuses.get(dep_id).unwrap_or(&JobStatus::Pending);
                if *dep_status != JobStatus::Success {
                    dependencies_met = false;
                    break;
                }
            }
            
            if dependencies_met {
                ready_jobs.push(job.clone());
            }
        }
        
        Ok(ready_jobs)
    }
    
    // 更新任务状态
    pub fn update_job_status(&mut self, execution_id: &str, job_id: &str, status: JobStatus, stats: Option<JobStats>) -> Result<(), String> {
        let execution = self.executions.get_mut(execution_id)
            .ok_or_else(|| format!("找不到执行记录: {}", execution_id))?;
        
        // 更新任务状态
        execution.job_statuses.insert(job_id.to_string(), status);
        
        // 如果提供了统计信息，则更新
        if let Some(stats) = stats {
            execution.job_stats.insert(job_id.to_string(), stats);
        }
        
        // 检查整个DAG是否已完成
        self.check_dag_completion(execution_id)?;
        
        Ok(())
    }
    
    // 检查DAG是否已完成
    fn check_dag_completion(&mut self, execution_id: &str) -> Result<(), String> {
        let execution = self.executions.get_mut(execution_id)
            .ok_or_else(|| format!("找不到执行记录: {}", execution_id))?;
        
        // 检查是否所有任务都已完成
        let all_completed = execution.job_statuses.values().all(|s| {
            match s {
                JobStatus::Success | JobStatus::Failed | JobStatus::Skipped | JobStatus::Cancelled => true,
                _ => false,
            }
        });
        
        if all_completed {
            // 检查是否有任务失败
            let has_failed = execution.job_statuses.values().any(|s| *s == JobStatus::Failed);
            
            execution.status = if has_failed { JobStatus::Failed } else { JobStatus::Success };
            execution.end_time = Some(Utc::now());
        }
        
        Ok(())
    }
    
    // 获取执行状态
    pub fn get_execution_status(&self, execution_id: &str) -> Result<DAGExecutionStatus, String> {
        self.executions.get(execution_id)
            .cloned()
            .ok_or_else(|| format!("找不到执行记录: {}", execution_id))
    }
    
    // 取消执行
    pub fn cancel_execution(&mut self, execution_id: &str) -> Result<(), String> {
        let execution = self.executions.get_mut(execution_id)
            .ok_or_else(|| format!("找不到执行记录: {}", execution_id))?;
        
        // 将所有未完成的任务标记为已取消
        for (job_id, status) in &mut execution.job_statuses {
            if *status == JobStatus::Pending || *status == JobStatus::Running {
                *status = JobStatus::Cancelled;
            }
        }
        
        execution.status = JobStatus::Cancelled;
        execution.end_time = Some(Utc::now());
        
        Ok(())
    }
}
```

## 5. DAG管理Actor实现

```rust
// actors/dag_manager.rs
use actix::prelude::*;
use std::collections::HashMap;
use uuid::Uuid;
use log::{info, error, debug, warn};
use crate::etl::types::{JobConfig, JobStatus, DAGExecutionStatus, JobStats};
use crate::etl::config::ETLConfig;
use crate::etl::dag::DAGManager;
use crate::etl::actors::job::{JobActor, ExecuteJob, GetJobStatus, JobStatusUpdate};

// Actor消息
#[derive(Message)]
#[rtype(result = "Result<String, String>")]
pub struct StartDAGExecution;

#[derive(Message)]
#[rtype(result = "Result<(), String>")]
pub struct CancelDAGExecution(pub String);

#[derive(Message)]
#[rtype(result = "Result<DAGExecutionStatus, String>")]
pub struct GetDAGExecutionStatus(pub String);

#[derive(Message)]
#[rtype(result = "Result<Vec<DAGExecutionStatus>, String>")]
pub struct ListDAGExecutions;

#[derive(Message)]
#[rtype(result = "()")]
pub struct JobCompleted {
    pub execution_id: String,
    pub job_id: String,
    pub status: JobStatus,
    pub stats: JobStats,
}

// DAG管理器Actor
pub struct DAGManagerActor {
    dag_manager: DAGManager,
    job_actors: HashMap<String, Addr<JobActor>>,
}

impl DAGManagerActor {
    pub fn new(config: ETLConfig) -> Result<Self, String> {
        let dag_manager = DAGManager::new(config)?;
        
        Ok(Self {
            dag_manager,
            job_actors: HashMap::new(),
        })
    }
    
    // 处理任务完成通知
    fn handle_job_completed(&mut self, msg: JobCompleted, ctx: &mut Context<Self>) {
        let execution_id = msg.execution_id.clone();
        let job_id = msg.job_id.clone();
        
        // 更新任务状态
        match self.dag_manager.update_job_status(&execution_id, &job_id, msg.status, Some(msg.stats)) {
            Ok(_) => {
                debug!("任务完成通知处理成功: {} - {}", execution_id, job_id);
                
                // 尝试启动下一批就绪的任务
                self.schedule_ready_jobs(&execution_id, ctx);
            },
            Err(e) => {
                error!("更新任务状态失败: {}", e);
            }
        }
    }
    
    // 调度就绪的任务
    fn schedule_ready_jobs(&mut self, execution_id: &str, ctx: &mut Context<Self>) {
        match self.dag_manager.get_ready_jobs(execution_id) {
            Ok(ready_jobs) => {
                for job in ready_jobs {
                    let job_id = job.id.clone();
                    debug!("启动就绪任务: {} - {}", execution_id, job_id);
                    
                    // 为每个任务创建一个Actor
                    let job_actor = match JobActor::new(job.clone(), ctx.address()) {
                        Ok(actor) => actor.start(),
                        Err(e) => {
                            error!("创建任务Actor失败: {} - {}", job_id, e);
                            continue;
                        }
                    };
                    
                    // 存储Actor引用
                    self.job_actors.insert(format!("{}:{}", execution_id, job_id), job_actor.clone());
                    
                    // 发送执行消息
                    let execution_id_clone = execution_id.to_string();
                    job_actor.do_send(ExecuteJob { execution_id: execution_id_clone });
                }
            },
            Err(e) => {
                error!("获取就绪任务失败: {}", e);
            }
        }
    }
}

impl Actor for DAGManagerActor {
    type Context = Context<Self>;
    
    fn started(&mut self, ctx: &mut Self::Context) {
        info!("DAG管理器Actor启动");
    }
}

impl Handler<StartDAGExecution> for DAGManagerActor {
    type Result = Result<String, String>;
    
    fn handle(&mut self, _: StartDAGExecution, ctx: &mut Context<Self>) -> Self::Result {
        info!("启动新的DAG执行");
        
        // 创建新的执行ID
        let execution_id = match self.dag_manager.start_execution() {
            Ok(id) => id,
            Err(e) => return Err(format!("启动DAG执行失败: {}", e)),
        };
        
        // 调度就绪的任务
        self.schedule_ready_jobs(&execution_id, ctx);
        
        Ok(execution_id)
    }
}

impl Handler<CancelDAGExecution> for DAGManagerActor {
    type Result = Result<(), String>;
    
    fn handle(&mut self, msg: CancelDAGExecution, _: &mut Context<Self>) -> Self::Result {
        info!("取消DAG执行: {}", msg.0);
        
        // 取消DAG执行
        self.dag_manager.cancel_execution(&msg.0)?;
        
        // 通知所有相关的任务Actor取消执行
        let prefix = format!("{}:", msg.0);
        for (actor_id, actor) in self.job_actors.iter() {
            if actor_id.starts_with(&prefix) {
                // 发送取消消息
                // 注意：这里没有等待响应，因为我们只关心通知已发送
                actor.do_send(crate::etl::actors::job::CancelJob);
            }
        }
        
        Ok(())
    }
}

impl Handler<GetDAGExecutionStatus> for DAGManagerActor {
    type Result = Result<DAGExecutionStatus, String>;
    
    fn handle(&mut self, msg: GetDAGExecutionStatus, _: &mut Context<Self>) -> Self::Result {
        debug!("获取DAG执行状态: {}", msg.0);
        self.dag_manager.get_execution_status(&msg.0)
    }
}

impl Handler<ListDAGExecutions> for DAGManagerActor {
    type Result = Result<Vec<DAGExecutionStatus>, String>;
    
    fn handle(&mut self, _: ListDAGExecutions, _: &mut Context<Self>) -> Self::Result {
        debug!("列出所有DAG执行");
        
        // 收集所有执行状态
        let mut executions = Vec::new();
        for execution_id in self.job_actors.keys() {
            if let Some(id) = execution_id.split(':').next() {
                match self.dag_manager.get_execution_status(id) {
                    Ok(status) => executions.push(status),
                    Err(e) => warn!("获取执行状态失败: {} - {}", id, e),
                }
            }
        }
        
        Ok(executions)
    }
}

impl Handler<JobCompleted> for DAGManagerActor {
    type Result = ();
    
    fn handle(&mut self, msg: JobCompleted, ctx: &mut Context<Self>) -> Self::Result {
        info!("收到任务完成通知: {} - {}", msg.execution_id, msg.job_id);
        self.handle_job_completed(msg, ctx);
    }
}
```

## 6. 任务Actor实现

```rust
// actors/job.rs
use actix::prelude::*;
use std::time::{Duration, Instant};
use chrono::Utc;
use log::{info, error, debug, warn};
use tokio::time::timeout;
use crate::etl::types::{JobConfig, JobStatus, JobStats};
use crate::etl::actors::pipeline::{PipelineActor, StartPipeline, GetPipelineStats, StopPipeline};
use crate::etl::actors::dag_manager::JobCompleted;

// Actor消息
#[derive(Message)]
#[rtype(result = "()")]
pub struct ExecuteJob {
    pub execution_id: String,
}

#[derive(Message)]
#[rtype(result = "()")]
pub struct CancelJob;

#[derive(Message)]
#[rtype(result = "JobStatus")]
pub struct GetJobStatus;

#[derive(Message)]
#[rtype(result = "()")]
pub struct JobStatusUpdate {
    pub status: JobStatus,
    pub stats: Option<JobStats>,
}

// 任务Actor
pub struct JobActor {
    config: JobConfig,
    status: JobStatus,
    stats: JobStats,
    pipeline: Option<Addr<PipelineActor>>,
    dag_manager: Addr<crate::etl::actors::dag_manager::DAGManagerActor>,
    execution_id: Option<String>,
    start_time: Option<Instant>,
}

impl JobActor {
    pub fn new(
        config: JobConfig, 
        dag_manager: Addr<crate::etl::actors::dag_manager::DAGManagerActor>
    ) -> Result<Self, String> {
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
        })
    }
    
    // 执行任务
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
                
                return Err(e);
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
                pipeline.
