use crate::error::LumosError;
use crate::types::{TableInfo, ColumnInfo};
use reqwest::Client as HttpClient;
use serde_json::Value;

/// 数据库客户端，负责管理集合和执行SQL查询
pub struct DbClient {
    http_client: HttpClient,
    base_url: String,
}

impl DbClient {
    /// 创建新的数据库客户端
    ///
    /// # 参数
    /// * `http_client` - HTTP客户端
    /// * `base_url` - LumosDB服务器的基础URL
    pub fn new(http_client: HttpClient, base_url: String) -> Self {
        Self {
            http_client,
            base_url,
        }
    }

    /// 获取所有集合列表
    pub async fn list_collections(&self) -> Result<Vec<String>, LumosError> {
        let url = format!("{}/api/vector/collections", self.base_url);
        
        let response = self.http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| LumosError::NetworkError(e.to_string()))?;
            
        if !response.status().is_success() {
            return Err(LumosError::ApiError(format!(
                "Failed to list collections: HTTP {}", 
                response.status()
            )));
        }
        
        let result: Value = response
            .json()
            .await
            .map_err(|e| LumosError::ParseError(e.to_string()))?;
            
        // 提取集合名称列表
        match result.get("collections") {
            Some(collections) => {
                let names = collections
                    .as_array()
                    .ok_or_else(|| LumosError::ParseError("Expected collections array".to_string()))?
                    .iter()
                    .filter_map(|c| c.get("name")?.as_str().map(String::from))
                    .collect();
                Ok(names)
            },
            None => Err(LumosError::ParseError("Missing collections field".to_string())),
        }
    }

    /// 创建新的向量集合
    ///
    /// # 参数
    /// * `name` - 集合名称
    /// * `dimension` - 向量维度
    pub async fn create_collection(&self, name: &str, dimension: usize) -> Result<(), LumosError> {
        let url = format!("{}/api/vector/collections", self.base_url);
        
        let body = serde_json::json!({
            "name": name,
            "dimension": dimension,
            "distance": "euclidean" // 使用默认距离度量
        });
        
        let response = self.http_client
            .post(&url)
            .json(&body)
            .send()
            .await
            .map_err(|e| LumosError::NetworkError(e.to_string()))?;
            
        if !response.status().is_success() {
            return Err(LumosError::ApiError(format!(
                "Failed to create collection: HTTP {}",
                response.status()
            )));
        }
        
        Ok(())
    }

    /// 删除向量集合
    ///
    /// # 参数
    /// * `name` - 集合名称
    pub async fn delete_collection(&self, name: &str) -> Result<(), LumosError> {
        let url = format!("{}/api/vector/collections/{}", self.base_url, name);
        
        let response = self.http_client
            .delete(&url)
            .send()
            .await
            .map_err(|e| LumosError::NetworkError(e.to_string()))?;
            
        if !response.status().is_success() {
            return Err(LumosError::ApiError(format!(
                "Failed to delete collection: HTTP {}",
                response.status()
            )));
        }
        
        Ok(())
    }
}