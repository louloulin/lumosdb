use std::sync::Arc;

use crate::api_client::ApiClient;
use crate::error::Result;
use crate::types::{ApiResponse, HealthResponse};

/// 健康检查客户端
pub struct HealthClient {
    /// API客户端
    api_client: Arc<ApiClient>,
}

impl HealthClient {
    /// 创建新的健康检查客户端
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        Self { api_client }
    }

    /// 获取服务健康状态
    pub async fn check(&self) -> Result<HealthResponse> {
        let response: ApiResponse<HealthResponse> = self.api_client.get("/health").await?;
        
        match response.data {
            Some(health) => Ok(health),
            None => Err(crate::error::Error::ApiError(
                response.error_code.unwrap_or_else(|| "unknown".to_string()),
                response.error.unwrap_or_else(|| "Failed to check health".to_string()),
            )),
        }
    }
} 