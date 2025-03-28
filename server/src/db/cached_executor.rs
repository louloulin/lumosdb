use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use std::collections::HashMap;
use log::{debug, info};
use lumos_core::LumosError;
use lumos_core::sqlite::connection::RowData;

use crate::cache::{Cache, CacheFactory};
use crate::db::executor::DbExecutor;
use crate::models::db::{TableInfo, ColumnInfo};

/// 带缓存的数据库执行器，为查询提供缓存支持
pub struct CachedDbExecutor {
    /// 底层数据库执行器
    executor: Arc<DbExecutor>,
    /// 查询结果缓存
    query_cache: Box<dyn Cache<String, Vec<RowData>>>,
    /// 表结构缓存
    schema_cache: Box<dyn Cache<String, Vec<ColumnInfo>>>,
    /// 表列表缓存
    tables_cache: Box<dyn Cache<String, Vec<TableInfo>>>,
}

impl CachedDbExecutor {
    /// 创建新的缓存数据库执行器
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, LumosError> {
        let executor = Arc::new(DbExecutor::new(path)?);
        
        // 创建查询缓存，设置30秒TTL和最大100项
        let query_cache = CacheFactory::create_lru_cache(
            100, // 容量
            Some(Duration::from_secs(30)), // TTL
        );
        
        // 创建表结构缓存，表结构变化较少，设置更长的TTL
        let schema_cache = CacheFactory::create_memory_cache(
            Some(Duration::from_secs(300)), // 5分钟
            Some(50), // 最多缓存50个表的结构
        );
        
        // 创建表列表缓存
        let tables_cache = CacheFactory::create_memory_cache(
            Some(Duration::from_secs(60)), // 1分钟
            Some(10), // 最多缓存10个数据库的表列表
        );
        
        Ok(Self {
            executor,
            query_cache,
            schema_cache,
            tables_cache,
        })
    }
    
    /// 执行查询并返回结果，优先从缓存获取
    pub fn execute_query(&self, sql: &str, params: &[String]) -> Result<Vec<RowData>, LumosError> {
        // 检查是否是只读查询，如果是写操作则不缓存
        if !Self::is_read_only_query(sql) {
            // 写操作直接执行，并清理相关缓存
            let result = self.executor.execute_query(sql, params)?;
            self.invalidate_cache_for_write(sql);
            return Ok(result);
        }
        
        // 为只读查询构造缓存键
        let cache_key = self.build_cache_key(sql, params);
        
        // 尝试从缓存获取
        if let Some(cached_result) = self.query_cache.get(&cache_key) {
            debug!("Query cache hit for: {}", sql);
            return Ok(cached_result);
        }
        
        // 缓存未命中，执行实际查询
        debug!("Query cache miss for: {}", sql);
        let result = self.executor.execute_query(sql, params)?;
        
        // 将结果存入缓存
        self.query_cache.set(cache_key, result.clone());
        
        Ok(result)
    }
    
    /// 执行SQL语句并返回影响的行数，不缓存
    pub fn execute(&self, sql: &str, params: &[String]) -> Result<usize, LumosError> {
        // 执行语句
        let result = self.executor.execute(sql, params)?;
        
        // 清理可能受影响的缓存
        self.invalidate_cache_for_write(sql);
        
        Ok(result)
    }
    
    /// 获取所有表名，优先从缓存获取
    pub fn list_tables(&self) -> Result<Vec<TableInfo>, LumosError> {
        // 使用数据库路径作为缓存键
        let cache_key = self.executor.path.clone();
        
        // 尝试从缓存获取
        if let Some(cached_tables) = self.tables_cache.get(&cache_key) {
            debug!("Tables cache hit");
            return Ok(cached_tables);
        }
        
        // 缓存未命中，执行实际查询
        debug!("Tables cache miss");
        let tables = self.executor.list_tables()?;
        
        // 将结果存入缓存
        self.tables_cache.set(cache_key, tables.clone());
        
        Ok(tables)
    }
    
