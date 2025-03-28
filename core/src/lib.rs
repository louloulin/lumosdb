pub mod sqlite;
pub mod duckdb;
pub mod query;
pub mod sync;
pub mod vector;
pub mod utils;

use std::error::Error;
use std::fmt;

/// Core error types for the Lumos-DB library
#[derive(Debug)]
pub enum LumosError {
    /// SQLite related errors
    Sqlite(String),
    /// DuckDB related errors
    DuckDb(String),
    /// Query processing errors
    Query(String),
    /// Data synchronization errors
    Sync(String),
    /// Vector search errors
    Vector(String),
    /// IO errors
    Io(std::io::Error),
    /// Invalid argument errors
    InvalidArgument(String),
    /// Internal errors
    Internal(String),
    /// Not found errors
    NotFound(String),
    /// Generic errors
    Other(String),
}

impl fmt::Display for LumosError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            LumosError::Sqlite(msg) => write!(f, "SQLite error: {}", msg),
            LumosError::DuckDb(msg) => write!(f, "DuckDB error: {}", msg),
            LumosError::Query(msg) => write!(f, "Query error: {}", msg),
            LumosError::Sync(msg) => write!(f, "Sync error: {}", msg),
            LumosError::Vector(msg) => write!(f, "Vector error: {}", msg),
            LumosError::Io(err) => write!(f, "IO error: {}", err),
            LumosError::InvalidArgument(msg) => write!(f, "Invalid argument: {}", msg),
            LumosError::Internal(msg) => write!(f, "Internal error: {}", msg),
            LumosError::NotFound(msg) => write!(f, "Not found: {}", msg),
            LumosError::Other(msg) => write!(f, "Error: {}", msg),
        }
    }
}

impl Error for LumosError {}

impl From<std::io::Error> for LumosError {
    fn from(err: std::io::Error) -> Self {
        LumosError::Io(err)
    }
}

impl From<rusqlite::Error> for LumosError {
    fn from(err: rusqlite::Error) -> Self {
        LumosError::Sqlite(err.to_string())
    }
}

impl From<duckdb::Error> for LumosError {
    fn from(err: duckdb::Error) -> Self {
        LumosError::DuckDb(err.to_string())
    }
}

/// Result type alias for Lumos-DB operations
pub type Result<T> = std::result::Result<T, LumosError>;

/// Core configuration for Lumos-DB
#[derive(Debug, Clone)]
pub struct LumosConfig {
    /// Path to SQLite database file
    pub sqlite_path: String,
    /// Path to DuckDB database file
    pub duckdb_path: String,
    /// Sync interval in seconds
    pub sync_interval: u64,
    /// Maximum memory usage in MB
    pub max_memory_mb: u64,
}

impl Default for LumosConfig {
    fn default() -> Self {
        Self {
            sqlite_path: "lumos.db".to_string(),
            duckdb_path: "lumos.duckdb".to_string(),
            sync_interval: 60,
            max_memory_mb: 1024,
        }
    }
}

/// Initialize logging for Lumos-DB
pub fn init_logging() {
    env_logger::init();
}
