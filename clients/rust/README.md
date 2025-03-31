# Lumos-DB Rust Client

This is the official Rust client for Lumos-DB, a data platform for AI Agents.

## Features

- Unified API for both SQLite and DuckDB operations
- Automatic query routing based on query types
- Support for cross-engine queries
- JSON result conversion for easy data manipulation
- Typed parameters for safe query execution

## Installation

Add the following to your `Cargo.toml`:

```toml
[dependencies]
lumos-client = { path = "path/to/lumos-db/clients/rust" }
```

## Quick Start

```rust
use lumos_client::LumosClient;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create a client with default settings
    let mut client = LumosClient::new()?;
    
    // Execute a query
    let results = client.query(
        "SELECT * FROM users WHERE age > ?",
        &[&18],
    )?;
    
    // Display results
    println!("Columns: {:?}", results.columns);
    for row in results.rows {
        println!("{:?}", row);
    }
    
    // Get results as JSON
    let json_results = client.query_json(
        "SELECT id, name FROM users WHERE age > ?",
        &[&18],
    )?;
    
    for user in json_results {
        println!("User: {}", user);
    }
    
    Ok(())
}
```

## Custom Configuration

You can customize the client configuration:

```rust
use lumos_client::{LumosClient, ClientOptions};

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let options = ClientOptions {
        sqlite_path: "custom.db".to_string(),
        duckdb_path: "custom.duckdb".to_string(),
        sync_interval: 30,
        max_memory_mb: 512,
    };
    
    let mut client = LumosClient::with_options(options)?;
    
    // Use the client...
    
    Ok(())
}
```

## Cross-Engine Queries

Cross-engine queries allow you to join data from both SQLite and DuckDB:

```rust
let result = client.query_cross_engine(
    "SELECT u.id, u.name, COUNT(a.action) as action_count
     FROM users u
     JOIN user_activity a ON u.id = a.user_id
     GROUP BY u.id, u.name",
    &[],
)?;
```

You can also use the special CROSSENGINE syntax:

```rust
let result = client.query(
    "SELECT * FROM CROSSENGINE(
        SQLite: SELECT id, name FROM users,
        DuckDB: SELECT user_id, SUM(duration) as total_duration FROM user_activity GROUP BY user_id
     ) WHERE total_duration > ?",
    &[&100],
)?;
```

## Examples

See the `examples` directory for more examples of how to use the Lumos-DB Rust client.

## License

MIT 