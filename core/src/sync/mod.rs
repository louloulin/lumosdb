pub mod strategy;
pub mod tracker;
pub mod schema;

use crate::{LumosError, Result, sqlite::SqliteEngine, duckdb::DuckDbEngine};
use std::collections::{HashMap, HashSet};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tracker::ChangeTracker;

/// Synchronization manager for keeping SQLite and DuckDB data in sync
pub struct SyncManager {
    /// Reference to the SQLite engine
    sqlite: Arc<SqliteEngine>,
    /// Reference to the DuckDB engine
    duckdb: Arc<DuckDbEngine>,
    /// Change tracker for identifying modified data
    tracker: Arc<Mutex<ChangeTracker>>,
    /// Configuration for synchronization
    config: SyncConfig,
    /// Last sync time for each table
    last_sync: Arc<Mutex<HashMap<String, SystemTime>>>,
    /// Tables that are synchronized
    synced_tables: Arc<Mutex<HashSet<String>>>,
}

/// Configuration for synchronization
#[derive(Debug, Clone)]
pub struct SyncConfig {
    /// Sync interval in seconds
    pub interval: u64,
    /// Maximum batch size for synchronization
    pub batch_size: usize,
    /// Whether to perform initial full sync
    pub full_sync_on_start: bool,
    /// Tables to exclude from synchronization
    pub exclude_tables: HashSet<String>,
    /// Tables to include in synchronization (empty means all)
    pub include_tables: HashSet<String>,
}

impl Default for SyncConfig {
    fn default() -> Self {
        Self {
            interval: 60,
            batch_size: 10000,
            full_sync_on_start: true,
            exclude_tables: HashSet::new(),
            include_tables: HashSet::new(),
        }
    }
}

impl SyncManager {
    /// Create a new sync manager
    pub fn new(
        sqlite: Arc<SqliteEngine>,
        duckdb: Arc<DuckDbEngine>,
        config: SyncConfig,
    ) -> Self {
        Self {
            sqlite,
            duckdb,
            tracker: Arc::new(Mutex::new(ChangeTracker::new())),
            config,
            last_sync: Arc::new(Mutex::new(HashMap::new())),
            synced_tables: Arc::new(Mutex::new(HashSet::new())),
        }
    }

    /// Initialize the sync manager
    pub fn init(&self) -> Result<()> {
        log::info!("Initializing synchronization manager");
        
        // Initialize the change tracker
        {
            let mut tracker = self.tracker.lock()
                .map_err(|_| LumosError::Sync("Failed to acquire lock on change tracker".to_string()))?;
            
            tracker.init(self.sqlite.clone())?;
        }
        
        // Discover tables to sync
        self.discover_tables()?;
        
        // Perform initial full sync if configured
        if self.config.full_sync_on_start {
            self.full_sync()?;
        }
        
        log::info!("Synchronization manager initialized successfully");
        Ok(())
    }

    /// Start the synchronization loop
    pub fn start_sync_loop(self: Arc<Self>) -> Result<tokio::task::JoinHandle<()>> {
        // Perform an initial full sync if configured
        if self.config.full_sync_on_start {
            if let Err(e) = self.full_sync() {
                log::error!("Initial full sync failed: {}", e);
            }
        }
        
        // Instead of spawning a background thread,
        // we'll just return a dummy JoinHandle that resolves immediately
        // Users should call incremental_sync() manually at appropriate intervals
        log::info!("Background sync is disabled due to thread safety concerns. Use incremental_sync() manually.");
        
        // Return a dummy JoinHandle
        Ok(tokio::spawn(async { }))
    }

