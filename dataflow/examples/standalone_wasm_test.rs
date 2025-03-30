use std::path::Path;
use std::collections::HashMap;
use serde::{Deserialize, Serialize};
use wasmtime::*;

/// 数据记录结构，与插件中定义的结构匹配
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DataRecord {
    pub id: String,
    pub source: String,
    pub timestamp: String,
    pub fields: HashMap<String, String>,
}

/// 提取器选项
#[derive(Serialize, Deserialize)]
pub struct ExtractorOptions {
    pub options: HashMap<String, String>,
}

/// 加载器选项
#[derive(Serialize, Deserialize)]
pub struct LoaderOptions {
    pub options: HashMap<String, String>,
}

/// 插件元数据
#[derive(Serialize, Deserialize, Debug)]
pub struct PluginMetadata {
    pub name: String,
    pub version: String,
    pub description: String,
    pub plugin_type: String,
}

/// 加载结果枚举
#[derive(Serialize, Deserialize, Debug)]
pub enum LoadResult {
    Success(u32),
    Error(String),
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("===== 独立WebAssembly插件测试程序 =====");
    
    // 检查插件文件
    let plugin_path = Path::new("plugins/mongodb.wasm");
    if !plugin_path.exists() {
        return Err(format!("MongoDB插件文件不存在: {:?}", plugin_path).into());
    }
    
    // 创建Wasmtime引擎
    println!("加载WebAssembly引擎...");
    let engine = Engine::default();
    let module = Module::from_file(&engine, plugin_path)?;
    
    // 创建存储
    let mut store = Store::new(&engine, ());
    
    // 创建链接器
    let linker = Linker::new(&engine);
    
    // 实例化模块
    println!("实例化MongoDB插件...");
    let instance = linker.instantiate(&mut store, &module)?;
    
    // 获取导出的函数
    let get_metadata = instance.get_typed_func::<(), i32>(&mut store, "get_metadata")?;
    let extract = instance.get_typed_func::<i32, i32>(&mut store, "extract")?;
    let transform = instance.get_typed_func::<i32, i32>(&mut store, "transform")?;
    let load = instance.get_typed_func::<(i32, i32), i32>(&mut store, "load")?;
    
    // 获取模块内存
    let memory = instance.get_memory(&mut store, "memory")
        .ok_or("找不到WebAssembly内存")?;
    
    // 调用get_metadata函数获取插件元数据
    println!("获取插件元数据...");
    let metadata_ptr = get_metadata.call(&mut store, ())?;
    let metadata: PluginMetadata = read_from_memory(&memory, &mut store, metadata_ptr)?;
    println!("插件元数据: {:?}", metadata);
    
    // 创建提取选项
    let mut options = HashMap::new();
    options.insert("collection".to_string(), "test_collection".to_string());
    options.insert("query".to_string(), "{}".to_string());
    
    let extractor_options = ExtractorOptions { options };
    
    // 序列化选项并传递给WebAssembly
    println!("调用extract函数...");
    let options_ptr = write_to_memory(&memory, &mut store, &extractor_options)?;
    let records_ptr = extract.call(&mut store, options_ptr)?;
    
    // 读取提取的记录
    let records: Vec<DataRecord> = read_from_memory(&memory, &mut store, records_ptr)?;
    println!("提取的记录数: {}", records.len());
    
    // 调用transform函数
    println!("调用transform函数...");
    let records_ptr = write_to_memory(&memory, &mut store, &records)?;
    let transformed_records_ptr = transform.call(&mut store, records_ptr)?;
    
    // 读取转换后的记录
    let transformed_records: Vec<DataRecord> = read_from_memory(&memory, &mut store, transformed_records_ptr)?;
    println!("转换后的记录数: {}", transformed_records.len());
    println!("转换后的记录示例:");
    for (i, record) in transformed_records.iter().enumerate().take(2) {
        println!("  记录 {}: ID={}, 字段数={}", i, record.id, record.fields.len());
        if let Some(transformed_at) = record.fields.get("transformed_at") {
            println!("  转换时间戳: {}", transformed_at);
        }
    }
    
    // 创建加载选项
    let mut load_options = HashMap::new();
    load_options.insert("collection".to_string(), "output_collection".to_string());
    
    let loader_options = LoaderOptions { options: load_options };
    
    // 序列化加载选项
    println!("调用load函数...");
    let records_ptr = write_to_memory(&memory, &mut store, &transformed_records)?;
    let load_options_ptr = write_to_memory(&memory, &mut store, &loader_options)?;
    let load_result_ptr = load.call(&mut store, (records_ptr, load_options_ptr))?;
    
    // 读取加载结果
    let load_result: LoadResult = read_from_memory(&memory, &mut store, load_result_ptr)?;
    println!("加载结果: {:?}", load_result);
    
    println!("===== WebAssembly插件测试完成 =====");
    Ok(())
}

// 从WebAssembly内存读取数据并反序列化
fn read_from_memory<T: for<'de> Deserialize<'de>>(
    memory: &Memory, 
    store: &mut Store<()>, 
    ptr: i32
) -> Result<T, Box<dyn std::error::Error>> {
    unsafe {
        // 读取长度（前4字节）
        let len_ptr = memory.data_ptr(store).add(ptr as usize) as *const u32;
        let len = *len_ptr as usize;
        
        // 读取JSON数据
        let data_ptr = memory.data_ptr(store).add(ptr as usize + 4);
        let data = std::slice::from_raw_parts(data_ptr, len);
        
        // 反序列化
        let result = serde_json::from_slice(data)?;
        Ok(result)
    }
}

// 将数据序列化并写入WebAssembly内存
fn write_to_memory<T: Serialize>(
    memory: &Memory, 
    store: &mut Store<()>, 
    value: &T
) -> Result<i32, Box<dyn std::error::Error>> {
    // 序列化为JSON
    let data = serde_json::to_vec(value)?;
    let len = data.len();
    
    // 准备写入内存的数据（长度+JSON数据）
    let mut buffer = Vec::with_capacity(4 + len);
    buffer.extend_from_slice(&(len as u32).to_le_bytes());
    buffer.extend_from_slice(&data);
    
    // 获取当前内存大小
    let current_pages = memory.size(store);
    let current_size = current_pages as usize * 65536; // 一页是64K
    
    // 找一个足够的偏移量存储我们的数据
    // 通常我们会从堆中分配，但为了简单，我们使用一个安全的偏移量
    let offset = current_size - buffer.len() - 1024; // 保留一些安全空间
    
    // 确保内存大小足够
    if offset < 0 {
        // 需要更多内存
        let additional_pages = ((buffer.len() + 1024) / 65536) + 1;
        memory.grow(store, additional_pages as u64)?;
    }
    
    // 写入内存
    for (i, byte) in buffer.iter().enumerate() {
        unsafe {
            let ptr_byte = memory.data_ptr(store).add(offset + i);
            *ptr_byte = *byte;
        }
    }
    
    Ok(offset as i32)
} 