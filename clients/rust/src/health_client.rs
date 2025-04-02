use crate::error::Result;
use crate::api_client::ApiClient;
use std::sync::Arc;
use serde::{Deserialize, Serialize};

/// 健康检查客户端，用于检查服务器状态
pub struct HealthClient {
    api_client: Arc<ApiClient>,
}

/// 健康状态响应
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthResponse {
    /// 服务状态
    pub status: String,
    /// 服务版本
    pub version: String,
}

impl HealthClient {
    /// 创建新的健康检查客户端
    pub fn new(api_client: Arc<ApiClient>) -> Self {
        Self { api_client }
    }

    /// 执行健康检查
    pub async fn check(&self) -> Result<HealthResponse> {
        let path = "/api/health";
        
        let response: serde_json::Value = self.api_client.get(path).await?;
        
        if let Some(data) = response.get("data") {
            let health_status: HealthResponse = serde_json::from_value(data.clone())
                .map_err(|e| crate::error::Error::ParseError(e.to_string()))?;
            return Ok(health_status);
        }
        
        Err(crate::error::Error::ParseError("无法解析健康状态".to_string()))
    }
} 