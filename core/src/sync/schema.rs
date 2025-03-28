use crate::{LumosError, Result, sqlite::SqliteEngine, duckdb::DuckDbEngine};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;

/// Column information for schema comparison
#[derive(Debug, Clone, PartialEq)]
pub struct ColumnInfo {
    /// Column name
    pub name: String,
    /// Data type
    pub data_type: String,
    /// Is this a primary key column?
    pub is_primary_key: bool,
    /// Can this column be NULL?
    pub is_nullable: bool,
    /// Default value
    pub default_value: Option<String>,
}

/// Schema manager for handling schema differences
pub struct SchemaManager {
    /// SQLite engine
    sqlite: Arc<SqliteEngine>,
    /// DuckDB engine
    duckdb: Arc<DuckDbEngine>,
}

impl SchemaManager {
    /// Create a new schema manager
    pub fn new(sqlite: Arc<SqliteEngine>, duckdb: Arc<DuckDbEngine>) -> Self {
        Self {
            sqlite,
            duckdb,
        }
    }
    
    /// Get schema information for a SQLite table
    pub fn get_sqlite_schema(&self, table_name: &str) -> Result<HashMap<String, ColumnInfo>> {
        let conn = self.sqlite.connection()?;
        let mut schema = HashMap::new();
        
        // Get table info
        let sql = format!("PRAGMA table_info({})", table_name);
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map([], |row| {
            let name: String = row.get(1)?;
            let data_type: String = row.get(2)?;
            let is_nullable: bool = row.get(3)? == 0; // notnull = 0 means nullable
            let default_value: Option<String> = row.get(4)?;
            let is_primary_key: bool = row.get(5)? == 1;
            
            Ok(ColumnInfo {
                name,
                data_type,
                is_primary_key,
                is_nullable,
                default_value,
            })
        })?;
        
        for row_result in rows {
            let col_info = row_result?;
            schema.insert(col_info.name.clone(), col_info);
        }
        
        Ok(schema)
    }
    
    /// Get schema information for a DuckDB table
    pub fn get_duckdb_schema(&self, table_name: &str) -> Result<HashMap<String, ColumnInfo>> {
        let conn = self.duckdb.connection()?;
        let mut schema = HashMap::new();
        
        // Check if table exists
        let table_exists = self.duckdb.table_exists(table_name)?;
        if !table_exists {
            return Ok(schema);
        }
        
        // Get column information
        let sql = format!("PRAGMA table_info('{}')", table_name);
        let result = conn.execute(&sql)?;
        
        while let Some(row) = result.fetch()? {
            let name: String = row.get(1)?;
            let data_type: String = row.get(2)?;
            let is_nullable: bool = row.get(3)? == 0; // notnull = 0 means nullable
            let default_value: Option<String> = row.get(4)?;
            let is_primary_key: bool = row.get(5)? == 1;
            
            let col_info = ColumnInfo {
                name,
                data_type,
                is_primary_key,
                is_nullable,
                default_value,
            };
            
            schema.insert(col_info.name.clone(), col_info);
        }
        
        Ok(schema)
    }
    
    /// Compare schemas between SQLite and DuckDB
    pub fn compare_schemas(
        &self, 
        sqlite_schema: &HashMap<String, ColumnInfo>,
        duckdb_schema: &HashMap<String, ColumnInfo>
    ) -> SchemaDifference {
        let mut diff = SchemaDifference {
            added_columns: Vec::new(),
            removed_columns: Vec::new(),
            type_changed_columns: Vec::new(),
            constraint_changed_columns: Vec::new(),
        };
        
        // Find added and changed columns
        for (name, sqlite_col) in sqlite_schema {
            if let Some(duckdb_col) = duckdb_schema.get(name) {
                // Column exists in both, check for type or constraint changes
                let sqlite_type = normalize_type(&sqlite_col.data_type);
                let duckdb_type = normalize_type(&duckdb_col.data_type);
                
                if sqlite_type != duckdb_type {
                    diff.type_changed_columns.push((name.clone(), sqlite_col.clone(), duckdb_col.clone()));
                }
                
                if sqlite_col.is_nullable != duckdb_col.is_nullable ||
                   sqlite_col.is_primary_key != duckdb_col.is_primary_key {
                    diff.constraint_changed_columns.push((name.clone(), sqlite_col.clone(), duckdb_col.clone()));
                }
            } else {
                // Column exists in SQLite but not in DuckDB
                diff.added_columns.push((name.clone(), sqlite_col.clone()));
            }
        }
        
        // Find removed columns
        for (name, duckdb_col) in duckdb_schema {
            if !sqlite_schema.contains_key(name) {
                // Column exists in DuckDB but not in SQLite
                diff.removed_columns.push((name.clone(), duckdb_col.clone()));
            }
        }
        
        diff
    }
    
    /// Apply schema changes to a DuckDB table
    pub fn apply_schema_changes(&self, table_name: &str, diff: &SchemaDifference) -> Result<bool> {
        let conn = self.duckdb.connection()?;
        let mut changes_applied = false;
        
        // Handle added columns
        for (name, col_info) in &diff.added_columns {
            let sql = format!(
                "ALTER TABLE {} ADD COLUMN {} {} {}{}",
                table_name,
                name,
                sqlite_to_duckdb_type(&col_info.data_type),
                if col_info.is_nullable { "" } else { "NOT NULL" },
                if let Some(default) = &col_info.default_value {
                    format!(" DEFAULT {}", default)
                } else {
                    "".to_string()
                }
            );
            
            log::info!("Adding column to DuckDB: {}", sql);
            conn.execute(&sql)?;
            changes_applied = true;
        }
        
        // Handle type changes - Need to recreate the table
        if !diff.type_changed_columns.is_empty() || !diff.removed_columns.is_empty() {
            log::info!("Schema changes in table '{}' require table recreation", table_name);
            self.recreate_table_with_new_schema(table_name)?;
            return Ok(true);
        }
        
        // Handle constraint changes
        for (name, sqlite_col, _) in &diff.constraint_changed_columns {
            // For constraint changes like NOT NULL, we need to recreate the table
            // This is a simplistic approach - in a more advanced implementation,
            // we might handle this without recreation when possible
            log::info!("Constraint changes in table '{}' require table recreation", table_name);
            self.recreate_table_with_new_schema(table_name)?;
            return Ok(true);
        }
        
        Ok(changes_applied)
    }
    
