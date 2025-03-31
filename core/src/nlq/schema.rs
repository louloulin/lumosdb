use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use crate::{LumosError, Result};

/// Database schema information for natural language processing
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DbSchema {
    /// Tables in the database
    pub tables: Vec<TableSchema>,
    
    /// Relationships between tables
    pub relationships: Vec<Relationship>,
    
    /// Semantic descriptions for database objects
    pub descriptions: HashMap<String, String>,
}

/// Schema for a table
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSchema {
    /// Table name
    pub name: String,
    
    /// Columns in the table
    pub columns: Vec<ColumnSchema>,
    
    /// Primary key column names
    pub primary_keys: Vec<String>,
    
    /// Number of rows in the table (approximate)
    pub row_count: Option<usize>,
    
    /// Sample data from the table (if available)
    pub sample_data: Option<Vec<HashMap<String, String>>>,
}

/// Schema for a column
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ColumnSchema {
    /// Column name
    pub name: String,
    
    /// Column data type
    pub data_type: String,
    
    /// Whether the column is nullable
    pub is_nullable: bool,
    
    /// Default value for the column
    pub default_value: Option<String>,
    
    /// Whether the column is auto-incrementing
    pub is_auto_increment: bool,
    
    /// Additional column attributes (index, unique, etc.)
    pub attributes: Vec<String>,
}

/// Relationship between tables
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Relationship {
    /// Source table name
    pub source_table: String,
    
    /// Source column name
    pub source_column: String,
    
    /// Target table name
    pub target_table: String,
    
    /// Target column name
    pub target_column: String,
    
    /// Relationship type (e.g. "one-to-many", "one-to-one")
    pub relationship_type: RelationshipType,
}

/// Types of relationships between tables
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub enum RelationshipType {
    /// One-to-one relationship
    OneToOne,
    
    /// One-to-many relationship
    OneToMany,
    
    /// Many-to-one relationship
    ManyToOne,
    
    /// Many-to-many relationship
    ManyToMany,
}

impl DbSchema {
    /// Create a new empty database schema
    pub fn new() -> Self {
        Self::default()
    }
    
    /// Add a table to the schema
    pub fn add_table(&mut self, table: TableSchema) {
        self.tables.push(table);
    }
    
    /// Add a relationship between tables
    pub fn add_relationship(&mut self, relationship: Relationship) {
        self.relationships.push(relationship);
    }
    
    /// Add a semantic description for a database object
    pub fn add_description(&mut self, object: &str, description: &str) {
        self.descriptions.insert(object.to_string(), description.to_string());
    }
    
    /// Get a table by name
    pub fn get_table(&self, table_name: &str) -> Option<&TableSchema> {
        self.tables.iter().find(|table| table.name == table_name)
    }
    
    /// Get all relationships for a table
    pub fn get_relationships_for_table(&self, table_name: &str) -> Vec<&Relationship> {
        self.relationships.iter()
            .filter(|rel| rel.source_table == table_name || rel.target_table == table_name)
            .collect()
    }
    
    /// Get a description for a database object
    pub fn get_description(&self, object: &str) -> Option<&String> {
        self.descriptions.get(object)
    }
    
    /// Generate a human-readable schema summary
    pub fn to_summary(&self) -> String {
        let mut summary = String::new();
        
        summary.push_str("Database Schema Summary:\n\n");
        
        // Add tables
        for table in &self.tables {
            summary.push_str(&format!("Table: {} ({})\n", table.name, table.row_count.map_or("unknown row count".to_string(), |c| c.to_string())));
            
            // Add description if available
            if let Some(desc) = self.get_description(&table.name) {
                summary.push_str(&format!("Description: {}\n", desc));
            }
            
            // Add columns
            summary.push_str("Columns:\n");
            for column in &table.columns {
                let pk_marker = if table.primary_keys.contains(&column.name) { " (PK)" } else { "" };
                summary.push_str(&format!("  - {}: {}{}{}\n", 
                    column.name, 
                    column.data_type,
                    pk_marker,
                    if column.is_nullable { "" } else { " NOT NULL" }
                ));
                
                // Add column description if available
                let column_key = format!("{}.{}", table.name, column.name);
                if let Some(desc) = self.get_description(&column_key) {
                    summary.push_str(&format!("    Description: {}\n", desc));
                }
            }
            
            summary.push('\n');
        }
        
        // Add relationships
        if !self.relationships.is_empty() {
            summary.push_str("Relationships:\n");
            
            for relationship in &self.relationships {
                let rel_type = match relationship.relationship_type {
                    RelationshipType::OneToOne => "one-to-one",
                    RelationshipType::OneToMany => "one-to-many",
                    RelationshipType::ManyToOne => "many-to-one",
                    RelationshipType::ManyToMany => "many-to-many",
                };
                
                summary.push_str(&format!("  - {}.{} -> {}.{} ({})\n",
                    relationship.source_table,
                    relationship.source_column,
                    relationship.target_table,
                    relationship.target_column,
                    rel_type
                ));
            }
        }
        
        summary
    }
}

