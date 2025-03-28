use crate::{LumosError, Result, sqlite::SqliteEngine};
use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

/// Tracks changes to tables for efficient synchronization
pub struct ChangeTracker {
    /// SQLite engine
    sqlite: Option<Arc<SqliteEngine>>,
    /// Tables with pending changes
    changed_tables: HashSet<String>,
    /// Last modification time for each table
    last_modified: HashMap<String, SystemTime>,
}

impl ChangeTracker {
    /// Create a new change tracker
    pub fn new() -> Self {
        Self {
            sqlite: None,
            changed_tables: HashSet::new(),
            last_modified: HashMap::new(),
        }
    }

    /// Initialize the change tracker
    pub fn init(&mut self, sqlite: Arc<SqliteEngine>) -> Result<()> {
        log::info!("Initializing change tracker");
        
        self.sqlite = Some(sqlite.clone());
        
        // Ensure we have the tracking table
        let result = self.create_tracking_table();
        
        if let Err(e) = &result {
            log::error!("Failed to create tracking table: {}", e);
        } else {
            log::info!("Change tracker initialized successfully");
        }
        
        result
    }

    /// Register a change to a table
    pub fn register_change(&mut self, table: &str) -> Result<()> {
        self.changed_tables.insert(table.to_string());
        self.last_modified.insert(table.to_string(), SystemTime::now());
        
        // Record the change in the tracking table if available
        if let Some(sqlite) = &self.sqlite {
            let current_time = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_else(|_| std::time::Duration::from_secs(0))
                .as_secs();
            
            let sql = "INSERT OR REPLACE INTO _lumos_change_tracker (table_name, last_modified) VALUES (?, ?)";
            let result = sqlite.execute(sql, &[&table as &dyn rusqlite::ToSql, &(current_time as i64) as &dyn rusqlite::ToSql]);
            
            if let Err(e) = &result {
                log::warn!("Failed to record change in tracking table: {}", e);
            }
        }
        
        Ok(())
    }

    /// Get the list of tables with pending changes
    pub fn get_changed_tables(&self) -> Result<HashSet<String>> {
        // First try to get changes from the database
        if let Some(sqlite) = &self.sqlite {
            let sql = "SELECT table_name FROM _lumos_change_tracker WHERE sync_status = 0";
            
            match sqlite.query_all(sql, &[]) {
                Ok(rows) => {
                    let mut tables = HashSet::new();
                    
                    for row in rows {
                        if let Ok(table_name) = row.get::<_, String>(0) {
                            tables.insert(table_name);
                        }
                    }
                    
                    Ok(tables)
                },
                Err(e) => {
                    log::warn!("Failed to get changed tables from tracking table: {}", e);
                    // Fall back to in-memory list
                    Ok(self.changed_tables.clone())
                }
            }
        } else {
            // Use in-memory list if database not available
            Ok(self.changed_tables.clone())
        }
    }

    /// Mark tables as synchronized
    pub fn mark_synced(&mut self, tables: &[String]) -> Result<()> {
        for table in tables {
            self.changed_tables.remove(table);
        }
        
        // Update the tracking table if available
        if let Some(sqlite) = &self.sqlite {
            let current_time = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_else(|_| std::time::Duration::from_secs(0))
                .as_secs();
            
            for table in tables {
                let sql = "UPDATE _lumos_change_tracker SET sync_status = 1, last_synced = ? WHERE table_name = ?";
                let result = sqlite.execute(sql, &[&(current_time as i64) as &dyn rusqlite::ToSql, &table as &dyn rusqlite::ToSql]);
                
                if let Err(e) = &result {
                    log::warn!("Failed to update sync status in tracking table: {}", e);
                }
            }
        }
        
        Ok(())
    }

    /// Create the change tracking table
    fn create_tracking_table(&self) -> Result<()> {
        if let Some(sqlite) = &self.sqlite {
            // Create a table to track changes
            let sql = "
                CREATE TABLE IF NOT EXISTS _lumos_change_tracker (
                    table_name TEXT PRIMARY KEY,
                    last_modified INTEGER NOT NULL,
                    last_synced INTEGER,
                    sync_status INTEGER DEFAULT 0
                )
            ";
            
            sqlite.execute(sql, &[])?;
            
            // Create indexes
            let idx_sql = "CREATE INDEX IF NOT EXISTS idx_change_tracker_status ON _lumos_change_tracker (sync_status)";
            sqlite.execute(idx_sql, &[])?;
            
            log::debug!("Created change tracking table");
        } else {
            return Err(LumosError::Sync("SQLite engine not initialized".to_string()));
        }
        
        Ok(())
    }

    /// Get the last modification time for a table
    pub fn get_last_modified(&self, table: &str) -> Option<SystemTime> {
        self.last_modified.get(table).cloned()
    }
}
