use actix::prelude::*;
use std::collections::HashMap;
use log::{error};

use crate::types::ETLError;
use crate::transformers::filter::FilterTransformer;
use crate::transformers::map::MapTransformer;

/// 创建转换器
pub fn create_transformer(transformer_type: &str, options: HashMap<String, serde_json::Value>) -> Result<Addr<dyn Actor>, ETLError> {
    match transformer_type {
        "filter" => {
            // 创建过滤转换器
            let transformer = FilterTransformer::new(options);
            Ok(transformer.start())
        },
        "map" => {
            // 创建映射转换器
            let transformer = MapTransformer::new(options);
            Ok(transformer.start())
        },
        // 可以添加更多转换器类型
        _ => {
            error!("未知的转换器类型: {}", transformer_type);
            Err(ETLError::ConfigError(format!("未知的转换器类型: {}", transformer_type)))
        }
    }
} 