use actix::prelude::*;
use std::collections::HashMap;
use log::{info, debug, error};
use serde_json::Value;

use crate::types::DataRecord;
use crate::actors::messages::TransformData;

/// 过滤转换器，根据条件过滤数据记录
pub struct FilterTransformer {
    config: HashMap<String, serde_json::Value>,
}

impl FilterTransformer {
    /// 创建新的过滤转换器
    pub fn new(config: HashMap<String, serde_json::Value>) -> Self {
        Self { config }
    }
    
    /// 过滤数据记录
    fn filter_records(&self, records: Vec<DataRecord>, options: &HashMap<String, serde_json::Value>) -> Result<Vec<DataRecord>, String> {
        // 获取过滤条件
        let condition = match options.get("condition") {
            Some(serde_json::Value::String(cond)) => cond,
            _ => return Err("未指定过滤条件".to_string()),
        };
        
        info!("使用条件过滤记录: {}", condition);
        
        // 解析过滤条件
        // 这里实现了简单的条件解析，实际应用中可能需要更复杂的表达式引擎
        let filtered = match parse_filter_condition(condition, records) {
            Ok(filtered) => filtered,
            Err(e) => return Err(format!("过滤条件解析失败: {}", e)),
        };
        
        info!("过滤后剩余{}条记录", filtered.len());
        Ok(filtered)
    }
}

impl Actor for FilterTransformer {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        debug!("过滤转换器已启动");
    }
}

impl Handler<TransformData> for FilterTransformer {
    type Result = ResponseFuture<Result<Vec<DataRecord>, String>>;
    
    fn handle(&mut self, msg: TransformData, _: &mut Context<Self>) -> Self::Result {
        let records = msg.records;
        let options = self.config.clone();
        
        Box::pin(async move {
            let transformer = FilterTransformer::new(options.clone());
            transformer.filter_records(records, &options)
        })
    }
}

/// 解析过滤条件并应用到记录
fn parse_filter_condition(condition: &str, records: Vec<DataRecord>) -> Result<Vec<DataRecord>, String> {
    // 简单的条件解析，支持 "field > value", "field = value", "field < value" 等
    let parts: Vec<&str> = condition.trim().split_whitespace().collect();
    if parts.len() != 3 {
        return Err(format!("无效的过滤条件格式: {}", condition));
    }
    
    let field = parts[0];
    let operator = parts[1];
    let value_str = parts[2];
    
    // 尝试将值解析为不同类型
    let parse_value = |value_str: &str| -> Value {
        // 尝试解析为数字
        if let Ok(num) = value_str.parse::<i64>() {
            return Value::Number(num.into());
        }
        if let Ok(num) = value_str.parse::<f64>() {
            if let Some(num) = serde_json::Number::from_f64(num) {
                return Value::Number(num);
            }
        }
        
        // 尝试解析为布尔值
        if value_str == "true" {
            return Value::Bool(true);
        }
        if value_str == "false" {
            return Value::Bool(false);
        }
        
        // 默认作为字符串处理
        Value::String(value_str.to_string())
    };
    
    let value = parse_value(value_str);
    
    // 过滤记录
    let filtered = records.into_iter().filter(|record| {
        match record.data.get(field) {
            Some(field_value) => {
                match operator {
                    "=" | "==" => field_value == &value,
                    "!=" | "<>" => field_value != &value,
                    ">" => {
                        match (field_value.as_f64(), value.as_f64()) {
                            (Some(a), Some(b)) => a > b,
                            _ => false,
                        }
                    },
                    "<" => {
                        match (field_value.as_f64(), value.as_f64()) {
                            (Some(a), Some(b)) => a < b,
                            _ => false,
                        }
                    },
                    ">=" => {
                        match (field_value.as_f64(), value.as_f64()) {
                            (Some(a), Some(b)) => a >= b,
                            _ => false,
                        }
                    },
                    "<=" => {
                        match (field_value.as_f64(), value.as_f64()) {
                            (Some(a), Some(b)) => a <= b,
                            _ => false,
                        }
                    },
                    "contains" => {
                        match (field_value.as_str(), value.as_str()) {
                            (Some(a), Some(b)) => a.contains(b),
                            _ => false,
                        }
                    },
                    _ => false,
                }
            },
            None => false,
        }
    }).collect();
    
    Ok(filtered)
} 