    /// Discover tables to synchronize
    fn discover_tables(&self) -> Result<()> {
        log::debug!("Discovering tables to synchronize");
        
        // Get tables from SQLite
        let sqlite_conn = self.sqlite.connection()?;
        let sqlite_schema = crate::sqlite::schema::SchemaManager::new(&sqlite_conn);
        let sqlite_tables = sqlite_schema.get_tables()?;
        
        // Filter tables based on configuration
        let mut synced_tables = self.synced_tables.lock()
            .map_err(|_| LumosError::Sync("Failed to acquire lock on synced tables".to_string()))?;
        
        for table in sqlite_tables {
            // Skip system tables
            if table.starts_with("sqlite_") {
                continue;
            }
            
            // Check exclusion list
            if self.config.exclude_tables.contains(&table) {
                log::debug!("Excluding table from sync: {}", table);
                continue;
            }
            
            // Check inclusion list
            if !self.config.include_tables.is_empty() && !self.config.include_tables.contains(&table) {
                log::debug!("Table not in inclusion list: {}", table);
                continue;
            }
            
            // Add to synchronized tables
            synced_tables.insert(table.clone());
            log::debug!("Added table to sync list: {}", table);
        }
        
        log::info!("Discovered {} tables to synchronize", synced_tables.len());
        Ok(())
    }

    /// Perform a full synchronization of all tables
    fn full_sync(&self) -> Result<()> {
        log::info!("Starting full synchronization");
        
        let start_time = Instant::now();
        let synced_tables = self.synced_tables.lock()
            .map_err(|_| LumosError::Sync("Failed to acquire lock on synced tables".to_string()))?;
        
        for table in synced_tables.iter() {
            log::debug!("Synchronizing table: {}", table);
            self.sync_table(table, true)?;
        }
        
        let elapsed = start_time.elapsed();
        log::info!("Full synchronization completed in {:?}", elapsed);
        
        Ok(())
    }

    /// Perform an incremental synchronization
    fn incremental_sync(&self) -> Result<()> {
        log::debug!("Starting incremental synchronization");
        
        let start_time = Instant::now();
        let synced_tables = self.synced_tables.lock()
            .map_err(|_| LumosError::Sync("Failed to acquire lock on synced tables".to_string()))?;
        
        // Get changed tables from tracker
        let changed_tables = {
            let tracker = self.tracker.lock()
                .map_err(|_| LumosError::Sync("Failed to acquire lock on change tracker".to_string()))?;
            
            tracker.get_changed_tables()?
        };
        
        for table in changed_tables {
            if synced_tables.contains(&table) {
                log::debug!("Incrementally synchronizing table: {}", table);
                self.sync_table(&table, false)?;
            }
        }
        
        let elapsed = start_time.elapsed();
        log::debug!("Incremental synchronization completed in {:?}", elapsed);
        
        Ok(())
    }

