use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use std::time::Duration;
use async_trait::async_trait;

/// 数据记录表示
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataRecord {
    pub data: HashMap<String, serde_json::Value>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub source: String,
    pub timestamp: DateTime<Utc>,
}

/// ETL任务状态
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum JobStatus {
    Pending,
    Running,
    Success,
    Failed,
    Skipped,
    Cancelled,
}

/// 任务配置
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

/// 重试配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RetryConfig {
    pub count: u32,
    pub delay: u64,  // 秒
    pub max_delay: Option<u64>,  // 秒
    pub backoff_factor: Option<f64>,
}

/// 管道配置
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

/// 任务执行统计信息
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

/// DAG执行状态
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

/// 数据源接口
#[async_trait]
pub trait DataSource: Send + Sync {
    /// 初始化数据源连接
    async fn open(&mut self) -> Result<(), String>;
    
    /// 关闭数据源连接
    async fn close(&mut self) -> Result<(), String>;
    
    /// 提取数据
    async fn extract(&mut self, options: HashMap<String, serde_json::Value>) -> Result<Vec<DataRecord>, String>;
    
    /// 获取源名称
    fn name(&self) -> String;
    
    /// 获取元数据
    fn metadata(&self) -> HashMap<String, serde_json::Value>;
}

/// 数据目标接口
#[async_trait]
pub trait DataSink: Send + Sync {
    /// 初始化数据目标连接
    async fn open(&mut self) -> Result<(), String>;
    
    /// 关闭数据目标连接
    async fn close(&mut self) -> Result<(), String>;
    
    /// 加载单条数据
    async fn load(&mut self, record: DataRecord) -> Result<(), String>;
    
    /// 批量加载数据
    async fn batch_load(&mut self, records: Vec<DataRecord>) -> Result<(), String>;
    
    /// 获取目标名称
    fn name(&self) -> String;
}

/// 数据转换器接口
#[async_trait]
pub trait DataTransformer: Send + Sync {
    /// 转换单条数据
    async fn transform(&self, record: DataRecord) -> Result<Vec<DataRecord>, String>;
    
    /// 批量转换数据
    async fn transform_batch(&self, records: Vec<DataRecord>) -> Result<Vec<DataRecord>, String>;
    
    /// 获取转换器名称
    fn name(&self) -> String;
}

/// 管道统计信息
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PipelineStats {
    pub start_time: Option<DateTime<Utc>>,
    pub end_time: Option<DateTime<Utc>>,
    pub duration_ms: Option<u64>,
    pub records_read: u64,
    pub records_processed: u64,
    pub records_written: u64,
    pub records_failed: u64,
    pub errors: Vec<String>,
}

/// ETL错误类型
#[derive(Debug, thiserror::Error)]
pub enum ETLError {
    #[error("配置错误: {0}")]
    ConfigError(String),
    
    #[error("数据源错误: {0}")]
    SourceError(String),
    
    #[error("转换错误: {0}")]
    TransformError(String),
    
    #[error("数据目标错误: {0}")]
    SinkError(String),
    
    #[error("执行错误: {0}")]
    ExecutionError(String),
    
    #[error("超时错误: {0}")]
    TimeoutError(String),
    
    #[error("依赖错误: {0}")]
    DependencyError(String),
}

impl From<ETLError> for String {
    fn from(err: ETLError) -> Self {
        err.to_string()
    }
} 