use rusqlite::Connection;
use std::time::{Duration, Instant};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use crate::{LumosError, Result};

/// Tracks query performance and provides optimization suggestions
pub struct QueryOptimizer {
    /// Tracks query execution times
    query_stats: Arc<Mutex<HashMap<String, QueryStats>>>,
    /// Optimization threshold in milliseconds
    threshold_ms: u64,
    /// Limit for the number of queries to track
    max_queries: usize,
}

/// Statistics for a specific query
#[derive(Debug, Clone)]
pub struct QueryStats {
    /// Number of times the query has been executed
    pub execution_count: usize,
    /// Total execution time
    pub total_time: Duration,
    /// Minimum execution time
    pub min_time: Duration,
    /// Maximum execution time
    pub max_time: Duration,
    /// Average execution time
    pub avg_time: Duration,
    /// Number of rows typically returned
    pub avg_rows: f64,
    /// Whether the query uses an index
    pub uses_index: bool,
    /// Suggested indexes (if applicable)
    pub suggested_indexes: Vec<String>,
}

impl QueryOptimizer {
    /// Create a new query optimizer
    pub fn new() -> Self {
        Self {
            query_stats: Arc::new(Mutex::new(HashMap::new())),
            threshold_ms: 100, // Default threshold of 100ms
            max_queries: 1000, // Track up to 1000 queries by default
        }
    }
    
    /// Set the optimization threshold in milliseconds
    pub fn set_threshold(&mut self, threshold_ms: u64) {
        self.threshold_ms = threshold_ms;
    }
    
    /// Set the maximum number of queries to track
    pub fn set_max_queries(&mut self, max_queries: usize) {
        self.max_queries = max_queries;
    }
    
    /// Record query execution time and analyze performance
    pub fn record_query(&self, conn: &Connection, sql: &str, params: &[&dyn rusqlite::ToSql], rows: usize, duration: Duration) -> Result<()> {
        // Normalize query by replacing literal values with placeholders
        let normalized_sql = self.normalize_query(sql);
        
        // Update query statistics
        let mut stats_map = self.query_stats.lock().unwrap();
        
        // Limit the number of tracked queries
        if stats_map.len() >= self.max_queries && !stats_map.contains_key(&normalized_sql) {
            // Remove the least frequently executed query if we're at capacity
            if let Some((least_frequent, _)) = stats_map.iter()
                .min_by_key(|(_, stats)| stats.execution_count) {
                let key = least_frequent.clone();
                stats_map.remove(&key);
            }
        }
        
        let stats = stats_map.entry(normalized_sql.clone()).or_insert_with(|| {
            QueryStats {
                execution_count: 0,
                total_time: Duration::from_secs(0),
                min_time: Duration::from_secs(u64::MAX),
                max_time: Duration::from_secs(0),
                avg_time: Duration::from_secs(0),
                avg_rows: 0.0,
                uses_index: false,
                suggested_indexes: Vec::new(),
            }
        });
        
        // Update statistics
        stats.execution_count += 1;
        stats.total_time += duration;
        stats.min_time = std::cmp::min(stats.min_time, duration);
        stats.max_time = std::cmp::max(stats.max_time, duration);
        stats.avg_time = stats.total_time / stats.execution_count as u32;
        
        // Update average rows returned
        let old_avg_rows = stats.avg_rows;
        let new_count = stats.execution_count as f64;
        stats.avg_rows = old_avg_rows + (rows as f64 - old_avg_rows) / new_count;
        
        // Check if the query is slow
        if duration.as_millis() > self.threshold_ms as u128 && stats.execution_count > 5 {
            // Check if the query uses an index
            stats.uses_index = self.check_if_uses_index(conn, &normalized_sql)?;
            
            // Generate optimization suggestions if needed
            if !stats.uses_index {
                stats.suggested_indexes = self.suggest_indexes(conn, &normalized_sql)?;
            }
        }
        
        Ok(())
    }
    
    /// Execute a query with performance tracking
    pub fn execute_tracked<T, F>(&self, conn: &Connection, sql: &str, params: &[&dyn rusqlite::ToSql], executor: F) -> Result<T>
    where
        F: FnOnce() -> std::result::Result<(T, usize), rusqlite::Error>,
    {
        let start = Instant::now();
        
        // Execute the query
        let result = executor().map_err(|e| LumosError::Sqlite(e.to_string()))?;
        let duration = start.elapsed();
        
        // Record the query execution
        let (value, rows) = result;
        self.record_query(conn, sql, params, rows, duration)?;
        
        Ok(value)
    }
    
    /// Normalize a SQL query by replacing literal values with placeholders
    fn normalize_query(&self, sql: &str) -> String {
        // This is a simplified implementation. In practice, you'd use a SQL parser
        let normalized = sql
            .replace(|c: char| c.is_digit(10), "?")  // Replace numbers
            .replace("'", "?")                       // Replace string literals
            .replace("\"", "?");                     // Replace quoted identifiers
            
        normalized
    }
    
    /// Check if a query uses an index
    fn check_if_uses_index(&self, conn: &Connection, sql: &str) -> Result<bool> {
        // Use EXPLAIN QUERY PLAN to check if the query uses an index
        let explain_sql = format!("EXPLAIN QUERY PLAN {}", sql);
        let mut stmt = conn.prepare(&explain_sql)?;
        let rows = stmt.query_map([], |row| {
            let detail: String = row.get(3)?;
            Ok(detail)
        })?;
        
        // Look for signs of index usage in the query plan
        for row_result in rows {
            let detail = row_result?;
            if detail.contains("USING INDEX") || detail.contains("SEARCH") {
                return Ok(true);
            }
        }
        
        Ok(false)
    }
    
