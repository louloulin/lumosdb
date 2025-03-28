use rusqlite::{Connection, params};
use std::collections::HashMap;
use crate::{LumosError, Result};

/// Represents a table column definition
#[derive(Debug, Clone)]
pub struct Column {
    /// Name of the column
    pub name: String,
    /// SQL data type
    pub data_type: String,
    /// Whether the column is a primary key
    pub is_primary_key: bool,
    /// Whether the column can be NULL
    pub is_nullable: bool,
    /// Default value for the column
    pub default_value: Option<String>,
}

impl Column {
    /// Create a new column definition
    pub fn new(name: &str, data_type: &str) -> Self {
        Self {
            name: name.to_string(),
            data_type: data_type.to_string(),
            is_primary_key: false,
            is_nullable: true,
            default_value: None,
        }
    }

    /// Set the column as primary key
    pub fn primary_key(mut self) -> Self {
        self.is_primary_key = true;
        self.is_nullable = false;
        self
    }

    /// Set the column as not nullable
    pub fn not_null(mut self) -> Self {
        self.is_nullable = false;
        self
    }

    /// Set a default value for the column
    pub fn default(mut self, value: &str) -> Self {
        self.default_value = Some(value.to_string());
        self
    }

    /// Convert the column definition to SQL
    pub fn to_sql(&self) -> String {
        let mut parts = vec![self.name.clone(), self.data_type.clone()];
        
        if self.is_primary_key {
            parts.push("PRIMARY KEY".to_string());
        }
        
        if !self.is_nullable {
            parts.push("NOT NULL".to_string());
        }
        
        if let Some(default) = &self.default_value {
            parts.push(format!("DEFAULT {}", default));
        }
        
        parts.join(" ")
    }
}

/// Schema manager for SQLite tables
pub struct SchemaManager<'a> {
    /// Reference to the SQLite connection
    conn: &'a Connection,
}

impl<'a> SchemaManager<'a> {
    /// Create a new schema manager
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    /// Create a table if it doesn't exist
    pub fn create_table(&self, table_name: &str, columns: &[Column]) -> Result<()> {
        let columns_sql = columns
            .iter()
            .map(|col| col.to_sql())
            .collect::<Vec<_>>()
            .join(", ");
        
        let sql = format!("CREATE TABLE IF NOT EXISTS {} ({})", table_name, columns_sql);
        self.conn.execute(&sql, [])?;
        
        log::debug!("Created table: {}", table_name);
        Ok(())
    }

    /// Check if a table exists
    pub fn table_exists(&self, table_name: &str) -> Result<bool> {
        let count: i32 = self.conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?",
            params![table_name],
            |row| row.get(0)
        )?;
        
        Ok(count > 0)
    }

    /// Get the list of tables in the database
    pub fn get_tables(&self) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )?;
        
        let tables = stmt.query_map([], |row| {
            let name: String = row.get(0)?;
            Ok(name)
        })?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        
        Ok(tables)
    }

    /// Get the schema for a table
    pub fn get_table_schema(&self, table_name: &str) -> Result<Vec<Column>> {
        // First check if the table exists
        if !self.table_exists(table_name)? {
            return Err(LumosError::Sqlite(format!("Table '{}' does not exist", table_name)));
        }
        
        let mut stmt = self.conn.prepare(&format!("PRAGMA table_info({})", table_name))?;
        
        let columns = stmt.query_map([], |row| {
            let column_name: String = row.get(1)?;
            let data_type: String = row.get(2)?;
            let not_null: i32 = row.get(3)?;
            let default_value: Option<String> = row.get(4)?;
            let is_primary_key: i32 = row.get(5)?;
            
            Ok(Column {
                name: column_name,
                data_type,
                is_primary_key: is_primary_key == 1,
                is_nullable: not_null == 0,
                default_value,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        
        Ok(columns)
    }

    /// Add a column to an existing table
    pub fn add_column(&self, table_name: &str, column: &Column) -> Result<()> {
        let sql = format!(
            "ALTER TABLE {} ADD COLUMN {}",
            table_name,
            column.to_sql()
        );
        
        self.conn.execute(&sql, [])?;
        log::debug!("Added column '{}' to table '{}'", column.name, table_name);
        
        Ok(())
    }

    /// Drop a table if it exists
    pub fn drop_table(&self, table_name: &str) -> Result<()> {
        let sql = format!("DROP TABLE IF EXISTS {}", table_name);
        self.conn.execute(&sql, [])?;
        
        log::debug!("Dropped table '{}'", table_name);
        Ok(())
    }

    /// Create a database index
    pub fn create_index(&self, table_name: &str, column_names: &[&str], unique: bool) -> Result<()> {
        let index_name = format!(
            "idx_{}_{}", 
            table_name, 
            column_names.join("_")
        );
        
        let unique_str = if unique { "UNIQUE " } else { "" };
        let columns = column_names.join(", ");
        
        let sql = format!(
            "CREATE {}INDEX IF NOT EXISTS {} ON {} ({})",
            unique_str, index_name, table_name, columns
        );
        
        self.conn.execute(&sql, [])?;
        log::debug!("Created index '{}' on table '{}'", index_name, table_name);
        
        Ok(())
    }
}
