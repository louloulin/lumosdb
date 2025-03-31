pub mod connection;
pub mod transaction;
pub mod schema;

use std::sync::{Arc, Mutex};
use rusqlite::{Connection, params};
use crate::{LumosError, Result};
use connection::RowData;

/// SQLite engine for Lumos-DB
pub struct SqliteEngine {
    /// Path to the SQLite database file
    path: String,
    /// Connection pool for managing SQLite connections
    pool: Arc<connection::ConnectionPool>,
    /// Default connection for backward compatibility
    default_connection: Mutex<Option<Connection>>,
}

impl SqliteEngine {
    /// Create a new SQLite engine with the specified database path
    pub fn new(path: &str) -> Self {
        Self {
            path: path.to_string(),
            pool: Arc::new(connection::ConnectionPool::new(path, 10)), // Default pool size of 10
            default_connection: Mutex::new(None),
        }
    }
    
    /// Create a new SQLite engine with custom connection pool size
    pub fn with_pool_size(path: &str, pool_size: usize) -> Self {
        Self {
            path: path.to_string(),
            pool: Arc::new(connection::ConnectionPool::new(path, pool_size)),
            default_connection: Mutex::new(None),
        }
    }

    /// Initialize the SQLite engine
    pub fn init(&self) -> Result<()> {
        log::info!("Initializing SQLite engine with database at: {}", self.path);
        
        // Create a default connection for backward compatibility
        let conn = Connection::open(&self.path)?;
        
        // Store the connection - don't run PRAGMA commands here since that's
        // already handled in the connection pool
        *self.default_connection.lock().unwrap() = Some(conn);
        
        // Pre-warm the connection pool by creating a connection
        // This will also set up all the PRAGMA settings
        let _ = self.pool.get()?;
        
        log::info!("SQLite engine initialized successfully");
        Ok(())
    }

    /// Get a connection from the pool for use in queries
    pub fn connection(&self) -> Result<connection::PooledConn> {
        self.pool.get()
    }
    
    /// Get a connection from the pool
    pub fn get_pooled_connection(&self) -> Result<connection::PooledConn> {
        self.pool.get()
    }

    /// Execute a simple query without returning results using a connection from the pool
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize> {
        let conn = self.connection()?;
        let rows_affected = conn.conn.execute(sql, params)?;
        Ok(rows_affected)
    }
    
    /// Execute a query and return all rows using a connection from the pool
    pub fn query_all(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<RowData>> {
        let conn = self.connection()?;
        let mut stmt = conn.conn.prepare(sql)?;
        let mut query_result = stmt.query(params)?;
        let mut rows_data = Vec::new();
        while let Some(row) = query_result.next()? {
            rows_data.push(RowData::from_row(row)?);
        }
        Ok(rows_data)
    }
    
    /// Create a table if it doesn't exist using a connection from the pool
    pub fn create_table(&self, table_name: &str, columns: &[(&str, &str)]) -> Result<()> {
        let columns_sql = columns
            .iter()
            .map(|(name, definition)| format!("{} {}", name, definition))
            .collect::<Vec<_>>()
            .join(", ");
        
        let sql = format!("CREATE TABLE IF NOT EXISTS {} ({})", table_name, columns_sql);
        self.execute(&sql, &[])?;
        
        log::debug!("Created table: {}", table_name);
        Ok(())
    }
    
    /// Begin a new transaction
    pub fn begin_transaction(&self) -> Result<transaction::Transaction> {
        let conn = Connection::open(&self.path)?;
        conn.execute("BEGIN TRANSACTION", [])?;
        Ok(transaction::Transaction::new_owned(conn))
    }
    
    /// Get a schema manager
    pub fn schema_manager(&self) -> Result<schema::SchemaManager> {
        let conn = Connection::open(&self.path)?;
        Ok(schema::SchemaManager::new_owned(conn))
    }
    
    /// Create optimized indexes for OLTP workloads
    pub fn optimize_for_oltp(&self, tables: &[&str]) -> Result<()> {
        for &table in tables {
            // Get a new connection for each table to avoid borrowing issues
            let conn = Connection::open(&self.path)?;
            let schema_mgr = schema::SchemaManager::new_owned(conn);
            
            // Get the schema for the table
            if let Ok(columns) = schema_mgr.get_table_schema(table) {
                // Create indexes for primary key columns if not already indexed
                for column in &columns {
                    if column.is_primary_key {
                        // Create an index on the primary key if one doesn't exist
                        schema_mgr.create_index(table, &[&column.name], true)?;
                        log::debug!("Created primary key index for {}.{}", table, column.name);
                    }
                }
                
                // Analyze the table to improve query planning
                let analyze_sql = format!("ANALYZE {}", table);
                let mut conn = Connection::open(&self.path)?;
                conn.execute(&analyze_sql, [])?;
                log::debug!("Analyzed table: {}", table);
            }
        }
        
        Ok(())
    }
    
    /// Get the connection pool
    pub fn pool(&self) -> Arc<connection::ConnectionPool> {
        self.pool.clone()
    }
    
    /// Close all connections
    pub fn close(self) -> Result<()> {
        // Close the connection pool
        self.pool.close()?;
        
        log::info!("SQLite engine closed");
        Ok(())
    }

    /// Check if a table exists in the database
    pub fn table_exists(&self, table_name: &str) -> Result<bool> {
        let sql = "SELECT name FROM sqlite_master WHERE type='table' AND name = ?";
        let rows = self.query_all(sql, &[&table_name as &dyn rusqlite::ToSql])?;
        Ok(!rows.is_empty())
    }
}

// 明确实现Send和Sync特性
unsafe impl Send for SqliteEngine {}
unsafe impl Sync for SqliteEngine {}
