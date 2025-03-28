use std::sync::{Arc, Mutex};
use std::collections::HashSet;
use std::time::{Duration, Instant};
use rusqlite::Connection;
use duckdb::Connection as DuckConnection;
use crate::{LumosError, Result, duckdb::DuckDbEngine};
use rusqlite::params;

/// Tracks tables that need to be synchronized between SQLite and DuckDB
pub struct SyncTracker {
    /// Tables that have been modified since the last sync
    modified_tables: Mutex<HashSet<String>>,
    /// Last sync time
    last_sync: Mutex<Instant>,
}

impl SyncTracker {
    /// Create a new sync tracker
    pub fn new() -> Self {
        Self {
            modified_tables: Mutex::new(HashSet::new()),
            last_sync: Mutex::new(Instant::now()),
        }
    }
    
    /// Mark a table as modified
    pub fn mark_modified(&self, table_name: &str) {
        let mut tables = self.modified_tables.lock().unwrap();
        tables.insert(table_name.to_string());
    }
    
    /// Get the set of modified tables
    pub fn get_modified_tables(&self) -> HashSet<String> {
        let tables = self.modified_tables.lock().unwrap();
        tables.clone()
    }
    
    /// Clear the set of modified tables
    pub fn clear_modified_tables(&self) {
        let mut tables = self.modified_tables.lock().unwrap();
        tables.clear();
        
        // Update last sync time
        let mut last_sync = self.last_sync.lock().unwrap();
        *last_sync = Instant::now();
    }
    
    /// Get the time since the last sync
    pub fn time_since_last_sync(&self) -> Duration {
        let last_sync = self.last_sync.lock().unwrap();
        last_sync.elapsed()
    }
}

/// Handles synchronization between SQLite and DuckDB
pub struct Synchronizer {
    /// SQLite connection
    sqlite_conn: Arc<Connection>,
    /// DuckDB engine
    duckdb: Arc<DuckDbEngine>,
    /// Sync tracker
    tracker: Arc<SyncTracker>,
    /// Maximum number of rows to sync in a single batch
    batch_size: usize,
}

impl Synchronizer {
    /// Create a new synchronizer
    pub fn new(sqlite_conn: Arc<Connection>, duckdb: Arc<DuckDbEngine>) -> Self {
        Self {
            sqlite_conn,
            duckdb,
            tracker: Arc::new(SyncTracker::new()),
            batch_size: 1000,
        }
    }
    
    /// Set the batch size for synchronization
    pub fn with_batch_size(mut self, batch_size: usize) -> Self {
        self.batch_size = batch_size;
        self
    }
    
    /// Get a reference to the sync tracker
    pub fn tracker(&self) -> Arc<SyncTracker> {
        self.tracker.clone()
    }
    
    /// Synchronize all modified tables
    pub fn sync_all(&self) -> Result<usize> {
        let tables = self.tracker.get_modified_tables();
        let mut total_synced = 0;
        
        for table in tables {
            let synced = self.sync_table(&table)?;
            total_synced += synced;
        }
        
        // Clear the modified tables list
        self.tracker.clear_modified_tables();
        
        log::info!("Synchronized {} rows across {} tables", total_synced, tables.len());
        Ok(total_synced)
    }
    
    /// Synchronize a specific table
    pub fn sync_table(&self, table_name: &str) -> Result<usize> {
        // Get the schema for the table
        let schema = self.get_table_schema(table_name)?;
        
        // Ensure the table exists in DuckDB with the same schema
        self.ensure_duckdb_table(table_name, &schema)?;
        
        // Determine which rows need to be synced
        let rows_to_sync = self.get_rows_to_sync(table_name)?;
        
        // Sync the rows in batches
        let mut total_synced = 0;
        for batch in rows_to_sync.chunks(self.batch_size) {
            let synced = self.sync_rows(table_name, &schema, batch)?;
            total_synced += synced;
        }
        
        log::debug!("Synchronized {} rows for table {}", total_synced, table_name);
        Ok(total_synced)
    }
    
    /// Get the schema for a SQLite table
    fn get_table_schema(&self, table_name: &str) -> Result<Vec<(String, String)>> {
        let mut schema = Vec::new();
        
        let sql = format!("PRAGMA table_info({})", table_name);
        let mut stmt = self.sqlite_conn.prepare(&sql)?;
        let rows = stmt.query_map([], |row| {
            let name: String = row.get(1)?;
            let data_type: String = row.get(2)?;
            Ok((name, data_type))
        })?;
        
        for row_result in rows {
            let (name, data_type) = row_result?;
            schema.push((name, data_type));
        }
        
        if schema.is_empty() {
            return Err(LumosError::Sqlite(format!("Table {} not found", table_name)));
        }
        
        Ok(schema)
    }
    
