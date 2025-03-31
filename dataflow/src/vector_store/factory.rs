//! 向量存储工厂模块
//!
//! 提供创建不同类型向量存储的工厂函数

use std::sync::Arc;
use anyhow::{Result, anyhow};
use std::collections::HashMap;
use serde_json::Value;
use log::{debug, info, warn, error};

use super::{VectorStore, VectorStoreConfig};
use super::duckdb::DuckDBVectorStore;
use super::sqlite::SQLiteVectorStore;

/// 向量存储类型
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum VectorStoreType {
    /// DuckDB向量存储
    DuckDB,
    /// SQLite向量存储
    SQLite,
    /// 内存向量存储
    Memory,
}

impl std::str::FromStr for VectorStoreType {
    type Err = anyhow::Error;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s.to_lowercase().as_str() {
            "duckdb" => Ok(VectorStoreType::DuckDB),
            "sqlite" => Ok(VectorStoreType::SQLite),
            "memory" => Ok(VectorStoreType::Memory),
            _ => Err(anyhow!("未知的向量存储类型: {}", s)),
        }
    }
}

/// 创建向量存储
pub fn create_vector_store(store_type: &str, config: VectorStoreConfig) -> Result<Arc<dyn VectorStore>> {
    let store_type = store_type.parse::<VectorStoreType>()?;
    
    debug!("创建向量存储：类型: {:?}, 维度: {}, 度量方法: {:?}", 
           store_type, config.dimensions, config.distance_metric);
    
    let mut store: Box<dyn VectorStore> = match store_type {
        VectorStoreType::DuckDB => Box::new(DuckDBVectorStore::new()),
        VectorStoreType::SQLite => Box::new(SQLiteVectorStore::new()),
        VectorStoreType::Memory => {
            // 内存向量存储是SQLite的特殊版本，使用内存数据库
            let mut config = config.clone();
            config.path = Some(":memory:".to_string());
            let mut store = SQLiteVectorStore::new();
            store.initialize(&config)?;
            return Ok(Arc::new(store));
        }
    };
    
    // 初始化存储
    store.initialize(&config)?;
    
    info!("成功创建向量存储：{:?}", store_type);
    Ok(Arc::new(store))
}

/// 从配置创建向量存储
pub fn from_config(config: &HashMap<String, Value>) -> Result<Arc<dyn VectorStore>> {
    let store_type = config.get("type")
        .and_then(|v| v.as_str())
        .ok_or_else(|| anyhow!("缺少向量存储类型配置"))?;
    
    let dimensions = config.get("dimensions")
        .and_then(|v| v.as_u64())
        .ok_or_else(|| anyhow!("缺少向量维度配置"))?;
    
    let distance_metric = config.get("distance_metric")
        .and_then(|v| v.as_str())
        .unwrap_or("cosine");
    
    let distance_metric = match distance_metric {
        "euclidean" => super::DistanceMetric::Euclidean,
        "cosine" => super::DistanceMetric::Cosine,
        "dot_product" => super::DistanceMetric::DotProduct,
        "hamming" => super::DistanceMetric::Hamming,
        "manhattan" => super::DistanceMetric::Manhattan,
        _ => return Err(anyhow!("未知的距离度量方法: {}", distance_metric)),
    };
    
    let index_type = config.get("index_type")
        .and_then(|v| v.as_str())
        .unwrap_or("flat");
    
    let index_type = match index_type {
        "flat" => super::IndexType::Flat,
        "hnsw" => super::IndexType::HNSW,
        "ivf" => super::IndexType::IVF,
        "pq" => super::IndexType::PQ,
        "sq" => super::IndexType::SQ,
        _ => return Err(anyhow!("未知的索引类型: {}", index_type)),
    };
    
    let table_name = config.get("table_name")
        .and_then(|v| v.as_str())
        .unwrap_or("vectors")
        .to_string();
    
    let path = config.get("path")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());
    
    // 提取索引参数和额外配置
    let mut index_params = HashMap::new();
    let mut extra = HashMap::new();
    
    if let Some(params) = config.get("index_params").and_then(|v| v.as_object()) {
        for (k, v) in params {
            index_params.insert(k.clone(), v.clone());
        }
    }
    
    if let Some(ex) = config.get("extra").and_then(|v| v.as_object()) {
        for (k, v) in ex {
            extra.insert(k.clone(), v.clone());
        }
    }
    
    let vector_config = VectorStoreConfig {
        dimensions: dimensions as usize,
        distance_metric,
        index_type,
        index_params,
        path,
        table_name,
        extra,
    };
    
    create_vector_store(store_type, vector_config)
} 