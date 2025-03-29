pub mod executor;
pub mod vector_executor;
pub mod cached_executor;

pub use executor::DbExecutor;
pub use vector_executor::VectorExecutor;
pub use cached_executor::CachedDbExecutor;

// 将来可能添加其他数据库相关模块，如连接池等 

// Extension trait for actix_web::web::Data<Arc<DbExecutor>>
#[cfg(feature = "web")]
pub mod extensions {
    use std::sync::Arc;
    use actix_web::web;
    use crate::models::db::ColumnInfo;
    use super::DbExecutor;
    
    // Extension trait to simplify working with DbExecutor through web::Data
    pub trait DbExecutorExtension {
        fn query(&self, sql: String) -> Result<Vec<serde_json::Value>, String>;
        fn execute_sql(&self, sql: String) -> Result<usize, String>;
        fn get_tables(&self) -> Result<Vec<String>, String>;
        fn get_table_info(&self, table_name: &str) -> Result<Vec<ColumnInfo>, String>;
    }
    
    // Implement extension methods for web::Data<Arc<DbExecutor>>
    impl DbExecutorExtension for web::Data<Arc<DbExecutor>> {
        fn query(&self, sql: String) -> Result<Vec<serde_json::Value>, String> {
            self.get_ref().query(&sql).map_err(|e| e.to_string())
        }
        
        fn execute_sql(&self, sql: String) -> Result<usize, String> {
            self.get_ref().execute_sql(&sql).map_err(|e| e.to_string())
        }
        
        fn get_tables(&self) -> Result<Vec<String>, String> {
            self.get_ref().get_tables().map_err(|e| e.to_string())
        }
        
        fn get_table_info(&self, table_name: &str) -> Result<Vec<ColumnInfo>, String> {
            self.get_ref().get_table_info(table_name).map_err(|e| e.to_string())
        }
    }
}

// Re-export extensions if web feature is enabled
#[cfg(feature = "web")]
pub use extensions::DbExecutorExtension; 