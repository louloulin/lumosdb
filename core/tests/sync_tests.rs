use lumos_core::{
    LumosError, Result,
    sqlite::SqliteEngine,
    duckdb::DuckDbEngine,
    sync::{
        SyncManager,
        tracker::ChangeTracker,
        strategy::{SyncStrategy, SyncStrategyType},
    },
};
use tempfile::tempdir;
use std::sync::Arc;

/// Test change tracker functionality
#[test]
fn test_change_tracker() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.db");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the SQLite engine
    let mut engine = SqliteEngine::new(db_path_str);
    engine.init()?;
    
    // Create test tables
    engine.execute(
        "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, value REAL)",
        &[],
    )?;
    
    // Create the change tracker
    let tracker = ChangeTracker::new(engine.connection()?);
    
    // Initialize tracking for the test table
    tracker.initialize_tracking("test_table")?;
    
    // Verify tracking table exists
    let tracking_table = format!("_lumos_track_{}", "test_table");
    assert!(engine.table_exists(&tracking_table)?);
    
    // Insert some data into the test table
    engine.execute(
        "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
        &[&1, &"test1", &10.5],
    )?;
    
    engine.execute(
        "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
        &[&2, &"test2", &20.5],
    )?;
    
    // Verify changes were tracked
    let changes = tracker.get_changes("test_table")?;
    assert_eq!(changes.len(), 2);
    
    // Verify the tracked changes
    let change1 = &changes[0];
    assert_eq!(change1.operation, "INSERT");
    assert_eq!(change1.record_id, 1);
    
    let change2 = &changes[1];
    assert_eq!(change2.operation, "INSERT");
    assert_eq!(change2.record_id, 2);
    
    // Update a record
    engine.execute(
        "UPDATE test_table SET name = ?, value = ? WHERE id = ?",
        &[&"updated_test1", &15.5, &1],
    )?;
    
    // Verify update was tracked
    let changes = tracker.get_changes("test_table")?;
    assert_eq!(changes.len(), 3);
    
    let change3 = &changes[2];
    assert_eq!(change3.operation, "UPDATE");
    assert_eq!(change3.record_id, 1);
    
    // Delete a record
    engine.execute(
        "DELETE FROM test_table WHERE id = ?",
        &[&2],
    )?;
    
    // Verify delete was tracked
    let changes = tracker.get_changes("test_table")?;
    assert_eq!(changes.len(), 4);
    
    let change4 = &changes[3];
    assert_eq!(change4.operation, "DELETE");
    assert_eq!(change4.record_id, 2);
    
    // Mark changes as synchronized
    tracker.mark_synchronized("test_table", &[change1.id, change2.id, change3.id, change4.id])?;
    
    // Verify changes were marked as synchronized
    let changes = tracker.get_changes("test_table")?;
    assert_eq!(changes.len(), 0); // All changes synchronized
    
    Ok(())
}

