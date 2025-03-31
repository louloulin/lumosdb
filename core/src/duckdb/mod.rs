pub mod connection;
pub mod analytics;

use duckdb::{Connection, params, Result as DuckResult};
use crate::{LumosError, Result};
use serde_json::Value as JsonValue;
use std::collections::HashMap;

// Re-export duckdb Error type
pub use duckdb::Error;
pub use duckdb::types;

/// Convert DuckDB ValueRef to JsonValue
pub fn value_ref_to_json(value_ref: &duckdb::types::ValueRef) -> JsonValue {
    match value_ref {
        duckdb::types::ValueRef::Null => JsonValue::Null,
        // Handle different types based on what's actually available in duckdb
        // If Integer/Real aren't available, handle the actual types here
        // For example:
        duckdb::types::ValueRef::Text(s) => {
            JsonValue::String(std::str::from_utf8(s).unwrap_or_default().to_string())
        }
        duckdb::types::ValueRef::Blob(b) => {
            JsonValue::String(format!("<BLOB: {} bytes>", b.len()))
        }
        // You may need to handle other variants based on the actual implementation
        _ => JsonValue::String("<UNSUPPORTED>".to_string()),
    }
}

/// DuckDB engine for Lumos-DB
pub struct DuckDbEngine {
    /// Path to the DuckDB database file
    path: String,
    /// Connection to the DuckDB database
    connection: Option<Connection>,
}

impl DuckDbEngine {
    /// Create a new DuckDB engine with the specified database path
    pub fn new(path: &str) -> Self {
        Self {
            path: path.to_string(),
            connection: None,
        }
    }

    /// Initialize the DuckDB engine
    pub fn init(&mut self) -> Result<()> {
        log::info!("Initializing DuckDB engine with database at: {}", self.path);
        
        let conn = Connection::open(&self.path)
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        // Set memory limit - convert MB to bytes
        let memory_limit_sql = format!("SET memory_limit='{} MB'", 1024);
        conn.execute(&memory_limit_sql, [])
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        // Enable progress bar for long-running queries
        conn.execute("SET enable_progress_bar=true", [])
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        // Store the connection
        self.connection = Some(conn);
        
        log::info!("DuckDB engine initialized successfully");
        Ok(())
    }

    /// Get a reference to the connection
    pub fn connection(&self) -> Result<&Connection> {
        self.connection.as_ref().ok_or_else(|| LumosError::DuckDb("DuckDB connection not initialized".to_string()))
    }

    /// Execute a simple query without returning results
    pub fn execute(&self, sql: &str) -> Result<usize> {
        let conn = self.connection()?;
        let rows_affected = conn.execute(sql, [])
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        Ok(rows_affected)
    }
    
    /// Execute a parameterized query without returning results
    pub fn execute_with_params(&self, sql: &str, params: &[&dyn duckdb::ToSql]) -> Result<usize> {
        let conn = self.connection()?;
        let rows_affected = conn.execute(sql, params)
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        Ok(rows_affected)
    }
    
    /// Execute a query and return all rows as a vector of tuples
    pub fn query<T, F>(&self, sql: &str, params: &[&dyn duckdb::ToSql], mut map_fn: F) -> Result<Vec<T>>
    where
        F: FnMut(&duckdb::Row) -> DuckResult<T>,
    {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(sql)
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        let rows = stmt.query_map(params, map_fn)
            .map_err(|e| LumosError::DuckDb(e.to_string()))?
            .collect::<DuckResult<Vec<T>>>()
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        Ok(rows)
    }
    
    /// Create a table from a SQL query
    pub fn create_table_as(&self, table_name: &str, query: &str) -> Result<()> {
        let sql = format!("CREATE OR REPLACE TABLE {} AS {}", table_name, query);
        self.execute(&sql)?;
        
        log::debug!("Created table: {}", table_name);
        Ok(())
    }
    
    /// Import data from a CSV file
    pub fn import_csv(&self, table_name: &str, file_path: &str, header: bool) -> Result<()> {
        let header_option = if header { "true" } else { "false" };
        let sql = format!(
            "CREATE TABLE {} AS SELECT * FROM read_csv('{}', header={})",
            table_name, file_path, header_option
        );
        
        self.execute(&sql)?;
        log::debug!("Imported CSV from '{}' to table '{}'", file_path, table_name);
        
        Ok(())
    }
    