    /// Synchronize a specific table
    fn sync_table(&self, table: &str, full_sync: bool) -> Result<()> {
        let sqlite_conn = self.sqlite.connection()?;
        let duckdb_conn = self.duckdb.connection()?;
        
        // Get schema information
        let sqlite_schema = crate::sqlite::schema::SchemaManager::new(&sqlite_conn);
        let columns = sqlite_schema.get_table_schema(table)?;
        
        // Create table in DuckDB if it doesn't exist
        let table_exists = self.duckdb.table_exists(table)?;
        
        if !table_exists {
            // Create a DDL statement for DuckDB based on SQLite schema
            let columns_sql = columns.iter()
                .map(|col| {
                    let mut sql = format!("{} ", col.name);
                    
                    // Map SQLite types to DuckDB types
                    let duckdb_type = match col.data_type.to_uppercase().as_str() {
                        "INTEGER" => "BIGINT",
                        "REAL" => "DOUBLE",
                        "TEXT" => "VARCHAR",
                        "BLOB" => "BLOB",
                        _ => "VARCHAR",
                    };
                    
                    sql.push_str(duckdb_type);
                    
                    // Also add columns that are marked as NOT NULL
                    if col.is_not_null {
                        sql.push_str(" NOT NULL");
                    }
                    
                    sql
                })
                .collect::<Vec<_>>()
                .join(", ");
            
            let create_sql = format!("CREATE TABLE {} ({})", table, columns_sql);
            
            duckdb_conn.execute(&create_sql, [])
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
            log::info!("Created DuckDB table: {}", table);
        }
        
        // Determine last sync time
        let mut last_sync_map = self.last_sync.lock()
            .map_err(|_| LumosError::Sync("Failed to acquire lock on last sync map".to_string()))?;
        
        let last_sync_time = if full_sync {
            None
        } else {
            last_sync_map.get(table).cloned()
        };
        
        // Build query for SQLite data retrieval
        let column_names = columns.iter()
            .map(|col| col.name.clone())
            .collect::<Vec<_>>()
            .join(", ");
        
        let mut sql = format!("SELECT {} FROM {}", column_names, table);
        
        // Add time filter for incremental sync
        if let Some(last_sync) = last_sync_time {
            // Convert to Unix timestamp
            let timestamp = last_sync
                .duration_since(UNIX_EPOCH)
                .map_err(|e| LumosError::Sync(format!("Time error: {}", e)))?
                .as_secs() as i64;
            
            // We need a way to track row modifications in SQLite
            // For now, we'll add a WHERE clause if _last_modified exists
            if columns.iter().any(|col| col.name == "_last_modified") {
                sql.push_str(&format!(" WHERE _last_modified > {}", timestamp));
            }
        }
        
        // Query SQLite for data to sync
        let sqlite_rows = self.sqlite.query_all(&sql, &[])?;
        let total_rows = sqlite_rows.len();
        
        if total_rows == 0 {
            log::debug!("No changes to sync for table: {}", table);
            
            // Update last sync time even if no changes
            last_sync_map.insert(table.to_string(), SystemTime::now());
            
            // Mark as synced in tracker
            let mut tracker = self.tracker.lock()
                .map_err(|_| LumosError::Sync("Failed to acquire lock on change tracker".to_string()))?;
            
            tracker.mark_synced(&[table.to_string()])?;
            
            return Ok(());
        }
        
        log::info!("Syncing {} rows for table: {}", total_rows, table);
        
        // Process in batches
        let batch_size = self.config.batch_size;
        let mut synced_count = 0;
        
        for chunk in sqlite_rows.chunks(batch_size) {
            // Clear existing data in DuckDB for full sync
            if full_sync && synced_count == 0 {
                let delete_sql = format!("DELETE FROM {}", table);
                duckdb_conn.execute(&delete_sql, [])
                    .map_err(|e| LumosError::DuckDb(e.to_string()))?;
                
                log::debug!("Cleared existing data for full sync of table: {}", table);
            }
            
            // Build INSERT statement for DuckDB
            let placeholders = (0..columns.len())
                .map(|_| "?")
                .collect::<Vec<_>>()
                .join(", ");
            
            let insert_sql = format!(
                "INSERT INTO {} ({}) VALUES ({})",
                table, column_names, placeholders
            );
            
            // Start a transaction
            let tx = duckdb_conn.transaction()
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
            // Prepare the statement once
            let mut stmt = tx.prepare(&insert_sql)
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
            // Insert each row
            for row in chunk {
                // Extract values for this row
                let mut params: Vec<&dyn duckdb::ToSql> = Vec::with_capacity(columns.len());
                
                for col in &columns {
                    if let Some(value) = row.get(&col.name) {
                        params.push(value);
                    } else {
                        // Use NULL for missing values
                        params.push(&duckdb::types::Value::Null);
                    }
                }
                
                // Execute the insert
                stmt.execute(params.as_slice())
                    .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            }
            
            // Commit the transaction
            tx.commit()
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
            synced_count += chunk.len();
            log::debug!("Synced {}/{} rows for table: {}", synced_count, total_rows, table);
        }
        
        // Update last sync time
        last_sync_map.insert(table.to_string(), SystemTime::now());
        
        // Mark as synced in tracker
        let mut tracker = self.tracker.lock()
            .map_err(|_| LumosError::Sync("Failed to acquire lock on change tracker".to_string()))?;
        
        tracker.mark_synced(&[table.to_string()])?;
        
        log::info!("Successfully synchronized table: {}", table);
        Ok(())
    }

    /// Register a table change with the tracker
    pub fn register_change(&self, table: &str) -> Result<()> {
        let mut tracker = self.tracker.lock()
            .map_err(|_| LumosError::Sync("Failed to acquire lock on change tracker".to_string()))?;
        
        tracker.register_change(table)?;
        Ok(())
    }

    /// Force a synchronization of all tables
    pub fn force_sync(&self) -> Result<()> {
        self.full_sync()
    }
}
