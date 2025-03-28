pub mod parser;
pub mod router;
pub mod executor;

use std::fmt;
use crate::{LumosError, Result, sqlite::SqliteEngine, duckdb::DuckDbEngine};
use serde::{Serialize, Deserialize};
use serde_json::Value as JsonValue;

/// Types of SQL queries
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum QueryType {
    /// SELECT query
    Select,
    /// INSERT query
    Insert,
    /// UPDATE query
    Update,
    /// DELETE query
    Delete,
    /// CREATE query
    Create,
    /// ALTER query
    Alter,
    /// DROP query
    Drop,
    /// Other query types
    Other,
}

impl fmt::Display for QueryType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            QueryType::Select => write!(f, "SELECT"),
            QueryType::Insert => write!(f, "INSERT"),
            QueryType::Update => write!(f, "UPDATE"),
            QueryType::Delete => write!(f, "DELETE"),
            QueryType::Create => write!(f, "CREATE"),
            QueryType::Alter => write!(f, "ALTER"),
            QueryType::Drop => write!(f, "DROP"),
            QueryType::Other => write!(f, "OTHER"),
        }
    }
}

/// Database engine type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EngineType {
    /// SQLite engine for transactional queries
    Sqlite,
    /// DuckDB engine for analytical queries
    DuckDb,
    /// Auto-select the best engine
    Auto,
}

impl fmt::Display for EngineType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EngineType::Sqlite => write!(f, "SQLite"),
            EngineType::DuckDb => write!(f, "DuckDB"),
            EngineType::Auto => write!(f, "Auto"),
        }
    }
}

/// SQL query parameters
#[derive(Debug, Clone)]
pub enum QueryParam {
    /// String parameter
    String(String),
    /// Integer parameter
    Integer(i64),
    /// Float parameter
    Float(f64),
    /// Boolean parameter
    Boolean(bool),
    /// Null parameter
    Null,
}

impl From<&str> for QueryParam {
    fn from(value: &str) -> Self {
        QueryParam::String(value.to_string())
    }
}

impl From<String> for QueryParam {
    fn from(value: String) -> Self {
        QueryParam::String(value)
    }
}

impl From<i64> for QueryParam {
    fn from(value: i64) -> Self {
        QueryParam::Integer(value)
    }
}

impl From<i32> for QueryParam {
    fn from(value: i32) -> Self {
        QueryParam::Integer(value as i64)
    }
}

impl From<f64> for QueryParam {
    fn from(value: f64) -> Self {
        QueryParam::Float(value)
    }
}

impl From<f32> for QueryParam {
    fn from(value: f32) -> Self {
        QueryParam::Float(value as f64)
    }
}

impl From<bool> for QueryParam {
    fn from(value: bool) -> Self {
        QueryParam::Boolean(value)
    }
}

/// SQL query definition
#[derive(Debug, Clone)]
pub struct Query {
    /// SQL query string
    pub sql: String,
    /// Query parameters
    pub params: Vec<QueryParam>,
    /// Query type
    pub query_type: QueryType,
    /// Target engine
    pub engine_type: EngineType,
}

impl Query {
    /// Create a new query
    pub fn new(sql: &str) -> Self {
        // Default to automatic engine selection
        Self {
            sql: sql.to_string(),
            params: Vec::new(),
            query_type: QueryType::Other, // Will be set by the parser
            engine_type: EngineType::Auto,
        }
    }

    /// Add a parameter to the query
    pub fn param<T: Into<QueryParam>>(mut self, value: T) -> Self {
        self.params.push(value.into());
        self
    }

    /// Add multiple parameters to the query
    pub fn params<T: Into<QueryParam>>(mut self, values: Vec<T>) -> Self {
        for value in values {
            self.params.push(value.into());
        }
        self
    }

    /// Set the engine type for the query
    pub fn engine(mut self, engine_type: EngineType) -> Self {
        self.engine_type = engine_type;
        self
    }
}

