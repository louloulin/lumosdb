use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// API错误信息
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiError {
    /// 错误代码
    pub code: String,
    /// 错误消息
    pub message: String,
}

impl ApiError {
    /// 创建新的API错误
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
        }
    }
}

/// API响应包装
#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    /// 操作是否成功
    pub success: bool,
    /// 响应数据（成功时）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    /// 错误信息（失败时）
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<ApiError>,
}

impl<T> ApiResponse<T> {
    /// 创建成功响应
    pub fn success(data: T) -> Self {
        Self {
            success: true,
            data: Some(data),
            error: None,
        }
    }
    
    /// 创建错误响应
    pub fn error(error: impl Into<ApiError>) -> Self {
        Self {
            success: false,
            data: None,
            error: Some(error.into()),
        }
    }
}

// 允许将字符串转换为ApiError
impl<'a> From<&'a str> for ApiError {
    fn from(s: &'a str) -> Self {
        Self {
            code: "ERROR".to_string(),
            message: s.to_string(),
        }
    }
}

// 允许将字符串转换为ApiError
impl From<String> for ApiError {
    fn from(s: String) -> Self {
        Self {
            code: "ERROR".to_string(),
            message: s,
        }
    }
}

// 允许将元组转换为ApiError
impl<S1: Into<String>, S2: Into<String>> From<(S1, S2)> for ApiError {
    fn from(tuple: (S1, S2)) -> Self {
        Self {
            code: tuple.0.into(),
            message: tuple.1.into(),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub timestamp: u64,
}

impl HealthResponse {
    pub fn new() -> Self {
        Self {
            status: "ok".to_string(),
            version: env!("CARGO_PKG_VERSION").to_string(),
            timestamp: current_timestamp(),
        }
    }
}

fn current_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
} 