/// Test full synchronization strategy
#[test]
fn test_full_sync_strategy() -> Result<()> {
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
    
    // Create test table in SQLite
    sqlite_engine.execute(
        "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, value REAL)",
        &[],
    )?;
    
    // Insert some data
    sqlite_engine.execute(
        "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
        &[&1, &"test1", &10.5],
    )?;
    
    sqlite_engine.execute(
        "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
        &[&2, &"test2", &20.5],
    )?;
    
    // Create a sync strategy
    let strategy = SyncStrategy::new(
        SyncStrategyType::Full,
        Arc::new(sqlite_engine),
        Arc::new(duckdb_engine),
    );
    
    // Synchronize the test table
    strategy.sync_table("test_table")?;
    
    // Verify the table was created in DuckDB and data was synchronized
    let duckdb = strategy.duckdb();
    assert!(duckdb.table_exists("test_table")?);
    
    // Query the data from DuckDB
    let rows = duckdb.query(
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

/// Test incremental synchronization strategy
#[test]
fn test_incremental_sync_strategy() -> Result<()> {
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
    
    // Create the SyncManager
    let sqlite = Arc::new(sqlite_engine);
    let duckdb = Arc::new(duckdb_engine);
    let sync_manager = SyncManager::new(sqlite.clone(), duckdb.clone());
    
    // Create test table in SQLite and initialize tracking
    sqlite.execute(
        "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, value REAL)",
        &[],
    )?;
    
    sync_manager.initialize_tracking("test_table")?;
    
    // Create matching table in DuckDB
    duckdb.execute("CREATE TABLE test_table (id INTEGER, name VARCHAR, value DOUBLE)")?;
    
    // Insert initial data in SQLite
    sqlite.execute(
        "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
        &[&1, &"test1", &10.5],
    )?;
    
    sqlite.execute(
        "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
        &[&2, &"test2", &20.5],
    )?;
    
    // Perform initial synchronization
    sync_manager.sync_table("test_table", SyncStrategyType::Incremental)?;
    
    // Verify data in DuckDB
    let rows = duckdb.query(
        "SELECT id, name, value FROM test_table ORDER BY id",
        &[],
        |row| {
            let id: i32 = row.get(0)?;
            let name: String = row.get(1)?;
            let value: f64 = row.get(2)?;
            
            Ok((id, name, value))
        }
    )?;
    
    // Verify initial sync results
    assert_eq!(rows.len(), 2);
    assert_eq!(rows[0], (1, "test1".to_string(), 10.5));
    assert_eq!(rows[1], (2, "test2".to_string(), 20.5));
    
    // Make changes to the SQLite table
    // Update a record
    sqlite.execute(
        "UPDATE test_table SET name = ?, value = ? WHERE id = ?",
        &[&"updated_test1", &15.5, &1],
    )?;
    
    // Delete a record
    sqlite.execute(
        "DELETE FROM test_table WHERE id = ?",
        &[&2],
    )?;
    
    // Insert a new record
    sqlite.execute(
        "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
        &[&3, &"test3", &30.5],
    )?;
    
    // Perform incremental synchronization
    sync_manager.sync_table("test_table", SyncStrategyType::Incremental)?;
    
    // Verify synchronized changes in DuckDB
    let rows = duckdb.query(
        "SELECT id, name, value FROM test_table ORDER BY id",
        &[],
        |row| {
            let id: i32 = row.get(0)?;
            let name: String = row.get(1)?;
            let value: f64 = row.get(2)?;
            
            Ok((id, name, value))
        }
    )?;
    
    // Verify incremental sync results
    assert_eq!(rows.len(), 2); // Record with id=2 was deleted
    
    let row1 = &rows[0];
    assert_eq!(row1.0, 1);
    assert_eq!(row1.1, "updated_test1");
    assert_eq!(row1.2, 15.5);
    
    let row2 = &rows[1];
    assert_eq!(row2.0, 3);
    assert_eq!(row2.1, "test3");
    assert_eq!(row2.2, 30.5);
    
    Ok(())
}

/// Test synchronization of multiple tables
#[test]
fn test_multi_table_sync() -> Result<()> {
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
    
    // Create the SyncManager
    let sqlite = Arc::new(sqlite_engine);
    let duckdb = Arc::new(duckdb_engine);
    let sync_manager = SyncManager::new(sqlite.clone(), duckdb.clone());
    
    // Create test tables in SQLite
    sqlite.execute(
        "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT)",
        &[],
    )?;
    
    sqlite.execute(
        "CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL, date TEXT)",
        &[],
    )?;
    
    // Initialize tracking for both tables
    sync_manager.initialize_tracking("users")?;
    sync_manager.initialize_tracking("orders")?;
    
    // Insert data into users table
    sqlite.execute(
        "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
        &[&1, &"User 1", &"user1@example.com"],
    )?;
    
    sqlite.execute(
        "INSERT INTO users (id, name, email) VALUES (?, ?, ?)",
        &[&2, &"User 2", &"user2@example.com"],
    )?;
    
    // Insert data into orders table
    sqlite.execute(
        "INSERT INTO orders (id, user_id, amount, date) VALUES (?, ?, ?, ?)",
        &[&1, &1, &100.0, &"2023-01-01"],
    )?;
    
    sqlite.execute(
        "INSERT INTO orders (id, user_id, amount, date) VALUES (?, ?, ?, ?)",
        &[&2, &1, &200.0, &"2023-01-02"],
    )?;
    
    sqlite.execute(
        "INSERT INTO orders (id, user_id, amount, date) VALUES (?, ?, ?, ?)",
        &[&3, &2, &300.0, &"2023-01-03"],
    )?;
    
    // Synchronize all tables
    let tables = vec!["users".to_string(), "orders".to_string()];
    sync_manager.sync_tables(&tables, SyncStrategyType::Full)?;
    
    // Verify all tables were created in DuckDB and data was synchronized
    assert!(duckdb.table_exists("users")?);
    assert!(duckdb.table_exists("orders")?);
    
    // Query users from DuckDB
    let users = duckdb.query(
        "SELECT id, name, email FROM users ORDER BY id",
        &[],
        |row| {
            let id: i32 = row.get(0)?;
            let name: String = row.get(1)?;
            let email: String = row.get(2)?;
            
            Ok((id, name, email))
        }
    )?;
    
    // Verify user results
    assert_eq!(users.len(), 2);
    assert_eq!(users[0], (1, "User 1".to_string(), "user1@example.com".to_string()));
    assert_eq!(users[1], (2, "User 2".to_string(), "user2@example.com".to_string()));
    
    // Query orders from DuckDB
    let orders = duckdb.query(
        "SELECT id, user_id, amount, date FROM orders ORDER BY id",
        &[],
        |row| {
            let id: i32 = row.get(0)?;
            let user_id: i32 = row.get(1)?;
            let amount: f64 = row.get(2)?;
            let date: String = row.get(3)?;
            
            Ok((id, user_id, amount, date))
        }
    )?;
    
    // Verify order results
    assert_eq!(orders.len(), 3);
    assert_eq!(orders[0], (1, 1, 100.0, "2023-01-01".to_string()));
    assert_eq!(orders[1], (2, 1, 200.0, "2023-01-02".to_string()));
    assert_eq!(orders[2], (3, 2, 300.0, "2023-01-03".to_string()));
    
    // Test analytical queries using the synchronized data
    let query = "
        SELECT 
            u.name as user_name,
            COUNT(o.id) as order_count,
            SUM(o.amount) as total_amount
        FROM 
            users u
        JOIN 
            orders o ON u.id = o.user_id
        GROUP BY 
            u.id, u.name
        ORDER BY 
            total_amount DESC
    ";
    
    let results = duckdb.query(
        query,
        &[],
        |row| {
            let user_name: String = row.get(0)?;
            let order_count: i64 = row.get(1)?;
            let total_amount: f64 = row.get(2)?;
            
            Ok((user_name, order_count, total_amount))
        }
    )?;
    
    // Verify analytical query results
    assert_eq!(results.len(), 2);
    
    // User 1 has 2 orders totaling 300
    assert_eq!(results[0].0, "User 1");
    assert_eq!(results[0].1, 2);
    assert_eq!(results[0].2, 300.0);
    
    // User 2 has 1 order totaling 300
    assert_eq!(results[1].0, "User 2");
    assert_eq!(results[1].1, 1);
    assert_eq!(results[1].2, 300.0);
    
    Ok(())
}
