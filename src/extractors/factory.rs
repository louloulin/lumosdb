use crate::extractors::{CsvExtractor, MemoryExtractor, JdbcExtractor};
use crate::plugin::{has_wasm_plugin, create_wasm_extractor};
use actix::prelude::*;
use anyhow::{anyhow, Result};
use log::error;
use std::collections::HashMap;
use serde_json::Value;

/// 创建适当的提取器
pub fn create_extractor(extractor_type: &str, options: HashMap<String, Value>) -> Result<Addr<dyn crate::extractors::Extractor>> {
    match extractor_type {
        "csv" => {
            let extractor = CsvExtractor::new(options);
            Ok(extractor.start())
        },
        "memory" => {
            let extractor = MemoryExtractor::new(options);
            Ok(extractor.start())
        },
        "jdbc" => {
            let extractor = JdbcExtractor::new(options);
            Ok(extractor.start())
        },
        _ => {
            // 尝试作为插件名加载
            if has_wasm_plugin(extractor_type) {
                create_wasm_extractor(extractor_type)
            } else {
                error!("Unknown extractor type: {}", extractor_type);
                Err(anyhow!("Configuration error: Unknown extractor type: {}", extractor_type))
            }
        }
    }
} 