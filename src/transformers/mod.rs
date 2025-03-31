// Transformer module
use anyhow::Result;
use serde_json::Value;

/// 数据转换器接口
pub trait Transformer {
    /// 转换单条数据
    fn transform(&self, data: Value) -> Result<Value>;
    
    /// 批量转换数据
    fn transform_batch(&self, data: Vec<Value>) -> Result<Vec<Value>>;
}

// 接口实现将在子模块中添加
