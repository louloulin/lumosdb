use lumos_core::{
    LumosError, Result,
    duckdb::{DuckDbEngine, analytics::AnalyticsEngine},
};
use tempfile::tempdir;
use std::path::Path;
use serde_json::json;

/// Test DuckDB engine initialization
#[test]
fn test_duckdb_engine_init() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.duckdb");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the engine
    let mut engine = DuckDbEngine::new(db_path_str);
    engine.init()?;
    
    // Verify the connection is established
    let conn = engine.connection()?;
    assert!(Path::new(db_path_str).exists());
    
    // Verify we can execute a simple query
    let result = engine.execute("SELECT 1")?;
    assert_eq!(result, 0); // SELECT affects 0 rows
    
    Ok(())
}

/// Test DuckDB table operations
#[test]
fn test_duckdb_table_operations() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.duckdb");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the engine
    let mut engine = DuckDbEngine::new(db_path_str);
    engine.init()?;
    
    // Create a test table with SQL
    engine.execute("CREATE TABLE test_table (id INTEGER, name VARCHAR, value DOUBLE)")?;
    
    // Verify the table exists
    assert!(engine.table_exists("test_table")?);
    
    // Insert some data
    engine.execute_with_params(
        "INSERT INTO test_table VALUES (?, ?, ?)",
        &[&1, &"test1", &10.5],
    )?;
    
    engine.execute_with_params(
        "INSERT INTO test_table VALUES (?, ?, ?)",
        &[&2, &"test2", &20.5],
    )?;
    
    // Query the data
    let rows = engine.query(
        "SELECT id, name, value FROM test_table ORDER BY id",
        &[],
        |row| {
            let id: i32 = row.get(0)?;
            let name: String = row.get(1)?;
            let value: f64 = row.get(2)?;
            
            Ok((id, name, value))
        }
    )?;
    
    // Verify the results
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0], (1, "test1".to_string(), 10.5));
    assert_eq!(rows[1], (2, "test2".to_string(), 20.5));
    
    Ok(())
}

/// Test creating a table from a query
#[test]
fn test_create_table_as() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.duckdb");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the engine
    let mut engine = DuckDbEngine::new(db_path_str);
    engine.init()?;
    
    // Create a test table
    engine.execute("CREATE TABLE source_table (id INTEGER, name VARCHAR, value DOUBLE)")?;
    
    // Insert some data
    engine.execute_with_params(
        "INSERT INTO source_table VALUES (?, ?, ?)",
        &[&1, &"test1", &10.5],
    )?;
    
    engine.execute_with_params(
        "INSERT INTO source_table VALUES (?, ?, ?)",
        &[&2, &"test2", &20.5],
    )?;
    
    // Create a new table from a query
    engine.create_table_as(
        "derived_table", 
        "SELECT id, name, value * 2 AS doubled_value FROM source_table WHERE id > 0"
    )?;
    
    // Verify the new table exists
    assert!(engine.table_exists("derived_table")?);
    
    // Query the derived table
    let rows = engine.query(
        "SELECT id, name, doubled_value FROM derived_table ORDER BY id",
        &[],
        |row| {
            let id: i32 = row.get(0)?;
            let name: String = row.get(1)?;
            let value: f64 = row.get(2)?;
            
            Ok((id, name, value))
        }
    )?;
    
    // Verify the results
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0], (1, "test1".to_string(), 21.0));
    assert_eq!(rows[1], (2, "test2".to_string(), 41.0));
    
    Ok(())
}

