use config::{Config, ConfigError, Environment, File};
use serde::Deserialize;
use std::env;
use std::path::PathBuf;

#[derive(Debug, Clone, Deserialize)]
pub struct ServerConfig {
    pub host: String,
    pub port: u16,
    pub workers: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct DatabaseConfig {
    pub path: String,
    pub pool_size: usize,
}

#[derive(Debug, Clone, Deserialize)]
pub struct LogConfig {
    pub level: String,
    pub format: String,
}

#[derive(Debug, Clone, Deserialize)]
pub struct AppConfig {
    pub server: ServerConfig,
    pub database: DatabaseConfig,
    pub log: LogConfig,
}

impl ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8080,
            workers: num_cpus::get(),
        }
    }
}

impl DatabaseConfig {
    fn default() -> Self {
        Self {
            path: "lumos.db".to_string(),
            pool_size: 10,
        }
    }
}

impl LogConfig {
    fn default() -> Self {
        Self {
            level: "info".to_string(),
            format: "json".to_string(),
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            server: ServerConfig::default(),
            database: DatabaseConfig::default(),
            log: LogConfig::default(),
        }
    }
}

impl AppConfig {
    pub fn from_env() -> Result<Self, ConfigError> {
        let config_dir = env::var("CONFIG_DIR").unwrap_or_else(|_| "./config".to_string());
        let env = env::var("RUN_ENV").unwrap_or_else(|_| "development".to_string());
        let config_path = PathBuf::from(&config_dir).join(format!("{}.toml", env));

        let mut builder = Config::builder();

        // 1. 默认值
        builder = builder.add_source(config::File::from_str(
            r#"
            [server]
            host = "127.0.0.1"
            port = 8080
            workers = 0
            
            [database]
            path = "lumos.db"
            pool_size = 10
            
            [log]
            level = "info"
            format = "json"
            "#,
            config::FileFormat::Toml,
        ));

        // 2. 配置文件 (如果存在)
        if config_path.exists() {
            builder = builder.add_source(File::from(config_path));
        }

        // 3. 环境变量 (以 "LUMOS_" 为前缀)
        builder = builder.add_source(Environment::with_prefix("LUMOS").separator("__"));

        // 构建配置并反序列化
        let config = builder.build()?;
        let app_config = config.try_deserialize::<AppConfig>()?;
        
        Ok(app_config)
    }
} 