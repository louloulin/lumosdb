use actix::prelude::*;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use log::{debug, info};

use crate::types::DataRecord;
use crate::actors::messages::LoadData;
use crate::extractors::memory::MemoryExtractor;

/// 内存加载器
pub struct MemoryLoader {
    config: HashMap<String, serde_json::Value>,
}

impl MemoryLoader {
    /// 创建新的内存加载器
    pub fn new(config: HashMap<String, serde_json::Value>) -> Self {
        Self { config }
    }
    
    /// 将数据加载到内存
    fn load_to_memory(&self, records: Vec<DataRecord>, options: &HashMap<String, serde_json::Value>) -> Result<usize, String> {
        // 获取存储键
        let key = match options.get("key") {
            Some(serde_json::Value::String(name)) => name.clone(),
            _ => "default".to_string(), // 默认键名
        };
        
        // 获取存储模式：append或replace
        let mode = match options.get("mode") {
            Some(serde_json::Value::String(m)) => m.as_str(),
            _ => "replace", // 默认替换现有数据
        };
        
        let count = records.len();
        
        // 使用MemoryExtractor的静态方法存储数据
        match mode {
            "append" => {
                // 追加模式
                if let Some(existing) = MemoryExtractor::get_data(&key) {
                    let mut combined = existing;
                    combined.extend(records);
                    MemoryExtractor::set_data(&key, combined);
                } else {
                    MemoryExtractor::set_data(&key, records);
                }
            },
            _ => {
                // 替换模式
                MemoryExtractor::set_data(&key, records);
            }
        }
        
        info!("成功加载{}条记录到内存存储: {}", count, key);
        Ok(count)
    }
}

impl Actor for MemoryLoader {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        debug!("内存加载器已启动");
    }
}

impl Handler<LoadData> for MemoryLoader {
    type Result = ResponseFuture<Result<usize, String>>;
    
    fn handle(&mut self, msg: LoadData, _: &mut Context<Self>) -> Self::Result {
        let records = msg.records;
        let options = self.config.clone();
        
        Box::pin(async move {
            let loader = MemoryLoader::new(options.clone());
            loader.load_to_memory(records, &options)
        })
    }
} 