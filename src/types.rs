use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;

/// 数据记录
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataRecord {
    /// 记录数据
    pub data: Value,
}

/// 管道统计信息
#[derive(Debug, Clone, Default)]
pub struct PipelineStats {
    /// 提取记录数量
    pub extracted_records: usize,
    /// 转换记录数量
    pub transformed_records: usize,
    /// 加载记录数量
    pub loaded_records: usize,
    /// 提取耗时
    pub extraction_time: Duration,
    /// 转换耗时
    pub transformation_time: Duration,
    /// 加载耗时
    pub loading_time: Duration,
    /// 总耗时
    pub total_time: Duration,
}

/// 管道结果类型
pub type PipelineResult = Result<PipelineStats, String>; 