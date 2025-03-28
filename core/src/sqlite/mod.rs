pub mod connection;
pub mod transaction;
pub mod schema;

use std::sync::Arc;
use rusqlite::{Connection, params};
use crate::{LumosError, Result};

/// SQLite engine for Lumos-DB
pub struct SqliteEngine {
    /// Path to the SQLite database file
    path: String,
    /// Connection pool for managing SQLite connections
    pool: Arc<connection::ConnectionPool>,
    /// Default connection for backward compatibility
    default_connection: Option<Connection>,
}

impl SqliteEngine {
    /// Create a new SQLite engine with the specified database path
    pub fn new(path: &str) -> Self {
        Self {
            path: path.to_string(),
            pool: Arc::new(connection::ConnectionPool::new(path, 10)), // Default pool size of 10
            default_connection: None,
        }
    }
    
    /// Create a new SQLite engine with custom connection pool size
    pub fn with_pool_size(path: &str, pool_size: usize) -> Self {
        Self {
            path: path.to_string(),
            pool: Arc::new(connection::ConnectionPool::new(path, pool_size)),
            default_connection: None,
        }
    }

    /// Initialize the SQLite engine
    pub fn init(&mut self) -> Result<()> {
        log::info!("Initializing SQLite engine with database at: {}", self.path);
        
        // Create a default connection for backward compatibility
        let conn = Connection::open(&self.path)?;
        
        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        
        // Set journal mode to WAL for better concurrency
        conn.execute("PRAGMA journal_mode = WAL", [])?;
        
        // Set synchronous mode to NORMAL for better performance with acceptable safety
        conn.execute("PRAGMA synchronous = NORMAL", [])?;
        
        // Set a reasonable cache size
        conn.execute("PRAGMA cache_size = 10000", [])?; // ~10MB cache
        
        // Store the connection
        self.default_connection = Some(conn);
        
        // Pre-warm the connection pool by creating a connection
        let _ = self.pool.get()?;
        
        log::info!("SQLite engine initialized successfully");
        Ok(())
    }

    /// Get a reference to the default connection (not from the pool)
    pub fn connection(&self) -> Result<&Connection> {
        self.default_connection.as_ref().ok_or_else(|| LumosError::Sqlite("SQLite connection not initialized".to_string()))
    }
    
    /// Get a connection from the pool
    pub fn get_pooled_connection(&self) -> Result<connection::PooledConn> {
        self.pool.get()
    }

    /// Execute a simple query without returning results using the default connection
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize> {
        let conn = self.connection()?;
        let rows_affected = conn.execute(sql, params)?;
        Ok(rows_affected)
    }
    
    /// Execute a query and return all rows using the default connection
    pub fn query_all(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<rusqlite::Row>> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(params, |row| Ok(row.clone()))?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        Ok(rows)
    }
    
    /// Create a table if it doesn't exist using the default connection
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
    
    /// Begin a new transaction using the default connection
    pub fn begin_transaction(&self) -> Result<transaction::Transaction> {
        let conn = self.connection()?;
        conn.execute("BEGIN TRANSACTION", [])?;
        Ok(transaction::Transaction::new(conn))
    }
    
    /// Get a schema manager for the default connection
    pub fn schema_manager(&self) -> Result<schema::SchemaManager> {
        let conn = self.connection()?;
        Ok(schema::SchemaManager::new(conn))
    }
    
    /// Create optimized indexes for OLTP workloads
    pub fn optimize_for_oltp(&self, tables: &[&str]) -> Result<()> {
        let schema_mgr = self.schema_manager()?;
        
        for &table in tables {
            // Get the schema for the table
            let columns = schema_mgr.get_table_schema(table)?;
            
            // Create indexes for primary key columns if not already indexed
            for column in &columns {
                if column.is_primary_key {
                    // Create an index on the primary key if one doesn't exist
                    let index_name = format!("idx_{}_pk", table);
                    schema_mgr.create_index(table, &[&column.name], true)?;
                    log::debug!("Created primary key index: {}", index_name);
                }
            }
            
            // Analyze the table to improve query planning
            let conn = self.connection()?;
            conn.execute(&format!("ANALYZE {}", table), [])?;
            log::debug!("Analyzed table: {}", table);
        }
        
        Ok(())
    }
    
    /// Get the connection pool
    pub fn pool(&self) -> Arc<connection::ConnectionPool> {
        self.pool.clone()
    }
    
    /// Close all connections
    pub fn close(self) -> Result<()> {
        // Close the default connection
        if let Some(conn) = self.default_connection {
            // Explicitly close the connection
            drop(conn);
        }
        
        // Close the connection pool
        self.pool.close()?;
        
        log::info!("SQLite engine closed");
        Ok(())
    }
}
