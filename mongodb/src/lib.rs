use actix::prelude::*;
use serde_json::{json, Value};
use std::collections::HashMap;
use log::{debug, info, error, warn};

#[derive(Debug)]
pub struct MongoDBPlugin {
    version: String,
}

// 插件元数据
pub struct PluginMetadata {
    pub name: String,
    pub version: String,
    pub description: String,
    pub author: String,
}

// 插件类型枚举
pub enum PluginType {
    Extractor,
    Transformer,
    Loader,
    All,
}

// 定义插件接口 - 这应该与您框架中的插件接口匹配
pub trait Plugin: Send {
    fn metadata(&self) -> PluginMetadata;
    fn get_type(&self) -> PluginType;
    fn start(&self) -> Addr<dyn Actor<Context = actix::Context<Self>> + Send> where Self: Actor<Context = actix::Context<Self>>;
}

// 数据记录结构 - 与主框架中的定义保持一致
#[derive(Debug, Clone)]
pub struct DataRecord {
    pub data: Value,
}

impl DataRecord {
    pub fn new(data: Value) -> Self {
        Self { data }
    }
}

// 消息定义 - 与主框架中的定义保持一致
#[derive(Message)]
#[rtype(result = "Result<Vec<DataRecord>, String>")]
pub struct ExtractData {
    pub options: HashMap<String, Value>,
}

#[derive(Message)]
#[rtype(result = "Result<usize, String>")]
pub struct LoadData {
    pub records: Vec<DataRecord>,
    pub options: HashMap<String, Value>,
}

// MongoDB插件实现
impl Actor for MongoDBPlugin {
    type Context = Context<Self>;

    fn started(&mut self, _ctx: &mut Self::Context) {
        info!("MongoDB插件启动");
    }
}

impl Handler<ExtractData> for MongoDBPlugin {
    type Result = ResponseFuture<Result<Vec<DataRecord>, String>>;

    fn handle(&mut self, msg: ExtractData, _ctx: &mut Self::Context) -> Self::Result {
        debug!("处理MongoDB数据提取请求");
        
        // 获取连接参数
        let conn_str = match msg.options.get("connection_string") {
            Some(Value::String(s)) => s.clone(),
            _ => return Box::pin(async { Err("缺少connection_string参数".to_string()) }),
        };
        
        let database = match msg.options.get("database") {
            Some(Value::String(s)) => s.clone(),
            _ => return Box::pin(async { Err("缺少database参数".to_string()) }),
        };
        
        let collection = match msg.options.get("collection") {
            Some(Value::String(s)) => s.clone(),
            _ => return Box::pin(async { Err("缺少collection参数".to_string()) }),
        };
        
        // 在实际应用中，这里会连接到MongoDB并执行查询
        // 为了简化示例，我们模拟返回一些数据
        info!("从MongoDB提取数据: {}::{}", database, collection);
        
        Box::pin(async move {
            // 模拟MongoDB连接和查询
            info!("连接到: {}", conn_str);
            
            // 检查是否有limit参数
            let limit = msg.options.get("limit")
                .and_then(|v| v.as_u64())
                .unwrap_or(10) as usize;
            
            // 创建模拟数据
            let mut records = Vec::with_capacity(limit);
            for i in 0..limit {
                records.push(DataRecord::new(json!({
                    "_id": format!("doc_{}", i),
                    "name": format!("Sample Document {}", i),
                    "value": i * 10,
                    "created_at": chrono::Utc::now().to_rfc3339(),
                })));
            }
            
            info!("从MongoDB提取了 {} 条记录", records.len());
            Ok(records)
        })
    }
}

impl Handler<LoadData> for MongoDBPlugin {
    type Result = ResponseFuture<Result<usize, String>>;
    
    fn handle(&mut self, msg: LoadData, _ctx: &mut Self::Context) -> Self::Result {
        debug!("处理MongoDB数据加载请求");
        
        // 获取连接参数
        let conn_str = match msg.options.get("connection_string") {
            Some(Value::String(s)) => s.clone(),
            _ => return Box::pin(async { Err("缺少connection_string参数".to_string()) }),
        };
        
        let database = match msg.options.get("database") {
            Some(Value::String(s)) => s.clone(),
            _ => return Box::pin(async { Err("缺少database参数".to_string()) }),
        };
        
        let collection = match msg.options.get("collection") {
            Some(Value::String(s)) => s.clone(),
            _ => return Box::pin(async { Err("缺少collection参数".to_string()) }),
        };
        
        // 获取插入模式
        let mode = msg.options.get("mode")
            .and_then(|v| v.as_str())
            .unwrap_or("insert");
        
        let records_count = msg.records.len();
        info!("正在加载 {} 条记录到 MongoDB {}::{} (模式: {})", 
              records_count, database, collection, mode);
        
        Box::pin(async move {
            // 模拟MongoDB连接和数据加载
            info!("连接到: {}", conn_str);
            
            // 在实际应用中，这里会连接到MongoDB并执行插入/更新
            // 为了简化示例，我们只模拟操作
            
            // 延迟100ms模拟网络操作
            tokio::time::sleep(std::time::Duration::from_millis(100)).await;
            
            info!("成功加载 {} 条记录到 MongoDB", records_count);
            Ok(records_count)
        })
    }
}

impl Plugin for MongoDBPlugin {
    fn metadata(&self) -> PluginMetadata {
        PluginMetadata {
            name: "mongodb".to_string(),
            version: self.version.clone(),
            description: "MongoDB连接器插件 - 支持从MongoDB中提取和加载数据".to_string(),
            author: "Lumos DataFlow 团队".to_string(),
        }
    }
    
    fn get_type(&self) -> PluginType {
        PluginType::All  // 这个插件既可以作为提取器也可以作为加载器
    }
    
    fn start(&self) -> Addr<dyn Actor<Context = actix::Context<Self>> + Send> {
        let addr = MongoDBPlugin {
            version: self.version.clone(),
        }.start();
        addr
    }
}

// 导出插件创建函数
#[no_mangle]
pub extern "C" fn create_plugin() -> Box<dyn Plugin> {
    Box::new(MongoDBPlugin {
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
} 