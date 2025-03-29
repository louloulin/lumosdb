use crate::loaders::{CsvLoader, MemoryLoader};
use crate::plugin::{has_wasm_plugin, create_wasm_loader};
use actix::prelude::*;
use anyhow::{anyhow, Result};
use log::error;
use std::collections::HashMap;
use serde_json::Value;

/// 创建适当的加载器
pub fn create_loader(loader_type: &str, options: HashMap<String, Value>) -> Result<Addr<dyn crate::loaders::Loader>> {
    match loader_type {
        "csv" => {
            let loader = CsvLoader::new(options);
            Ok(loader.start())
        },
        "memory" => {
            let loader = MemoryLoader::new(options);
            Ok(loader.start())
        },
        _ => {
            // 尝试作为插件名加载
            if has_wasm_plugin(loader_type) {
                create_wasm_loader(loader_type)
            } else {
                error!("Unknown loader type: {}", loader_type);
                Err(anyhow!("Configuration error: Unknown loader type: {}", loader_type))
            }
        }
    }
} 