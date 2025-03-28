use duckdb::{Connection, Result as DuckResult};
use std::sync::{Arc, Mutex};
use crate::{LumosError, Result};

/// Connection pool for DuckDB
pub struct ConnectionPool {
    /// Path to the DuckDB database file
    path: String,
    /// Maximum number of connections in the pool
    max_connections: usize,
    /// Available connections
    connections: Arc<Mutex<Vec<Connection>>>,
}

impl ConnectionPool {
    /// Create a new connection pool
    pub fn new(path: &str, max_connections: usize) -> Self {
        Self {
            path: path.to_string(),
            max_connections,
            connections: Arc::new(Mutex::new(Vec::with_capacity(max_connections))),
        }
    }

    /// Initialize the connection pool
    pub fn init(&self) -> Result<()> {
        log::info!("Initializing DuckDB connection pool with {} connections", self.max_connections);
        
        let mut connections = self.connections.lock()
            .map_err(|_| LumosError::DuckDb("Failed to acquire lock on connection pool".to_string()))?;
        
        for i in 0..self.max_connections {
            let conn = Connection::open(&self.path)
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
            // Set memory limit - distribute among connections
            let per_conn_memory = 1024 / self.max_connections;
            let memory_limit_sql = format!("SET memory_limit='{} MB'", per_conn_memory);
            conn.execute(&memory_limit_sql, [])
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
            connections.push(conn);
            log::debug!("Initialized DuckDB connection {}/{}", i + 1, self.max_connections);
        }
        
        log::info!("DuckDB connection pool initialized successfully");
        Ok(())
    }

    /// Borrow a connection from the pool
    pub fn get_connection(&self) -> Result<PooledConnection> {
        let mut connections = self.connections.lock()
            .map_err(|_| LumosError::DuckDb("Failed to acquire lock on connection pool".to_string()))?;
        
        if connections.is_empty() {
            return Err(LumosError::DuckDb("No available connections in the pool".to_string()));
        }
        
        let conn = connections.pop()
            .ok_or_else(|| LumosError::DuckDb("Failed to get connection from pool".to_string()))?;
        
        Ok(PooledConnection {
            conn: Some(conn),
            pool: Arc::clone(&self.connections),
        })
    }

    /// Get the current number of available connections
    pub fn available_connections(&self) -> Result<usize> {
        let connections = self.connections.lock()
            .map_err(|_| LumosError::DuckDb("Failed to acquire lock on connection pool".to_string()))?;
        
        Ok(connections.len())
    }
}

/// A connection borrowed from the pool
pub struct PooledConnection {
    /// The connection, wrapped in an Option to allow for take() in Drop
    conn: Option<Connection>,
    /// Reference to the connection pool
    pool: Arc<Mutex<Vec<Connection>>>,
}

impl PooledConnection {
    /// Get a reference to the underlying connection
    pub fn connection(&self) -> Result<&Connection> {
        self.conn.as_ref()
            .ok_or_else(|| LumosError::DuckDb("Connection has been taken".to_string()))
    }

    /// Execute a SQL statement
    pub fn execute(&self, sql: &str, params: &[&dyn duckdb::ToSql]) -> Result<usize> {
        let conn = self.connection()?;
        let rows_affected = conn.execute(sql, params)
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        Ok(rows_affected)
    }

    /// Query data and map rows to a type
    pub fn query<T, F>(&self, sql: &str, params: &[&dyn duckdb::ToSql], map_fn: F) -> Result<Vec<T>>
    where
        F: FnMut(&duckdb::Row) -> DuckResult<T>,
    {
        let conn = self.connection()?;
        let mut stmt = conn.prepare(sql)
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        let rows = stmt.query_map(params, map_fn)
            .map_err(|e| LumosError::DuckDb(e.to_string()))?
            .collect::<DuckResult<Vec<T>>>()
            .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        
        Ok(rows)
    }
}

impl Drop for PooledConnection {
    fn drop(&mut self) {
        // Return the connection to the pool
        if let Some(conn) = self.conn.take() {
            if let Ok(mut connections) = self.pool.lock() {
                connections.push(conn);
            } else {
                log::error!("Failed to return connection to pool");
            }
        }
    }
}