    /// Import data from a Parquet file
    pub fn import_parquet(&self, table_name: &str, file_path: &str) -> Result<()> {
        let sql = format!(
            "CREATE TABLE {} AS SELECT * FROM read_parquet('{}')",
            table_name, file_path
        );
        
        self.execute(&sql)?;
        log::debug!("Imported Parquet from '{}' to table '{}'", file_path, table_name);
        
        Ok(())
    }
    
    /// Export data to a CSV file
    pub fn export_csv(&self, table_name: &str, file_path: &str, header: bool) -> Result<()> {
        let header_option = if header { "true" } else { "false" };
        let sql = format!(
            "COPY {} TO '{}' (HEADER {})",
            table_name, file_path, header_option
        );
        
        self.execute(&sql)?;
        log::debug!("Exported table '{}' to CSV '{}'", table_name, file_path);
        
        Ok(())
    }
    
    /// Export data to a Parquet file
    pub fn export_parquet(&self, table_name: &str, file_path: &str) -> Result<()> {
        let sql = format!(
            "COPY {} TO '{}' (FORMAT PARQUET)",
            table_name, file_path
        );
        
        self.execute(&sql)?;
        log::debug!("Exported table '{}' to Parquet '{}'", table_name, file_path);
        
        Ok(())
    }
    
    /// Check if a table exists
    pub fn table_exists(&self, table_name: &str) -> Result<bool> {
        let sql = "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ?";
        let conn = self.connection()?;
        
        let count: i64 = conn.query_row(sql, params![table_name], |row| row.get(0))
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        Ok(count > 0)
    }
    
    /// 执行查询并返回所有行，以字符串形式返回所有值
    pub fn query_all_as_strings(&self, sql: &str) -> Result<Vec<HashMap<String, String>>> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(sql)
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
        // 获取列名
        let column_count = stmt.column_count();
        let mut column_names = Vec::with_capacity(column_count);
        for i in 0..column_count {
            let name = stmt.column_name(i)
                .map_err(|e| LumosError::DuckDb(e.to_string()))?
                .to_string();
            column_names.push(name);
        }
        
        // 执行查询
        let mut rows = Vec::new();
        let mut query_result = stmt.query([])
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
        while let Some(row) = query_result.next()
            .map_err(|e| LumosError::DuckDb(e.to_string()))?
        {
            let mut row_map = std::collections::HashMap::new();
            for (i, column_name) in column_names.iter().enumerate() {
                let value = match row.get_ref(i) {
                    Ok(value_ref) => {
                        match value_ref {
                            duckdb::types::ValueRef::Null => "NULL".to_string(),
                            duckdb::types::ValueRef::Boolean(b) => b.to_string(),
                            duckdb::types::ValueRef::TinyInt(i) => i.to_string(),
                            duckdb::types::ValueRef::SmallInt(i) => i.to_string(),
                            duckdb::types::ValueRef::Int(i) => i.to_string(),
                            duckdb::types::ValueRef::BigInt(i) => i.to_string(),
                            duckdb::types::ValueRef::HugeInt(i) => i.to_string(),
                            duckdb::types::ValueRef::UTinyInt(i) => i.to_string(),
                            duckdb::types::ValueRef::USmallInt(i) => i.to_string(),
                            duckdb::types::ValueRef::UInt(i) => i.to_string(),
                            duckdb::types::ValueRef::UBigInt(i) => i.to_string(),
                            duckdb::types::ValueRef::Float(f) => f.to_string(),
                            duckdb::types::ValueRef::Double(f) => f.to_string(),
                            duckdb::types::ValueRef::Text(s) => {
                                std::str::from_utf8(s).unwrap_or_default().to_string()
                            },
                            duckdb::types::ValueRef::Blob(b) => format!("<BLOB: {} bytes>", b.len()),
                            _ => "<UNSUPPORTED>".to_string(),
                        }
                    },
                    Err(_) => "<ERROR>".to_string(),
                };
                
                row_map.insert(column_name.clone(), value);
            }
            
            rows.push(row_map);
        }
        
        Ok(rows)
    }
    
    /// Close the connection
    pub fn close(self) -> Result<()> {
        if let Some(_conn) = self.connection {
            // Connection will be closed when dropped
            log::info!("DuckDB connection closed");
        }
        Ok(())
    }
}
