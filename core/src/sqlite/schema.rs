use rusqlite::{Connection, params};
use std::collections::HashMap;
use crate::{LumosError, Result};

/// Column information from a SQLite table
#[derive(Debug, Clone)]
pub struct ColumnInfo {
    /// Column name
    pub name: String,
    /// SQLite data type
    pub data_type: String,
    /// Is the column NOT NULL?
    pub is_not_null: bool,
    /// Is the column a primary key?
    pub is_primary_key: bool,
    /// Default value expression
    pub default_value: Option<String>,
}

/// Schema manager for SQLite
pub enum SchemaManager<'a> {
    /// Schema manager that borrows a connection
    Borrowed(BorrowedSchemaManager<'a>),
    /// Schema manager that owns a connection
    Owned(OwnedSchemaManager),
}

/// Schema manager that borrows a connection
pub struct BorrowedSchemaManager<'a> {
    /// Reference to the connection
    conn: &'a Connection,
}

/// Schema manager that owns a connection
pub struct OwnedSchemaManager {
    /// Owned connection
    conn: Connection,
}

impl<'a> SchemaManager<'a> {
    /// Create a new schema manager from a borrowed connection
    pub fn new(conn: &'a Connection) -> Self {
        Self::Borrowed(BorrowedSchemaManager { conn })
    }
    
    /// Create a new schema manager with an owned connection
    pub fn new_owned(conn: Connection) -> Self {
        Self::Owned(OwnedSchemaManager { conn })
    }
    
    /// Get schema information for a table
    pub fn get_table_schema(&self, table_name: &str) -> Result<Vec<ColumnInfo>> {
        match self {
            Self::Borrowed(mgr) => mgr.get_table_schema(table_name),
            Self::Owned(mgr) => mgr.get_table_schema(table_name),
        }
    }
    
    /// Check if a table exists
    pub fn table_exists(&self, table_name: &str) -> Result<bool> {
        match self {
            Self::Borrowed(mgr) => mgr.table_exists(table_name),
            Self::Owned(mgr) => mgr.table_exists(table_name),
        }
    }
    
    /// Create a new index
    pub fn create_index(&self, table_name: &str, columns: &[&str], if_not_exists: bool) -> Result<()> {
        match self {
            Self::Borrowed(mgr) => mgr.create_index(table_name, columns, if_not_exists),
            Self::Owned(mgr) => mgr.create_index(table_name, columns, if_not_exists),
        }
    }
    
    /// Get all tables in the database
    pub fn get_tables(&self) -> Result<Vec<String>> {
        match self {
            Self::Borrowed(mgr) => mgr.get_tables(),
            Self::Owned(mgr) => mgr.get_tables(),
        }
    }
}

impl<'a> BorrowedSchemaManager<'a> {
    /// Get schema information for a table
    pub fn get_table_schema(&self, table_name: &str) -> Result<Vec<ColumnInfo>> {
        let mut stmt = self.conn.prepare("PRAGMA table_info(?1)")?;
        let columns = stmt.query_map([table_name], |row| {
            Ok(ColumnInfo {
                name: row.get(1)?,
                data_type: row.get(2)?,
                is_not_null: row.get::<_, i32>(3)? == 1,
                is_primary_key: row.get::<_, i32>(5)? == 1,
                default_value: row.get(4)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
        
        if columns.is_empty() {
            return Err(LumosError::Sqlite(format!("Table '{}' not found", table_name)));
        }
        
        Ok(columns)
    }
    
    /// Check if a table exists
    pub fn table_exists(&self, table_name: &str) -> Result<bool> {
        let count: i32 = self.conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
            [table_name],
            |row| row.get(0)
        )?;
        
        Ok(count > 0)
    }
    
    /// Create a new index
    pub fn create_index(&self, table_name: &str, columns: &[&str], if_not_exists: bool) -> Result<()> {
        let index_name = format!("idx_{}_{}", table_name, columns.join("_"));
        let if_not_exists_clause = if if_not_exists { "IF NOT EXISTS " } else { "" };
        
        let columns_str = columns.join(", ");
        let sql = format!(
            "CREATE INDEX {}{}_{} ON {} ({})",
            if_not_exists_clause, table_name, columns_str.replace(", ", "_"), 
            table_name, columns_str
        );
        
        self.conn.execute(&sql, [])?;
        Ok(())
    }
    
    /// Get all tables in the database
    pub fn get_tables(&self) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )?;
        
        let tables = stmt.query_map([], |row| {
            row.get::<_, String>(0)
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
        
        Ok(tables)
    }
}

impl OwnedSchemaManager {
    /// Get schema information for a table
    pub fn get_table_schema(&self, table_name: &str) -> Result<Vec<ColumnInfo>> {
        let mut stmt = self.conn.prepare("PRAGMA table_info(?1)")?;
        let columns = stmt.query_map([table_name], |row| {
            Ok(ColumnInfo {
                name: row.get(1)?,
                data_type: row.get(2)?,
                is_not_null: row.get::<_, i32>(3)? == 1,
                is_primary_key: row.get::<_, i32>(5)? == 1,
                default_value: row.get(4)?,
            })
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
        
        if columns.is_empty() {
            return Err(LumosError::Sqlite(format!("Table '{}' not found", table_name)));
        }
        
        Ok(columns)
    }
    
    /// Check if a table exists
    pub fn table_exists(&self, table_name: &str) -> Result<bool> {
        let count: i32 = self.conn.query_row(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
            [table_name],
            |row| row.get(0)
        )?;
        
        Ok(count > 0)
    }
    
    /// Create a new index
    pub fn create_index(&self, table_name: &str, columns: &[&str], if_not_exists: bool) -> Result<()> {
        let index_name = format!("idx_{}_{}", table_name, columns.join("_"));
        let if_not_exists_clause = if if_not_exists { "IF NOT EXISTS " } else { "" };
        
        let columns_str = columns.join(", ");
        let sql = format!(
            "CREATE INDEX {}{}_{} ON {} ({})",
            if_not_exists_clause, table_name, columns_str.replace(", ", "_"), 
            table_name, columns_str
        );
        
        self.conn.execute(&sql, [])?;
        Ok(())
    }
    
    /// Get all tables in the database
    pub fn get_tables(&self) -> Result<Vec<String>> {
        let mut stmt = self.conn.prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        )?;
        
        let tables = stmt.query_map([], |row| {
            row.get::<_, String>(0)
        })?
        .collect::<std::result::Result<Vec<_>, _>>()?;
        
        Ok(tables)
    }
}
