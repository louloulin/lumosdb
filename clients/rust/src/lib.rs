use std::sync::Arc;

// 导出子模块
mod api_client;
mod db_client;
mod health_client;
mod vector_client;
mod error;
mod types;

// 重新导出常用类型
pub use error::{Error, LumosError, Result};
pub use types::{VectorMatch, VectorSearchResult, VectorSearchOptions};

// 客户端接口 - 用于不公开内部API客户端
pub struct LumosDbClient {
    /// API客户端
    api_client: Arc<api_client::ApiClient>,
}

impl LumosDbClient {
    /// 创建新的LumosDB客户端
    pub fn new(base_url: &str) -> Self {
        let api_client = Arc::new(api_client::ApiClient::new(base_url));
        Self { api_client }
    }

    /// 设置API密钥
    pub fn with_api_key(self, api_key: &str) -> Self {
        let api_client = Arc::new(self.api_client.with_api_key(api_key));
        Self { api_client }
    }

    /// 获取数据库客户端
    pub fn db(&self) -> db_client::DbClient {
        db_client::DbClient::new(self.api_client.clone())
    }

    /// 获取向量客户端
    pub fn vector(&self, collection: &str) -> vector_client::VectorClient {
        vector_client::VectorClient::new(self.api_client.clone(), collection.to_string())
    }

    /// 获取健康检查客户端
    pub fn health(&self) -> health_client::HealthClient {
        health_client::HealthClient::new(self.api_client.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_client_creation() {
        let client = LumosDbClient::new("http://localhost:8000");
        assert!(client.api_client.base_url().contains("http://localhost:8000"));
    }

    #[test]
    fn test_client_with_api_key() {
        let client = LumosDbClient::new("http://localhost:8000").with_api_key("test-key");
        assert!(client.api_client.base_url().contains("http://localhost:8000"));
        // API密钥内部保存，无法直接断言
    }

    #[test]
    fn it_works() {
        assert_eq!(2 + 2, 4);
    }
} 