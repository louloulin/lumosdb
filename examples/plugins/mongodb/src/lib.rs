use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use serde_json::json;

/// 数据记录结构
#[derive(Serialize, Deserialize, Clone)]
pub struct DataRecord {
    /// 记录的唯一标识符
    pub id: String,
    /// 记录的来源
    pub source: String,
    /// 记录的时间戳
    pub timestamp: String,
    /// 字段映射
    pub fields: HashMap<String, String>,
}

/// 提取器选项
#[derive(Serialize, Deserialize)]
pub struct ExtractorOptions {
    /// 提取操作的选项
    pub options: HashMap<String, String>,
}

/// 加载器选项
#[derive(Serialize, Deserialize)]
pub struct LoaderOptions {
    /// 加载操作的选项
    pub options: HashMap<String, String>,
}

/// 插件元数据
#[derive(Serialize, Deserialize)]
pub struct PluginMetadata {
    /// 插件名称
    pub name: String,
    /// 插件版本
    pub version: String,
    /// 插件描述
    pub description: String,
    /// 插件类型
    pub plugin_type: String,
}

/// 加载结果枚举
#[derive(Serialize, Deserialize)]
pub enum LoadResult {
    /// 成功加载
    Success(u32),
    /// 加载失败
    Error(String),
}

/// 获取插件元数据
#[no_mangle]
pub extern "C" fn get_metadata() -> *mut u8 {
    let metadata = PluginMetadata {
        name: "mongodb".to_string(),
        version: "0.1.0".to_string(),
        description: "MongoDB plugin for Lumos DataFlow".to_string(),
        plugin_type: "all".to_string(),
    };
    
    return_json(&metadata)
}

/// 从数据源提取数据
#[no_mangle]
pub extern "C" fn extract(options_ptr: *mut u8) -> *mut u8 {
    // 解析选项
    let options: ExtractorOptions = match parse_json(options_ptr) {
        Ok(opts) => opts,
        Err(e) => return return_json(&e.to_string()),
    };
    
    // 记录操作
    eprintln!("[MongoDB提取器] 开始提取数据");
    
    // 解析选项
    let collection = options.options.get("collection").unwrap_or(&"test".to_string()).to_string();
    let query = options.options.get("query").unwrap_or(&"{}".to_string()).to_string();
    
    // 记录查询
    eprintln!("[MongoDB提取器] 从集合 {} 提取数据: {}", collection, query);
    
    // 模拟提取的数据
    let records = generate_mock_data();
    
    eprintln!("[MongoDB提取器] 提取了 {} 条记录", records.len());
    
    return_json(&records)
}

/// 转换数据记录
#[no_mangle]
pub extern "C" fn transform(records_ptr: *mut u8) -> *mut u8 {
    // 解析记录
    let records: Vec<DataRecord> = match parse_json(records_ptr) {
        Ok(recs) => recs,
        Err(e) => return return_json(&e.to_string()),
    };
    
    // 记录操作
    eprintln!("[MongoDB转换器] 转换 {} 条记录", records.len());
    
    // 简单转换
    let transformed = records.into_iter().map(|record| {
        // 添加一个转换时间戳
        let mut fields = record.fields;
        fields.insert("transformed_at".to_string(), get_timestamp());
        
        DataRecord {
            id: record.id,
            source: record.source,
            timestamp: record.timestamp,
            fields,
        }
    }).collect::<Vec<_>>();
    
    return_json(&transformed)
}

/// 加载数据到目标
#[no_mangle]
pub extern "C" fn load(records_ptr: *mut u8, options_ptr: *mut u8) -> *mut u8 {
    // 解析记录
    let records: Vec<DataRecord> = match parse_json(records_ptr) {
        Ok(recs) => recs,
        Err(e) => return return_json(&LoadResult::Error(e.to_string())),
    };
    
    // 解析选项
    let options: LoaderOptions = match parse_json(options_ptr) {
        Ok(opts) => opts,
        Err(e) => return return_json(&LoadResult::Error(e.to_string())),
    };
    
    // 记录操作
    eprintln!("[MongoDB加载器] 开始加载数据");
    
    // 解析选项
    let collection = options.options.get("collection").unwrap_or(&"output".to_string()).to_string();
    
    // 记录操作
    eprintln!("[MongoDB加载器] 加载 {} 条记录到集合 {}", records.len(), collection);
    
    // 模拟加载
    return_json(&LoadResult::Success(records.len() as u32))
}

// 生成模拟数据
fn generate_mock_data() -> Vec<DataRecord> {
    let mut records = Vec::new();
    
    for i in 1..6 {
        let id = format!("doc_{}", i);
        let mut fields = HashMap::new();
        
        fields.insert("name".to_string(), format!("测试文档 {}", i));
        fields.insert("value".to_string(), format!("{}", i * 10));
        fields.insert("created_at".to_string(), get_timestamp());
        
        records.push(DataRecord {
            id,
            source: "mongodb".to_string(),
            timestamp: get_timestamp(),
            fields,
        });
    }
    
    records
}

// 获取当前时间戳
fn get_timestamp() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    format!("{}", now)
}

// 从指针解析JSON
fn parse_json<T: for<'de> Deserialize<'de>>(ptr: *mut u8) -> Result<T, serde_json::Error> {
    let data = unsafe {
        let len = (*(ptr as *const u32)) as usize;
        let data_ptr = ptr.add(4);
        let slice = std::slice::from_raw_parts(data_ptr, len);
        slice
    };
    
    serde_json::from_slice(data)
}

// 将值序列化为JSON并返回指针
fn return_json<T: Serialize>(value: &T) -> *mut u8 {
    let json = serde_json::to_vec(value).unwrap_or_default();
    let len = json.len();
    
    // 分配足够的内存存储长度和数据
    let mut result = Vec::with_capacity(4 + len);
    result.extend_from_slice(&(len as u32).to_le_bytes());
    result.extend_from_slice(&json);
    
    // 转移所有权
    let boxed = result.into_boxed_slice();
    let ptr = Box::into_raw(boxed) as *mut u8;
    
    ptr
} 