    /// Ensure the table exists in DuckDB with the same schema
    fn ensure_duckdb_table(&self, table_name: &str, schema: &[(String, String)]) -> Result<()> {
        let conn = self.duckdb.connection()?;
        
        // Check if the table exists
        let exists = conn.prepared_statement("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
            .param(0, table_name)?
            .execute()?
            .next()?
            .is_some();
            
        if !exists {
            // Create the table with the same schema
            let columns = schema
                .iter()
                .map(|(name, data_type)| {
                    let duck_type = sqlite_to_duckdb_type(data_type);
                    format!("{} {}", name, duck_type)
                })
                .collect::<Vec<_>>()
                .join(", ");
                
            let create_sql = format!("CREATE TABLE IF NOT EXISTS {} ({})", table_name, columns);
            conn.execute(&create_sql)?;
            
            log::info!("Created table {} in DuckDB", table_name);
        }
        
        Ok(())
    }
    
    /// Get rows that need to be synchronized
    fn get_rows_to_sync(&self, table_name: &str) -> Result<Vec<Vec<rusqlite::types::Value>>> {
        let mut rows = Vec::new();
        
        // For simplicity, we're syncing all rows
        // In a real implementation, you'd track which rows have been modified
        let sql = format!("SELECT * FROM {}", table_name);
        let mut stmt = self.sqlite_conn.prepare(&sql)?;
        
        let column_count = stmt.column_count();
        let mut row_iter = stmt.query([])?;
        
        while let Some(row) = row_iter.next()? {
            let mut values = Vec::new();
            
            for i in 0..column_count {
                let value = row.get_ref(i)?;
                values.push(value.into());
            }
            
            rows.push(values);
        }
        
        Ok(rows)
    }
    
    /// Sync rows from SQLite to DuckDB
    fn sync_rows(&self, table_name: &str, schema: &[(String, String)], rows: &[Vec<rusqlite::types::Value>]) -> Result<usize> {
        if rows.is_empty() {
            return Ok(0);
        }
        
        let conn = self.duckdb.connection()?;
        
        // Create a transaction for better performance
        conn.execute("BEGIN TRANSACTION")?;
        
        // Clear existing data (simple approach - replace all data)
        conn.execute(&format!("DELETE FROM {}", table_name))?;
        
        // Insert all rows
        let column_names = schema
            .iter()
            .map(|(name, _)| name.clone())
            .collect::<Vec<_>>()
            .join(", ");
            
        let placeholders = vec!["?"; schema.len()].join(", ");
        let insert_sql = format!("INSERT INTO {} ({}) VALUES ({})", table_name, column_names, placeholders);
        
        let mut stmt = conn.prepared_statement(&insert_sql);
        
        let mut row_count = 0;
        for row_values in rows {
            // Bind parameters
            for (i, value) in row_values.iter().enumerate() {
                match value {
                    rusqlite::types::Value::Null => stmt.param(i as i32, None::<&str>)?,
                    rusqlite::types::Value::Integer(i) => stmt.param(i as i32, *i)?,
                    rusqlite::types::Value::Real(f) => stmt.param(i as i32, *f)?,
                    rusqlite::types::Value::Text(s) => stmt.param(i as i32, s.as_str())?,
                    rusqlite::types::Value::Blob(b) => stmt.param(i as i32, b.as_slice())?,
                }
            }
            
            stmt.execute()?;
            row_count += 1;
        }
        
        // Commit the transaction
        conn.execute("COMMIT")?;
        
        Ok(row_count)
    }
    
    /// Set up triggers to automatically track changes in SQLite tables
    pub fn setup_sync_triggers(&self, tables: &[&str]) -> Result<()> {
        let tracker = self.tracker.clone();
        
        for &table_name in tables {
            // Create triggers for INSERT, UPDATE, DELETE operations
            self.create_sync_trigger(table_name, "INSERT", tracker.clone())?;
            self.create_sync_trigger(table_name, "UPDATE", tracker.clone())?;
            self.create_sync_trigger(table_name, "DELETE", tracker.clone())?;
            
            log::debug!("Created sync triggers for table {}", table_name);
        }
        
        Ok(())
    }
    
    /// Create a trigger to track changes to a table
    fn create_sync_trigger(&self, table_name: &str, operation: &str, tracker: Arc<SyncTracker>) -> Result<()> {
        let trigger_name = format!("sync_trigger_{}_on_{}", operation.to_lowercase(), table_name);
        
        // Drop existing trigger if it exists
        self.sqlite_conn.execute(&format!("DROP TRIGGER IF EXISTS {}", trigger_name), [])?;
        
        // Create the trigger
        let trigger_sql = format!(
            "CREATE TRIGGER {} AFTER {} ON {} BEGIN
                SELECT lumos_mark_modified('{}');
            END",
            trigger_name, operation, table_name, table_name
        );
        
        self.sqlite_conn.execute(&trigger_sql, [])?;
        
        // Register a function to mark tables as modified
        let tracker_clone = tracker.clone();
        let table_name_clone = table_name.to_string();
        
        rusqlite::functions::create_scalar_function(
            self.sqlite_conn.as_ref(),
            "lumos_mark_modified",
            1,
            rusqlite::functions::FunctionFlags::SQLITE_UTF8,
            move |ctx| {
                let table = ctx.get::<String>(0)?;
                tracker_clone.mark_modified(&table);
                Ok(rusqlite::types::Value::Null)
            },
        )?;
        
        Ok(())
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
    use rusqlite::Connection;
    use crate::duckdb::DuckDbEngine;
    
    #[test]
    fn test_sync_tracker() {
        let tracker = SyncTracker::new();
        
        // Mark some tables as modified
        tracker.mark_modified("users");
        tracker.mark_modified("orders");
        
        // Check the modified tables
        let modified = tracker.get_modified_tables();
        assert!(modified.contains("users"));
        assert!(modified.contains("orders"));
        assert_eq!(modified.len(), 2);
        
        // Clear the modified tables
        tracker.clear_modified_tables();
        let modified = tracker.get_modified_tables();
        assert_eq!(modified.len(), 0);
    }
}
