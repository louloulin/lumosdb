use crate::error::{Error, Result};
use crate::api_client::ApiClient;
use std::sync::Arc;
use serde::{Serialize, Deserialize};

/// 数据库客户端，负责管理集合和执行SQL查询
pub struct DbClient {
    api_client: Arc<ApiClient>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CollectionsResponse {
    collections: Vec<CollectionInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
struct CollectionInfo {
    name: String,
    dimension: usize,
    distance: String,
}

impl DbClient {
    /// 创建新的数据库客户端
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        Self { api_client }
    }

    /// 获取所有集合列表
    pub async fn list_collections(&self) -> Result<Vec<String>> {
        let path = "/api/vector/collections";
        
        let response: serde_json::Value = self.api_client.get(path).await?;
        
        // 提取集合名称列表
        if let Some(data) = response.get("data") {
            if let Some(collections) = data.get("collections") {
                if let Some(collections_array) = collections.as_array() {
                    let names = collections_array
                        .iter()
                        .filter_map(|c| c.get("name")?.as_str().map(String::from))
                        .collect();
                    return Ok(names);
                }
            }
        }
        
        Err(Error::ParseError("无法解析集合列表".to_string()))
    }

    /// 创建新的向量集合
    ///
    /// # 参数
    /// * `name` - 集合名称
    /// * `dimension` - 向量维度
    pub async fn create_collection(&self, name: &str, dimension: usize) -> Result<()> {
        let path = "/api/vector/collections";
        
        let body = serde_json::json!({
            "name": name,
            "dimension": dimension,
            "distance": "euclidean" // 使用默认距离度量
        });
        
        let _: serde_json::Value = self.api_client.post(path, &body).await?;
        Ok(())
    }

    /// 删除向量集合
    ///
    /// # 参数
    /// * `name` - 集合名称
    pub async fn delete_collection(&self, name: &str) -> Result<()> {
        let path = format!("/api/vector/collections/{}", name);
        
        let _: serde_json::Value = self.api_client.delete(&path).await?;
        Ok(())
    }
}