use serde::de::DeserializeOwned;
use std::sync::Arc;

use crate::api_client::ApiClient;
use crate::error::Result;
use crate::types::ApiResponse;

/// 数据库客户端
pub struct DbClient {
    /// API客户端
    api_client: Arc<ApiClient>,
}

impl DbClient {
    /// 创建新的数据库客户端
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        Self { api_client }
    }

    /// 列出所有集合
    pub async fn list_collections(&self) -> Result<Vec<String>> {
        let response: ApiResponse<Vec<String>> = self.api_client.get("/collections").await?;
        
        match response.data {
            Some(collections) => Ok(collections),
            None => Err(crate::error::Error::ApiError(
                response.error_code.unwrap_or_else(|| "unknown".to_string()),
                response.error.unwrap_or_else(|| "Failed to list collections".to_string()),
            )),
        }
    }

    /// 创建新集合
    pub async fn create_collection(&self, name: &str, dimension: u32) -> Result<()> {
        let data = serde_json::json!({
            "name": name,
            "dimension": dimension
        });
        
        let response: ApiResponse<()> = self.api_client.post("/collections", &data).await?;
        
        if response.error.is_some() {
            return Err(crate::error::Error::ApiError(
                response.error_code.unwrap_or_else(|| "unknown".to_string()),
                response.error.unwrap_or_else(|| "Failed to create collection".to_string()),
            ));
        }
        
        Ok(())
    }

    /// 删除集合
    pub async fn delete_collection(&self, name: &str) -> Result<()> {
        let path = format!("/collections/{}", name);
        let response: ApiResponse<()> = self.api_client.delete(&path).await?;
        
        if response.error.is_some() {
            return Err(crate::error::Error::ApiError(
                response.error_code.unwrap_or_else(|| "unknown".to_string()),
                response.error.unwrap_or_else(|| "Failed to delete collection".to_string()),
            ));
        }
        
        Ok(())
    }

    /// 获取集合信息
    pub async fn get_collection<T>(&self, name: &str) -> Result<T>
    where
        T: DeserializeOwned,
    {
        let path = format!("/collections/{}", name);
        let response: ApiResponse<T> = self.api_client.get(&path).await?;
        
        match response.data {
            Some(collection) => Ok(collection),
            None => Err(crate::error::Error::ApiError(
                response.error_code.unwrap_or_else(|| "unknown".to_string()),
                response.error.unwrap_or_else(|| "Collection not found".to_string()),
            )),
        }
    }
}