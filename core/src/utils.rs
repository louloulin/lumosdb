//! Utility functions for Lumos-DB

use std::path::Path;
use std::fs;
use crate::Result;

/// Check if a file exists
pub fn file_exists(path: impl AsRef<Path>) -> bool {
    path.as_ref().exists() && path.as_ref().is_file()
}

/// Ensure a directory exists, create it if it doesn't
pub fn ensure_dir_exists(path: impl AsRef<Path>) -> Result<()> {
    let path = path.as_ref();
    if !path.exists() {
        fs::create_dir_all(path)?;
    }
    Ok(())
}

/// Get file size in bytes
pub fn file_size(path: impl AsRef<Path>) -> Result<u64> {
    let metadata = fs::metadata(path)?;
    Ok(metadata.len())
}

/// Format a size in bytes as a human-readable string
pub fn format_size(size: u64) -> String {
    const KB: u64 = 1024;
    const MB: u64 = KB * 1024;
    const GB: u64 = MB * 1024;
    
    if size < KB {
        format!("{} B", size)
    } else if size < MB {
        format!("{:.2} KB", size as f64 / KB as f64)
    } else if size < GB {
        format!("{:.2} MB", size as f64 / MB as f64)
    } else {
        format!("{:.2} GB", size as f64 / GB as f64)
    }
}

/// Generate a unique ID
pub fn generate_id() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    
    let random_part = rand::random::<u64>();
    format!("{:x}-{:x}", timestamp, random_part)
} 