/// Result of a query execution
#[derive(Debug, Clone)]
pub struct QueryResult {
    /// Column names
    pub columns: Vec<String>,
    /// Data rows as JSON values
    pub rows: Vec<Vec<JsonValue>>,
    /// Number of rows affected (for UPDATE, INSERT, DELETE)
    pub rows_affected: usize,
    /// Engine used to execute the query
    pub engine_used: EngineType,
    /// Execution time in milliseconds
    pub execution_time_ms: u64,
}

impl QueryResult {
    /// Create a new query result
    pub fn new(
        columns: Vec<String>,
        rows: Vec<Vec<JsonValue>>,
        rows_affected: usize,
        engine_used: EngineType,
        execution_time_ms: u64,
    ) -> Self {
        Self {
            columns,
            rows,
            rows_affected,
            engine_used,
            execution_time_ms,
        }
    }

    /// Convert the result to a JSON array of objects
    pub fn to_json_array(&self) -> Result<Vec<JsonValue>> {
        let mut result = Vec::with_capacity(self.rows.len());

        for row in &self.rows {
            let mut obj = serde_json::Map::new();
            
            for (i, column) in self.columns.iter().enumerate() {
                if i < row.len() {
                    obj.insert(column.clone(), row[i].clone());
                }
            }
            
            result.push(JsonValue::Object(obj));
        }

        Ok(result)
    }

    /// Get the first row as a JSON object
    pub fn first_row_as_json(&self) -> Result<Option<JsonValue>> {
        if self.rows.is_empty() {
            return Ok(None);
        }

        let mut obj = serde_json::Map::new();
        
        for (i, column) in self.columns.iter().enumerate() {
            if i < self.rows[0].len() {
                obj.insert(column.clone(), self.rows[0][i].clone());
            }
        }
        
        Ok(Some(JsonValue::Object(obj)))
    }
}

/// Query executor that handles routing queries to the appropriate engine
pub struct QueryExecutor {
    /// SQLite engine
    sqlite: SqliteEngine,
    /// DuckDB engine
    duckdb: DuckDbEngine,
    /// Query parser
    parser: parser::QueryParser,
    /// Query router
    router: router::QueryRouter,
}

impl QueryExecutor {
    /// Create a new query executor
    pub fn new(sqlite: SqliteEngine, duckdb: DuckDbEngine) -> Self {
        Self {
            sqlite,
            duckdb,
            parser: parser::QueryParser::new(),
            router: router::QueryRouter::new(),
        }
    }

    /// Execute an SQL query and return the result
    pub fn execute(&mut self, query: Query) -> Result<QueryResult> {
        let mut query = query;
        
        // Parse the query to determine the query type
        query.query_type = self.parser.parse_query_type(&query.sql)?;
        
        // Use the router to determine the best engine
        let engine = if query.engine_type == EngineType::Auto {
            self.router.route(&query)?
        } else {
            query.engine_type
        };
        
        // Execute based on the selected engine
        let start_time = std::time::Instant::now();
        
        let result = match engine {
            EngineType::Sqlite => {
                executor::execute_on_sqlite(&self.sqlite, &query)?
            },
            EngineType::DuckDb => {
                executor::execute_on_duckdb(&self.duckdb, &query)?
            },
            EngineType::Auto => {
                // This shouldn't happen as we've already resolved it above
                return Err(LumosError::Other("Auto engine type not resolved".to_string()));
            }
        };
        
        let end_time = std::time::Instant::now();
        let execution_time = end_time.duration_since(start_time).as_millis() as u64;
        
        Ok(QueryResult {
            columns: result.columns,
            rows: result.rows,
            rows_affected: result.rows_affected,
            engine_used: engine,
            execution_time_ms: execution_time,
        })
    }

    /// Get a reference to the SQLite engine
    pub fn sqlite(&self) -> &SqliteEngine {
        &self.sqlite
    }

    /// Get a reference to the DuckDB engine
    pub fn duckdb(&self) -> &DuckDbEngine {
        &self.duckdb
    }
}
