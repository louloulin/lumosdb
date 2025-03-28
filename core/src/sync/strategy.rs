use crate::{LumosError, Result, sqlite::SqliteEngine, duckdb::DuckDbEngine};
use serde::{Serialize, Deserialize};
use std::sync::Arc;
use std::collections::HashMap;

/// Synchronization strategy for data between SQLite and DuckDB
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SyncStrategy {
    /// Full sync - all data is synchronized
    Full,
    /// Incremental - only changed data is synchronized
    Incremental,
    /// Snapshot - point-in-time snapshots are synchronized
    Snapshot,
    /// Manual - synchronization only happens when explicitly requested
    Manual,
}

impl std::fmt::Display for SyncStrategy {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SyncStrategy::Full => write!(f, "Full"),
            SyncStrategy::Incremental => write!(f, "Incremental"),
            SyncStrategy::Snapshot => write!(f, "Snapshot"),
            SyncStrategy::Manual => write!(f, "Manual"),
        }
    }
}

/// Table synchronization configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TableSyncConfig {
    /// Table name
    pub table_name: String,
    /// Synchronization strategy
    pub strategy: SyncStrategy,
    /// Columns to include (empty means all)
    pub include_columns: Vec<String>,
    /// Columns to exclude
    pub exclude_columns: Vec<String>,
    /// Primary key column(s)
    pub primary_keys: Vec<String>,
    /// Custom transformation SQL
    pub transform_sql: Option<String>,
}

/// Strategy executor for data synchronization
pub struct StrategyExecutor {
    /// SQLite engine
    sqlite: Arc<SqliteEngine>,
    /// DuckDB engine
    duckdb: Arc<DuckDbEngine>,
    /// Table configurations
    table_configs: HashMap<String, TableSyncConfig>,
}

impl StrategyExecutor {
    /// Create a new strategy executor
    pub fn new(
        sqlite: Arc<SqliteEngine>,
        duckdb: Arc<DuckDbEngine>,
    ) -> Self {
        Self {
            sqlite,
            duckdb,
            table_configs: HashMap::new(),
        }
    }

    /// Configure a table's synchronization strategy
    pub fn configure_table(&mut self, config: TableSyncConfig) {
        self.table_configs.insert(config.table_name.clone(), config);
    }

    /// Execute synchronization for a table
    pub fn sync_table(&self, table_name: &str) -> Result<usize> {
        // Get table configuration or use default
        let config = self.table_configs.get(table_name).cloned().unwrap_or_else(|| {
            TableSyncConfig {
                table_name: table_name.to_string(),
                strategy: SyncStrategy::Incremental,
                include_columns: vec![],
                exclude_columns: vec![],
                primary_keys: vec!["id".to_string()],
                transform_sql: None,
            }
        });
        
        log::debug!("Synchronizing table '{}' using {} strategy", table_name, config.strategy);
        
        match config.strategy {
            SyncStrategy::Full => self.execute_full_sync(&config),
            SyncStrategy::Incremental => self.execute_incremental_sync(&config),
            SyncStrategy::Snapshot => self.execute_snapshot_sync(&config),
            SyncStrategy::Manual => {
                log::debug!("Skipping table '{}' with Manual sync strategy", table_name);
                Ok(0)
            }
        }
    }

    /// Execute a full synchronization for a table
    fn execute_full_sync(&self, config: &TableSyncConfig) -> Result<usize> {
        log::debug!("Executing full sync for table '{}'", config.table_name);
        
        // Get column list
        let columns = self.get_column_list(config)?;
        
        // Prepare SQLite query
        let sqlite_query = if let Some(transform_sql) = &config.transform_sql {
            transform_sql.clone()
        } else {
            format!("SELECT {} FROM {}", columns, config.table_name)
        };
        
        // Get data from SQLite
        let sqlite_conn = self.sqlite.connection()?;
        let rows = sqlite_conn.prepare(&sqlite_query)?
            .query_map([], |row| Ok(row.clone()))?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        
        if rows.is_empty() {
            log::debug!("No data to synchronize for table '{}'", config.table_name);
            return Ok(0);
        }
        
        // Clear existing data in DuckDB
        let duckdb_conn = self.duckdb.connection()?;
        let delete_sql = format!("DELETE FROM {}", config.table_name);
        
        // Only try to delete if the table exists in DuckDB
        let table_exists = self.duckdb.table_exists(&config.table_name)?;
        if table_exists {
            duckdb_conn.execute(&delete_sql, [])
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        } else {
            // Create table if it doesn't exist
            self.create_table_in_duckdb(config)?;
        }
        
        // Insert data into DuckDB
        let row_count = self.insert_data_to_duckdb(config, &rows)?;
        
        log::info!("Full sync completed for table '{}': {} rows synchronized", config.table_name, row_count);
        
        Ok(row_count)
    }

