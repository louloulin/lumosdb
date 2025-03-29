use actix::prelude::*;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use chrono::Utc;
use log::{info, debug};

use crate::types::DataRecord;
use crate::actors::messages::ExtractData;

/// 全局内存存储
lazy_static::lazy_static! {
    static ref MEMORY_STORE: Arc<RwLock<HashMap<String, Vec<DataRecord>>>> = Arc::new(RwLock::new(HashMap::new()));
}

/// 内存提取器，用于从上一个任务的内存缓存中读取数据
pub struct MemoryExtractor {
    config: HashMap<String, serde_json::Value>,
}

impl MemoryExtractor {
    /// 创建新的内存提取器
    pub fn new(config: HashMap<String, serde_json::Value>) -> Self {
        Self { config }
    }
    
    /// 设置内存数据
    pub fn set_data(key: &str, data: Vec<DataRecord>) {
        let mut store = MEMORY_STORE.write().unwrap();
        store.insert(key.to_string(), data);
    }
    
    /// 获取内存数据
    pub fn get_data(key: &str) -> Option<Vec<DataRecord>> {
        let store = MEMORY_STORE.read().unwrap();
        store.get(key).cloned()
    }
    
    /// 清除内存数据
    pub fn clear_data(key: &str) {
        let mut store = MEMORY_STORE.write().unwrap();
        store.remove(key);
    }
    
    /// 清除所有内存数据
    pub fn clear_all() {
        let mut store = MEMORY_STORE.write().unwrap();
        store.clear();
    }
    
    /// 从内存读取数据
    fn read_memory_data(&self, options: &HashMap<String, serde_json::Value>) -> Result<Vec<DataRecord>, String> {
        // 获取内存键
        let key = match options.get("key") {
            Some(serde_json::Value::String(key)) => key,
            _ => "default",  // 默认键名
        };
        
        // 从内存中获取数据
        match Self::get_data(key) {
            Some(records) => {
                info!("从内存读取了{}条记录，键: {}", records.len(), key);
                Ok(records)
            },
            None => {
                if let Some(serde_json::Value::Bool(true)) = options.get("required") {
                    Err(format!("内存中不存在键: {}", key))
                } else {
                    // 如果不要求数据存在，则返回空列表
                    info!("内存中不存在键: {}，返回空列表", key);
                    Ok(Vec::new())
                }
            }
        }
    }
}

impl Actor for MemoryExtractor {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        debug!("内存提取器已启动");
    }
}

impl Handler<ExtractData> for MemoryExtractor {
    type Result = ResponseFuture<Result<Vec<DataRecord>, String>>;
    
    fn handle(&mut self, msg: ExtractData, _: &mut Context<Self>) -> Self::Result {
        // 合并默认配置和提供的选项
        let mut options = self.config.clone();
        for (k, v) in msg.options {
            options.insert(k, v);
        }
        
        // 从内存读取数据
        Box::pin(async move {
            let extractor = MemoryExtractor::new(options.clone());
            extractor.read_memory_data(&options)
        })
    }
} 