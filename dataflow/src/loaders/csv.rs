use actix::prelude::*;
use std::collections::HashMap;
use std::fs::File;
use std::path::Path;
use std::io::{Write, BufWriter};
use log::{info, debug, error};
use csv::{Writer, WriterBuilder};

use crate::types::DataRecord;
use crate::actors::messages::LoadData;

/// CSV文件加载器
pub struct CsvLoader {
    config: HashMap<String, serde_json::Value>,
}

impl CsvLoader {
    /// 创建新的CSV加载器
    pub fn new(config: HashMap<String, serde_json::Value>) -> Self {
        Self { config }
    }
    
    /// 将数据写入CSV文件
    fn write_csv_file(&self, records: Vec<DataRecord>, options: &HashMap<String, serde_json::Value>) -> Result<usize, String> {
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
        
        // 是否写入表头
        let write_header = match options.get("write_header") {
            Some(serde_json::Value::Bool(write_header)) => *write_header,
            _ => true,  // 默认写入表头
        };
        
        // 是否追加模式
        let append = match options.get("append") {
            Some(serde_json::Value::Bool(append)) => *append,
            _ => false,  // 默认不追加，覆盖文件
        };
        
        // 是否仅包含指定字段
        let included_fields = match options.get("fields") {
            Some(serde_json::Value::Array(fields)) => {
                let mut field_names = Vec::new();
                for field in fields {
                    if let serde_json::Value::String(name) = field {
                        field_names.push(name.clone());
                    }
                }
                
                if !field_names.is_empty() {
                    Some(field_names)
                } else {
                    None
                }
            },
            _ => None,
        };
        
        // 创建目录（如果不存在）
        if let Some(parent) = Path::new(file_path).parent() {
            if !parent.exists() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("创建目录失败: {}", e))?;
            }
        }
        
        // 打开文件
        let file = if append && Path::new(file_path).exists() {
            // 追加模式且文件存在
            std::fs::OpenOptions::new()
                .write(true)
                .append(true)
                .open(file_path)
                .map_err(|e| format!("打开CSV文件失败: {}", e))?
        } else {
            // 覆盖模式或文件不存在
            File::create(file_path)
                .map_err(|e| format!("创建CSV文件失败: {}", e))?
        };
        
        let buf_writer = BufWriter::new(file);
        
        // 创建CSV写入器
        let mut writer = WriterBuilder::new()
            .delimiter(delimiter as u8)
            .from_writer(buf_writer);
        
        // 如果没有记录，直接返回
        if records.is_empty() {
            info!("没有记录需要写入");
            return Ok(0);
        }
        
        // 确定所有字段名
        let field_names = if let Some(fields) = &included_fields {
            fields.clone()
        } else {
            // 收集所有记录的所有字段名
            let mut all_fields = std::collections::HashSet::new();
            for record in &records {
                for key in record.data.keys() {
                    all_fields.insert(key.clone());
                }
            }
            all_fields.into_iter().collect()
        };
        
        // 写入表头
        if write_header && (!append || !Path::new(file_path).exists()) {
            writer.write_record(&field_names)
                .map_err(|e| format!("写入CSV表头失败: {}", e))?;
        }
        
        // 写入记录
        let mut count = 0;
        for record in &records {
            let mut row = Vec::new();
            
            // 按字段顺序构建行
            for field in &field_names {
                let value = match record.data.get(field) {
                    Some(val) => match val {
                        serde_json::Value::String(s) => s.clone(),
                        serde_json::Value::Number(n) => n.to_string(),
                        serde_json::Value::Bool(b) => b.to_string(),
                        serde_json::Value::Null => "".to_string(),
                        _ => val.to_string(),
                    },
                    None => "".to_string(),
                };
                
                row.push(value);
            }
            
            writer.write_record(&row)
                .map_err(|e| format!("写入CSV记录失败: {}", e))?;
            
            count += 1;
        }
        
        // 刷新写入器
        writer.flush()
            .map_err(|e| format!("刷新CSV写入器失败: {}", e))?;
        
        info!("成功写入{}条记录到CSV文件: {}", count, file_path);
        Ok(count)
    }
}

impl Actor for CsvLoader {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        debug!("CSV加载器已启动");
    }
}

impl Handler<LoadData> for CsvLoader {
    type Result = ResponseFuture<Result<usize, String>>;
    
    fn handle(&mut self, msg: LoadData, _: &mut Context<Self>) -> Self::Result {
        let records = msg.records;
        let options = self.config.clone();
        
        Box::pin(async move {
            let loader = CsvLoader::new(options.clone());
            loader.write_csv_file(records, &options)
        })
    }
} 