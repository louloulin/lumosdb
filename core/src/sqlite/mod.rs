pub mod connection;
pub mod transaction;
pub mod schema;

use rusqlite::{Connection, params};
use crate::{LumosError, Result};

/// SQLite engine for Lumos-DB
pub struct SqliteEngine {
    /// Path to the SQLite database file
    path: String,
    /// Connection to the SQLite database
    connection: Option<Connection>,
}

impl SqliteEngine {
    /// Create a new SQLite engine with the specified database path
    pub fn new(path: &str) -> Self {
        Self {
            path: path.to_string(),
            connection: None,
        }
    }

    /// Initialize the SQLite engine
    pub fn init(&mut self) -> Result<()> {
        log::info!("Initializing SQLite engine with database at: {}", self.path);
        
        let conn = Connection::open(&self.path)?;
        
        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        
        // Set journal mode to WAL for better concurrency
        conn.execute("PRAGMA journal_mode = WAL", [])?;
        
        // Set synchronous mode to NORMAL for better performance with acceptable safety
        conn.execute("PRAGMA synchronous = NORMAL", [])?;
        
        // Store the connection
        self.connection = Some(conn);
        
        log::info!("SQLite engine initialized successfully");
        Ok(())
    }

    /// Get a reference to the connection
    pub fn connection(&self) -> Result<&Connection> {
        self.connection.as_ref().ok_or_else(|| LumosError::Sqlite("SQLite connection not initialized".to_string()))
    }

    /// Execute a simple query without returning results
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize> {
        let conn = self.connection()?;
        let rows_affected = conn.execute(sql, params)?;
        Ok(rows_affected)
    }
    
    /// Execute a query and return all rows
    pub fn query_all(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<rusqlite::Row>> {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query_map(params, |row| Ok(row.clone()))?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        Ok(rows)
    }
    
    /// Create a table if it doesn't exist
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
        let conn = self.connection()?;
        conn.execute("BEGIN TRANSACTION", [])?;
        Ok(transaction::Transaction::new(conn))
    }
    
    /// Close the connection
    pub fn close(self) -> Result<()> {
        if let Some(conn) = self.connection {
            // Explicitly close the connection
            drop(conn);
            log::info!("SQLite connection closed");
        }
        Ok(())
    }
}
