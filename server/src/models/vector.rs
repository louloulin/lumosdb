use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// 表示一个向量集合
#[derive(Debug, Serialize, Deserialize)]
pub struct Collection {
    /// 集合名称
    pub name: String,
    /// 向量维度
    pub dimension: usize,
}

/// 表示一个向量嵌入
#[derive(Debug, Serialize, Deserialize)]
pub struct Embedding {
    /// 唯一标识符
    pub id: String,
    /// 向量数据
    pub vector: Vec<f32>,
    /// 可选的元数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// 创建集合的请求
#[derive(Debug, Deserialize)]
pub struct CreateCollectionRequest {
    /// 集合名称
    pub name: String,
    /// 向量维度
    pub dimension: usize,
}

/// 添加嵌入向量的请求
#[derive(Debug, Deserialize)]
pub struct AddEmbeddingsRequest {
    /// 嵌入向量列表
    pub embeddings: Vec<Embedding>,
}

/// 相似度搜索请求
#[derive(Debug, Deserialize)]
pub struct SearchRequest {
    /// 查询向量
    pub vector: Vec<f32>,
    /// 返回结果的数量
    pub top_k: usize,
    /// 可选的过滤条件
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter: Option<HashMap<String, serde_json::Value>>,
    /// 是否包含向量数据在结果中
    #[serde(default)]
    pub include_value: bool,
}

/// 相似度搜索结果
#[derive(Debug, Serialize)]
pub struct SearchResult {
    /// 嵌入ID
    pub id: String,
    /// 相似度分数
    pub score: f32,
    /// 可选的向量数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vector: Option<Vec<f32>>,
    /// 可选的元数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// 添加嵌入的响应
#[derive(Debug, Serialize)]
pub struct AddEmbeddingsResponse {
    /// 集合名称
    pub collection: String,
    /// 添加的嵌入数量
    pub added: usize,
    /// 操作是否成功
    pub success: bool,
}

/// 搜索响应
#[derive(Debug, Serialize)]
pub struct SearchResponse {
    /// 集合名称
    pub collection: String,
    /// 搜索结果
    pub results: Vec<SearchResult>,
    /// 结果数量
    pub count: usize,
}

/// 创建集合的响应
#[derive(Debug, Serialize)]
pub struct CreateCollectionResponse {
    /// 集合名称
    pub name: String,
    /// 向量维度
    pub dimension: usize,
    /// 创建是否成功
    pub created: bool,
}

/// 列出集合的响应
#[derive(Debug, Serialize)]
pub struct ListCollectionsResponse {
    /// 集合列表
    pub collections: Vec<Collection>,
} 