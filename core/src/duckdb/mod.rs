pub mod connection;
pub mod analytics;

use duckdb::{Connection, params, Result as DuckResult};
use crate::{LumosError, Result};

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
    
    /// Close the connection
    pub fn close(self) -> Result<()> {
        if let Some(_conn) = self.connection {
            // Connection will be closed when dropped
            log::info!("DuckDB connection closed");
        }
        Ok(())
    }
}
