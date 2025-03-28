use std::sync::{Arc, Mutex};
use std::collections::{HashMap, VecDeque};
use std::time::{Duration, Instant};
use rusqlite::{Connection, Row};
use crate::{LumosError, Result};

/// Data extracted from a SQLite row
#[derive(Debug, Clone)]
pub struct RowData {
    /// Column values stored as strings
    pub values: HashMap<String, String>,
}

impl RowData {
    /// Create a new RowData from a SQLite row
    pub fn from_row(row: &Row) -> Result<Self> {
        let mut values = HashMap::new();
        
        // Get column names and count from the statement
        let stmt = row.as_ref();
        let column_count = stmt.column_count();
        
        for i in 0..column_count {
            let column_name = stmt.column_name(i)?.to_string();
            let value: String = match row.get::<_, rusqlite::types::Value>(i)? {
                rusqlite::types::Value::Null => "NULL".to_string(),
                rusqlite::types::Value::Integer(i) => i.to_string(),
                rusqlite::types::Value::Real(f) => f.to_string(),
                rusqlite::types::Value::Text(s) => s,
                rusqlite::types::Value::Blob(_) => "<BLOB>".to_string(),
            };
            values.insert(column_name, value);
        }
        
        Ok(Self { values })
    }
    
    /// Get a value by column name
    pub fn get(&self, column: &str) -> Option<&String> {
        self.values.get(column)
    }
}

/// A connection pool for SQLite connections
pub struct ConnectionPool {
    /// Path to the SQLite database file
    path: String,
    /// Available connections
    available: Mutex<VecDeque<PooledConnection>>,
    /// Maximum number of connections in the pool
    max_size: usize,
    /// Current number of connections (both available and in-use)
    size: Mutex<usize>,
    /// The time a connection can be idle before it's closed
    max_idle_time: Duration,
    /// Cache of prepared statements for each connection
    prepared_cache: Mutex<HashMap<String, usize>>,
}

/// A connection that belongs to a pool
struct PooledConnection {
    /// The actual SQLite connection
    conn: Connection,
    /// When this connection was last used
    last_used: Instant,
}

impl ConnectionPool {
    /// Create a new connection pool
    pub fn new(path: &str, max_size: usize) -> Self {
        Self {
            path: path.to_string(),
            available: Mutex::new(VecDeque::new()),
            max_size,
            size: Mutex::new(0),
            max_idle_time: Duration::from_secs(60 * 5), // 5 minutes default
            prepared_cache: Mutex::new(HashMap::new()),
        }
    }
    
    /// Set the maximum idle time for connections
    pub fn set_max_idle_time(&mut self, duration: Duration) {
        self.max_idle_time = duration;
    }
    
    /// Get a connection from the pool
    pub fn get(&self) -> Result<PooledConn> {
        // First try to get an available connection
        let mut available = self.available.lock().unwrap();
        
        // Remove expired connections
        while let Some(conn) = available.front() {
            if conn.last_used.elapsed() > self.max_idle_time {
                available.pop_front(); // Remove expired connection
                let mut size = self.size.lock().unwrap();
                *size -= 1;
                // We'll create a new connection below if needed
            } else {
                break;
            }
        }
        
        // If there's an available connection, use it
        if let Some(pooled_conn) = available.pop_front() {
            return Ok(PooledConn {
                conn: pooled_conn.conn,
                pool: self,
            });
        }
        
        // No available connection, create a new one if we haven't reached max_size
        let mut size = self.size.lock().unwrap();
        if *size >= self.max_size {
            return Err(LumosError::Sqlite("Connection pool exhausted".to_string()));
        }
        
        // Create a new connection
        let conn = Connection::open(&self.path)?;
        
        // Configure the connection for OLTP workloads
        // WAL journal mode for better concurrency
        conn.execute("PRAGMA journal_mode = WAL", [])?;
        // NORMAL sync mode for better performance with acceptable safety
        conn.execute("PRAGMA synchronous = NORMAL", [])?;
        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", [])?;
        // Set a reasonable cache size
        conn.execute("PRAGMA cache_size = 10000", [])?; // ~10MB cache
        // Set busy timeout
        conn.busy_timeout(Duration::from_secs(5))?;
        
        *size += 1;
        
        Ok(PooledConn {
            conn,
            pool: self,
        })
    }
    
    /// Return a connection to the pool
    fn return_conn(&self, conn: Connection) {
        let mut available = self.available.lock().unwrap();
        available.push_back(PooledConnection {
            conn,
            last_used: Instant::now(),
        });
    }
    
