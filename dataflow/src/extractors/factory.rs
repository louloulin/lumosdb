use actix::prelude::*;
use std::collections::HashMap;
use log::{warn, error};

use crate::types::ETLError;
use crate::extractors::csv::CsvExtractor;
use crate::extractors::memory::MemoryExtractor;
use crate::extractors::jdbc::JdbcExtractor;

/// 创建提取器
pub fn create_extractor(extractor_type: &str, options: HashMap<String, serde_json::Value>) -> Result<Addr<dyn Actor>, ETLError> {
    match extractor_type {
        "csv" => {
            // 创建CSV提取器
            let extractor = CsvExtractor::new(options);
            Ok(extractor.start())
        },
        "memory" => {
            // 创建内存提取器
            let extractor = MemoryExtractor::new(options);
            Ok(extractor.start())
        },
        "jdbc" => {
            // 创建JDBC提取器
            let extractor = JdbcExtractor::new(options);
            Ok(extractor.start())
        },
        // 可以添加更多提取器类型
        _ => {
            error!("未知的提取器类型: {}", extractor_type);
            Err(ETLError::ConfigError(format!("未知的提取器类型: {}", extractor_type)))
        }
    }
} 