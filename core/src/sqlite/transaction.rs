use rusqlite::{Connection, Result as SqliteResult};
use crate::{Result, LumosError};
use crate::sqlite::connection::RowData;
use std::ops::Deref;

/// A SQLite transaction - either owning or borrowing a connection
pub enum Transaction<'a> {
    /// Transaction that borrows a connection
    Borrowed(BorrowedTransaction<'a>),
    /// Transaction that owns a connection
    Owned(OwnedTransaction),
}

/// Transaction that borrows a connection
pub struct BorrowedTransaction<'a> {
    /// Reference to the connection
    conn: &'a Connection,
    /// Whether the transaction has been committed
    committed: bool,
}

/// Transaction that owns a connection
pub struct OwnedTransaction {
    /// Owned connection
    conn: Connection,
    /// Whether the transaction has been committed
    committed: bool,
}

impl<'a> Transaction<'a> {
    /// Create a new transaction from a borrowed connection
    pub fn new(conn: &'a Connection) -> Self {
        Self::Borrowed(BorrowedTransaction {
            conn,
            committed: false,
        })
    }
    
    /// Create a new transaction from an owned connection
    pub fn new_owned(conn: Connection) -> Self {
        Self::Owned(OwnedTransaction {
            conn,
            committed: false,
        })
    }
    
    /// Commit the transaction
    pub fn commit(self) -> Result<()> {
        match self {
            Self::Borrowed(tx) => {
                tx.conn.execute("COMMIT", [])?;
                Ok(())
            },
            Self::Owned(mut tx) => {
                tx.conn.execute("COMMIT", [])?;
                Ok(())
            }
        }
    }
    
    /// Execute a simple query without returning results
    pub fn execute(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<usize> {
        match self {
            Self::Borrowed(tx) => {
                let rows_affected = tx.conn.execute(sql, params)?;
                Ok(rows_affected)
            },
            Self::Owned(tx) => {
                let rows_affected = tx.conn.execute(sql, params)?;
                Ok(rows_affected)
            }
        }
    }
    
    /// Execute a query and return all rows
    pub fn query_all(&self, sql: &str, params: &[&dyn rusqlite::ToSql]) -> Result<Vec<RowData>> {
        match self {
            Self::Borrowed(tx) => {
                let mut stmt = tx.conn.prepare(sql)?;
                let mut query_result = stmt.query(params)?;
                let mut rows_data = Vec::new();
                while let Some(row) = query_result.next()? {
                    rows_data.push(RowData::from_row(row)?);
                }
                Ok(rows_data)
            },
            Self::Owned(tx) => {
                let mut stmt = tx.conn.prepare(sql)?;
                let mut query_result = stmt.query(params)?;
                let mut rows_data = Vec::new();
                while let Some(row) = query_result.next()? {
                    rows_data.push(RowData::from_row(row)?);
                }
                Ok(rows_data)
            }
        }
    }
}

impl Drop for BorrowedTransaction<'_> {
    fn drop(&mut self) {
        if !self.committed {
            // Attempt to roll back if not committed
            let _ = self.conn.execute("ROLLBACK", []);
        }
    }
}

impl Drop for OwnedTransaction {
    fn drop(&mut self) {
        if !self.committed {
            // Attempt to roll back if not committed
            let _ = self.conn.execute("ROLLBACK", []);
        }
    }
}

impl<'a> Deref for BorrowedTransaction<'a> {
    type Target = Connection;
    
    fn deref(&self) -> &Self::Target {
        self.conn
    }
}

impl Deref for OwnedTransaction {
    type Target = Connection;
    
    fn deref(&self) -> &Self::Target {
        &self.conn
    }
}

impl<'a> Deref for Transaction<'a> {
    type Target = Connection;
    
    fn deref(&self) -> &Self::Target {
        match self {
            Self::Borrowed(tx) => tx.conn,
            Self::Owned(tx) => &tx.conn
        }
    }
}
