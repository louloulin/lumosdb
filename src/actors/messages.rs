use crate::types::{DataRecord, PipelineResult};
use actix::prelude::*;
use anyhow::Result;
use serde_json::Value;
use std::collections::HashMap;

/// 初始化并运行管道的消息
#[derive(Message)]
#[rtype(result = "Result<PipelineResult>")]
pub struct InitializeAndRun;

/// 提取数据的消息
#[derive(Message)]
#[rtype(result = "Result<Vec<DataRecord>>")]
pub struct ExtractData {
    pub options: HashMap<String, Value>,
}

/// 转换数据的消息
#[derive(Message)]
#[rtype(result = "Result<Vec<DataRecord>>")]
pub struct TransformData {
    pub records: Vec<DataRecord>,
}

/// 加载数据的消息
#[derive(Message)]
#[rtype(result = "Result<usize>")]
pub struct LoadData {
    pub records: Vec<DataRecord>,
    pub options: HashMap<String, Value>,
} 