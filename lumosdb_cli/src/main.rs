mod cli;
mod commands;
mod config;
mod connection;
mod output;
mod repl;
mod sync;

use anyhow::{Context, Result};
use clap::{Parser, Subcommand};
use config::CliConfig;
use std::path::PathBuf;

/// LumosDB CLI Tool - A command-line interface for Lumos-DB
///
/// Examples:
///   # Start interactive REPL
///   lumosdb
///
///   # Start with a specific connection
///   lumosdb --connect "lumos://localhost:8080"
///
///   # Execute a single SQL query
///   lumosdb exec "SELECT * FROM users"
///
///   # Execute SQL file
///   lumosdb file path/to/script.sql
#[derive(Parser)]
#[command(name = "lumosdb")]
#[command(author, version, about, long_about = None)]
struct Cli {
    /// Path to config file
    #[arg(short = 'C', long, value_name = "FILE")]
    config: Option<PathBuf>,

    /// Connection string
    /// Format: lumos://hostname:port - Connect to LumosDB server
    /// Format: sqlite://path/to/file.db - Connect to SQLite database
    /// Format: duckdb://path/to/file.db - Connect to DuckDB database
    #[arg(short, long)]
    connect: Option<String>,

    /// Enable debug output
    #[arg(short, long)]
    debug: bool,

    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Execute SQL query and exit
    Exec {
        /// SQL query
        #[arg(required = true)]
        query: String,
    },
    /// Batch execute SQL file
    File {
        /// SQL file path
        #[arg(required = true)]
        path: PathBuf,
    },
}

fn main() -> Result<()> {
    // Initialize logging
    env_logger::init();

    // Parse command line arguments
    let cli = Cli::parse();

    // Set debug mode if requested
    if cli.debug {
        std::env::set_var("RUST_LOG", "debug");
    }

    // Load configuration
    let config = CliConfig::load(cli.config.as_deref())?;
    
    // Handle commands
    match &cli.command {
        Some(Commands::Exec { query }) => {
            execute_query(&config, &cli.connect, query)?;
        }
        Some(Commands::File { path }) => {
            execute_file(&config, &cli.connect, path)?;
        }
        None => {
            // Start interactive REPL
            start_repl(&config, &cli.connect)?;
        }
    }

    Ok(())
}

/// Execute a single SQL query
fn execute_query(config: &CliConfig, connect: &Option<String>, query: &str) -> Result<()> {
    let mut repl = repl::Repl::new(config, connect.clone())?;
    repl.execute_query(query)
}

/// Execute SQL file
fn execute_file(config: &CliConfig, connect: &Option<String>, path: &PathBuf) -> Result<()> {
    let mut repl = repl::Repl::new(config, connect.clone())?;
    repl.execute_file(path)
}

/// Start interactive REPL
fn start_repl(config: &CliConfig, connect: &Option<String>) -> Result<()> {
    let mut repl = repl::Repl::new(config, connect.clone())?;
    repl.run().context("REPL execution failed")
} 