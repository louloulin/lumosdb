use thiserror::Error;

/// 结果类型别名
pub type Result<T> = std::result::Result<T, Error>;

/// LumosDB客户端错误
#[derive(Error, Debug)]
pub enum Error {
    /// API错误
    #[error("API错误 {0}: {1}")]
    ApiError(String, String),
    
    /// 网络请求错误
    #[error("网络请求失败: {0}")]
    RequestError(#[from] reqwest::Error),
    
    /// URL解析错误
    #[error("URL解析失败: {0}")]
    UrlParseError(#[from] url::ParseError),
    
    /// JSON序列化/反序列化错误
    #[error("JSON处理失败: {0}")]
    JsonError(#[from] serde_json::Error),
    
    /// 意外的API响应
    #[error("意外的API响应: {0}")]
    UnexpectedResponse(String),
    
    /// 无效的参数
    #[error("无效的参数: {0}")]
    InvalidArgument(String),
    
    /// 其他错误
    #[error("其他错误: {0}")]
    Other(String),
} 