use anyhow::Result;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use crate::types::DataRecord;

/// 插件类型
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PluginType {
    /// 数据提取器插件
    Extractor = 0,
    /// 数据转换器插件
    Transformer = 1,
    /// 数据加载器插件
    Loader = 2,
    /// 多功能插件，实现全部功能
    All = 3,
}

impl std::fmt::Display for PluginType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PluginType::Extractor => write!(f, "extractor"),
            PluginType::Transformer => write!(f, "transformer"),
            PluginType::Loader => write!(f, "loader"),
            PluginType::All => write!(f, "all"),
        }
    }
}

impl From<i32> for PluginType {
    fn from(value: i32) -> Self {
        match value {
            0 => PluginType::Extractor,
            1 => PluginType::Transformer,
            2 => PluginType::Loader,
            _ => PluginType::All,
        }
    }
}

/// 插件元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMetadata {
    /// 插件名称
    pub name: String,
    /// 插件版本号
    pub version: String,
    /// 插件描述
    pub description: String,
    /// 插件作者
    pub author: String,
}

/// 提取结果
#[derive(Debug, Serialize, Deserialize)]
pub enum ExtractResult {
    /// 成功提取数据
    Success(Vec<Value>),
    /// 提取失败，带错误消息
    Error(String),
}

/// 加载结果
#[derive(Debug, Serialize, Deserialize)]
pub enum LoadResult {
    /// 成功加载数据，带加载记录数
    Success(usize),
    /// 加载失败，带错误消息
    Error(String),
}

/// 插件接口 (抽象)
pub trait Plugin {
    /// 获取插件元数据
    fn get_metadata(&self) -> PluginMetadata;
    
    /// 获取插件类型
    fn get_type(&self) -> PluginType;
    
    /// 初始化插件
    fn init(&mut self) -> Result<()>;
    
    /// 关闭插件
    fn shutdown(&mut self) -> Result<()>;
}

/// 提取器接口
pub trait Extractor: Plugin {
    /// 提取数据
    fn extract(&mut self, options: HashMap<String, Value>) -> Result<Vec<DataRecord>>;
}

/// 转换器接口
pub trait Transformer: Plugin {
    /// 转换数据
    fn transform(&mut self, records: Vec<DataRecord>) -> Result<Vec<DataRecord>>;
}

/// 加载器接口
pub trait Loader: Plugin {
    /// 加载数据
    fn load(&mut self, records: Vec<DataRecord>, options: HashMap<String, Value>) -> Result<usize>;
} 