use actix::prelude::*;
use serde_json::{json, Value};
use std::collections::HashMap;
use log::{debug, info, error, warn};
use serde::{Deserialize, Serialize};

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
    fn init(&mut self) -> Result<(), String> { Ok(()) }
    fn shutdown(&mut self) -> Result<(), String> { Ok(()) }
    fn process_config(&self, config: HashMap<String, Value>) -> Result<HashMap<String, Value>, String> { Ok(config) }
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

// MongoDB WASM Plugin for Lumos DataFlow

// 插件类型常量
const PLUGIN_TYPE_EXTRACTOR: i32 = 0;
const PLUGIN_TYPE_TRANSFORMER: i32 = 1;
const PLUGIN_TYPE_LOADER: i32 = 2;
const PLUGIN_TYPE_ALL: i32 = 3;

// 插件元数据
static PLUGIN_NAME: &str = "mongodb";
static PLUGIN_VERSION: &str = "0.1.0";
static PLUGIN_DESCRIPTION: &str = "MongoDB plugin for Lumos DataFlow";
static PLUGIN_AUTHOR: &str = "Lumos Team";

// 数据记录类型
#[derive(Serialize, Deserialize)]
struct DataRecord {
    data: Value,
}

// 提取结果
#[derive(Serialize, Deserialize)]
enum ExtractResult {
    Success(Vec<Value>),
    Error(String),
}

// 加载结果
#[derive(Serialize, Deserialize)]
enum LoadResult {
    Success(usize),
    Error(String),
}

// MongoDB连接配置
#[derive(Serialize, Deserialize, Debug)]
struct MongoDBConfig {
    connection_string: String,
    database: String,
    collection: String,
    query: Option<Value>,
    projection: Option<Value>,
    limit: Option<usize>,
}

