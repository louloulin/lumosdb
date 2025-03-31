// Extractor module
use anyhow::Result;
use serde_json::Value;

/// 数据提取器接口
pub trait Extractor {
    /// 提取数据
    fn extract(&self, config: Value) -> Result<Vec<Value>>;
    
    /// 从其他数据源提取数据
    fn extract_from(&self, source: &str, config: Value) -> Result<Vec<Value>>;
}

// 接口实现将在子模块中添加
