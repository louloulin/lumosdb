// Loader module
use anyhow::Result;
use serde_json::Value;

/// 数据加载器接口
pub trait Loader {
    /// 加载单条数据
    fn load(&self, data: Value) -> Result<()>;
    
    /// 批量加载数据
    fn load_batch(&self, data: Vec<Value>) -> Result<()>;
    
    /// 刷新缓存数据
    fn flush(&self) -> Result<()>;
}

// 接口实现将在子模块中添加
