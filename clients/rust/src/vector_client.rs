use std::sync::Arc;
use std::collections::HashMap;

use crate::api_client::ApiClient;
use crate::error::{Error, Result};
use crate::types::{
    VectorInsertRequest, VectorSearchOptions, VectorSearchRequest,
    VectorUpdateRequest, VectorSearchResult,
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
            // 解析搜索结果
            if let Some(results) = data.get("results") {
                if let Some(results_array) = results.as_array() {
                    let matches = results_array
                        .iter()
                        .map(|r| {
                            let id = r.get("id")
                                .and_then(|id| id.as_str())
                                .unwrap_or("")
                                .to_string();
                            
                            let score = r.get("score")
                                .and_then(|s| s.as_f64())
                                .unwrap_or(0.0) as f32;
                            
                            let metadata = r.get("metadata")
                                .map(|m| serde_json::from_value(m.clone()).unwrap_or_default());
                            
                            crate::types::VectorMatch {
                                id,
                                score,
                                metadata,
                            }
                        })
                        .collect();
                    
                    return Ok(VectorSearchResult { matches });
                }
            }
            
            return Err(Error::ParseError("无法解析搜索结果数组".to_string()));
        }
        
        Err(Error::ParseError("无法解析搜索结果".to_string()))
    }

    /// 向量插入
    pub async fn insert(
        &self,
        id: String,
        vector: Vec<f32>,
        metadata: Option<HashMap<String, serde_json::Value>>,
        namespace: Option<String>,
    ) -> Result<()> {
        // 构建批量插入格式的请求
        let request = serde_json::json!({
            "ids": [id],
            "embeddings": [vector],
            "metadata": metadata.map(|m| vec![m]).unwrap_or_default(),
            "namespace": namespace
        });
        
        let path = format!("/api/vector/collections/{}/vectors", self.collection);
        let response: serde_json::Value = self.api_client.post(&path, &request).await?;
        
        if let Some(data) = response.get("data") {
            if let Some(added) = data.get("added") {
                if added.as_u64().unwrap_or(0) > 0 {
                    return Ok(());
                }
            }
        }
        
        Err(Error::ParseError("插入向量失败".to_string()))
    }

    /// 向量更新
    pub async fn update(
        &self,
        id: String,
        vector: Option<Vec<f32>>,
        metadata: Option<HashMap<String, serde_json::Value>>,
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
    pub async fn delete(&self, id: String, _namespace: Option<String>) -> Result<()> {
        let path = format!("/api/vector/collections/{}/vectors/{}", self.collection, id);
        let _: serde_json::Value = self.api_client.delete(&path).await?;
        Ok(())
    }
}
