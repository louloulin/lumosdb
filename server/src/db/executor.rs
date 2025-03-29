use std::path::Path;
use std::sync::{Arc, Mutex, RwLock};
use lumos_core::{LumosError};
use lumos_core::sqlite::connection::RowData;
use crate::models::db::{TableInfo, ColumnInfo};

/// 数据库执行器，负责执行SQL语句和查询
pub struct DbExecutor {
    /// 数据库文件路径
    pub path: String,
    engine: Arc<Mutex<lumos_core::sqlite::SqliteEngine>>,
}

impl DbExecutor {
    /// 创建新的数据库执行器
    pub fn new<P: AsRef<Path>>(path: P) -> Result<Self, LumosError> {
        let path_str = path.as_ref().to_str().unwrap_or("").to_string();
        let mut db = lumos_core::sqlite::SqliteEngine::new(&path_str);
        db.init()?;
        
        Ok(Self { 
            path: path_str,
            engine: Arc::new(Mutex::new(db)) 
        })
    }
    
    /// 执行查询并返回结果
    pub fn execute_query(&self, sql: &str, params: &[String]) -> Result<Vec<RowData>, LumosError> {
        let engine = self.engine.lock().unwrap();
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();
        engine.query_all(sql, &param_refs)
    }
    
    /// 执行SQL语句并返回影响的行数
    pub fn execute(&self, sql: &str, params: &[String]) -> Result<usize, LumosError> {
        let engine = self.engine.lock().unwrap();
        let param_refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|p| p as &dyn rusqlite::ToSql).collect();
        engine.execute(sql, &param_refs)
    }
    
    /// 获取所有表名
    pub fn list_tables(&self) -> Result<Vec<TableInfo>, LumosError> {
        let engine = self.engine.lock().unwrap();
        let rows = engine.query_all("SELECT name, 
                            (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND tbl_name=m.name) as count 
                           FROM sqlite_master m 
                           WHERE type='table' AND name NOT LIKE 'sqlite_%'", &[])?;
        
        let mut tables = Vec::new();
        for row in rows {
            let name = row.get("name").unwrap_or(&String::default()).clone();
            let count: usize = row.get("count")
                .unwrap_or(&String::default())
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
        let engine = self.engine.lock().unwrap();
        let sql = format!("PRAGMA table_info({})", table_name);
        let rows = engine.query_all(&sql, &[])?;
        
        let mut columns = Vec::new();
        for row in rows {
            let name = row.get("name").unwrap_or(&String::default()).clone();
            let data_type = row.get("type").unwrap_or(&String::default()).clone();
            let is_nullable = row.get("notnull").unwrap_or(&"1".to_string()) == "0";
            let is_primary_key = row.get("pk").unwrap_or(&"0".to_string()) == "1";
            
            columns.push(ColumnInfo {
                name,
                data_type,
                is_nullable,
                is_primary_key,
            });
        }
        
        Ok(columns)
    }

    /// 执行SQL查询并返回JSON结果（用于REST API）
    pub fn query(&self, sql: &str) -> Result<Vec<serde_json::Value>, LumosError> {
        let rows = self.execute_query(sql, &[])?;
        
        let mut result = Vec::new();
        for row in rows {
            let mut obj = serde_json::Map::new();
            for (key, value) in &row.values {
                obj.insert(key.clone(), serde_json::Value::String(value.clone()));
            }
            result.push(serde_json::Value::Object(obj));
        }
        
        Ok(result)
    }
    
    /// 执行SQL命令并返回受影响的行数（用于REST API）
    pub fn execute_sql(&self, sql: &str) -> Result<usize, LumosError> {
        self.execute(sql, &[])
    }
    
    /// 获取所有表名（用于REST API）
    pub fn get_tables(&self) -> Result<Vec<String>, LumosError> {
        let tables = self.list_tables()?;
        let names = tables.into_iter().map(|t| t.name).collect();
        Ok(names)
    }
    
    /// 获取表结构信息（用于REST API）
    pub fn get_table_info(&self, table_name: &str) -> Result<Vec<ColumnInfo>, LumosError> {
        self.get_table_schema(table_name)
    }
} 