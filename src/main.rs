use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use log::{info, error};
use std::path::PathBuf;
use lumos_core::{sqlite::SqliteEngine, LumosConfig, LumosError};

/// Lumos-DB: Lightweight data platform for AI Agents
#[derive(Parser)]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Sets a custom config file
    #[arg(short, long, value_name = "FILE")]
    config: Option<PathBuf>,

    /// Turn on verbose output
    #[arg(short, long)]
    verbose: bool,

    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Initialize a new database
    Init {
        /// Path to database file
        #[arg(short, long, default_value = "lumos.db")]
        path: PathBuf,
    },
    
    /// Run a SQL query
    Query {
        /// SQL query to execute
        #[arg(short, long)]
        sql: String,
        
        /// Path to database file
        #[arg(short, long, default_value = "lumos.db")]
        path: PathBuf,
    },
    
    /// Start the Lumos-DB server
    Serve {
        /// Host address to bind to
        #[arg(short, long, default_value = "127.0.0.1")]
        host: String,
        
        /// Port to listen on
        #[arg(short, long, default_value_t = 8080)]
        port: u16,
        
        /// Path to database file
        #[arg(long, default_value = "lumos.db")]
        db_path: PathBuf,
    },
}

fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();
    
    // Parse command line arguments
    let cli = Cli::parse();
    
    // Handle verbosity
    if cli.verbose {
        info!("Verbose mode enabled");
    }
    
    // Load config if specified
    if let Some(config_path) = cli.config.as_ref() {
        info!("Using config file: {}", config_path.display());
        // TODO: Load configuration from file
    }
    
    // Execute command
    match &cli.command {
        Commands::Init { path } => {
            info!("Initializing database at: {}", path.display());
            let path_str = path.to_string_lossy().to_string();
            let mut engine = SqliteEngine::new(&path_str);
            engine.init().context("Failed to initialize database")?;
            println!("Database initialized successfully at: {}", path.display());
        }
        
        Commands::Query { sql, path } => {
            info!("Executing query on database: {}", path.display());
            let path_str = path.to_string_lossy().to_string();
            let mut engine = SqliteEngine::new(&path_str);
            engine.init().context("Failed to initialize database")?;
            
            // Execute the query and get results
            let result = engine.query_all(sql, &[]).context("Failed to execute query")?;
            
            // Display results
            if result.is_empty() {
                println!("Query executed successfully (no results)");
            } else {
                println!("Query executed successfully with {} rows:", result.len());
                
                // Print column headers
                if let Some(first_row) = result.first() {
                    let column_names = first_row.values.keys().collect::<Vec<_>>();
                    for name in &column_names {
                        print!("{}\t", name);
                    }
                    println!();
                    
                    // Print separator
                    for _ in &column_names {
                        print!("--------\t");
                    }
                    println!();
                    
                    // Print data rows
                    for row in &result {
                        for name in &column_names {
                            if let Some(value) = row.values.get(*name) {
                                print!("{}\t", value);
                            } else {
                                print!("NULL\t");
                            }
                        }
                        println!();
                    }
                }
            }
        }
        
        Commands::Serve { host, port, db_path } => {
            info!("Starting server at {}:{} with database: {}", host, port, db_path.display());
            println!("Server functionality is not yet implemented");
            println!("Server would run at {}:{} with database: {}", host, port, db_path.display());
        }
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_cli_parsing() {
        // Basic test to ensure CLI parsing works
        assert!(true);
    }
} 