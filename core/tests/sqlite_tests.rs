use lumos_core::{
    LumosError, Result,
    sqlite::{SqliteEngine, schema::{Column, SchemaManager}},
};
use tempfile::tempdir;
use std::path::Path;

/// Test SQLite engine initialization
#[test]
fn test_sqlite_engine_init() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.db");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the engine
    let mut engine = SqliteEngine::new(db_path_str);
    engine.init()?;
    
    // Verify the connection is established
    let conn = engine.connection()?;
    assert!(Path::new(db_path_str).exists());
    
    // Verify we can execute a simple query
    let result = engine.execute("SELECT 1", &[])?;
    assert_eq!(result, 0); // Non-mutation query affects 0 rows
    
    Ok(())
}

/// Test SQLite table operations
#[test]
fn test_sqlite_table_operations() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.db");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the engine
    let mut engine = SqliteEngine::new(db_path_str);
    engine.init()?;
    
    // Create a test table
    engine.create_table(
        "test_table",
        &[
            ("id", "INTEGER PRIMARY KEY"),
            ("name", "TEXT NOT NULL"),
            ("value", "REAL"),
        ],
    )?;
    
    // Insert some data
    engine.execute(
        "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
        &[&1, &"test1", &10.5],
    )?;
    
    engine.execute(
        "INSERT INTO test_table (id, name, value) VALUES (?, ?, ?)",
        &[&2, &"test2", &20.5],
    )?;
    
    // Query the data
    let rows = engine.query_all(
        "SELECT id, name, value FROM test_table ORDER BY id",
        &[],
    )?;
    
    // Verify the results
    assert_eq!(rows.len(), 2);
    
    let row1_id: i64 = rows[0].get(0)?;
    let row1_name: String = rows[0].get(1)?;
    let row1_value: f64 = rows[0].get(2)?;
    
    assert_eq!(row1_id, 1);
    assert_eq!(row1_name, "test1");
    assert_eq!(row1_value, 10.5);
    
    let row2_id: i64 = rows[1].get(0)?;
    let row2_name: String = rows[1].get(1)?;
    let row2_value: f64 = rows[1].get(2)?;
    
    assert_eq!(row2_id, 2);
    assert_eq!(row2_name, "test2");
    assert_eq!(row2_value, 20.5);
    
    Ok(())
}

/// Test SQLite transaction handling
#[test]
fn test_sqlite_transactions() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.db");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the engine
    let mut engine = SqliteEngine::new(db_path_str);
    engine.init()?;
    
    // Create a test table
    engine.create_table(
        "test_table",
        &[
            ("id", "INTEGER PRIMARY KEY"),
            ("name", "TEXT NOT NULL"),
        ],
    )?;
    
    // Test successful transaction
    {
        let transaction = engine.begin_transaction()?;
        
        transaction.execute(
            "INSERT INTO test_table (id, name) VALUES (?, ?)",
            &[&1, &"test1"],
        )?;
        
        transaction.execute(
            "INSERT INTO test_table (id, name) VALUES (?, ?)",
            &[&2, &"test2"],
        )?;
        
        transaction.commit()?;
    }
    
    // Verify the committed data
    let rows = engine.query_all(
        "SELECT COUNT(*) FROM test_table",
        &[],
    )?;
    
    let count: i64 = rows[0].get(0)?;
    assert_eq!(count, 2);
    
    // Test rolled back transaction
    {
        let transaction = engine.begin_transaction()?;
        
        transaction.execute(
            "INSERT INTO test_table (id, name) VALUES (?, ?)",
            &[&3, &"test3"],
        )?;
        
        // Rollback explicitly
        transaction.rollback()?;
    }
    
    // Verify the data was not committed
    let rows = engine.query_all(
        "SELECT COUNT(*) FROM test_table",
        &[],
    )?;
    
    let count: i64 = rows[0].get(0)?;
    assert_eq!(count, 2);
    
    // Test automatic rollback on drop
    {
        let transaction = engine.begin_transaction()?;
        
        transaction.execute(
            "INSERT INTO test_table (id, name) VALUES (?, ?)",
            &[&4, &"test4"],
        )?;
        
        // Transaction goes out of scope without commit
    }
    
    // Verify the data was not committed
    let rows = engine.query_all(
        "SELECT COUNT(*) FROM test_table",
        &[],
    )?;
    
    let count: i64 = rows[0].get(0)?;
    assert_eq!(count, 2);
    
    Ok(())
}

/// Test SchemaManager functionality
#[test]
fn test_schema_manager() -> Result<()> {
    // Create a temporary directory for the test
    let dir = tempdir().expect("Failed to create temp dir");
    let db_path = dir.path().join("test.db");
    let db_path_str = db_path.to_str().expect("Invalid path");
    
    // Create and initialize the engine
    let mut engine = SqliteEngine::new(db_path_str);
    engine.init()?;
    
    let conn = engine.connection()?;
    let schema_manager = SchemaManager::new(conn);
    
    // Create a table using the schema manager
    let columns = vec![
        Column::new("id", "INTEGER").primary_key(),
        Column::new("name", "TEXT").not_null(),
        Column::new("age", "INTEGER").default("0"),
        Column::new("active", "BOOLEAN").default("TRUE"),
    ];
    
    schema_manager.create_table("users", &columns)?;
    
    // Verify the table exists
    assert!(schema_manager.table_exists("users")?);
    
    // Get the table schema
    let table_schema = schema_manager.get_table_schema("users")?;
    
    // Verify the schema
    assert_eq!(table_schema.len(), 4);
    
    // Check the id column
    let id_col = table_schema.iter().find(|c| c.name == "id").expect("ID column not found");
    assert_eq!(id_col.data_type, "INTEGER");
    assert!(id_col.is_primary_key);
    assert!(!id_col.is_nullable);
    
    // Check the name column
    let name_col = table_schema.iter().find(|c| c.name == "name").expect("Name column not found");
    assert_eq!(name_col.data_type, "TEXT");
    assert!(!name_col.is_primary_key);
    assert!(!name_col.is_nullable);
    
    // Check the age column
    let age_col = table_schema.iter().find(|c| c.name == "age").expect("Age column not found");
    assert_eq!(age_col.data_type, "INTEGER");
    assert!(!age_col.is_primary_key);
    assert!(age_col.is_nullable);
    assert_eq!(age_col.default_value.as_deref(), Some("0"));
    
    // Add a new column
    let email_column = Column::new("email", "TEXT").not_null().default("''");
    schema_manager.add_column("users", &email_column)?;
    
    // Verify the new column was added
    let updated_schema = schema_manager.get_table_schema("users")?;
    assert_eq!(updated_schema.len(), 5);
    
    let email_col = updated_schema.iter().find(|c| c.name == "email").expect("Email column not found");
    assert_eq!(email_col.data_type, "TEXT");
    assert!(!email_col.is_nullable);
    
    // Create an index
    schema_manager.create_index("users", &["name"], true)?;
    
    // Drop the table
    schema_manager.drop_table("users")?;
    
    // Verify the table no longer exists
    assert!(!schema_manager.table_exists("users")?);
    
    Ok(())
}
