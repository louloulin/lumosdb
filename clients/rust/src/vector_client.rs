use serde::de::DeserializeOwned;
use std::sync::Arc;

use crate::api_client::ApiClient;
use crate::error::Result;
use crate::types::{
    ApiResponse, VectorDeleteRequest, VectorInsertRequest, VectorSearchOptions, VectorSearchRequest,
    VectorSearchResponse, VectorUpdateRequest,
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
        format!("/collections/{}/vectors/{}", self.collection, endpoint)
    }

    /// 发送向量请求并解析响应
    async fn send_vector_request<T, R>(&self, endpoint: &str, data: &T) -> Result<R>
    where
        T: serde::Serialize,
        R: DeserializeOwned,
    {
        let path = self.build_vector_path(endpoint);
        let response: ApiResponse<R> = self.api_client.post(&path, data).await?;
        
        match response.data {
            Some(data) => Ok(data),
            None => Err(crate::error::Error::ApiError(
                response.error_code.unwrap_or_else(|| "unknown".to_string()),
                response.error.unwrap_or_else(|| "Unknown error".to_string()),
            )),
        }
    }

    /// 向量搜索
    pub async fn search(&self, vector: Vec<f32>, options: Option<VectorSearchOptions>) -> Result<VectorSearchResponse> {
        let options = options.unwrap_or_default();
        let request = VectorSearchRequest {
            vector,
            options,
        };
        
        self.send_vector_request("search", &request).await
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
        
        let _: () = self.send_vector_request("", &request).await?;
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
            id,
            vector,
            metadata,
            namespace,
        };
        
        let _: () = self.send_vector_request("update", &request).await?;
        Ok(())
    }

    /// 向量删除
    pub async fn delete(&self, id: String, namespace: Option<String>) -> Result<()> {
        let request = VectorDeleteRequest {
            id,
            namespace,
        };
        
        let _: () = self.send_vector_request("delete", &request).await?;
        Ok(())
    }
} 