    /// Recreate a DuckDB table with updated schema
    fn recreate_table_with_new_schema(&self, table_name: &str) -> Result<()> {
        let duckdb_conn = self.duckdb.connection()?;
        
        // Get current schema from SQLite
        let sqlite_schema = self.get_sqlite_schema(table_name)?;
        
        // Create a new table with the updated schema
        let temp_table = format!("{}_temp", table_name);
        
        // Build column definitions
        let columns = sqlite_schema
            .iter()
            .map(|(_, col)| {
                format!(
                    "{} {} {}{}",
                    col.name,
                    sqlite_to_duckdb_type(&col.data_type),
                    if col.is_nullable { "" } else { "NOT NULL" },
                    if let Some(default) = &col.default_value {
                        format!(" DEFAULT {}", default)
                    } else {
                        "".to_string()
                    }
                )
            })
            .collect::<Vec<_>>()
            .join(", ");
        
        // Create temp table
        let create_sql = format!("CREATE TABLE {} ({})", temp_table, columns);
        duckdb_conn.execute(&create_sql)?;
        
        // Get column names that exist in both tables
        let duckdb_schema = self.get_duckdb_schema(table_name)?;
        let common_columns: Vec<String> = sqlite_schema
            .keys()
            .filter(|name| duckdb_schema.contains_key(*name))
            .cloned()
            .collect();
        
        // Copy data from original to temp table
        let column_list = common_columns.join(", ");
        let copy_sql = format!("INSERT INTO {} ({}) SELECT {} FROM {}", 
                           temp_table, column_list, column_list, table_name);
        duckdb_conn.execute(&copy_sql)?;
        
        // Drop original table
        let drop_sql = format!("DROP TABLE {}", table_name);
        duckdb_conn.execute(&drop_sql)?;
        
        // Rename temp table to original
        let rename_sql = format!("ALTER TABLE {} RENAME TO {}", temp_table, table_name);
        duckdb_conn.execute(&rename_sql)?;
        
        log::info!("Recreated table '{}' with updated schema", table_name);
        
        Ok(())
    }
}

/// Represents differences between two schemas
#[derive(Debug)]
pub struct SchemaDifference {
    /// Columns added in the source schema
    pub added_columns: Vec<(String, ColumnInfo)>,
    /// Columns removed in the source schema
    pub removed_columns: Vec<(String, ColumnInfo)>,
    /// Columns with changed data types
    pub type_changed_columns: Vec<(String, ColumnInfo, ColumnInfo)>,
    /// Columns with changed constraints
    pub constraint_changed_columns: Vec<(String, ColumnInfo, ColumnInfo)>,
}

/// Normalize a data type string for comparison
fn normalize_type(data_type: &str) -> String {
    match data_type.to_uppercase().as_str() {
        "INTEGER" | "INT" | "BIGINT" | "SMALLINT" | "TINYINT" => "INTEGER".to_string(),
        "REAL" | "FLOAT" | "DOUBLE" | "DECIMAL" => "REAL".to_string(),
        "TEXT" | "VARCHAR" | "CHAR" | "STRING" => "TEXT".to_string(),
        "BLOB" | "BINARY" => "BLOB".to_string(),
        _ => data_type.to_uppercase(),
    }
}

/// Convert SQLite data type to DuckDB data type
fn sqlite_to_duckdb_type(sqlite_type: &str) -> &str {
    match sqlite_type.to_uppercase().as_str() {
        "INTEGER" => "BIGINT",
        "REAL" => "DOUBLE",
        "TEXT" => "VARCHAR",
        "BLOB" => "BLOB",
        _ => "VARCHAR",  // Default to VARCHAR for unknown types
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_normalize_type() {
        assert_eq!(normalize_type("INTEGER"), "INTEGER");
        assert_eq!(normalize_type("INT"), "INTEGER");
        assert_eq!(normalize_type("BIGINT"), "INTEGER");
        assert_eq!(normalize_type("REAL"), "REAL");
        assert_eq!(normalize_type("FLOAT"), "REAL");
        assert_eq!(normalize_type("TEXT"), "TEXT");
        assert_eq!(normalize_type("VARCHAR"), "TEXT");
        assert_eq!(normalize_type("BLOB"), "BLOB");
        assert_eq!(normalize_type("BINARY"), "BLOB");
        assert_eq!(normalize_type("CUSTOM_TYPE"), "CUSTOM_TYPE");
    }
    
    #[test]
    fn test_sqlite_to_duckdb_type() {
        assert_eq!(sqlite_to_duckdb_type("INTEGER"), "BIGINT");
        assert_eq!(sqlite_to_duckdb_type("REAL"), "DOUBLE");
        assert_eq!(sqlite_to_duckdb_type("TEXT"), "VARCHAR");
        assert_eq!(sqlite_to_duckdb_type("BLOB"), "BLOB");
        assert_eq!(sqlite_to_duckdb_type("CUSTOM_TYPE"), "VARCHAR");
    }
}
