use crate::transformers::{DefaultTransformer};
use crate::plugin::{has_wasm_plugin, create_wasm_transformer};
use actix::prelude::*;
use anyhow::{anyhow, Result};
use log::error;
use std::collections::HashMap;
use serde_json::Value;

/// 创建适当的转换器
pub fn create_transformer(transformer_type: &str, options: HashMap<String, Value>) -> Result<Addr<dyn crate::transformers::Transformer>> {
    match transformer_type {
        "default" => {
            let transformer = DefaultTransformer::new(options);
            Ok(transformer.start())
        },
        _ => {
            // 尝试作为插件名加载
            if has_wasm_plugin(transformer_type) {
                create_wasm_transformer(transformer_type)
            } else {
                error!("Unknown transformer type: {}", transformer_type);
                Err(anyhow!("Configuration error: Unknown transformer type: {}", transformer_type))
            }
        }
    }
} 