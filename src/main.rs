use log::{info, warn, error, debug};
use anyhow::Result;

fn main() -> Result<()> {
    // Initialize logger
    env_logger::init();
    
    println!("Before log messages");
    info!("This is an info message");
    warn!("This is a warning message");
    error!("This is an error message");
    debug!("This is a debug message");
    println!("After log messages");
    
    Ok(())
} 