impl MongoDBConfig {
    fn from_options(options: &HashMap<String, Value>) -> Result<Self, String> {
        let get_string = |key: &str| -> Result<String, String> {
            options
                .get(key)
                .and_then(|v| v.as_str())
                .map(|s| s.to_string())
                .ok_or_else(|| format!("Missing required option: {}", key))
        };

        let connection_string = get_string("connection_string")?;
        let database = get_string("database")?;
        let collection = get_string("collection")?;
        
        let query = options.get("query").cloned();
        let projection = options.get("projection").cloned();
        let limit = options.get("limit").and_then(|v| v.as_u64()).map(|v| v as usize);

        Ok(MongoDBConfig {
            connection_string,
            database,
            collection,
            query,
            projection,
            limit,
        })
    }
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

#[no_mangle]
pub extern "C" fn get_metadata() -> i64 {
    // Since we can't return complex types directly across FFI boundary in WIT format,
    // we'll serialize to a JSON string
    let metadata = json!({
        "name": PLUGIN_NAME,
        "version": PLUGIN_VERSION,
        "description": PLUGIN_DESCRIPTION,
        "author": PLUGIN_AUTHOR,
    })
    .to_string();
    
    // Store the metadata string in a location that can be retrieved
    store_string_result(&metadata);
    1 // Success
}

#[no_mangle]
pub extern "C" fn get_type() -> i32 {
    PLUGIN_TYPE_ALL // This plugin supports all operations
}

#[no_mangle]
pub extern "C" fn init() -> i32 {
    // Initialize plugin
    // For example: set up global connection pool or other resources
    1 // Success
}

#[no_mangle]
pub extern "C" fn shutdown() -> i32 {
    // Clean up resources
    1 // Success
}

#[no_mangle]
pub extern "C" fn extract(options_ptr: i64) -> i64 {
    // Get options string
    let options_str = get_string_param(options_ptr);
    
    // Parse options
    let options: HashMap<String, Value> = match serde_json::from_str(&options_str) {
        Ok(opts) => opts,
        Err(e) => {
            let result = ExtractResult::Error(format!("Failed to parse options: {}", e));
            let result_str = serde_json::to_string(&result).unwrap_or_default();
            store_string_result(&result_str);
            return 1;
        }
    };

    // Parse MongoDB config
    let config = match MongoDBConfig::from_options(&options) {
        Ok(cfg) => cfg,
        Err(e) => {
            let result = ExtractResult::Error(e);
            let result_str = serde_json::to_string(&result).unwrap_or_default();
            store_string_result(&result_str);
            return 1;
        }
    };

    // In a real implementation, we would connect to MongoDB and execute the query
    // For this example, we'll return mock data
    
    // Mock data
    let records = generate_mock_data(&config);
    
    // Return success
    let result = ExtractResult::Success(records);
    let result_str = serde_json::to_string(&result).unwrap_or_default();
    store_string_result(&result_str);
    1 // Success
}

#[no_mangle]
pub extern "C" fn transform(records_ptr: i64) -> i64 {
    // Get records string
    let records_str = get_string_param(records_ptr);
    
    // Parse records
    let records: Vec<Value> = match serde_json::from_str(&records_str) {
        Ok(recs) => recs,
        Err(e) => {
            // Return empty array on error
            store_string_result("[]");
            return 0;
        }
    };

    // In a real implementation, we would transform the records
    // For this example, we'll just add a transformation field
    
    let transformed: Vec<Value> = records
        .into_iter()
        .map(|mut record| {
            if let Value::Object(obj) = &mut record {
                obj.insert("transformed_by".to_string(), json!("mongodb_plugin"));
                obj.insert("transformed_at".to_string(), json!(get_current_timestamp()));
            }
            record
        })
        .collect();
    
    // Return transformed records
    let result = serde_json::to_string(&transformed).unwrap_or_default();
    store_string_result(&result);
    1 // Success
}

#[no_mangle]
pub extern "C" fn load(records_ptr: i64, options_ptr: i64) -> i64 {
    // Get records string
    let records_str = get_string_param(records_ptr);
    
    // Get options string
    let options_str = get_string_param(options_ptr);
    
    // Parse records
    let records: Vec<Value> = match serde_json::from_str(&records_str) {
        Ok(recs) => recs,
        Err(e) => {
            let result = LoadResult::Error(format!("Failed to parse records: {}", e));
            let result_str = serde_json::to_string(&result).unwrap_or_default();
            store_string_result(&result_str);
            return 0;
        }
    };

    // Parse options
    let options: HashMap<String, Value> = match serde_json::from_str(&options_str) {
        Ok(opts) => opts,
        Err(e) => {
            let result = LoadResult::Error(format!("Failed to parse options: {}", e));
            let result_str = serde_json::to_string(&result).unwrap_or_default();
            store_string_result(&result_str);
            return 0;
        }
    };

    // Parse MongoDB config
    let config = match MongoDBConfig::from_options(&options) {
        Ok(cfg) => cfg,
        Err(e) => {
            let result = LoadResult::Error(e);
            let result_str = serde_json::to_string(&result).unwrap_or_default();
            store_string_result(&result_str);
            return 0;
        }
    };

    // In a real implementation, we would connect to MongoDB and insert the records
    // For this example, we'll just return the count
    
    // Return success
    let result = LoadResult::Success(records.len());
    let result_str = serde_json::to_string(&result).unwrap_or_default();
    store_string_result(&result_str);
    1 // Success
}

// Helper functions

// Store string result in a location that can be retrieved by the host
fn store_string_result(result: &str) {
    // In a real implementation using WIT, we would use proper WIT bindings
    // For this example, we're just showing the structure
    // The actual mechanism for passing strings will be handled by WIT
}

// Get string parameter from the host
fn get_string_param(ptr: i64) -> String {
    // In a real implementation using WIT, we would use proper WIT bindings
    // For this example, we're just showing the structure
    // The actual mechanism for passing strings will be handled by WIT
    "".to_string()
}

// Generate mock data for MongoDB extraction
fn generate_mock_data(config: &MongoDBConfig) -> Vec<Value> {
    let limit = config.limit.unwrap_or(10);
    let mut records = Vec::new();
    
    for i in 0..limit {
        records.push(json!({
            "_id": format!("id_{}", i),
            "name": format!("Document {}", i),
            "value": i,
            "created_at": get_current_timestamp(),
            "source": "mongodb_plugin",
            "collection": config.collection,
            "database": config.database
        }));
    }
    
    records
}

// Get current timestamp as ISO string
fn get_current_timestamp() -> String {
    // In a real implementation, we would use proper time handling
    // For this example prototype, we'll return a mock timestamp
    "2023-01-01T00:00:00Z".to_string()
} 