use std::path::Path;
use std::sync::Arc;
use lumos_core::LumosError;
use lumos_core::sqlite::connection::RowData;

use crate::db::executor::DbExecutor;
use crate::models::db::{TableInfo, ColumnInfo};

/// 带缓存的数据库执行器，为查询提供缓存支持
/// 注意：当前为简化实现，缓存功能暂未实现
pub struct CachedDbExecutor {
    /// 底层数据库执行器
    executor: Arc<DbExecutor>,
}

impl CachedDbExecutor {
    /// 创建新的缓存数据库执行器
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, LumosError> {
        let executor = Arc::new(DbExecutor::new(path)?);
        
        Ok(Self {
            executor,
        })
    }
    
    /// 执行查询并返回结果
    pub fn execute_query(&self, sql: &str, params: &[String]) -> Result<Vec<RowData>, LumosError> {
        self.executor.execute_query(sql, params)
    }
    
    /// 执行SQL语句并返回影响的行数
    pub fn execute(&self, sql: &str, params: &[String]) -> Result<usize, LumosError> {
        self.executor.execute(sql, params)
    }
    
    /// 获取所有表名
    pub fn list_tables(&self) -> Result<Vec<TableInfo>, LumosError> {
        self.executor.list_tables()
    }
    
    /// 获取表结构
    pub fn get_table_schema(&self, table_name: &str) -> Result<Vec<ColumnInfo>, LumosError> {
        self.executor.get_table_schema(table_name)
    }
} 