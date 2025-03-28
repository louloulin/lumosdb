use lumos_core::{
    LumosError, Result,
    sqlite::SqliteEngine,
    duckdb::DuckDbEngine,
    query::{
        Query, QueryType, EngineType, QueryParam,
        parser::QueryParser,
        router::QueryRouter,
        executor::QueryExecutor,
    },
};
use tempfile::tempdir;
use std::sync::Arc;

/// Test query parsing
#[test]
fn test_query_parser() -> Result<()> {
    let parser = QueryParser::new();
    
    // Test SELECT query detection
    let sql = "SELECT * FROM users WHERE id = 1";
    let query_type = parser.parse_query_type(sql)?;
    assert_eq!(query_type, QueryType::Select);
    
    // Test INSERT query detection
    let sql = "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')";
    let query_type = parser.parse_query_type(sql)?;
    assert_eq!(query_type, QueryType::Insert);
    
    // Test UPDATE query detection
    let sql = "UPDATE users SET name = 'John' WHERE id = 1";
    let query_type = parser.parse_query_type(sql)?;
    assert_eq!(query_type, QueryType::Update);
    
    // Test DELETE query detection
    let sql = "DELETE FROM users WHERE id = 1";
    let query_type = parser.parse_query_type(sql)?;
    assert_eq!(query_type, QueryType::Delete);
    
    // Test CREATE TABLE query detection
    let sql = "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
    let query_type = parser.parse_query_type(sql)?;
    assert_eq!(query_type, QueryType::SchemaChange);
    
    // Test ALTER TABLE query detection
    let sql = "ALTER TABLE users ADD COLUMN email TEXT";
    let query_type = parser.parse_query_type(sql)?;
    assert_eq!(query_type, QueryType::SchemaChange);
    
    // Test DROP TABLE query detection
    let sql = "DROP TABLE users";
    let query_type = parser.parse_query_type(sql)?;
    assert_eq!(query_type, QueryType::SchemaChange);
    
    // Test analytical query detection
    let sql = "SELECT date, SUM(amount) FROM sales GROUP BY date ORDER BY date";
    let query_type = parser.parse_query_type(sql)?;
    assert_eq!(query_type, QueryType::Select);
    assert!(parser.is_analytical_query(sql));
    
    // Test non-analytical query detection
    let sql = "SELECT * FROM users WHERE id = 1";
    assert!(!parser.is_analytical_query(sql));
    
    // Test parameter extraction
    let sql = "SELECT * FROM users WHERE id = ? AND name = ?";
    let params = parser.extract_parameters(sql);
    assert_eq!(params, 2);
    
    // Test table extraction
    let sql = "SELECT * FROM users JOIN orders ON users.id = orders.user_id";
    let tables = parser.extract_tables(sql);
    assert_eq!(tables.len(), 2);
    assert!(tables.contains(&"users".to_string()));
    assert!(tables.contains(&"orders".to_string()));
    
    Ok(())
}

/// Test query routing
#[test]
fn test_query_router() -> Result<()> {
    let parser = QueryParser::new();
    let router = QueryRouter::new();
    
    // Test DML query routing to SQLite
    let sql = "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')";
    let query_type = parser.parse_query_type(sql)?;
    let is_analytical = parser.is_analytical_query(sql);
    let engine_type = router.route_query(query_type.clone(), is_analytical)?;
    assert_eq!(engine_type, EngineType::SQLite);
    
    // Test simple SELECT query routing to SQLite
    let sql = "SELECT * FROM users WHERE id = 1";
    let query_type = parser.parse_query_type(sql)?;
    let is_analytical = parser.is_analytical_query(sql);
    let engine_type = router.route_query(query_type.clone(), is_analytical)?;
    assert_eq!(engine_type, EngineType::SQLite);
    
    // Test analytical query routing to DuckDB
    let sql = "SELECT date, SUM(amount) FROM sales GROUP BY date ORDER BY date";
    let query_type = parser.parse_query_type(sql)?;
    let is_analytical = parser.is_analytical_query(sql);
    let engine_type = router.route_query(query_type.clone(), is_analytical)?;
    assert_eq!(engine_type, EngineType::DuckDB);
    
    // Test schema change query routing to both engines
    let sql = "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT)";
    let query_type = parser.parse_query_type(sql)?;
    let is_analytical = parser.is_analytical_query(sql);
    let engine_type = router.route_query(query_type.clone(), is_analytical)?;
    assert_eq!(engine_type, EngineType::Both);
    
    Ok(())
}

