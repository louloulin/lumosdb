use serde::de::DeserializeOwned;
use std::sync::Arc;

use crate::api_client::ApiClient;
use crate::error::Result;
use crate::types::{
    ApiResponse, VectorDeleteRequest, VectorInsertRequest, VectorSearchOptions, VectorSearchRequest,
    VectorSearchResponse, VectorUpdateRequest, VectorSearchResult,
};

/// 向量客户端
pub struct VectorClient {
    /// API客户端
    api_client: Arc<ApiClient>,
    /// 集合名称
    collection: String,
}

impl VectorClient {
    /// 创建新的向量客户端
    pub fn new(api_client: Arc<ApiClient>, collection: String) -> Self {
        Self {
            api_client,
            collection,
        }
    }

    /// 构建向量请求路径
    fn build_vector_path(&self, endpoint: &str) -> String {
        format!("/api/vector/collections/{}/{}", self.collection, endpoint)
    }

    /// 向量搜索
    pub async fn search(&self, vector: Vec<f32>, options: Option<VectorSearchOptions>) -> Result<VectorSearchResult> {
        let options = options.unwrap_or_default();
        let request = VectorSearchRequest {
            vector,
            options,
        };
        
        let path = format!("/api/vector/collections/{}/search", self.collection);
        let response: serde_json::Value = self.api_client.post(&path, &request).await?;
        
        if let Some(data) = response.get("data") {
            let result: VectorSearchResult = serde_json::from_value(data.clone())
                .map_err(|e| crate::error::Error::ParseError(e.to_string()))?;
            Ok(result)
        } else {
            Err(crate::error::Error::ParseError("无法解析搜索结果".to_string()))
        }
    }

    /// 向量插入
    pub async fn insert(
        &self,
        id: String,
        vector: Vec<f32>,
        metadata: Option<std::collections::HashMap<String, serde_json::Value>>,
        namespace: Option<String>,
    ) -> Result<()> {
        let request = VectorInsertRequest {
            id,
            vector,
            metadata,
            namespace,
        };
        
        let path = format!("/api/vector/collections/{}/vectors", self.collection);
        let _: serde_json::Value = self.api_client.post(&path, &request).await?;
        Ok(())
    }

    /// 向量更新
    pub async fn update(
        &self,
        id: String,
        vector: Option<Vec<f32>>,
        metadata: Option<std::collections::HashMap<String, serde_json::Value>>,
        namespace: Option<String>,
    ) -> Result<()> {
        let request = VectorUpdateRequest {
            id: id.clone(),
            vector,
            metadata,
            namespace,
        };
        
        let path = format!("/api/vector/collections/{}/vectors/{}", self.collection, id);
        let _: serde_json::Value = self.api_client.put(&path, &request).await?;
        Ok(())
    }

    /// 向量删除
    pub async fn delete(&self, id: String, namespace: Option<String>) -> Result<()> {
        let path = format!("/api/vector/collections/{}/vectors/{}", self.collection, id);
        let _: serde_json::Value = self.api_client.delete(&path).await?;
        Ok(())
    }
} 