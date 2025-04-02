use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// 向量匹配
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VectorMatch {
    /// 文档ID
    pub id: String,
    /// 相似度分数
    pub score: f32,
    /// 元数据
    #[serde(default)]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
}

/// 向量检索选项
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct VectorSearchOptions {
    /// 返回的结果数量
    #[serde(skip_serializing_if = "Option::is_none")]
    pub top_k: Option<u32>,
    /// 相似度阈值
    #[serde(skip_serializing_if = "Option::is_none")]
    pub score_threshold: Option<f32>,
    /// 过滤器
    #[serde(skip_serializing_if = "Option::is_none")]
    pub filter: Option<HashMap<String, serde_json::Value>>,
    /// 命名空间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub namespace: Option<String>,
}

impl Default for VectorSearchOptions {
    fn default() -> Self {
        Self {
            top_k: Some(10),
            score_threshold: None,
            filter: None,
            namespace: None,
        }
    }
}

/// 向量检索请求
#[derive(Debug, Serialize, Deserialize)]
pub struct VectorSearchRequest {
    /// 向量数据
    pub vector: Vec<f32>,
    /// 检索选项
    #[serde(flatten)]
    pub options: VectorSearchOptions,
}

/// 向量检索响应
#[derive(Debug, Serialize, Deserialize)]
pub struct VectorSearchResponse {
    /// 匹配结果
    pub matches: Vec<VectorMatch>,
}

/// 向量插入请求
#[derive(Debug, Serialize, Deserialize)]
pub struct VectorInsertRequest {
    /// 文档ID
    pub id: String,
    /// 向量数据
    pub vector: Vec<f32>,
    /// 元数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
    /// 命名空间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub namespace: Option<String>,
}

/// 向量更新请求
#[derive(Debug, Serialize, Deserialize)]
pub struct VectorUpdateRequest {
    /// 文档ID
    pub id: String,
    /// 向量数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub vector: Option<Vec<f32>>,
    /// 元数据
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, serde_json::Value>>,
    /// 命名空间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub namespace: Option<String>,
}

/// 向量删除请求
#[derive(Debug, Serialize, Deserialize)]
pub struct VectorDeleteRequest {
    /// 文档ID
    pub id: String,
    /// 命名空间
    #[serde(skip_serializing_if = "Option::is_none")]
    pub namespace: Option<String>,
}

/// API响应
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    /// 响应数据
    #[serde(default)]
    pub data: Option<T>,
    /// 错误信息
    #[serde(default)]
    pub error: Option<String>,
    /// 错误代码
    #[serde(default)]
    pub error_code: Option<String>,
}

/// 健康检查响应
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    /// 服务状态
    pub status: String,
    /// 版本信息
    pub version: String,
} 