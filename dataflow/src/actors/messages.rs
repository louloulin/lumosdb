use actix::prelude::*;
use std::collections::HashMap;
use crate::types::{DataRecord, JobStatus, JobStats, PipelineStats, DAGExecutionStatus};

/// 启动DAG执行
#[derive(Message)]
#[rtype(result = "Result<String, String>")]
pub struct StartDAGExecution;

/// 取消DAG执行
#[derive(Message)]
#[rtype(result = "Result<(), String>")]
pub struct CancelDAGExecution(pub String);

/// 获取DAG执行状态
#[derive(Message)]
#[rtype(result = "Result<DAGExecutionStatus, String>")]
pub struct GetDAGExecutionStatus(pub String);

/// 列出所有DAG执行
#[derive(Message)]
#[rtype(result = "Result<Vec<DAGExecutionStatus>, String>")]
pub struct ListDAGExecutions;

/// 任务完成通知
#[derive(Message)]
#[rtype(result = "()")]
pub struct JobCompleted {
    pub execution_id: String,
    pub job_id: String,
    pub status: JobStatus,
    pub stats: JobStats,
}

/// 执行任务
#[derive(Message)]
#[rtype(result = "()")]
pub struct ExecuteJob {
    pub execution_id: String,
}

/// 取消任务
#[derive(Message)]
#[rtype(result = "()")]
pub struct CancelJob;

/// 获取任务状态
#[derive(Message)]
#[rtype(result = "JobStatus")]
pub struct GetJobStatus;

/// 任务状态更新
#[derive(Message)]
#[rtype(result = "()")]
pub struct JobStatusUpdate {
    pub status: JobStatus,
    pub stats: Option<JobStats>,
}

/// 启动管道
#[derive(Message)]
#[rtype(result = "Result<(), String>")]
pub struct StartPipeline;

/// 停止管道
#[derive(Message)]
#[rtype(result = "Result<(), String>")]
pub struct StopPipeline;

/// 获取管道状态
#[derive(Message)]
#[rtype(result = "PipelineStats")]
pub struct GetPipelineStats;

/// 从数据源提取数据
#[derive(Message)]
#[rtype(result = "Result<Vec<DataRecord>, String>")]
pub struct ExtractData {
    pub options: HashMap<String, serde_json::Value>,
}

/// 转换数据
#[derive(Message)]
#[rtype(result = "Result<Vec<DataRecord>, String>")]
pub struct TransformData {
    pub records: Vec<DataRecord>,
}

/// 加载数据到目标
#[derive(Message)]
#[rtype(result = "Result<usize, String>")]
pub struct LoadData {
    pub records: Vec<DataRecord>,
} 