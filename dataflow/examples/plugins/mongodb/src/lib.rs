//! MongoDB 连接器插件
//!
//! 该插件为 Lumos DataFlow 提供 MongoDB 数据库连接功能。
//! 它同时实现了提取器和加载器功能。

use std::collections::HashMap;
use std::sync::Arc;
use actix::prelude::*;
use log::{info, debug, error, warn};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use mongodb::{
    Client, Database,
    options::{ClientOptions, FindOptions},
    bson::{Document, doc, Bson, from_document, to_document, to_bson},
};
use futures::stream::TryStreamExt;
use tokio::sync::Mutex;

#[cfg(feature = "lumos-dataflow")]
use lumos_dataflow::{
    plugin::{Plugin, PluginMetadata, PluginType},
    types::{DataRecord, ETLError},
    actors::messages::{ExtractData, LoadData},
};

#[cfg(not(feature = "lumos-dataflow"))]
mod compat;
#[cfg(not(feature = "lumos-dataflow"))]
use compat::*;

/// MongoDB 插件
pub struct MongoDBPlugin {
    /// 客户端连接缓存
    client_cache: Arc<Mutex<Option<Client>>>,
    /// 插件配置
    config: HashMap<String, Value>,
}

impl Default for MongoDBPlugin {
    fn default() -> Self {
        Self {
            client_cache: Arc::new(Mutex::new(None)),
            config: HashMap::new(),
        }
    }
}

impl Plugin for MongoDBPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata::new(
            "mongodb",
            "0.1.0",
            "MongoDB connector for Lumos DataFlow",
            "Lumos DB Team",
            "0.1.0",
        )
        .with_feature("extractor")
        .with_feature("loader")
        .with_license("MIT")
    }
    
    fn init(&mut self) -> Result<(), String> {
        info!("初始化 MongoDB 插件");
        Ok(())
    }
    
    fn shutdown(&mut self) -> Result<(), String> {
        info!("关闭 MongoDB 插件");
        
        // 清理连接
        let mut cache = futures::executor::block_on(async {
            self.client_cache.lock().await
        });
        *cache = None;
        
        Ok(())
    }
    
    fn get_type(&self) -> PluginType {
        // 同时支持提取器和加载器
        PluginType::All
    }
    
    fn process_config(&self, config: HashMap<String, Value>) -> Result<HashMap<String, Value>, String> {
        // 验证配置
        if !config.contains_key("connection_string") {
            return Err("MongoDB 插件需要 'connection_string' 配置项".to_string());
        }
        
        // 处理并返回配置
        Ok(config)
    }
}

impl Actor for MongoDBPlugin {
    type Context = Context<Self>;
    
    fn started(&mut self, _: &mut Self::Context) {
        debug!("MongoDB 插件 Actor 已启动");
    }
    
    fn stopped(&mut self, _: &mut Self::Context) {
        debug!("MongoDB 插件 Actor 已停止");
    }
}

// 处理提取数据请求
impl Handler<ExtractData> for MongoDBPlugin {
    type Result = ResponseFuture<Result<Vec<DataRecord>, ETLError>>;
    
    fn handle(&mut self, msg: ExtractData, _: &mut Context<Self>) -> Self::Result {
        let options = msg.options;
        let client_cache = self.client_cache.clone();
        
        Box::pin(async move {
            debug!("从 MongoDB 提取数据");
            
            // 获取连接参数
            let conn_str = options.get("connection_string")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ETLError::ConfigError("未提供 MongoDB 连接字符串".to_string()))?;
                
            let database = options.get("database")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ETLError::ConfigError("未提供数据库名称".to_string()))?;
                
            let collection = options.get("collection")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ETLError::ConfigError("未提供集合名称".to_string()))?;
                
            // 获取或创建连接
            let client = get_or_create_client(client_cache, conn_str).await?;
            
            // 获取数据库和集合
            let db = client.database(database);
            let coll = db.collection::<Document>(collection);
            
            // 构建查询
            let filter = match options.get("filter") {
                Some(filter_value) => {
                    match serde_json::from_value::<Document>(filter_value.clone()) {
                        Ok(filter) => filter,
                        Err(e) => {
                            error!("无效的 MongoDB 过滤器: {}", e);
                            return Err(ETLError::ConfigError(format!("无效的 MongoDB 过滤器: {}", e)));
                        }
                    }
                },
                None => Document::new(),
            };
            
            // 设置查询选项
            let mut find_options = FindOptions::default();
            
            // 批量大小
            if let Some(batch_size) = options.get("batch_size").and_then(|v| v.as_u64()) {
                find_options.batch_size = Some(batch_size as u32);
            }
            
            // 限制数量
            if let Some(limit) = options.get("limit").and_then(|v| v.as_i64()) {
                find_options.limit = Some(limit);
            }
            