    /// Suggest indexes for a slow query
    fn suggest_indexes(&self, conn: &Connection, sql: &str) -> Result<Vec<String>> {
        let mut suggested_indexes = Vec::new();
        
        // Parse the query to extract table and column information
        // This is a simplified implementation
        if let Some(table_name) = extract_table_name(sql) {
            // Check if the query has WHERE clauses
            if let Some(where_columns) = extract_where_columns(sql) {
                for column in where_columns {
                    let index_name = format!("idx_{}_{}", table_name, column);
                    let create_index_sql = format!("CREATE INDEX IF NOT EXISTS {} ON {} ({})", 
                                                 index_name, table_name, column);
                    suggested_indexes.push(create_index_sql);
                }
            }
        }
        
        Ok(suggested_indexes)
    }
    
    /// Get statistics for all tracked queries
    pub fn get_all_stats(&self) -> HashMap<String, QueryStats> {
        let stats_map = self.query_stats.lock().unwrap();
        stats_map.clone()
    }
    
    /// Get statistics for a specific normalized query
    pub fn get_query_stats(&self, normalized_sql: &str) -> Option<QueryStats> {
        let stats_map = self.query_stats.lock().unwrap();
        stats_map.get(normalized_sql).cloned()
    }
    
    /// Get slow queries that exceed the threshold
    pub fn get_slow_queries(&self) -> HashMap<String, QueryStats> {
        let stats_map = self.query_stats.lock().unwrap();
        stats_map.iter()
            .filter(|(_, stats)| stats.avg_time.as_millis() > self.threshold_ms as u128)
            .map(|(sql, stats)| (sql.clone(), stats.clone()))
            .collect()
    }
    
    /// Apply suggested optimizations to the database
    pub fn apply_optimizations(&self, conn: &Connection) -> Result<usize> {
        let mut applied_count = 0;
        
        // Get slow queries that don't use indexes
        let stats_map = self.query_stats.lock().unwrap();
        let slow_queries = stats_map.iter()
            .filter(|(_, stats)| {
                stats.avg_time.as_millis() > self.threshold_ms as u128 && 
                !stats.uses_index && 
                !stats.suggested_indexes.is_empty()
            })
            .collect::<Vec<_>>();
        
        // Apply suggested indexes for slow queries
        for (_, stats) in slow_queries {
            for index_sql in &stats.suggested_indexes {
                // Create the suggested index
                match conn.execute(index_sql, []) {
                    Ok(_) => {
                        applied_count += 1;
                        log::info!("Applied optimization: {}", index_sql);
                    }
                    Err(e) => {
                        log::error!("Failed to apply optimization: {} - Error: {}", index_sql, e);
                    }
                }
            }
        }
        
        Ok(applied_count)
    }
}

/// Extract table name from a SQL query (simplified implementation)
fn extract_table_name(sql: &str) -> Option<String> {
    // Look for FROM clause
    let sql_upper = sql.to_uppercase();
    if let Some(from_pos) = sql_upper.find(" FROM ") {
        let after_from = &sql[from_pos + 6..];
        // Extract table name (until the next space, comma, etc.)
        let end_pos = after_from.find(|c: char| c.is_whitespace() || c == ',' || c == ';')
            .unwrap_or_else(|| after_from.len());
        let table_name = &after_from[..end_pos];
        return Some(table_name.trim().to_string());
    }
    None
}

/// Extract column names from WHERE clauses (simplified implementation)
fn extract_where_columns(sql: &str) -> Option<Vec<String>> {
    let sql_upper = sql.to_uppercase();
    if let Some(where_pos) = sql_upper.find(" WHERE ") {
        let where_clause = &sql[where_pos + 7..];
        let mut columns = Vec::new();
        
        // Split by AND/OR and extract column names
        let conditions = where_clause.split(|c: char| c == ' ' && (c.to_uppercase() == "AND" || c.to_uppercase() == "OR"));
        for condition in conditions {
            if let Some(eq_pos) = condition.find('=') {
                let column = condition[..eq_pos].trim().to_string();
                if !column.is_empty() {
                    columns.push(column);
                }
            }
        }
        
        if !columns.is_empty() {
            return Some(columns);
        }
    }
    None
}

/// Trait extension for Connection to provide optimized query execution
pub trait OptimizedConnection {
    /// Execute a query with optimization tracking
    fn execute_optimized(&self, optimizer: &QueryOptimizer, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize>;
    
    /// Query with optimization tracking
    fn query_optimized(&self, optimizer: &QueryOptimizer, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<rusqlite::Row>>;
}

impl OptimizedConnection for Connection {
    fn execute_optimized(&self, optimizer: &QueryOptimizer, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize> {
        optimizer.execute_tracked(self, sql, params, || {
            let result = self.execute(sql, rusqlite::params_from_iter(params))?;
            Ok((result, 0)) // 0 rows for execute
        })
    }
    
    fn query_optimized(&self, optimizer: &QueryOptimizer, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<rusqlite::Row>> {
        optimizer.execute_tracked(self, sql, params, || {
            let mut stmt = self.prepare(sql)?;
            let rows = stmt.query_map(rusqlite::params_from_iter(params), |row| Ok(row.clone()))?
                .collect::<std::result::Result<Vec<_>, _>>()?;
            Ok((rows.clone(), rows.len()))
        })
    }
}
