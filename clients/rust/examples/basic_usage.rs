use lumos_client::{LumosClient, ClientOptions};
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // Initialize logging
    env_logger::init();
    
    println!("Lumos-DB Rust Client Example");
    println!("----------------------------");
    
    // Create temporary database files
    let temp_dir = tempfile::tempdir()?;
    let sqlite_path = temp_dir.path().join("example.db");
    let duckdb_path = temp_dir.path().join("example.duckdb");
    
    // Create client options
    let options = ClientOptions {
        sqlite_path: sqlite_path.to_str().unwrap().to_string(),
        duckdb_path: duckdb_path.to_str().unwrap().to_string(),
        sync_interval: 5,
        max_memory_mb: 512,
    };
    
    // Create Lumos-DB client
    let mut client = LumosClient::with_options(options)?;
    
    // Create tables in both engines
    println!("Creating tables...");
    
    // Create users table in SQLite (transactional data)
    client.query_sqlite(
        "CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            age INTEGER
        )",
        &[],
    )?;
    
    // Create analytics table in DuckDB (analytical data)
    client.query_duckdb(
        "CREATE TABLE user_activity (
            user_id INTEGER,
            action TEXT,
            timestamp TIMESTAMP,
            duration INTEGER
        )",
        &[],
    )?;
    
    // Insert data into SQLite
    println!("Inserting data into SQLite...");
    
    for i in 1..=10 {
        client.execute(
            "INSERT INTO users (id, name, email, age) VALUES (?, ?, ?, ?)",
            &[
                &i,
                &format!("User {}", i),
                &format!("user{}@example.com", i),
                &(20 + i),
            ],
        )?;
    }
    
    // Insert data into DuckDB
    println!("Inserting data into DuckDB...");
    
    for i in 1..=10 {
        for j in 1..=5 {
            client.query_duckdb(
                "INSERT INTO user_activity (user_id, action, timestamp, duration)
                 VALUES (?, ?, CURRENT_TIMESTAMP, ?)",
                &[
                    &i,
                    &format!("action_{}", j),
                    &(j * 10),
                ],
            )?;
        }
    }
    
    // Query data from SQLite
    println!("\nQuerying data from SQLite:");
    
    let users = client.query_json(
        "SELECT id, name, age FROM users WHERE age > ? ORDER BY age",
        &[&25],
    )?;
    
    for user in users {
        println!("User: {}", user);
    }
    
    // Query data from DuckDB
    println!("\nQuerying data from DuckDB:");
    
    let activities = client.query_json(
        "SELECT user_id, action, AVG(duration) as avg_duration
         FROM user_activity
         GROUP BY user_id, action
         HAVING AVG(duration) > ?
         ORDER BY avg_duration DESC",
        &[&20],
    )?;
    
    for activity in activities {
        println!("Activity: {}", activity);
    }
    
    // Execute a cross-engine query
    println!("\nExecuting a cross-engine query:");
    
    let result = client.query_cross_engine(
        "SELECT u.id, u.name, COUNT(a.action) as action_count, AVG(a.duration) as avg_duration
         FROM users u
         JOIN user_activity a ON u.id = a.user_id
         GROUP BY u.id, u.name
         HAVING action_count > ?
         ORDER BY avg_duration DESC",
        &[&3],
    )?;
    
    // Display the results
    println!("Columns: {:?}", result.columns);
    
    for row in result.rows {
        println!("Row: {:?}", row);
    }
    
    println!("\nExecution time: {}ms", result.execution_time_ms);
    println!("Engine used: {:?}", result.engine_used);
    
    println!("\nExample completed successfully!");
    Ok(())
} 