    /// Execute an incremental synchronization for a table
    fn execute_incremental_sync(&self, config: &TableSyncConfig) -> Result<usize> {
        log::debug!("Executing incremental sync for table '{}'", config.table_name);
        
        // Check for tracking information
        let last_modified_col = "_lumos_last_modified";
        
        // Get column list
        let columns = self.get_column_list(config)?;
        
        // Get SQLite connection
        let sqlite_conn = self.sqlite.connection()?;
        
        // Check if the tracking column exists
        let has_tracking = {
            let mut stmt = sqlite_conn.prepare("PRAGMA table_info(?1)")?;
            let columns = stmt.query_map([&config.table_name], |row| {
                let name: String = row.get(1)?;
                Ok(name)
            })?
            .collect::<std::result::Result<Vec<String>, _>>()
            .map_err(|e| LumosError::Sqlite(e.to_string()))?;
            
            columns.iter().any(|c| c == last_modified_col)
        };
        
        // Get primary key columns for identification
        let pk_columns = if config.primary_keys.is_empty() {
            vec!["rowid".to_string()]
        } else {
            config.primary_keys.clone()
        };
        
        // Find the last sync time from tracking table
        let last_sync_time = self.get_last_sync_time(&config.table_name)?;
        
        // Prepare SQLite query for changed records
        let sqlite_query = if has_tracking {
            format!(
                "SELECT {} FROM {} WHERE {} > {}",
                columns, config.table_name, last_modified_col, last_sync_time
            )
        } else if let Some(transform_sql) = &config.transform_sql {
            // If we have a custom transform, use it
            transform_sql.clone()
        } else {
            // Without tracking column, we'll use a simple query
            // This won't be efficient for large tables
            format!("SELECT {} FROM {}", columns, config.table_name)
        };
        
        // Get changed data from SQLite
        let rows = sqlite_conn.prepare(&sqlite_query)?
            .query_map([], |row| Ok(row.clone()))?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        
        if rows.is_empty() {
            log::debug!("No changes to synchronize for table '{}'", config.table_name);
            return Ok(0);
        }
        
        // Check if table exists in DuckDB
        let duckdb_conn = self.duckdb.connection()?;
        let table_exists = self.duckdb.table_exists(&config.table_name)?;
        
        if !table_exists {
            // Create table if it doesn't exist
            self.create_table_in_duckdb(config)?;
        }
        
        // For incremental sync, delete matching records first
        if !rows.is_empty() && !pk_columns.is_empty() {
            // Get list of primary key values
            let mut pk_values = Vec::new();
            
            for row in &rows {
                let pk_value = if pk_columns.len() == 1 {
                    // Single column primary key
                    let pk_col = &pk_columns[0];
                    let pk_idx = self.get_column_index(sqlite_conn, &config.table_name, pk_col)?;
                    
                    match row.get_ref(pk_idx)? {
                        rusqlite::types::ValueRef::Null => "NULL".to_string(),
                        rusqlite::types::ValueRef::Integer(i) => i.to_string(),
                        rusqlite::types::ValueRef::Real(f) => f.to_string(),
                        rusqlite::types::ValueRef::Text(s) => format!("'{}'", std::str::from_utf8(s).unwrap_or_default().replace('\'', "''")),
                        rusqlite::types::ValueRef::Blob(_) => "NULL".to_string(),
                    }
                } else {
                    // Composite primary key
                    let parts: Vec<String> = pk_columns.iter().map(|pk_col| {
                        let pk_idx = match self.get_column_index(sqlite_conn, &config.table_name, pk_col) {
                            Ok(idx) => idx,
                            Err(_) => return "NULL".to_string(),
                        };
                        
                        match row.get_ref(pk_idx) {
                            Ok(rusqlite::types::ValueRef::Null) => "NULL".to_string(),
                            Ok(rusqlite::types::ValueRef::Integer(i)) => i.to_string(),
                            Ok(rusqlite::types::ValueRef::Real(f)) => f.to_string(),
                            Ok(rusqlite::types::ValueRef::Text(s)) => format!("'{}'", std::str::from_utf8(s).unwrap_or_default().replace('\'', "''")),
                            Ok(rusqlite::types::ValueRef::Blob(_)) => "NULL".to_string(),
                            Err(_) => "NULL".to_string(),
                        }
                    }).collect();
                    
                    parts.join(", ")
                };
                
                pk_values.push(pk_value);
            }
            
            // Delete matching records
            if !pk_values.is_empty() {
                let pk_list = pk_columns.join(", ");
                let where_clause = if pk_columns.len() == 1 {
                    format!("{} IN ({})", pk_columns[0], pk_values.join(", "))
                } else {
                    // For composite keys, use combination
                    format!("({}) IN ({})", pk_list, pk_values.iter().map(|v| format!("({})", v)).collect::<Vec<_>>().join(", "))
                };
                
                let delete_sql = format!("DELETE FROM {} WHERE {}", config.table_name, where_clause);
                
                duckdb_conn.execute(&delete_sql, [])
                    .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            }
        }
        
        // Insert data into DuckDB
        let row_count = self.insert_data_to_duckdb(config, &rows)?;
        
        // Update last sync time
        self.update_last_sync_time(&config.table_name)?;
        
        log::info!("Incremental sync completed for table '{}': {} rows synchronized", config.table_name, row_count);
        
        Ok(row_count)
    }