/// Schema extraction utilities
pub mod extractor {
    use super::*;
    use crate::{sqlite::SqliteEngine, duckdb::DuckDbEngine};
    
    /// Extract schema from a SQLite database
    pub fn extract_from_sqlite(engine: &SqliteEngine) -> Result<DbSchema> {
        let mut schema = DbSchema::new();
        
        // Get all tables
        let tables = engine.query_all(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
            &[],
        )?;
        
        for table_row in tables {
            let table_name = table_row.get("name")
                .ok_or_else(|| LumosError::Other("Failed to get table name".to_string()))?
                .to_string();
            
            // Get columns for this table
            let columns = engine.query_all(
                "PRAGMA table_info(?)",
                &[&table_name as &dyn rusqlite::ToSql],
            )?;
            
            let mut table_schema = TableSchema {
                name: table_name.clone(),
                columns: Vec::new(),
                primary_keys: Vec::new(),
                row_count: None,
                sample_data: None,
            };
            
            for column_row in columns {
                let column_name = column_row.get("name")
                    .ok_or_else(|| LumosError::Other("Failed to get column name".to_string()))?
                    .to_string();
                let data_type = column_row.get("type")
                    .ok_or_else(|| LumosError::Other("Failed to get column type".to_string()))?
                    .to_string();
                let not_null = column_row.get("notnull")
                    .ok_or_else(|| LumosError::Other("Failed to get not null status".to_string()))?
                    .parse::<i32>().unwrap_or(0) == 1;
                let pk = column_row.get("pk")
                    .ok_or_else(|| LumosError::Other("Failed to get primary key status".to_string()))?
                    .parse::<i32>().unwrap_or(0) == 1;
                let default_value = column_row.get("dflt_value").map(|s| s.to_string());
                
                let column_schema = ColumnSchema {
                    name: column_name.clone(),
                    data_type,
                    is_nullable: !not_null,
                    default_value,
                    is_auto_increment: false, // SQLite doesn't explicitly store this
                    attributes: Vec::new(),
                };
                
                table_schema.columns.push(column_schema);
                
                if pk {
                    table_schema.primary_keys.push(column_name);
                }
            }
            
            // Get row count for the table
            let count_sql = format!("SELECT COUNT(*) FROM {}", table_name);
            let count_rows = engine.query_all(&count_sql, &[])?;
            let count: i64 = if let Some(row) = count_rows.first() {
                if let Some(count_str) = row.get("0") {
                    count_str.parse().unwrap_or(0)
                } else {
                    0
                }
            } else {
                0
            };
            
            table_schema.row_count = Some(count as usize);
            
            // Get sample data (up to 5 rows)
            let sample_rows = engine.query_all(
                &format!("SELECT * FROM {} LIMIT 5", table_name),
                &[],
            )?;
            
            if !sample_rows.is_empty() {
                let mut sample_data = Vec::new();
                
                for row in sample_rows {
                    let mut data_row = HashMap::new();
                    
                    for column in &table_schema.columns {
                        let value = row.get(&column.name).map_or("NULL".to_string(), |v| v.to_string());
                        data_row.insert(column.name.clone(), value);
                    }
                    
                    sample_data.push(data_row);
                }
                
                table_schema.sample_data = Some(sample_data);
            }
            
            schema.add_table(table_schema);
        }
        
        // Extract foreign key relationships
        // 先复制数据，避免同时拥有不可变和可变借用
        let tables_copy = schema.tables.clone();
        
        for table in &tables_copy {
            let fk_results = engine.query_all(
                "PRAGMA foreign_key_list(?)",
                &[&table.name as &dyn rusqlite::ToSql],
            )?;
            
            for fk_row in fk_results {
                let target_table = fk_row.get("table")
                    .ok_or_else(|| LumosError::Other("Failed to get target table".to_string()))?
                    .to_string();
                let source_column = fk_row.get("from")
                    .ok_or_else(|| LumosError::Other("Failed to get source column".to_string()))?
                    .to_string();
                let target_column = fk_row.get("to")
                    .ok_or_else(|| LumosError::Other("Failed to get target column".to_string()))?
                    .to_string();
                
                // Determine relationship type (simplified)
                let relationship_type = RelationshipType::ManyToOne; // Default for foreign keys
                
                let relationship = Relationship {
                    source_table: table.name.clone(),
                    source_column,
                    target_table,
                    target_column,
                    relationship_type,
                };
                
                schema.add_relationship(relationship);
            }
        }
        
        Ok(schema)
    }
    
