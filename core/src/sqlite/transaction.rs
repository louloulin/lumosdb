use rusqlite::Connection;
use crate::{LumosError, Result};
use crate::sqlite::connection::RowData;

/// Represents a SQLite transaction
pub struct Transaction<'a> {
    /// Reference to the SQLite connection
    conn: &'a Connection,
    /// Whether the transaction has been committed or rolled back
    finished: bool,
}

impl<'a> Transaction<'a> {
    /// Create a new transaction from a connection
    pub(crate) fn new(conn: &'a Connection) -> Self {
        Self {
            conn,
            finished: false,
        }
    }

    /// Commit the transaction
    pub fn commit(mut self) -> Result<()> {
        if self.finished {
            return Err(LumosError::Sqlite("Transaction already finished".to_string()));
        }
        
        self.conn.execute("COMMIT", [])?;
        self.finished = true;
        
        log::debug!("Transaction committed successfully");
        Ok(())
    }

    /// Roll back the transaction
    pub fn rollback(mut self) -> Result<()> {
        if self.finished {
            return Err(LumosError::Sqlite("Transaction already finished".to_string()));
        }
        
        self.conn.execute("ROLLBACK", [])?;
        self.finished = true;
        
        log::debug!("Transaction rolled back");
        Ok(())
    }

    /// Execute a SQL statement within the transaction
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize> {
        if self.finished {
            return Err(LumosError::Sqlite("Transaction already finished".to_string()));
        }
        
        let rows_affected = self.conn.execute(sql, params)?;
        Ok(rows_affected)
    }

    /// Execute a query and return all rows
    pub fn query_all(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<RowData>> {
        if self.finished {
            return Err(LumosError::Sqlite("Transaction already finished".to_string()));
        }
        
        let mut stmt = self.conn.prepare(sql)?;
        let mut query_result = stmt.query(params)?;
        let mut rows_data = Vec::new();
        while let Some(row) = query_result.next()? {
            rows_data.push(RowData::from_row(row)?);
        }
        Ok(rows_data)
    }
}

impl<'a> Drop for Transaction<'a> {
    fn drop(&mut self) {
        if !self.finished {
            // Automatically roll back the transaction if it hasn't been committed or rolled back
            if let Err(e) = self.conn.execute("ROLLBACK", []) {
                log::error!("Failed to roll back transaction: {}", e);
            } else {
                log::debug!("Transaction automatically rolled back on drop");
            }
        }
    }
}