    /// Execute a snapshot synchronization for a table
    fn execute_snapshot_sync(&self, config: &TableSyncConfig) -> Result<usize> {
        log::debug!("Executing snapshot sync for table '{}'", config.table_name);
        
        // Get snapshot name with timestamp
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_else(|_| std::time::Duration::from_secs(0))
            .as_secs();
        
        let snapshot_table = format!("{}_{}", config.table_name, timestamp);
        
        // Get column list
        let columns = self.get_column_list(config)?;
        
        // Prepare SQLite query
        let sqlite_query = if let Some(transform_sql) = &config.transform_sql {
            transform_sql.clone()
        } else {
            format!("SELECT {} FROM {}", columns, config.table_name)
        };
        
        // Get data from SQLite
        let sqlite_conn = self.sqlite.connection()?;
        let rows = sqlite_conn.prepare(&sqlite_query)?
            .query_map([], |row| Ok(row.clone()))?
            .collect::<std::result::Result<Vec<_>, _>>()
            .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        
        if rows.is_empty() {
            log::debug!("No data to snapshot for table '{}'", config.table_name);
            return Ok(0);
        }
        
        // Create a snapshot table in DuckDB
        let mut snapshot_config = config.clone();
        snapshot_config.table_name = snapshot_table.clone();
        self.create_table_in_duckdb(&snapshot_config)?;
        
        // Insert data into DuckDB snapshot
        let row_count = self.insert_data_to_duckdb(&snapshot_config, &rows)?;
        
        log::info!("Snapshot sync completed for table '{}' as '{}': {} rows synchronized", 
            config.table_name, snapshot_table, row_count);
        
        Ok(row_count)
    }

