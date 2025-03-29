use actix::prelude::*;
use std::collections::HashMap;
use std::fs::File;
use std::path::Path;
use chrono::Utc;
use log::{info, error, debug};
use csv::ReaderBuilder;

use crate::types::{DataRecord};
use crate::actors::messages::ExtractData;

/// CSV文件提取器
pub struct CsvExtractor {
    config: HashMap<String, serde_json::Value>,
}

impl CsvExtractor {
    /// 创建新的CSV提取器
    pub fn new(config: HashMap<String, serde_json::Value>) -> Self {
        Self { config }
    }
    
    /// 从CSV文件读取数据
    fn read_csv_file(&self, options: &HashMap<String, serde_json::Value>) -> Result<Vec<DataRecord>, String> {
        // 获取文件路径
        let file_path = match options.get("file_path") {
            Some(serde_json::Value::String(path)) => path,
            _ => return Err("未指定CSV文件路径".to_string()),
        };
        
        // 获取分隔符
        let delimiter = match options.get("delimiter") {
            Some(serde_json::Value::String(delim)) => {
                if delim.len() != 1 {
                    return Err("分隔符必须是单个字符".to_string());
                }
                delim.chars().next().unwrap()
            }
            _ => ',',  // 默认分隔符为逗号
        };
        
        // 是否有表头
        let has_header = match options.get("has_header") {
            Some(serde_json::Value::Bool(has_header)) => *has_header,
            _ => true,  // 默认有表头
        };
        
        // 打开CSV文件
        let file = File::open(file_path)
            .map_err(|e| format!("无法打开CSV文件: {}", e))?;
        
        // 创建CSV读取器
        let mut reader = ReaderBuilder::new()
            .delimiter(delimiter as u8)
            .has_headers(has_header)
            .from_reader(file);
        
        let headers = if has_header {
            reader.headers()
                .map_err(|e| format!("无法读取CSV表头: {}", e))?
                .iter()
                .map(|h| h.to_string())
                .collect::<Vec<String>>()
        } else {
            // 如果没有表头，则使用列索引作为字段名
            (0..reader.headers()
                .map_err(|e| format!("无法读取CSV记录: {}", e))?
                .len())
                .map(|i| format!("column_{}", i))
                .collect::<Vec<String>>()
        };
        
        // 读取所有记录
        let mut records = Vec::new();
        
        for result in reader.records() {
            let record = result.map_err(|e| format!("读取CSV记录失败: {}", e))?;
            
            let mut data_record = DataRecord::new();
            data_record.source = format!("csv:{}", Path::new(file_path).file_name().unwrap_or_default().to_string_lossy());
            data_record.timestamp = Utc::now();
            
            // 将CSV记录转换为DataRecord
            for (i, field) in record.iter().enumerate() {
                if i < headers.len() {
                    let field_name = &headers[i];
                    data_record.set_field(field_name.clone(), field.to_string());
                }
            }
            
            records.push(data_record);
        }
        
        info!("从CSV文件读取了{}条记录: {}", records.len(), file_path);
        Ok(records)
    }
}

impl Actor for CsvExtractor {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        debug!("CSV提取器已启动");
    }
}

impl Handler<ExtractData> for CsvExtractor {
    type Result = ResponseFuture<Result<Vec<DataRecord>, String>>;
    
    fn handle(&mut self, msg: ExtractData, _: &mut Context<Self>) -> Self::Result {
        // 合并默认配置和提供的选项
        let mut options = self.config.clone();
        for (k, v) in msg.options {
            options.insert(k, v);
        }
        
        // 读取CSV文件
        Box::pin(async move {
            let extractor = CsvExtractor::new(options.clone());
            extractor.read_csv_file(&options)
        })
    }
} 