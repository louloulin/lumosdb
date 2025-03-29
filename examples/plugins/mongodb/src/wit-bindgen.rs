// 这个文件通常由wit-bindgen工具自动生成
// 这里我们手动创建一个简化版本作为示例

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Serialize, Deserialize)]
pub struct DataRecord {
    pub data: Value,
}

#[derive(Serialize, Deserialize)]
pub enum ExtractResult {
    Success(Vec<Value>),
    Error(String),
}

#[derive(Serialize, Deserialize)]
pub enum LoadResult {
    Success(usize),
    Error(String),
}

// 这些函数通常由wit-bindgen工具生成，用于与宿主环境通信
// 在实际的WebAssembly环境中，这些会被链接到正确的导入函数

pub fn debug(message: &str) {
    // 实际实现会链接到宿主环境提供的日志功能
    #[cfg(target_arch = "wasm32")]
    {
        // 这里会调用导入的宿主函数
    }
    
    #[cfg(not(target_arch = "wasm32"))]
    {
        println!("[DEBUG] {}", message);
    }
}

pub fn info(message: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        // 这里会调用导入的宿主函数
    }
    
    #[cfg(not(target_arch = "wasm32"))]
    {
        println!("[INFO] {}", message);
    }
}

pub fn warn(message: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        // 这里会调用导入的宿主函数
    }
    
    #[cfg(not(target_arch = "wasm32"))]
    {
        println!("[WARN] {}", message);
    }
}

pub fn error(message: &str) {
    #[cfg(target_arch = "wasm32")]
    {
        // 这里会调用导入的宿主函数
    }
    
    #[cfg(not(target_arch = "wasm32"))]
    {
        println!("[ERROR] {}", message);
    }
} 