    /// Create a table in DuckDB based on SQLite schema
    fn create_table_in_duckdb(&self, config: &TableSyncConfig) -> Result<()> {
        log::debug!("Creating table '{}' in DuckDB", config.table_name);
        
        // Get SQLite connection
        let sqlite_conn = self.sqlite.connection()?;
        
        // Get table schema from SQLite
        let mut stmt = sqlite_conn.prepare("PRAGMA table_info(?1)")?;
        let columns: Vec<(String, String, bool)> = stmt.query_map([&config.table_name], |row| {
            let name: String = row.get(1)?;
            let data_type: String = row.get(2)?;
            let not_null: i32 = row.get(3)?;
            
            Ok((name, data_type, not_null == 1))
        })?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        
        // Filter columns based on configuration
        let filtered_columns: Vec<(String, String, bool)> = columns.into_iter()
            .filter(|(name, _, _)| {
                // Include if either the include list is empty or it contains this column
                let include = config.include_columns.is_empty() || config.include_columns.contains(name);
                // Exclude if the exclude list contains this column
                let exclude = config.exclude_columns.contains(name);
                
                include && !exclude
            })
            .collect();
        
        if filtered_columns.is_empty() {
            return Err(LumosError::Sync(format!("No columns to sync for table '{}'", config.table_name)));
        }
        
        // Create column definitions
        let columns_sql = filtered_columns.iter()
            .map(|(name, data_type, not_null)| {
                // Map SQLite types to DuckDB types
                let duckdb_type = match data_type.to_uppercase().as_str() {
                    "INTEGER" => "BIGINT",
                    "REAL" => "DOUBLE",
                    "TEXT" => "VARCHAR",
                    "BLOB" => "BLOB",
                    _ => "VARCHAR",
                };
                
                let null_constraint = if *not_null { " NOT NULL" } else { "" };
                
                format!("{} {}{}", name, duckdb_type, null_constraint)
            })
            .collect::<Vec<_>>()
            .join(", ");
        
        // Create primary key clause if needed
        let pk_clause = if !config.primary_keys.is_empty() {
            format!(", PRIMARY KEY ({})", config.primary_keys.join(", "))
        } else {
            String::new()
        };
        
        // Create table in DuckDB
        let duckdb_conn = self.duckdb.connection()?;
        let create_sql = format!("CREATE TABLE IF NOT EXISTS {} ({}{})", 
            config.table_name, columns_sql, pk_clause);
        
        duckdb_conn.execute(&create_sql, [])
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        log::info!("Created table '{}' in DuckDB", config.table_name);
        
        Ok(())
    }

    /// Insert data into DuckDB
    fn insert_data_to_duckdb(&self, config: &TableSyncConfig, rows: &[rusqlite::Row]) -> Result<usize> {
        if rows.is_empty() {
            return Ok(0);
        }
        
        // Get DuckDB connection
        let duckdb_conn = self.duckdb.connection()?;
        
        // Get SQLite connection for schema info
        let sqlite_conn = self.sqlite.connection()?;
        
        // Get column names and indices
        let column_names = self.get_column_list_vec(config)?;
        let column_indices: Vec<usize> = column_names.iter()
            .filter_map(|col| self.get_column_index(sqlite_conn, &config.table_name, col).ok())
            .collect();
        
        if column_indices.is_empty() {
            return Err(LumosError::Sync(format!("No valid columns to sync for table '{}'", config.table_name)));
        }
        
        // Begin a transaction
        duckdb_conn.execute("BEGIN TRANSACTION", [])
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        // Prepare batches of values for insertion
        let batch_size = 1000;
        let mut total_inserted = 0;
        
        for chunk in rows.chunks(batch_size) {
            let mut values_lists = Vec::new();
            
            for row in chunk {
                let mut values = Vec::new();
                
                for &idx in &column_indices {
                    match row.get_ref(idx) {
                        Ok(rusqlite::types::ValueRef::Null) => values.push("NULL".to_string()),
                        Ok(rusqlite::types::ValueRef::Integer(i)) => values.push(i.to_string()),
                        Ok(rusqlite::types::ValueRef::Real(f)) => values.push(f.to_string()),
                        Ok(rusqlite::types::ValueRef::Text(s)) => values.push(format!("'{}'", std::str::from_utf8(s).unwrap_or_default().replace('\'', "''")),),
                        Ok(rusqlite::types::ValueRef::Blob(b)) => values.push(format!("'{}'", hex::encode(b))),
                        Err(_) => values.push("NULL".to_string()),
                    }
                }
                
                values_lists.push(format!("({})", values.join(", ")));
            }
            
            if values_lists.is_empty() {
                continue;
            }
            
            // Insert the batch
            let columns_str = column_names.join(", ");
            let values_str = values_lists.join(", ");
            
            let insert_sql = format!(
                "INSERT INTO {} ({}) VALUES {}",
                config.table_name, columns_str, values_str
            );
            
            duckdb_conn.execute(&insert_sql, [])
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
            total_inserted += values_lists.len();
        }
        
        // Commit the transaction
        duckdb_conn.execute("COMMIT", [])
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        log::debug!("Inserted {} rows into table '{}'", total_inserted, config.table_name);
        
        Ok(total_inserted)
    }

