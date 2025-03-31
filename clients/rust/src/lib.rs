use lumos_core::{
    LumosConfig,
    query::{Query, QueryResult, QueryType, EngineType, QueryExecutor},
    sqlite::SqliteEngine,
    duckdb::DuckDbEngine,
    LumosError, Result,
};
use serde::{Serialize, Deserialize};
use serde_json::Value as JsonValue;
use std::path::Path;

/// Client for Lumos-DB
pub struct LumosClient {
    /// Query executor
    executor: QueryExecutor,
    /// Database configuration
    config: LumosConfig,
}

/// Client options for configuring the Lumos-DB connection
#[derive(Debug, Clone)]
pub struct ClientOptions {
    /// Path to SQLite database file
    pub sqlite_path: String,
    /// Path to DuckDB database file
    pub duckdb_path: String,
    /// Sync interval in seconds
    pub sync_interval: u64,
    /// Maximum memory usage in MB
    pub max_memory_mb: u64,
}

impl Default for ClientOptions {
    fn default() -> Self {
        Self {
            sqlite_path: "lumos.db".to_string(),
            duckdb_path: "lumos.duckdb".to_string(),
            sync_interval: 60,
            max_memory_mb: 1024,
        }
    }
}

impl LumosClient {
    /// Create a new Lumos-DB client with default options
    pub fn new() -> Result<Self> {
        Self::with_options(ClientOptions::default())
    }
    
    /// Create a new Lumos-DB client with custom options
    pub fn with_options(options: ClientOptions) -> Result<Self> {
        // Create configuration
        let config = LumosConfig {
            sqlite_path: options.sqlite_path.clone(),
            duckdb_path: options.duckdb_path.clone(),
            sync_interval: options.sync_interval,
            max_memory_mb: options.max_memory_mb,
        };
        
        // Initialize engines
        let mut sqlite_engine = SqliteEngine::new(&options.sqlite_path);
        sqlite_engine.init()?;
        
        let mut duckdb_engine = DuckDbEngine::new(&options.duckdb_path);
        duckdb_engine.init()?;
        
        // Create query executor
        let executor = QueryExecutor::new(sqlite_engine, duckdb_engine);
        
        Ok(Self {
            executor,
            config,
        })
    }
    
    /// Execute an SQL query
    pub fn query(&mut self, sql: &str, params: &[&dyn ToSqlParam]) -> Result<QueryResult> {
        // Build query with parameters
        let mut query = Query::new(sql);
        
        for param in params {
            query = query.param(param.to_param());
        }
        
        // Execute the query
        self.executor.execute(query)
    }
    
    /// Execute a query on SQLite
    pub fn query_sqlite(&mut self, sql: &str, params: &[&dyn ToSqlParam]) -> Result<QueryResult> {
        let mut query = Query::new(sql);
        
        for param in params {
            query = query.param(param.to_param());
        }
        
        query = query.engine(EngineType::Sqlite);
        
        self.executor.execute(query)
    }
    
    /// Execute a query on DuckDB
    pub fn query_duckdb(&mut self, sql: &str, params: &[&dyn ToSqlParam]) -> Result<QueryResult> {
        let mut query = Query::new(sql);
        
        for param in params {
            query = query.param(param.to_param());
        }
        
        query = query.engine(EngineType::DuckDb);
        
        self.executor.execute(query)
    }
    
    /// Execute a cross-engine query
    pub fn query_cross_engine(&mut self, sql: &str, params: &[&dyn ToSqlParam]) -> Result<QueryResult> {
        let mut query = Query::new(sql);
        
        for param in params {
            query = query.param(param.to_param());
        }
        
        // If this is not already a cross-engine query, it will be routed normally
        self.executor.execute(query)
    }
    
    /// Get a single row as a JSON object
    pub fn query_one(&mut self, sql: &str, params: &[&dyn ToSqlParam]) -> Result<Option<JsonValue>> {
        let result = self.query(sql, params)?;
        result.first_row_as_json()
    }
    
    /// Get query results as a JSON array
    pub fn query_json(&mut self, sql: &str, params: &[&dyn ToSqlParam]) -> Result<Vec<JsonValue>> {
        let result = self.query(sql, params)?;
        result.to_json_array()
    }
    
    /// Execute an update query (INSERT, UPDATE, DELETE)
    pub fn execute(&mut self, sql: &str, params: &[&dyn ToSqlParam]) -> Result<usize> {
        let result = self.query(sql, params)?;
        Ok(result.rows_affected)
    }
    
    /// Get a reference to the SQLite engine
    pub fn sqlite(&self) -> &SqliteEngine {
        self.executor.sqlite()
    }
    
    /// Get a reference to the DuckDB engine
    pub fn duckdb(&self) -> &DuckDbEngine {
        self.executor.duckdb()
    }
    
    /// Get the configuration
    pub fn config(&self) -> &LumosConfig {
        &self.config
    }
}

/// Trait for converting Rust types to SQL parameters
pub trait ToSqlParam {
    /// Convert to a SQL parameter
    fn to_param(&self) -> lumos_core::query::QueryParam;
}

// Implement ToSqlParam for common types
impl ToSqlParam for String {
    fn to_param(&self) -> lumos_core::query::QueryParam {
        lumos_core::query::QueryParam::String(self.clone())
    }
}

impl ToSqlParam for &str {
    fn to_param(&self) -> lumos_core::query::QueryParam {
        lumos_core::query::QueryParam::String(self.to_string())
    }
}

impl ToSqlParam for i32 {
    fn to_param(&self) -> lumos_core::query::QueryParam {
        lumos_core::query::QueryParam::Integer(*self as i64)
    }
}

impl ToSqlParam for i64 {
    fn to_param(&self) -> lumos_core::query::QueryParam {
        lumos_core::query::QueryParam::Integer(*self)
    }
}

impl ToSqlParam for f32 {
    fn to_param(&self) -> lumos_core::query::QueryParam {
        lumos_core::query::QueryParam::Float(*self as f64)
    }
}

impl ToSqlParam for f64 {
    fn to_param(&self) -> lumos_core::query::QueryParam {
        lumos_core::query::QueryParam::Float(*self)
    }
}

impl ToSqlParam for bool {
    fn to_param(&self) -> lumos_core::query::QueryParam {
        lumos_core::query::QueryParam::Boolean(*self)
    }
}

impl<T: ToSqlParam> ToSqlParam for Option<T> {
    fn to_param(&self) -> lumos_core::query::QueryParam {
        match self {
            Some(value) => value.to_param(),
            None => lumos_core::query::QueryParam::Null,
        }
    }
} 