    /// Record usage of a prepared statement for caching decisions
    pub fn record_prepared_statement(&self, sql: &str) {
        let mut cache = self.prepared_cache.lock().unwrap();
        let count = cache.entry(sql.to_string()).or_insert(0);
        *count += 1;
    }
    
    /// Check if a statement should be cached based on usage patterns
    pub fn should_cache_statement(&self, sql: &str) -> bool {
        let cache = self.prepared_cache.lock().unwrap();
        // Cache if it's been used at least 5 times
        cache.get(sql).map_or(false, |&count| count >= 5)
    }
    
    /// Shrink the pool by closing idle connections
    pub fn shrink(&self) -> Result<usize> {
        let mut available = self.available.lock().unwrap();
        let initial_size = available.len();
        
        // Keep only non-expired connections
        let mut retained = VecDeque::new();
        while let Some(conn) = available.pop_front() {
            if conn.last_used.elapsed() <= self.max_idle_time {
                retained.push_back(conn);
            } else {
                let mut size = self.size.lock().unwrap();
                *size -= 1;
            }
        }
        
        *available = retained;
        let closed = initial_size - available.len();
        Ok(closed)
    }
    
    /// Close all connections in the pool
    pub fn close(&self) -> Result<()> {
        let mut available = self.available.lock().unwrap();
        available.clear();
        
        let mut size = self.size.lock().unwrap();
        *size = 0;
        
        Ok(())
    }
}

/// A connection borrowed from a connection pool
pub struct PooledConn<'a> {
    /// The actual SQLite connection
    conn: Connection,
    /// Reference to the pool
    pool: &'a ConnectionPool,
}

impl<'a> PooledConn<'a> {
    /// Get a reference to the underlying connection
    pub fn conn(&self) -> &Connection {
        &self.conn
    }
    
    /// Execute a query with statement caching based on usage patterns
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize> {
        // Record this statement usage
        self.pool.record_prepared_statement(sql);
        
        // Determine if this statement should be cached
        let should_cache = self.pool.should_cache_statement(sql);
        
        let result = if should_cache {
            // Use prepared_cached for frequently used statements
            let mut stmt = self.conn.prepare_cached(sql)?;
            stmt.execute(params)?
        } else {
            // Use regular prepare for infrequent statements
            let mut stmt = self.conn.prepare(sql)?;
            stmt.execute(params)?
        };
        
        Ok(result)
    }
    
    /// Query with statement caching based on usage patterns
    pub fn query_all(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<RowData>> {
        // Record this statement usage
        self.pool.record_prepared_statement(sql);
        
        // Determine if this statement should be cached
        let should_cache = self.pool.should_cache_statement(sql);
        
        let rows_data = if should_cache {
            // Use prepared_cached for frequently used statements
            let mut stmt = self.conn.prepare_cached(sql)?;
            let mut query_result = stmt.query(params)?;
            let mut data = Vec::new();
            
            while let Some(row) = query_result.next()? {
                data.push(RowData::from_row(row)?);
            }
            data
        } else {
            // Use regular prepare for infrequent statements
            let mut stmt = self.conn.prepare(sql)?;
            let mut query_result = stmt.query(params)?;
            let mut data = Vec::new();
            while let Some(row) = query_result.next()? {
                data.push(RowData::from_row(row)?);
            }
            data
        };
        
        Ok(rows_data)
    }
    
    /// Begin a transaction
    pub fn begin_transaction(&self) -> Result<crate::sqlite::transaction::Transaction> {
        self.conn.execute("BEGIN TRANSACTION", [])?;
        Ok(crate::sqlite::transaction::Transaction::new(&self.conn))
    }
}

impl<'a> Drop for PooledConn<'a> {
    fn drop(&mut self) {
        // Extract the connection from self
        // We need to use std::mem::replace since we can't move out of self
        let conn = std::mem::replace(&mut self.conn, 
            // This temporary connection will never be used
            Connection::open_in_memory().expect("Failed to create temporary connection"));
            
        // Return the connection to the pool
        self.pool.return_conn(conn);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_connection_pool() {
        let pool = ConnectionPool::new(":memory:", 5);
        
        // Get a connection
        let conn = pool.get().unwrap();
        
        // Execute a simple query
        conn.execute("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)", &[]).unwrap();
        conn.execute("INSERT INTO test (name) VALUES (?)", &[&"test"]).unwrap();
        
        // Query
        let rows = conn.query_all("SELECT * FROM test", &[]).unwrap();
        assert_eq!(rows.len(), 1);
        
        // Connection is automatically returned to the pool when dropped
        drop(conn);
        
        // Get another connection and check the data is still there
        let conn = pool.get().unwrap();
        let rows = conn.query_all("SELECT * FROM test", &[]).unwrap();
        assert_eq!(rows.len(), 1);
    }
}