/// Test CSV import/export
#[test]
fn test_csv_operations() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.duckdb");
    let db_path_str = db_path.to_str().expect("Invalid path");
    let csv_path = dir.path().join("test.csv");
    let csv_path_str = csv_path.to_str().expect("Invalid path");
    
    // Create CSV file
    std::fs::write(
        &csv_path,
        "id,name,value\n1,test1,10.5\n2,test2,20.5\n"
    ).expect("Failed to write CSV file");
    
    // Create and initialize the engine
    let mut engine = DuckDbEngine::new(db_path_str);
    engine.init()?;
    
    // Import CSV file
    engine.import_csv("csv_table", csv_path_str, true)?;
    
    // Verify the table exists
    assert!(engine.table_exists("csv_table")?);
    
    // Query the data
    let rows = engine.query(
        "SELECT id, name, value FROM csv_table ORDER BY id",
        &[],
        |row| {
            let id: i32 = row.get(0)?;
            let name: String = row.get(1)?;
            let value: f64 = row.get(2)?;
            
            Ok((id, name, value))
        }
    )?;
    
    // Verify the results
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0], (1, "test1".to_string(), 10.5));
    assert_eq!(rows[1], (2, "test2".to_string(), 20.5));
    
    // Create another table and export to CSV
    engine.execute("CREATE TABLE export_table (id INTEGER, name VARCHAR, value DOUBLE)")?;
    
    engine.execute_with_params(
        "INSERT INTO export_table VALUES (?, ?, ?)",
        &[&3, &"test3", &30.5],
    )?;
    
    engine.execute_with_params(
        "INSERT INTO export_table VALUES (?, ?, ?)",
        &[&4, &"test4", &40.5],
    )?;
    
    // Export to CSV
    let export_csv_path = dir.path().join("export.csv");
    let export_csv_path_str = export_csv_path.to_str().expect("Invalid path");
    
    engine.export_csv("export_table", export_csv_path_str, true)?;
    
    // Verify the CSV file was created
    assert!(Path::new(export_csv_path_str).exists());
    
    Ok(())
}

/// Test analytics engine
#[test]
fn test_analytics_engine() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.duckdb");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the engine
    let mut engine = DuckDbEngine::new(db_path_str);
    engine.init()?;
    
    let conn = engine.connection()?;
    let analytics = AnalyticsEngine::new(conn);
    
    // Create a test table
    engine.execute("
        CREATE TABLE sales (
            id INTEGER,
            date DATE,
            product VARCHAR,
            amount DOUBLE,
            customer_id INTEGER
        )
    ")?;
    
    // Insert some data
    engine.execute("
        INSERT INTO sales VALUES
        (1, '2023-01-01', 'Product A', 100.50, 1),
        (2, '2023-01-02', 'Product B', 200.75, 2),
        (3, '2023-01-03', 'Product A', 150.25, 3),
        (4, '2023-01-04', 'Product C', 300.00, 1),
        (5, '2023-01-05', 'Product B', 250.50, 2)
    ")?;
    
    // Execute an analytics query
    let result = analytics.execute_query(
        "SELECT product, SUM(amount) as total_sales FROM sales GROUP BY product ORDER BY total_sales DESC",
        &[],
    )?;
    
    // Verify the results
    assert_eq!(result.columns.len(), 2);
    assert_eq!(result.columns[0], "product");
    assert_eq!(result.columns[1], "total_sales");
    assert_eq!(result.rows.len(), 3);
    
    // First row should be Product B with highest sales
    assert_eq!(result.rows[0][0], json!("Product B"));
    
    // Generate summary statistics
    let summary = analytics.generate_summary("sales")?;
    
    // Verify summary contains columns
    assert!(summary.contains_key("column_name"));
    
    // Test time series analysis
    let time_series = analytics.time_series_analysis(
        "sales",
        "date",
        "amount",
        "1 day",
        "SUM",
    )?;
    
    // Verify time series results
    assert_eq!(time_series.columns.len(), 2);
    assert_eq!(time_series.columns[0], "time_bucket");
    assert_eq!(time_series.columns[1], "SUM_value");
    assert_eq!(time_series.rows.len(), 5); // One row per day
    
    // Test correlation analysis
    let correlation = analytics.correlation_analysis(
        "sales",
        "id",
        "amount",
    )?;
    
    // Correlation should be a number
    assert!(correlation >= -1.0 && correlation <= 1.0);
    
    Ok(())
}