/// Test query execution with real engines
#[test]
fn test_query_execution() -> Result<()> {
    // Create temporary directories for the test databases
    let sqlite_dir = tempdir().expect("Failed to create temp dir for SQLite");
    let sqlite_path = sqlite_dir.path().join("test.db");
    let sqlite_path_str = sqlite_path.to_str().expect("Invalid path");
    
    let duckdb_dir = tempdir().expect("Failed to create temp dir for DuckDB");
    let duckdb_path = duckdb_dir.path().join("test.duckdb");
    let duckdb_path_str = duckdb_path.to_str().expect("Invalid path");
    
    // Create and initialize the engines
    let mut sqlite_engine = SqliteEngine::new(sqlite_path_str);
    sqlite_engine.init()?;
    
    let mut duckdb_engine = DuckDbEngine::new(duckdb_path_str);
    duckdb_engine.init()?;
    
    // Wrap engines in Arc
    let sqlite = Arc::new(sqlite_engine);
    let duckdb = Arc::new(duckdb_engine);
    
    // Create executor, parser, and router
    let executor = QueryExecutor::new(sqlite.clone(), duckdb.clone());
    let parser = QueryParser::new();
    let router = QueryRouter::new();
    
    // Create test tables in both engines
    let create_table_sql = "CREATE TABLE test_table (id INTEGER, name TEXT, value REAL)";
    let query_type = parser.parse_query_type(create_table_sql)?;
    let is_analytical = parser.is_analytical_query(create_table_sql);
    let engine_type = router.route_query(query_type.clone(), is_analytical)?;
    
    let query = Query {
        sql: create_table_sql.to_string(),
        params: vec![],
        query_type,
        engine_type,
    };
    
    executor.execute_query(&query)?;
    
    // Insert data using SQLite engine
    let insert_sql = "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)";
    let query_type = parser.parse_query_type(insert_sql)?;
    let is_analytical = parser.is_analytical_query(insert_sql);
    let engine_type = router.route_query(query_type.clone(), is_analytical)?;
    
    let params = vec![
        QueryParam::Integer(1),
        QueryParam::Text("test1".to_string()),
        QueryParam::Real(10.5),
    ];
    
    let query = Query {
        sql: insert_sql.to_string(),
        params,
        query_type,
        engine_type,
    };
    
    executor.execute_query(&query)?;
    
    // Insert more data
    let params = vec![
        QueryParam::Integer(2),
        QueryParam::Text("test2".to_string()),
        QueryParam::Real(20.5),
    ];
    
    let query = Query {
        sql: insert_sql.to_string(),
        params,
        query_type: QueryType::Insert,
        engine_type: EngineType::SQLite,
    };
    
    executor.execute_query(&query)?;
    
    // Query data from SQLite
    let select_sql = "SELECT * FROM test_table WHERE id = ?";
    let query_type = parser.parse_query_type(select_sql)?;
    let is_analytical = parser.is_analytical_query(select_sql);
    let engine_type = router.route_query(query_type.clone(), is_analytical)?;
    
    let params = vec![QueryParam::Integer(1)];
    
    let query = Query {
        sql: select_sql.to_string(),
        params,
        query_type,
        engine_type,
    };
    
    let result = executor.execute_query(&query)?;
    
    // Verify the result
    match result {
        lumos_core::query::QueryResult::Rows(rows) => {
            assert_eq!(rows.len(), 1);
            
            // Check row values
            let row = &rows[0];
            assert_eq!(row["id"].as_i64().unwrap(), 1);
            assert_eq!(row["name"].as_str().unwrap(), "test1");
            assert!(row["value"].as_f64().unwrap() - 10.5 < 0.001);
        },
        _ => panic!("Expected rows result"),
    }
    
    // Test analytical query
    let analytical_sql = "SELECT SUM(value) AS total_value FROM test_table GROUP BY id ORDER BY id";
    let query_type = parser.parse_query_type(analytical_sql)?;
    let is_analytical = parser.is_analytical_query(analytical_sql);
    let engine_type = router.route_query(query_type.clone(), is_analytical)?;
    
    assert_eq!(engine_type, EngineType::DuckDB);
    
    let query = Query {
        sql: analytical_sql.to_string(),
        params: vec![],
        query_type,
        engine_type,
    };
    
    let result = executor.execute_query(&query)?;
    
    // Verify the analytical result
    match result {
        lumos_core::query::QueryResult::Rows(rows) => {
            assert_eq!(rows.len(), 2);
            
            // Check first row values - should be for id 1
            let row = &rows[0];
            assert_eq!(row["id"].as_i64().unwrap(), 1);
            assert!(row["total_value"].as_f64().unwrap() - 10.5 < 0.001);
            
            // Check second row values - should be for id 2
            let row = &rows[1];
            assert_eq!(row["id"].as_i64().unwrap(), 2);
            assert!(row["total_value"].as_f64().unwrap() - 20.5 < 0.001);
        },
        _ => panic!("Expected rows result"),
    }
    
    Ok(())
}
