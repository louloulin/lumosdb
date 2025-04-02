use crate::error::LumosError;
use reqwest::Client as HttpClient;
use serde::{Deserialize, Serialize};

/// 健康检查客户端，用于检查服务器状态
pub struct HealthClient {
    http_client: HttpClient,
    base_url: String,
}

/// 健康状态响应
#[derive(Debug, Serialize, Deserialize)]
pub struct HealthStatus {
    /// 服务状态
    pub status: String,
    /// 服务版本
    pub version: String,
    /// 服务启动时间（秒）
    pub uptime: u64,
    /// CPU使用率
    pub cpu_usage: f64,
    /// 内存使用量（字节）
    pub memory_usage: u64,
    /// 当前连接数
    pub connections: u64,
}

impl HealthClient {
    /// 创建新的健康检查客户端
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

    /// 执行健康检查
    pub async fn check(&self) -> Result<HealthStatus, LumosError> {
        let url = format!("{}/api/health", self.base_url);
        
        let response = self.http_client
            .get(&url)
            .send()
            .await
            .map_err(|e| LumosError::NetworkError(e.to_string()))?;
            
        if !response.status().is_success() {
            return Err(LumosError::ApiError(format!(
                "Health check failed: HTTP {}", 
                response.status()
            )));
        }
        
        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| LumosError::ParseError(e.to_string()))?;
            
        match result.get("data") {
            Some(data) => {
                let health_status: HealthStatus = serde_json::from_value(data.clone())
                    .map_err(|e| LumosError::ParseError(e.to_string()))?;
                Ok(health_status)
            },
            None => Err(LumosError::ParseError("Missing health data".to_string())),
        }
    }
} 