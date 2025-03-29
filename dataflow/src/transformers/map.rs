use actix::prelude::*;
use std::collections::HashMap;
use log::{info, debug, error};
use serde_json::Value;

use crate::types::DataRecord;
use crate::actors::messages::TransformData;

/// 字段映射配置
#[derive(Clone, Debug)]
struct FieldMapping {
    source: String,
    target: String,
    transform: Option<String>,
}

/// 映射转换器，用于字段映射和转换
pub struct MapTransformer {
    config: HashMap<String, serde_json::Value>,
}

impl MapTransformer {
    /// 创建新的映射转换器
    pub fn new(config: HashMap<String, serde_json::Value>) -> Self {
        Self { config }
    }
    
    /// 进行字段映射
    fn map_records(&self, records: Vec<DataRecord>, options: &HashMap<String, serde_json::Value>) -> Result<Vec<DataRecord>, String> {
        // 获取映射配置
        let mappings = match options.get("mappings") {
            Some(Value::Array(mappings)) => mappings,
            _ => return Err("未指定字段映射".to_string()),
        };
        
        // 解析映射配置
        let field_mappings = mappings.iter().map(|mapping| {
            let source = match mapping.get("source") {
                Some(Value::String(source)) => source.clone(),
                _ => "".to_string(),
            };
            
            let target = match mapping.get("target") {
                Some(Value::String(target)) => target.clone(),
                _ => source.clone(),  // 默认目标字段与源字段相同
            };
            
            let transform = match mapping.get("transform") {
                Some(Value::String(transform)) => Some(transform.clone()),
                _ => None,
            };
            
            FieldMapping {
                source,
                target,
                transform,
            }
        }).collect::<Vec<FieldMapping>>();
        
        // 应用映射
        let mapped_records = records.into_iter().map(|record| {
            let mut new_record = record.clone();
            
            for mapping in &field_mappings {
                if mapping.source.is_empty() {
                    continue;
                }
                
                // 获取源字段值
                if let Some(value) = record.data.get(&mapping.source) {
                    let transformed_value = match &mapping.transform {
                        Some(transform) => apply_transform(value, transform),
                        None => value.clone(),
                    };
                    
                    // 设置目标字段值
                    new_record.set_field(mapping.target.clone(), transformed_value);
                    
                    // 如果源字段和目标字段不同，并且配置了移除源字段，则移除源字段
                    if mapping.source != mapping.target {
                        if let Some(Value::Bool(true)) = options.get("remove_source_fields") {
                            new_record.data.remove(&mapping.source);
                        }
                    }
                }
            }
            
            new_record
        }).collect();
        
        info!("映射转换完成，共处理{}条记录", mapped_records.len());
        Ok(mapped_records)
    }
}

impl Actor for MapTransformer {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        debug!("映射转换器已启动");
    }
}

impl Handler<TransformData> for MapTransformer {
    type Result = ResponseFuture<Result<Vec<DataRecord>, String>>;
    
    fn handle(&mut self, msg: TransformData, _: &mut Context<Self>) -> Self::Result {
        let records = msg.records;
        let options = self.config.clone();
        
        Box::pin(async move {
            let transformer = MapTransformer::new(options.clone());
            transformer.map_records(records, &options)
        })
    }
}

/// 应用转换函数
fn apply_transform(value: &Value, transform: &str) -> Value {
    // 目前支持的转换：
    // - to_uppercase(): 转为大写（仅适用于字符串）
    // - to_lowercase(): 转为小写（仅适用于字符串）
    // - multiply(n): 乘以n（仅适用于数字）
    // - divide(n): 除以n（仅适用于数字）
    // - concat(suffix): 连接后缀（仅适用于字符串）
    // - prefix(prefix): 添加前缀（仅适用于字符串）
    
    if transform == "value.to_uppercase()" || transform == "to_uppercase()" {
        if let Some(s) = value.as_str() {
            return Value::String(s.to_uppercase());
        }
    } else if transform == "value.to_lowercase()" || transform == "to_lowercase()" {
        if let Some(s) = value.as_str() {
            return Value::String(s.to_lowercase());
        }
    } else if transform.starts_with("multiply(") && transform.ends_with(")") {
        if let Some(num) = value.as_f64() {
            let factor_str = transform[9..transform.len()-1].trim();
            if let Ok(factor) = factor_str.parse::<f64>() {
                if let Some(result) = serde_json::Number::from_f64(num * factor) {
                    return Value::Number(result);
                }
            }
        }
    } else if transform.starts_with("divide(") && transform.ends_with(")") {
        if let Some(num) = value.as_f64() {
            let divisor_str = transform[7..transform.len()-1].trim();
            if let Ok(divisor) = divisor_str.parse::<f64>() {
                if divisor != 0.0 {
                    if let Some(result) = serde_json::Number::from_f64(num / divisor) {
                        return Value::Number(result);
                    }
                }
            }
        }
    } else if transform.starts_with("concat(") && transform.ends_with(")") {
        if let Some(s) = value.as_str() {
            let suffix = transform[7..transform.len()-1].trim();
            // 去掉可能的引号
            let suffix = suffix.trim_matches(|c| c == '\'' || c == '"');
            return Value::String(format!("{}{}", s, suffix));
        }
    } else if transform.starts_with("prefix(") && transform.ends_with(")") {
        if let Some(s) = value.as_str() {
            let prefix = transform[7..transform.len()-1].trim();
            // 去掉可能的引号
            let prefix = prefix.trim_matches(|c| c == '\'' || c == '"');
            return Value::String(format!("{}{}", prefix, s));
        }
    }
    
    // 默认保持原值不变
    value.clone()
} 