            // 排序
            if let Some(sort_value) = options.get("sort") {
                match serde_json::from_value::<Document>(sort_value.clone()) {
                    Ok(sort) => {
                        find_options.sort = Some(sort);
                    },
                    Err(e) => {
                        error!("无效的 MongoDB 排序选项: {}", e);
                        return Err(ETLError::ConfigError(format!("无效的 MongoDB 排序选项: {}", e)));
                    }
                }
            }
            
            // 执行查询
            info!("从 MongoDB 集合 {}.{} 查询数据", database, collection);
            let mut cursor = coll.find(filter, find_options).await
                .map_err(|e| ETLError::ExtractorError(format!("MongoDB 查询失败: {}", e)))?;
            
            // 收集结果
            let mut records = Vec::new();
            
            while let Some(doc) = cursor.try_next().await
                .map_err(|e| ETLError::ExtractorError(format!("MongoDB 读取失败: {}", e)))? {
                    
                // 将 BSON 文档转换为 JSON
                let record = bson_to_data_record(doc)?;
                records.push(record);
            }
            
            info!("成功从 MongoDB 提取了 {} 条记录", records.len());
            Ok(records)
        })
    }
}

// 处理加载数据请求
impl Handler<LoadData> for MongoDBPlugin {
    type Result = ResponseFuture<Result<usize, ETLError>>;
    
    fn handle(&mut self, msg: LoadData, _: &mut Context<Self>) -> Self::Result {
        let options = msg.options;
        let records = msg.records;
        let client_cache = self.client_cache.clone();
        
        Box::pin(async move {
            debug!("加载数据到 MongoDB");
            
            // 获取连接参数
            let conn_str = options.get("connection_string")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ETLError::ConfigError("未提供 MongoDB 连接字符串".to_string()))?;
                
            let database = options.get("database")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ETLError::ConfigError("未提供数据库名称".to_string()))?;
                
            let collection = options.get("collection")
                .and_then(|v| v.as_str())
                .ok_or_else(|| ETLError::ConfigError("未提供集合名称".to_string()))?;
                
            // 获取加载模式
            let mode = options.get("mode")
                .and_then(|v| v.as_str())
                .unwrap_or("insert");
                
            // 键字段（用于update和upsert模式）
            let key_field = options.get("key_field")
                .and_then(|v| v.as_str())
                .unwrap_or("_id");
                
            // 获取或创建连接
            let client = get_or_create_client(client_cache, conn_str).await?;
            
            // 获取数据库和集合
            let db = client.database(database);
            let coll = db.collection::<Document>(collection);
            
            // 将记录转换为BSON文档
            let docs: Result<Vec<Document>, _> = records.into_iter()
                .map(data_record_to_bson)
                .collect();
                
            let docs = docs.map_err(|e| ETLError::LoaderError(format!("数据转换失败: {}", e)))?;
            
            info!("准备加载 {} 条记录到 MongoDB 集合 {}.{}", docs.len(), database, collection);
            
            match mode {
                "insert" => {
                    // 批量插入
                    let result = coll.insert_many(docs, None).await
                        .map_err(|e| ETLError::LoaderError(format!("MongoDB 插入失败: {}", e)))?;
                        
                    info!("成功插入 {} 条记录到 MongoDB", result.inserted_ids.len());
                    Ok(result.inserted_ids.len())
                },
                "update" | "upsert" => {
                    // 更新或插入更新
                    let is_upsert = mode == "upsert";
                    let mut success_count = 0;
                    
                    for doc in docs {
                        // 获取键值
                        let key_value = match doc.get(key_field) {
                            Some(value) => value.clone(),
                            None => {
                                warn!("记录中缺少键字段 '{}', 跳过", key_field);
                                continue;
                            }
                        };
                        
                        // 创建过滤器
                        let filter = doc! { key_field: key_value };
                        
                        // 创建更新文档
                        let update = doc! { "$set": doc };
                        
                        // 执行更新
                        let update_options = mongodb::options::UpdateOptions::builder()
                            .upsert(is_upsert)
                            .build();
                            
                        let result = coll.update_one(filter, update, update_options).await
                            .map_err(|e| ETLError::LoaderError(format!("MongoDB 更新失败: {}", e)))?;
                            
                        if result.matched_count > 0 || result.upserted_id.is_some() {
                            success_count += 1;
                        }
                    }
                    
                    info!("成功{}了 {} 条记录到 MongoDB", 
                         if is_upsert { "更新/插入" } else { "更新" }, 
                         success_count);
                    Ok(success_count)
                },
                _ => {
                    Err(ETLError::ConfigError(format!("不支持的 MongoDB 加载模式: {}", mode)))
                }
            }
        })
    }
}

