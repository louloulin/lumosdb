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

    /// Check if a query needs to be executed across both engines
    fn is_cross_engine_query(&self, query: &Query) -> Result<bool> {
        // Only SELECT queries can be cross-engine
        if query.query_type != QueryType::Select {
            return Ok(false);
        }
        
        // Check if the query explicitly uses the special cross-engine syntax
        if query.sql.to_uppercase().contains("CROSSENGINE") {
            return Ok(true);
        }
        
        // Check if the query references tables from both engines
        let table_names = self.parser.extract_table_names(&query.sql);
        
        let mut has_sqlite_tables = false;
        let mut has_duckdb_tables = false;
        
        for table in &table_names {
            // Check if this table exists in SQLite
            if self.sqlite.table_exists(table)? {
                has_sqlite_tables = true;
            }
            
            // Check if this table exists in DuckDB
            if self.duckdb.table_exists(table)? {
                has_duckdb_tables = true;
            }
            
            // If we find tables in both engines, it's a cross-engine query
            if has_sqlite_tables && has_duckdb_tables {
                return Ok(true);
            }
        }
        
        Ok(false)
    }

    /// Execute a query that spans both engines
    fn execute_cross_engine_query(&mut self, query: Query) -> Result<QueryResult> {
        log::info!("Executing cross-engine query: {}", query.sql);
        
        // Start measuring time
        let start_time = std::time::Instant::now();
        
        // 1. Analyze the query to determine the best execution strategy
        let execution_plan = self.create_cross_engine_plan(&query)?;
        
        // 2. Execute the subqueries in the appropriate engines
        let intermediate_results = self.execute_cross_engine_plan(execution_plan)?;
        
        // 3. Combine the results
        let combined_result = self.combine_cross_engine_results(intermediate_results)?;
        
        // Measure execution time
        let end_time = std::time::Instant::now();
        let execution_time = end_time.duration_since(start_time).as_millis() as u64;
        
        // Create the final result
        let result = QueryResult {
            columns: combined_result.columns,
            rows: combined_result.rows,
            rows_affected: combined_result.rows_affected,
            engine_used: EngineType::Auto, // Cross-engine query uses both
            execution_time_ms: execution_time,
        };
        
        Ok(result)
    }

    /// Create an execution plan for a cross-engine query
    fn create_cross_engine_plan(&self, query: &Query) -> Result<CrossEngineExecutionPlan> {
        // This is a simplified implementation
        // A full implementation would parse the query into an AST and do sophisticated analysis
        
        // Extract the tables referenced in the query
        let table_names = self.parser.extract_table_names(&query.sql);
        
        let mut sqlite_tables = Vec::new();
        let mut duckdb_tables = Vec::new();
        
        // Categorize tables by engine
        for table in &table_names {
            if self.sqlite.table_exists(table)? {
                sqlite_tables.push(table.clone());
            }
            
            if self.duckdb.table_exists(table)? {
                duckdb_tables.push(table.clone());
            }
        }
        
        // Simplified strategy: create temporary tables for cross-engine joins
        let plan = if !sqlite_tables.is_empty() && !duckdb_tables.is_empty() {
            // Case 1: Query involves tables from both engines
            // Strategy: Export smaller tables to the other engine, then execute there
            
            // Decide which direction to go based on table sizes and query complexity
            // For this demo, we'll use a simple heuristic: count the tables
            
            if sqlite_tables.len() <= duckdb_tables.len() {
                // Export SQLite tables to DuckDB
                CrossEngineExecutionPlan::ExportToDuckDb {
                    sqlite_tables,
                    final_query: query.sql.clone(),
                }
            } else {
                // Export DuckDB tables to SQLite
                CrossEngineExecutionPlan::ExportToSqlite {
                    duckdb_tables,
                    final_query: query.sql.clone(),
                }
            }
        } else {
            // Case 2: Special CROSSENGINE syntax
            // Example: SELECT * FROM CROSSENGINE(
            //   SQLite: SELECT id, name FROM users,
            //   DuckDB: SELECT id, count(*) as order_count FROM orders GROUP BY id
            // ) WHERE order_count > 5
            
            // Parse the special syntax to extract subqueries
            // This is a very simplified implementation for demonstration
            let sql = &query.sql.to_uppercase();
            
            if sql.contains("CROSSENGINE(") {
                // Find the subqueries
                let sqlite_query = if let Some(start) = sql.find("SQLITE:") {
                    let remaining = &sql[start + 7..];
                    
                    if let Some(end) = remaining.find(",") {
                        remaining[..end].trim().to_string()
                    } else {
                        "".to_string()
                    }
                } else {
                    "".to_string()
                };
                
                let duckdb_query = if let Some(start) = sql.find("DUCKDB:") {
                    let remaining = &sql[start + 7..];
                    
                    if let Some(end) = remaining.find(")") {
                        remaining[..end].trim().to_string()
                    } else {
                        "".to_string()
                    }
                } else {
                    "".to_string()
                };
                
                // Extract the outer query
                let outer_query = if let Some(end) = sql.find(")") {
                    if sql.len() > end + 1 {
                        sql[end + 1..].trim().to_string()
                    } else {
                        "".to_string()
                    }
                } else {
                    "".to_string()
                };
                
                CrossEngineExecutionPlan::SubQueries {
                    sqlite_query,
                    duckdb_query,
                    outer_query,
                }
            } else {
                // Fallback to a single engine
                CrossEngineExecutionPlan::SingleEngine {
                    engine: if !sqlite_tables.is_empty() {
                        EngineType::Sqlite
                    } else {
                        EngineType::DuckDb
                    },
                    query: query.sql.clone(),
                }
            }
        };
        
        Ok(plan)
    }

    /// Execute a cross-engine execution plan
    fn execute_cross_engine_plan(&mut self, plan: CrossEngineExecutionPlan) -> Result<Vec<IntermediateResult>> {
        match plan {
            CrossEngineExecutionPlan::SingleEngine { engine, query } => {
                // This is not really a cross-engine query, so just execute it directly
                let mut query_obj = Query::new(&query);
                query_obj.engine_type = engine;
                let result = self.execute(query_obj)?;
                
                Ok(vec![IntermediateResult {
                    engine,
                    columns: result.columns,
                    rows: result.rows,
                }])
            },
            
            CrossEngineExecutionPlan::SubQueries { sqlite_query, duckdb_query, outer_query } => {
                let mut results = Vec::new();
                
                // Execute SQLite subquery
                if !sqlite_query.is_empty() {
                    let mut query = Query::new(&sqlite_query);
                    query.engine_type = EngineType::Sqlite;
                    let result = executor::execute_on_sqlite(&self.sqlite, &query)?;
                    
                    results.push(IntermediateResult {
                        engine: EngineType::Sqlite,
                        columns: result.columns,
                        rows: result.rows,
                    });
                }
                
                // Execute DuckDB subquery
                if !duckdb_query.is_empty() {
                    let mut query = Query::new(&duckdb_query);
                    query.engine_type = EngineType::DuckDb;
                    let result = executor::execute_on_duckdb(&self.duckdb, &query)?;
                    
                    results.push(IntermediateResult {
                        engine: EngineType::DuckDb,
                        columns: result.columns,
                        rows: result.rows,
                    });
                }
                
                Ok(results)
            },
            
            CrossEngineExecutionPlan::ExportToDuckDb { sqlite_tables, final_query } => {
                // Export SQLite tables to DuckDB as temporary tables
                for table in &sqlite_tables {
                    self.export_sqlite_to_duckdb(table)?;
                }
                
                // Execute the final query in DuckDB
                let mut query = Query::new(&final_query);
                query.engine_type = EngineType::DuckDb;
                let result = executor::execute_on_duckdb(&self.duckdb, &query)?;
                
                Ok(vec![IntermediateResult {
                    engine: EngineType::DuckDb,
                    columns: result.columns,
                    rows: result.rows,
                }])
            },
            
            CrossEngineExecutionPlan::ExportToSqlite { duckdb_tables, final_query } => {
                // Export DuckDB tables to SQLite as temporary tables
                for table in &duckdb_tables {
                    self.export_duckdb_to_sqlite(table)?;
                }
                
                // Execute the final query in SQLite
                let mut query = Query::new(&final_query);
                query.engine_type = EngineType::Sqlite;
                let result = executor::execute_on_sqlite(&self.sqlite, &query)?;
                
                Ok(vec![IntermediateResult {
                    engine: EngineType::Sqlite,
                    columns: result.columns,
                    rows: result.rows,
                }])
            },
        }
    }

    /// Export a SQLite table to DuckDB as a temporary table
    fn export_sqlite_to_duckdb(&self, table: &str) -> Result<()> {
        log::info!("Exporting SQLite table to DuckDB: {}", table);
        
        // 1. Get schema from SQLite
        let sqlite_conn = self.sqlite.connection()?;
        let sqlite_schema = crate::sqlite::schema::SchemaManager::new(&sqlite_conn);
        let columns = sqlite_schema.get_table_schema(table)?;
        
        // 2. Create temp table in DuckDB
        let temp_table = format!("temp_{}", table);
        
        // Create the table in DuckDB
        let columns_sql = columns.iter()
            .map(|col| {
                let mut sql = format!("{} ", col.name);
                
                // Map SQLite types to DuckDB types
                let duckdb_type = match col.data_type.to_uppercase().as_str() {
                    "INTEGER" => "BIGINT",
                    "REAL" => "DOUBLE",
                    "TEXT" => "VARCHAR",
                    "BLOB" => "BLOB",
                    _ => "VARCHAR",
                };
                
                sql.push_str(duckdb_type);
                
                if col.is_not_null {
                    sql.push_str(" NOT NULL");
                }
                
                sql
            })
            .collect::<Vec<_>>()
            .join(", ");
        
        let create_sql = format!("CREATE TEMPORARY TABLE {} ({})", temp_table, columns_sql);
        self.duckdb.execute(&create_sql)?;
        
        // 3. Export data from SQLite
        let column_names = columns.iter()
            .map(|col| col.name.clone())
            .collect::<Vec<_>>()
            .join(", ");
        
        let select_sql = format!("SELECT {} FROM {}", column_names, table);
        let rows = self.sqlite.query_all(&select_sql, &[])?;
        
        // 4. Insert data into DuckDB
        if !rows.is_empty() {
            // Build INSERT statement with placeholders
            let placeholders = std::iter::repeat("?")
                .take(columns.len())
                .collect::<Vec<_>>()
                .join(", ");
            
            let insert_sql = format!("INSERT INTO {} ({}) VALUES ({})",
                                   temp_table, column_names, placeholders);
            
            // Insert in batches
            let batch_size = 1000;
            let conn = self.duckdb.connection()?;
            
            for batch in rows.chunks(batch_size) {
                for row in batch {
                    // 首先收集所有临时字符串
                    let mut string_values = Vec::new();
                    
                    // 创建参数向量
                    let mut params: Vec<String> = Vec::with_capacity(columns.len());
                    
                    // 处理每个列的值
                    for col in &columns {
                        if let Some(value) = row.get(&col.name) {
                            params.push(value.clone());
                        } else {
                            params.push("NULL".to_string());
                        }
                    }
                    
                    // Convert string values to SQL parameters
                    let sql_params: Vec<&dyn rusqlite::ToSql> = params.iter()
                        .map(|s| s as &dyn rusqlite::ToSql)
                        .collect();
                    
                    // 执行插入操作
                    conn.execute(&insert_sql, &sql_params)?;
                }
            }
            
            conn.execute("BEGIN", &[])?;
            conn.execute("COMMIT", &[])?;
        }
        
        // 5. Create a view that maps to the original table name
        let view_sql = format!("CREATE OR REPLACE TEMPORARY VIEW {} AS SELECT * FROM {}", 
                               table, temp_table);
        self.duckdb.execute(&view_sql)?;
        
        Ok(())
    }

    /// Export a DuckDB table to SQLite as a temporary table
    fn export_duckdb_to_sqlite(&self, table: &str) -> Result<()> {
        log::info!("Exporting DuckDB table to SQLite: {}", table);
        
        // 1. Get schema from DuckDB
        let duckdb_conn = self.duckdb.connection()?;
        
        // Get column information
        let schema_sql = format!("SELECT column_name, data_type 
                                FROM information_schema.columns 
                                WHERE table_name = '{}'", table);
        
        let columns = self.duckdb.query(&schema_sql, &[], |row| {
            let name: String = row.get(0)?;
            let data_type: String = row.get(1)?;
            
            Ok((name, data_type))
        })?;
        
        // 2. Create temp table in SQLite
        let temp_table = format!("temp_{}", table);
        
        // Create the table in SQLite
        let columns_sql = columns.iter()
            .map(|(name, data_type)| {
                let sqlite_type = match data_type.to_uppercase().as_str() {
                    "BIGINT" | "INTEGER" => "INTEGER",
                    "DOUBLE" | "REAL" => "REAL",
                    "VARCHAR" | "TEXT" => "TEXT",
                    "BLOB" => "BLOB",
                    _ => "TEXT",
                };
                
                format!("{} {}", name, sqlite_type)
            })
            .collect::<Vec<_>>()
            .join(", ");
        
        let create_sql = format!("CREATE TEMPORARY TABLE {} ({})", temp_table, columns_sql);
        self.sqlite.execute(&create_sql, &[])?;
        
        // 3. Export data from DuckDB
        let column_names = columns.iter()
            .map(|(name, _)| name.clone())
            .collect::<Vec<_>>()
            .join(", ");
        
        let select_sql = format!("SELECT {} FROM {}", column_names, table);
        
        // Use DuckDB to fetch the data
        let rows = self.duckdb.query(&select_sql, &[], |row| {
            let mut values = Vec::with_capacity(columns.len());
            
            for i in 0..columns.len() {
                let value = match row.get_ref(i)? {
                    duckdb::types::ValueRef::Null => JsonValue::Null,
                    duckdb::types::ValueRef::Boolean(b) => JsonValue::from(b),
                    duckdb::types::ValueRef::SmallInt(i) => JsonValue::from(i),
                    duckdb::types::ValueRef::Int(i) => JsonValue::from(i),
                    duckdb::types::ValueRef::BigInt(i) => JsonValue::from(i),
                    duckdb::types::ValueRef::Float(f) => JsonValue::from(f),
                    duckdb::types::ValueRef::Double(f) => JsonValue::from(f),
                    duckdb::types::ValueRef::Text(s) => JsonValue::from(s),
                    duckdb::types::ValueRef::Blob(b) => JsonValue::from(format!("<BLOB: {} bytes>", b.len())),
                    _ => JsonValue::Null,
                };
                
                values.push(value);
            }
            
            Ok(values)
        })?;
        
        // 4. Insert data into SQLite
        if !rows.is_empty() {
            // Build INSERT statement with placeholders
            let placeholders = std::iter::repeat("?")
                .take(columns.len())
                .collect::<Vec<_>>()
                .join(", ");
            
            let insert_sql = format!("INSERT INTO {} ({}) VALUES ({})",
                                   temp_table, column_names, placeholders);
            
            // Insert in batches
            let batch_size = 1000;
            let conn = self.sqlite.connection()?;
            
            for batch in rows.chunks(batch_size) {
                for row in batch {
                    // 收集所有值
                    let mut params = Vec::with_capacity(columns.len());
                    
                    for i in 0..columns.len() {
                        let column_name = &columns[i].0;
                        // 将值转换为适当的参数
                        params.push(format!("{}", row[i]));
                    }
                    
                    // Convert string values to SQL parameters
                    let sql_params: Vec<&dyn rusqlite::ToSql> = params.iter()
                        .map(|s| s as &dyn rusqlite::ToSql)
                        .collect();
                    
                    // 执行插入操作
                    conn.execute(&insert_sql, &sql_params)?;
                }
            }
            
            conn.execute("BEGIN", &[])?;
            conn.execute("COMMIT", &[])?;
        }
        
        // 5. Create a view that maps to the original table name
        let view_sql = format!("CREATE TEMP VIEW {} AS SELECT * FROM {}", table, temp_table);
        self.sqlite.execute(&view_sql, &[])?;
        
        Ok(())
    }

    /// Combine results from multiple engines
    fn combine_cross_engine_results(&self, results: Vec<IntermediateResult>) -> Result<QueryResult> {
        // If we only have one result, return it directly
        if results.len() == 1 {
            return Ok(QueryResult {
                columns: results[0].columns.clone(),
                rows: results[0].rows.clone(),
                rows_affected: results[0].rows.len(),
                engine_used: EngineType::Auto,
                execution_time_ms: 0, // Will be filled in by the caller
            });
        }
        
        // For multiple results, we need to merge them
        // This is a simplified implementation that just does a JOIN on the first column
        // In a real system, this would be more sophisticated
        
        // Check if we have exactly two results
        if results.len() != 2 {
            return Err(LumosError::Query("Only two-way joins are supported in cross-engine queries".to_string()));
        }
        
        let result1 = &results[0];
        let result2 = &results[1];
        
        // Combine columns from both results
        let mut combined_columns = result1.columns.clone();
        
        // Add columns from result2, skipping the first column (join key)
        for i in 1..result2.columns.len() {
            combined_columns.push(result2.columns[i].clone());
        }
        
        // Perform the join
        let mut combined_rows = Vec::new();
        
        for row1 in &result1.rows {
            if row1.is_empty() {
                continue;
            }
            
            let key1 = &row1[0];
            
            // Find matching rows in result2
            for row2 in &result2.rows {
                if row2.is_empty() {
                    continue;
                }
                
                let key2 = &row2[0];
                
                // If the keys match, combine the rows
                if key1 == key2 {
                    let mut combined_row = row1.clone();
                    
                    // Add columns from row2, skipping the first column (join key)
                    for i in 1..row2.len() {
                        combined_row.push(row2[i].clone());
                    }
                    
                    combined_rows.push(combined_row);
                }
            }
        }
        
        let rows_count = combined_rows.len();
        
        Ok(QueryResult {
            columns: combined_columns,
            rows: combined_rows,
            rows_affected: rows_count,
            engine_used: EngineType::Auto,
            execution_time_ms: 0, // Will be filled in by the caller
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

/// Intermediate result during cross-engine query execution
struct IntermediateResult {
    /// Engine that produced this result
    engine: EngineType,
    /// Column names
    columns: Vec<String>,
    /// Data rows
    rows: Vec<Vec<JsonValue>>,
}

/// Execution plan for a cross-engine query
enum CrossEngineExecutionPlan {
    /// No cross-engine needed, use a single engine
    SingleEngine {
        /// Engine to use
        engine: EngineType,
        /// Query to execute
        query: String,
    },
    
    /// Explicit subqueries for each engine
    SubQueries {
        /// Query to execute on SQLite
        sqlite_query: String,
        /// Query to execute on DuckDB
        duckdb_query: String,
        /// Outer query to apply to the combined results
        outer_query: String,
    },
    
    /// Export SQLite tables to DuckDB
    ExportToDuckDb {
        /// SQLite tables to export
        sqlite_tables: Vec<String>,
        /// Final query to execute
        final_query: String,
    },
    
    /// Export DuckDB tables to SQLite
    ExportToSqlite {
        /// DuckDB tables to export
        duckdb_tables: Vec<String>,
        /// Final query to execute
        final_query: String,
    },
}
