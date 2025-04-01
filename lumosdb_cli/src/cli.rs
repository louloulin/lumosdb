use anyhow::Result;
use colored::Colorize;
use rustyline::{
    config::{Config, EditMode},
    DefaultEditor,
};
use std::collections::HashSet;
use std::path::Path;

/// A simple CLI helper with basic functionality
pub struct CliHelper {
    /// SQL keywords for completion
    keywords: HashSet<String>,
    /// Database table names
    tables: HashSet<String>,
    /// Available commands
    commands: HashSet<String>,
    /// Use colors for formatting
    use_colors: bool,
}

impl CliHelper {
    /// Create a new CLI helper
    pub fn new() -> Self {
        // Common SQL keywords
        let mut keywords = HashSet::new();
        for kw in &[
            "SELECT", "FROM", "WHERE", "INSERT", "INTO", "VALUES", "UPDATE", "SET",
            "DELETE", "CREATE", "TABLE", "INDEX", "DROP", "ALTER", "ADD", "COLUMN",
            "AND", "OR", "NOT", "IS", "NULL", "TRUE", "FALSE", "GROUP", "BY", "HAVING",
            "ORDER", "ASC", "DESC", "LIMIT", "OFFSET", "JOIN", "LEFT", "RIGHT", "INNER",
            "OUTER", "ON", "AS", "DISTINCT", "COUNT", "SUM", "AVG", "MIN", "MAX",
        ] {
            keywords.insert(kw.to_string());
        }

        Self {
            keywords,
            tables: HashSet::new(),
            commands: HashSet::new(),
            use_colors: true,
        }
    }

    /// Update schema information for autocompletion
    pub fn update_schema(&mut self, tables: Vec<String>) {
        self.tables = tables.into_iter().collect();
    }

    /// Update available commands
    pub fn update_commands(&mut self, commands: Vec<String>) {
        self.commands = commands.into_iter().collect();
    }
}

/// Create a readline editor
pub fn create_editor() -> Result<DefaultEditor> {
    // Use default config for simplicity
    let editor = DefaultEditor::new()?;
    Ok(editor)
}

/// Load command history from file
pub fn load_history(editor: &mut DefaultEditor, history_file: &str) -> Result<()> {
    if Path::new(history_file).exists() {
        editor.load_history(history_file)?;
    }
    Ok(())
}

/// Save command history to file
pub fn save_history(editor: &mut DefaultEditor, history_file: &str) -> Result<()> {
    editor.save_history(history_file)?;
    Ok(())
}

/// Print an error message
pub fn print_error(msg: &str) {
    eprintln!("{} {}", "Error:".red().bold(), msg);
}

/// Print success message
pub fn print_success(msg: &str) {
    println!("{} {}", "Success:".green().bold(), msg);
}

/// Print a notice or information
pub fn print_info(msg: &str) {
    println!("{} {}", "Info:".blue().bold(), msg);
} 