    /// 获取表结构，优先从缓存获取
    pub fn get_table_schema(&self, table_name: &str) -> Result<Vec<ColumnInfo>, LumosError> {
        // 使用表名作为缓存键
        let cache_key = table_name.to_string();
        
        // 尝试从缓存获取
        if let Some(cached_schema) = self.schema_cache.get(&cache_key) {
            debug!("Schema cache hit for table: {}", table_name);
            return Ok(cached_schema);
        }
        
        // 缓存未命中，执行实际查询
        debug!("Schema cache miss for table: {}", table_name);
        let schema = self.executor.get_table_schema(table_name)?;
        
        // 将结果存入缓存
        self.schema_cache.set(cache_key, schema.clone());
        
        Ok(schema)
    }
    
    /// 清理所有缓存
    pub fn clear_all_cache(&self) {
        info!("Clearing all cache");
        self.query_cache.clear();
        self.schema_cache.clear();
        self.tables_cache.clear();
    }
    
    /// 清理特定表的缓存
    pub fn invalidate_table_cache(&self, table_name: &str) {
        info!("Invalidating cache for table: {}", table_name);
        // 移除表结构缓存
        self.schema_cache.remove(&table_name.to_string());
        // 移除表列表缓存
        self.tables_cache.clear();
        // 移除可能包含该表数据的查询缓存
        // 由于缓存键中可能不包含表名信息，为安全起见，清空所有查询缓存
        self.query_cache.clear();
    }
    
    /// 构建缓存键
    fn build_cache_key(&self, sql: &str, params: &[String]) -> String {
        // 使用SQL和参数组合作为缓存键
        format!("{}:{}", sql, params.join(","))
    }
    
    /// 检查SQL是否是只读查询
    fn is_read_only_query(sql: &str) -> bool {
        let normalized_sql = sql.trim().to_uppercase();
        
        // 简单的启发式判断，仅考虑以SELECT开头的语句为只读
        // 实际使用中可能需要更复杂的解析
        normalized_sql.starts_with("SELECT")
    }
    
    /// 根据写操作清理相关缓存
    fn invalidate_cache_for_write(&self, sql: &str) {
        let normalized_sql = sql.trim().to_uppercase();
        
        // 根据SQL操作类型清理不同的缓存
        if normalized_sql.starts_with("INSERT") || 
           normalized_sql.starts_with("UPDATE") || 
           normalized_sql.starts_with("DELETE") {
            // 数据修改，清理查询缓存
            debug!("Clearing query cache due to data modification");
            self.query_cache.clear();
            
            // 尝试提取表名(简化实现)
            if let Some(table_name) = Self::extract_table_name(sql) {
                debug!("Detected modification to table: {}", table_name);
                // 对于UPDATE和DELETE不需要清理表结构缓存
                if !normalized_sql.starts_with("INSERT") {
                    return;
                }
            }
        } else if normalized_sql.starts_with("CREATE TABLE") || 
                  normalized_sql.starts_with("DROP TABLE") || 
                  normalized_sql.starts_with("ALTER TABLE") {
            // 表结构修改，清理所有缓存
            debug!("Clearing all cache due to schema modification");
            self.clear_all_cache();
        }
    }
    
    /// 从SQL中提取表名(简化实现)
    fn extract_table_name(sql: &str) -> Option<String> {
        let lowercase_sql = sql.to_lowercase();
        
        // 非常简化的实现，仅用于演示
        // 实际使用中需要更复杂的SQL解析
        if lowercase_sql.contains(" into ") {
            let parts: Vec<&str> = lowercase_sql.split(" into ").collect();
            if parts.len() > 1 {
                let table_part = parts[1].trim();
                let table_name = table_part.split_whitespace().next().unwrap_or("");
                return Some(table_name.to_string());
            }
        } else if lowercase_sql.contains(" from ") {
            let parts: Vec<&str> = lowercase_sql.split(" from ").collect();
            if parts.len() > 1 {
                let table_part = parts[1].trim();
                let table_name = table_part.split_whitespace().next().unwrap_or("");
                return Some(table_name.to_string());
            }
        } else if lowercase_sql.contains(" table ") {
            let parts: Vec<&str> = lowercase_sql.split(" table ").collect();
            if parts.len() > 1 {
                let table_part = parts[1].trim();
                let table_name = table_part.split_whitespace().next().unwrap_or("");
                return Some(table_name.to_string());
            }
        }
        
        None
    }
} 