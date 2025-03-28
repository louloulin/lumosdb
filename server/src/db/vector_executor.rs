use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use ndarray::{Array1, Array2};
use serde::{Serialize, Deserialize};
use log::{info, error, debug};

use lumos_core::LumosError;
use lumos_core::duckdb::DuckDbEngine;
use lumos_core::vector::{Embedding as LumosEmbedding, VectorStore, distance::DistanceMetric, index::{VectorIndex, IndexType}};

use crate::models::vector::{Embedding, SearchResult};

/// 向量执行器结构
pub struct VectorExecutor {
    base_path: String,
    // 内存中向量存储，实际项目中可能需要持久化
    collections: Arc<Mutex<HashMap<String, VectorCollection>>>,
}

/// 向量集合结构
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VectorCollection {
    pub name: String,
    pub dimension: usize,
    pub count: usize,
    pub ids: Vec<String>,
    pub embeddings: Vec<Vec<f32>>,
    pub metadata: HashMap<String, serde_json::Value>,
    pub indexed: bool,
    pub index_type: Option<String>,
}

/// 搜索结果结构
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub score: f32,
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

impl VectorExecutor {
    /// 创建新的向量执行器
    pub fn new<P: AsRef<Path>>(base_path: P) -> Result<Self, String> {
        let base_path = base_path.as_ref().to_string_lossy().to_string();
        let collections = Arc::new(Mutex::new(HashMap::new()));
        
        Ok(Self {
            base_path,
            collections,
        })
    }
    
    /// 创建新的向量集合
    pub fn create_collection(&self, name: &str, dimension: usize) -> Result<VectorCollection, String> {
        let mut collections = self.collections.lock().unwrap();
        
        if collections.contains_key(name) {
            return Err(format!("Collection '{}' already exists", name));
        }
        
        let collection = VectorCollection {
            name: name.to_string(),
            dimension,
            count: 0,
            ids: Vec::new(),
            embeddings: Vec::new(),
            metadata: HashMap::new(),
            indexed: false,
            index_type: None,
        };
        
        collections.insert(name.to_string(), collection.clone());
        info!("Created vector collection '{}' with dimension {}", name, dimension);
        
        Ok(collection)
    }
    
    /// 获取所有向量集合
    pub fn list_collections(&self) -> Result<Vec<VectorCollection>, String> {
        let collections = self.collections.lock().unwrap();
        
        Ok(collections.values().cloned().collect())
    }
    
    /// 添加向量嵌入
    pub fn add_embeddings(
        &self, 
        collection_name: &str, 
        ids: Vec<String>, 
        embeddings: Vec<Vec<f32>>,
        metadata: Option<Vec<HashMap<String, serde_json::Value>>>
    ) -> Result<usize, String> {
        let mut collections = self.collections.lock().unwrap();
        
        let collection = match collections.get_mut(collection_name) {
            Some(c) => c,
            None => return Err(format!("Collection '{}' not found", collection_name)),
        };
        
        // 验证维度
        for embedding in &embeddings {
            if embedding.len() != collection.dimension {
                return Err(format!(
                    "Embedding dimension mismatch. Expected {}, got {}", 
                    collection.dimension, 
                    embedding.len()
                ));
            }
        }
        
        // 添加向量和ID
        let count = ids.len();
        for i in 0..count {
            collection.ids.push(ids[i].clone());
            collection.embeddings.push(embeddings[i].clone());
            
            // 如果提供了元数据，也添加它
            if let Some(meta) = &metadata {
                if i < meta.len() {
                    collection.metadata.insert(ids[i].clone(), serde_json::to_value(&meta[i]).unwrap_or_default());
                }
            }
        }
        
        collection.count += count;
        collection.indexed = false;  // 添加新向量后需要重新构建索引
        
        info!("Added {} embeddings to collection '{}'", count, collection_name);
        
        Ok(count)
    }
    
    /// 搜索相似向量
    pub fn search_similar(
        &self, 
        collection_name: &str, 
        query_vector: Vec<f32>, 
        top_k: usize
    ) -> Result<Vec<SearchResult>, String> {
        let collections = self.collections.lock().unwrap();
        
        let collection = match collections.get(collection_name) {
            Some(c) => c,
            None => return Err(format!("Collection '{}' not found", collection_name)),
        };
        
        if query_vector.len() != collection.dimension {
            return Err(format!(
                "Query vector dimension mismatch. Expected {}, got {}", 
                collection.dimension, 
                query_vector.len()
            ));
        }
        
        if collection.count == 0 {
            return Ok(Vec::new());
        }
        
        // 转换为ndarray进行计算
        let query = Array1::from_vec(query_vector);
        
        // 计算余弦相似度
        let mut results = Vec::with_capacity(collection.count);
        for i in 0..collection.count {
            let embedding = Array1::from_vec(collection.embeddings[i].clone());
            
            // 计算余弦相似度: dot(a, b) / (|a| * |b|)
            let dot_product = query.dot(&embedding);
            let query_norm = query.dot(&query).sqrt();
            let embedding_norm = embedding.dot(&embedding).sqrt();
            
            let similarity = if query_norm > 0.0 && embedding_norm > 0.0 {
                dot_product / (query_norm * embedding_norm)
            } else {
                0.0
            };
            
            // 获取元数据
            let metadata = collection.metadata.get(&collection.ids[i])
                .map(|v| {
                    if let Ok(map) = serde_json::from_value::<HashMap<String, serde_json::Value>>(v.clone()) {
                        map
                    } else {
                        HashMap::new()
                    }
                });
            
            results.push(SearchResult {
                id: collection.ids[i].clone(),
                score: similarity,
                metadata,
            });
        }
        
        // 按相似度排序
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
        
        // 只返回前top_k个结果
        let results = if top_k < results.len() {
            results[0..top_k].to_vec()
        } else {
            results
        };
        
        debug!("Found {} similar vectors in collection '{}'", results.len(), collection_name);
        
        Ok(results)
    }
    
    /// 创建索引
    pub fn create_index(&self, collection_name: &str, index_type: &str) -> Result<(), String> {
        let mut collections = self.collections.lock().unwrap();
        
        let collection = match collections.get_mut(collection_name) {
            Some(c) => c,
            None => return Err(format!("Collection '{}' not found", collection_name)),
        };
        
        // 当前仅支持简单的索引类型
        if index_type != "flat" && index_type != "hnsw" {
            return Err(format!("Unsupported index type: {}", index_type));
        }
        
        // 在实际应用中，这里应该构建适当的索引结构
        // 简单起见，我们只标记索引已创建
        collection.indexed = true;
        collection.index_type = Some(index_type.to_string());
        
        info!("Created '{}' index for collection '{}'", index_type, collection_name);
        
        Ok(())
    }
} 