// 辅助函数：获取或创建MongoDB客户端
async fn get_or_create_client(cache: Arc<Mutex<Option<Client>>>, conn_str: &str) -> Result<Client, ETLError> {
    let mut client_cache = cache.lock().await;
    
    if let Some(client) = &*client_cache {
        return Ok(client.clone());
    }
    
    debug!("创建新的 MongoDB 客户端连接");
    
    // 解析连接字符串
    let client_options = ClientOptions::parse(conn_str).await
        .map_err(|e| ETLError::ConfigError(format!("MongoDB 连接字符串解析失败: {}", e)))?;
        
    // 创建客户端
    let client = Client::with_options(client_options)
        .map_err(|e| ETLError::ConfigError(format!("MongoDB 客户端创建失败: {}", e)))?;
        
    // 测试连接
    client.list_database_names(None, None).await
        .map_err(|e| ETLError::ConfigError(format!("MongoDB 连接测试失败: {}", e)))?;
        
    *client_cache = Some(client.clone());
    
    Ok(client)
}

// 将 BSON 文档转换为 DataRecord
fn bson_to_data_record(doc: Document) -> Result<DataRecord, ETLError> {
    // 将 BSON 转换为 JSON
    let json_value = mongodb::bson::to_bson(&doc)
        .map_err(|e| ETLError::ExtractorError(format!("BSON 到 JSON 转换失败: {}", e)))?;
        
    let json_value = match json_value {
        Bson::Document(doc) => {
            let json = serde_json::to_value(doc)
                .map_err(|e| ETLError::ExtractorError(format!("BSON 文档到 JSON 转换失败: {}", e)))?;
            json
        },
        _ => return Err(ETLError::ExtractorError("无效的 BSON 文档".to_string())),
    };
    
    // 创建数据记录
    Ok(DataRecord::new(json_value))
}

// 将 DataRecord 转换为 BSON 文档
fn data_record_to_bson(record: DataRecord) -> Result<Document, String> {
    // 获取 JSON 数据
    let json_value = record.data;
    
    // 转换为 BSON
    bson::to_document(&json_value)
        .map_err(|e| format!("JSON 到 BSON 转换失败: {}", e))
}

// 提供创建插件的导出函数
#[no_mangle]
pub extern "C" fn create_plugin() -> *mut dyn Plugin {
    let plugin = MongoDBPlugin::default();
    Box::into_raw(Box::new(plugin))
}

// 兼容性模块，仅在没有 lumos-dataflow 特性时使用
#[cfg(not(feature = "lumos-dataflow"))]
mod compat {
    use std::collections::HashMap;
    use serde::{Serialize, Deserialize};
    use serde_json::Value;
    
    // 兼容性类型，用于独立测试
    
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct PluginMetadata {
        pub name: String,
        pub version: String,
        pub description: String,
        pub author: String,
        pub min_framework_version: String,
        pub homepage: Option<String>,
        pub repository: Option<String>,
        pub features: Vec<String>,
        pub license: Option<String>,
    }
    
    impl PluginMetadata {
        pub fn new(
            name: impl Into<String>,
            version: impl Into<String>,
            description: impl Into<String>,
            author: impl Into<String>,
            min_framework_version: impl Into<String>,
        ) -> Self {
            Self {
                name: name.into(),
                version: version.into(),
                description: description.into(),
                author: author.into(),
                min_framework_version: min_framework_version.into(),
                homepage: None,
                repository: None,
                features: Vec::new(),
                license: None,
            }
        }
        
        pub fn with_feature(mut self, feature: impl Into<String>) -> Self {
            self.features.push(feature.into());
            self
        }
        
        pub fn with_license(mut self, license: impl Into<String>) -> Self {
            self.license = Some(license.into());
            self
        }
    }
    
    #[derive(Debug, Clone, Copy, PartialEq, Eq)]
    pub enum PluginType {
        Extractor,
        Transformer,
        Loader,
        All,
    }
    
    pub trait Plugin: Send + Sync {
        fn metadata(&self) -> PluginMetadata;
        fn init(&mut self) -> Result<(), String>;
        fn shutdown(&mut self) -> Result<(), String>;
        fn get_type(&self) -> PluginType;
        fn process_config(&self, config: HashMap<String, Value>) -> Result<HashMap<String, Value>, String>;
    }
    
    #[derive(Debug, thiserror::Error)]
    pub enum ETLError {
        #[error("配置错误: {0}")]
        ConfigError(String),
        
        #[error("提取器错误: {0}")]
        ExtractorError(String),
        
        #[error("转换器错误: {0}")]
        TransformerError(String),
        
        #[error("加载器错误: {0}")]
        LoaderError(String),
    }
    
    #[derive(Debug, Clone)]
    pub struct DataRecord {
        pub data: Value,
    }
    
    impl DataRecord {
        pub fn new(data: Value) -> Self {
            Self { data }
        }
    }
    
    pub mod actors {
        use super::*;
        use std::collections::HashMap;
        
        pub mod messages {
            use super::*;
            use actix::prelude::*;
            
            #[derive(Message)]
            #[rtype(result = "Result<Vec<DataRecord>, ETLError>")]
            pub struct ExtractData {
                pub options: HashMap<String, Value>,
            }
            
            #[derive(Message)]
            #[rtype(result = "Result<usize, ETLError>")]
            pub struct LoadData {
                pub records: Vec<DataRecord>,
                pub options: HashMap<String, Value>,
            }
        }
    }
} 