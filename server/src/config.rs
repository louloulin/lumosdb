pub struct AppConfig {
    pub host: String,
    pub port: u16,
    pub db_path: String,
    pub log_level: String,
    // 向量存储配置
    pub vector_base_path: String,
    pub vector_cache_size: usize,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 8080,
            db_path: "lumos.db".to_string(),
            log_level: "info".to_string(),
            vector_base_path: "vector_store".to_string(),
            vector_cache_size: 100,
        }
    }
}

impl AppConfig {
    // ... existing code ...
} 