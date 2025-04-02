use crate::db::DbClient;
use crate::health::HealthClient;
use crate::vector::VectorClient;
use reqwest::Client as HttpClient;
use std::time::Duration;

/// 主LumosDB客户端，负责与服务器交互
pub struct LumosDbClient {
    http_client: HttpClient,
    base_url: String,
}

impl LumosDbClient {
    /// 创建新的LumosDB客户端
    ///
    /// # 参数
    /// * `base_url` - LumosDB服务器的基础URL，例如 "http://localhost:8080"
    pub fn new(base_url: &str) -> Self {
        let http_client = HttpClient::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");

        Self {
            http_client,
            base_url: base_url.trim_end_matches('/').to_string(),
        }
    }

    /// 创建新的LumosDB客户端，使用自定义配置的HTTP客户端
    ///
    /// # 参数
    /// * `base_url` - LumosDB服务器的基础URL，例如 "http://localhost:8080"
    /// * `http_client` - 预先配置的HTTP客户端
    pub fn new_with_client(base_url: &str, http_client: HttpClient) -> Self {
        Self {
            http_client,
            base_url: base_url.trim_end_matches('/').to_string(),
        }
    }

    /// 获取数据库客户端，用于管理集合和执行SQL查询
    pub fn db(&self) -> DbClient {
        DbClient::new(self.http_client.clone(), self.base_url.clone())
    }

    /// 获取健康检查客户端，用于检查服务器状态
    pub fn health(&self) -> HealthClient {
        HealthClient::new(self.http_client.clone(), self.base_url.clone())
    }

    /// 获取向量客户端，用于管理向量集合中的向量
    ///
    /// # 参数
    /// * `collection` - 向量集合名称
    pub fn vector(&self, collection: &str) -> VectorClient {
        VectorClient::new(
            self.http_client.clone(),
            self.base_url.clone(),
            collection.to_string(),
        )
    }
} 