use actix_web::{HttpResponse, ResponseError};
use serde::{Serialize};
use thiserror::Error;
use std::fmt;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("数据库错误: {0}")]
    Database(String),
    
    #[error("无效参数: {0}")]
    InvalidArgument(String),
    
    #[error("未找到: {0}")]
    NotFound(String),
    
    #[error("内部服务器错误: {0}")]
    Internal(String),
    
    #[error("未授权: {0}")]
    Unauthorized(String),
}

// 从core库中的LumosError转换
impl From<lumos_core::LumosError> for AppError {
    fn from(err: lumos_core::LumosError) -> Self {
        match err {
            lumos_core::LumosError::Sqlite(e) => AppError::Database(e),
            lumos_core::LumosError::DuckDb(e) => AppError::Database(e),
            lumos_core::LumosError::Io(e) => AppError::Internal(e.to_string()),
            lumos_core::LumosError::InvalidArgument(e) => AppError::InvalidArgument(e),
            lumos_core::LumosError::Internal(e) => AppError::Internal(e),
            lumos_core::LumosError::NotFound(e) => AppError::NotFound(e),
            _ => AppError::Internal(format!("未知错误: {:?}", err)),
        }
    }
}

#[derive(Serialize)]
struct ErrorResponse {
    code: u16,
    message: String,
}

impl ResponseError for AppError {
    fn error_response(&self) -> HttpResponse {
        let status = self.status_code();
        
        let error_response = ErrorResponse {
            code: status.as_u16(),
            message: self.to_string(),
        };
        
        HttpResponse::build(status)
            .json(error_response)
    }
    
    fn status_code(&self) -> actix_web::http::StatusCode {
        use actix_web::http::StatusCode;
        
        match *self {
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::InvalidArgument(_) => StatusCode::BAD_REQUEST,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Unauthorized(_) => StatusCode::UNAUTHORIZED,
        }
    }
} 