use std::path::Path;
use std::collections::HashMap;
use lumos_core::{LumosDB, LumosError, RowData};
use crate::models::db::{TableInfo, ColumnInfo};

/// 数据库执行器，负责执行SQL语句和查询
pub struct DbExecutor {
    db: LumosDB,
}

impl DbExecutor {
    /// 创建新的数据库执行器
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, LumosError> {
        let db = LumosDB::open(path)?;
        Ok(Self { db })
    }
    
    /// 执行查询并返回结果
    pub fn execute_query(&self, sql: &str, params: &[String]) -> Result<Vec<RowData>, LumosError> {
        self.db.query(sql, params)
    }
    
    /// 执行SQL语句并返回影响的行数
    pub fn execute(&self, sql: &str, params: &[String]) -> Result<usize, LumosError> {
        self.db.execute(sql, params)
    }
    
    /// 获取所有表名
    pub fn list_tables(&self) -> Result<Vec<TableInfo>, LumosError> {
        let rows = self.db.query("SELECT name, 
                            (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND tbl_name=m.name) as count 
                           FROM sqlite_master m 
                           WHERE type='table' AND name NOT LIKE 'sqlite_%'", &[])?;
        
        let mut tables = Vec::new();
        for row in rows {
            let name = row.get_string("name").unwrap_or_default();
            let count: usize = row.get_string("count")
                .unwrap_or_default()
                .parse()
                .unwrap_or(0);
                
            tables.push(TableInfo {
                name,
                rows: count,
            });
        }
        
        Ok(tables)
    }
    
    /// 获取表结构
    pub fn get_table_schema(&self, table_name: &str) -> Result<Vec<ColumnInfo>, LumosError> {
        let sql = format!("PRAGMA table_info({})", table_name);
        let rows = self.db.query(&sql, &[])?;
        
        let mut columns = Vec::new();
        for row in rows {
            let name = row.get_string("name").unwrap_or_default();
            let data_type = row.get_string("type").unwrap_or_default();
            let is_nullable = row.get_string("notnull").unwrap_or("1".to_string()) == "0";
            let is_primary_key = row.get_string("pk").unwrap_or("0".to_string()) == "1";
            
            columns.push(ColumnInfo {
                name,
                data_type,
                is_nullable,
                is_primary_key,
            });
        }
        
        Ok(columns)
    }
}

/// 表信息
#[derive(Debug)]
pub struct TableInfo {
    pub name: String,
    pub rows: usize,
}

/// 列信息
#[derive(Debug)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
} 