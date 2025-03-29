use std::env;
use log::info;

/// 服务器配置
#[derive(Debug, Clone)]
pub struct ServerConfig {
    /// 服务器主机地址
    pub host: String,
    /// 服务器端口
    pub port: u16,
    /// 数据库路径
    pub db_path: String,
    /// 向量数据库路径
    pub vector_db_path: String,
    /// API密钥
    pub api_key: Option<String>,
    /// 日志级别
    pub log_level: String,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8080,
            db_path: "lumos.db".to_string(),
            vector_db_path: "lumos_vector.db".to_string(),
            api_key: None,
            log_level: "info".to_string(),
        }
    }
}

impl ServerConfig {
    /// 从环境变量加载配置
    pub fn from_env() -> Self {
        // 尝试加载.env文件（如果存在）
        let _ = dotenv::dotenv();
        
        let host = env::var("LUMOS_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
        let port = env::var("LUMOS_PORT")
            .ok()
            .and_then(|p| p.parse::<u16>().ok())
            .unwrap_or(8080);
        
        let db_path = env::var("LUMOS_DB_PATH").unwrap_or_else(|_| "lumos.db".to_string());
        let vector_db_path = env::var("LUMOS_VECTOR_DB_PATH").unwrap_or_else(|_| "lumos_vector.db".to_string());
        
        let api_key = env::var("LUMOS_API_KEY").ok();
        let log_level = env::var("LUMOS_LOG_LEVEL").unwrap_or_else(|_| "info".to_string());
        
        info!("Loaded configuration from environment");
        
        Self {
            host,
            port,
            db_path,
            vector_db_path,
            api_key,
            log_level,
        }
    }
    
    /// 设置数据库路径
    pub fn with_db_path(mut self, path: impl Into<String>) -> Self {
        self.db_path = path.into();
        self
    }
    
    /// 设置向量数据库路径
    pub fn with_vector_db_path(mut self, path: impl Into<String>) -> Self {
        self.vector_db_path = path.into();
        self
    }
    
    /// 设置API密钥
    pub fn with_api_key(mut self, key: impl Into<String>) -> Self {
        self.api_key = Some(key.into());
        self
    }
    
    /// 设置主机地址
    pub fn with_host(mut self, host: impl Into<String>) -> Self {
        self.host = host.into();
        self
    }
    
    /// 设置端口
    pub fn with_port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }
} 