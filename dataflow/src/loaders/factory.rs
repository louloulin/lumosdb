use actix::prelude::*;
use std::collections::HashMap;
use log::error;

use crate::types::ETLError;
use crate::loaders::csv::CsvLoader;
use crate::loaders::memory::MemoryLoader;
use crate::loaders::jdbc::JdbcLoader;

/// 创建加载器
pub fn create_loader(loader_type: &str, options: HashMap<String, serde_json::Value>) -> Result<Addr<dyn Actor>, ETLError> {
    match loader_type {
        "csv" => {
            // 创建CSV加载器
            let loader = CsvLoader::new(options);
            Ok(loader.start())
        },
        "memory" => {
            // 创建内存加载器
            let loader = MemoryLoader::new(options);
            Ok(loader.start())
        },
        "jdbc" => {
            // 创建JDBC加载器
            let loader = JdbcLoader::new(options);
            Ok(loader.start())
        },
        // 可以添加更多加载器类型
        _ => {
            error!("未知的加载器类型: {}", loader_type);
            Err(ETLError::ConfigError(format!("未知的加载器类型: {}", loader_type)))
        }
    }
} 