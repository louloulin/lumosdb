//! 向量存储模块
//! 
//! 该模块提供向量存储和相似性搜索功能，支持高效的嵌入式向量操作，
//! 集成DuckDB向量扩展，实现AI应用所需的语义检索能力。

use std::collections::HashMap;
use std::path::Path;
use anyhow::{Result, anyhow};
use serde::{Serialize, Deserialize};
use serde_json::Value;
use log::{debug, info, warn, error};

/// 向量搜索距离度量方法
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum DistanceMetric {
    /// 欧几里得距离
    Euclidean,
    /// 余弦相似度
    Cosine, 
    /// 内积
    DotProduct,
    /// 汉明距离
    Hamming,
    /// 曼哈顿距离
    Manhattan,
}

impl std::fmt::Display for DistanceMetric {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            DistanceMetric::Euclidean => write!(f, "euclidean"),
            DistanceMetric::Cosine => write!(f, "cosine"),
            DistanceMetric::DotProduct => write!(f, "dot_product"),
            DistanceMetric::Hamming => write!(f, "hamming"),
            DistanceMetric::Manhattan => write!(f, "manhattan"),
        }
    }
}

/// 向量索引类型
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum IndexType {
    /// 暴力检索（无索引）
    Flat,
    /// HNSW (Hierarchical Navigable Small World) 索引
    HNSW,
    /// IVF (Inverted File) 索引
    IVF,
    /// PQ (Product Quantization) 索引
    PQ,
    /// Scalar Quantizer 索引
    SQ,
}

impl std::fmt::Display for IndexType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            IndexType::Flat => write!(f, "flat"),
            IndexType::HNSW => write!(f, "hnsw"),
            IndexType::IVF => write!(f, "ivf"),
            IndexType::PQ => write!(f, "pq"),
            IndexType::SQ => write!(f, "sq"),
        }
    }
}

/// 向量存储配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorStoreConfig {
    /// 向量维度
    pub dimensions: usize,
    /// 距离度量方法
    pub distance_metric: DistanceMetric,
    /// 索引类型
    pub index_type: IndexType,
    /// 索引参数
    #[serde(default)]
    pub index_params: HashMap<String, Value>,
    /// 存储路径
    pub path: Option<String>,
    /// 表名
    pub table_name: String,
    /// 额外配置
    #[serde(default)]
    pub extra: HashMap<String, Value>,
}

/// 向量查询结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VectorSearchResult {
    /// 文档ID
    pub id: String,
    /// 相似度分数
    pub score: f32,
    /// 元数据
    pub metadata: HashMap<String, Value>,
    /// 向量数据(可选)
    pub vector: Option<Vec<f32>>,
}

/// 向量存储接口
pub trait VectorStore: Send + Sync {
    /// 初始化向量存储
    fn initialize(&mut self, config: &VectorStoreConfig) -> Result<()>;
    
    /// 添加单个向量
    fn add_vector(&mut self, id: &str, vector: Vec<f32>, metadata: HashMap<String, Value>) -> Result<()>;
    
    /// 批量添加向量
    fn add_vectors(&mut self, batch: Vec<(String, Vec<f32>, HashMap<String, Value>)>) -> Result<()>;
    
    /// 搜索相似向量
    fn search(&self, query_vector: &[f32], top_k: usize) -> Result<Vec<VectorSearchResult>>;
    
    /// 根据ID获取向量
    fn get_by_id(&self, id: &str) -> Result<Option<VectorSearchResult>>;
    
    /// 根据ID删除向量
    fn delete_by_id(&mut self, id: &str) -> Result<bool>;
    
    /// 根据元数据过滤条件搜索向量
    fn search_with_filter(
        &self, 
        query_vector: &[f32], 
        filter: HashMap<String, Value>, 
        top_k: usize
    ) -> Result<Vec<VectorSearchResult>>;
    
    /// 获取向量数量
    fn count(&self) -> Result<usize>;
    
    /// 关闭向量存储
    fn close(&mut self) -> Result<()>;
}

// 创建向量存储的工厂函数
pub mod factory;

// DuckDB向量存储实现
pub mod duckdb;

// SQLite + 外部索引实现
pub mod sqlite; 