    /// Extract schema from a DuckDB database
    pub fn extract_from_duckdb(engine: &DuckDbEngine) -> Result<DbSchema> {
        let mut schema = DbSchema::new();
        
        // Get all tables
        let tables = engine.query(
            "SELECT table_name FROM information_schema.tables WHERE table_schema='main'",
            &[],
            |row| {
                let table_name: String = row.get(0)?;
                Ok(table_name)
            }
        )?;
        
        for table_name in tables {
            // Get columns for this table
            let columns = engine.query(
                "SELECT column_name, data_type, is_nullable, column_default 
                 FROM information_schema.columns 
                 WHERE table_name = ?",
                &[&table_name],
                |row| {
                    let column_name: String = row.get(0)?;
                    let data_type: String = row.get(1)?;
                    let is_nullable: String = row.get(2)?;
                    let default_value: Option<String> = row.get(3)?;
                    
                    Ok((column_name, data_type, is_nullable, default_value))
                }
            )?;
            
            let mut table_schema = TableSchema {
                name: table_name.clone(),
                columns: Vec::new(),
                primary_keys: Vec::new(),
                row_count: None,
                sample_data: None,
            };
            
            // Get primary keys for this table
            let pks = engine.query(
                "SELECT column_name 
                 FROM information_schema.table_constraints tc 
                 JOIN information_schema.key_column_usage kcu 
                 ON tc.constraint_name = kcu.constraint_name 
                 WHERE tc.table_name = ? AND tc.constraint_type = 'PRIMARY KEY'",
                &[&table_name],
                |row| {
                    let column_name: String = row.get(0)?;
                    Ok(column_name)
                }
            )?;
            
            table_schema.primary_keys = pks;
            
            for (column_name, data_type, is_nullable, default_value) in columns {
                let column_schema = ColumnSchema {
                    name: column_name,
                    data_type,
                    is_nullable: is_nullable == "YES",
                    default_value,
                    is_auto_increment: false, // DuckDB doesn't have auto_increment
                    attributes: Vec::new(),
                };
                
                table_schema.columns.push(column_schema);
            }
            
            // Get row count for the table
            let count = engine.query(
                &format!("SELECT COUNT(*) FROM {}", table_name),
                &[],
                |row| {
                    let count: i64 = row.get(0)?;
                    Ok(count)
                }
            )?.first().cloned().unwrap_or(0);
            
            table_schema.row_count = Some(count as usize);
            
            // Get sample data (up to 5 rows)
            let sample_query = format!("SELECT * FROM {} LIMIT 5", table_name);
            let mut sample_data_vec = Vec::new();
            
            // 直接一步获取所有数据为字符串
            let rows_result = engine.query_all_as_strings(&sample_query)?;
            
            // 转换为要求的格式
            for row_map in rows_result {
                let mut data_row = HashMap::new();
                for (col, val) in row_map {
                    data_row.insert(col, val);
                }
                sample_data_vec.push(data_row);
            }
            
            if !sample_data_vec.is_empty() {
                table_schema.sample_data = Some(sample_data_vec);
            }
            
            schema.add_table(table_schema);
        }
        
        // DuckDB doesn't have a straightforward way to get foreign key info
        // through the information schema, so we'd need to rely on naming conventions
        // or additional metadata. This is a simplified implementation.
        
        Ok(schema)
    }
    
    /// Extract schema from both SQLite and DuckDB
    pub fn extract_combined(sqlite: &SqliteEngine, duckdb: &DuckDbEngine) -> Result<DbSchema> {
        let sqlite_schema = extract_from_sqlite(sqlite)?;
        let duckdb_schema = extract_from_duckdb(duckdb)?;
        
        // Merge the schemas
        let mut combined_schema = DbSchema::new();
        
        // Add tables from SQLite schema
        for table in sqlite_schema.tables {
            combined_schema.add_table(table);
        }
        
        // Add tables from DuckDB schema
        for table in duckdb_schema.tables {
            combined_schema.add_table(table);
        }
        
        // Add relationships from SQLite schema
        for relationship in sqlite_schema.relationships {
            combined_schema.add_relationship(relationship);
        }
        
        // Add relationships from DuckDB schema
        for relationship in duckdb_schema.relationships {
            combined_schema.add_relationship(relationship);
        }
        
        // Merge descriptions
        for (obj, desc) in sqlite_schema.descriptions {
            combined_schema.add_description(&obj, &desc);
        }
        
        for (obj, desc) in duckdb_schema.descriptions {
            combined_schema.add_description(&obj, &desc);
        }
        
        Ok(combined_schema)
    }
} 