    /// Get the column list for a table as a comma-separated string
    fn get_column_list(&self, config: &TableSyncConfig) -> Result<String> {
        let columns = self.get_column_list_vec(config)?;
        Ok(columns.join(", "))
    }

    /// Get the column list for a table as a vector
    fn get_column_list_vec(&self, config: &TableSyncConfig) -> Result<Vec<String>> {
        // Get SQLite connection
        let sqlite_conn = self.sqlite.connection()?;
        
        // Get column names from SQLite
        let mut stmt = sqlite_conn.prepare("PRAGMA table_info(?1)")?;
        let all_columns: Vec<String> = stmt.query_map([&config.table_name], |row| {
            let name: String = row.get(1)?;
            Ok(name)
        })?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        
        // Filter columns based on configuration
        let columns: Vec<String> = if !config.include_columns.is_empty() {
            // Only include specified columns
            config.include_columns.iter()
                .filter(|col| all_columns.contains(col))
                .cloned()
                .collect()
        } else if !config.exclude_columns.is_empty() {
            // Include all except excluded columns
            all_columns.into_iter()
                .filter(|col| !config.exclude_columns.contains(col))
                .collect()
        } else {
            // Include all columns
            all_columns
        };
        
        if columns.is_empty() {
            return Err(LumosError::Sync(format!("No columns to sync for table '{}'", config.table_name)));
        }
        
        Ok(columns)
    }

    /// Get the index of a column in a table
    fn get_column_index(&self, conn: &rusqlite::Connection, table: &str, column: &str) -> Result<usize> {
        let mut stmt = conn.prepare("PRAGMA table_info(?1)")?;
        
        let columns: Vec<(i32, String)> = stmt.query_map([table], |row| {
            let cid: i32 = row.get(0)?;
            let name: String = row.get(1)?;
            Ok((cid, name))
        })?
        .collect::<std::result::Result<Vec<_>, _>>()
        .map_err(|e| LumosError::Sqlite(e.to_string()))?;
        
        for (idx, name) in columns {
            if name == column {
                return Ok(idx as usize);
            }
        }
        
        Err(LumosError::Sync(format!("Column '{}' not found in table '{}'", column, table)))
    }

    /// Get the last synchronization time for a table
    fn get_last_sync_time(&self, table: &str) -> Result<i64> {
        let sqlite_conn = self.sqlite.connection()?;
        
        let sql = "SELECT last_synced FROM _lumos_change_tracker WHERE table_name = ?";
        let last_sync = sqlite_conn.query_row(sql, [table], |row| {
            row.get::<_, Option<i64>>(0)
        }).unwrap_or(None).unwrap_or(0);
        
        Ok(last_sync)
    }

    /// Update the last synchronization time for a table
    fn update_last_sync_time(&self, table: &str) -> Result<()> {
        let sqlite_conn = self.sqlite.connection()?;
        
        let current_time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_else(|_| std::time::Duration::from_secs(0))
            .as_secs() as i64;
        
        let sql = "INSERT OR REPLACE INTO _lumos_change_tracker 
                   (table_name, last_modified, last_synced, sync_status) 
                   VALUES (?, ?, ?, 1)";
        
        sqlite_conn.execute(sql, rusqlite::params![table, current_time, current_time])?;
        
        Ok(())
    }
}
