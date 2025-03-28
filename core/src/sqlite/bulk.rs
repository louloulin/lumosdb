use rusqlite::{Connection, Transaction};
use std::collections::HashMap;
use crate::{LumosError, Result};

/// Supports efficient bulk operations for SQLite
pub struct BulkOperator<'a> {
    /// Reference to the SQLite connection or transaction
    conn: &'a Connection,
    /// Batch size for bulk operations
    batch_size: usize,
    /// Prepared statement cache
    statement_cache: HashMap<String, rusqlite::Statement<'a>>,
}

impl<'a> BulkOperator<'a> {
    /// Create a new bulk operator with the given connection
    pub fn new(conn: &'a Connection) -> Self {
        Self {
            conn,
            batch_size: 1000, // Default batch size
            statement_cache: HashMap::new(),
        }
    }
    
    /// Set the batch size for bulk operations
    pub fn with_batch_size(mut self, batch_size: usize) -> Self {
        self.batch_size = batch_size;
        self
    }
    
    /// Insert multiple rows into a table in batches
    pub fn insert_batch<F, T>(
        &mut self, 
        table: &str, 
        columns: &[&str], 
        data: &[T], 
        params_builder: F
    ) -> Result<usize>
    where 
        F: Fn(&T) -> Vec<Box<dyn rusqlite::ToSql>>,
    {
        if data.is_empty() {
            return Ok(0);
        }
        
        // Start a transaction for better performance
        let tx = self.conn.transaction()?;
        
        // Build the parameterized query
        let placeholders = vec!["?"; columns.len()].join(", ");
        let sql = format!(
            "INSERT INTO {} ({}) VALUES ({})",
            table,
            columns.join(", "),
            placeholders
        );
        
        let mut total_inserted = 0;
        
        // Process in batches for better performance
        for chunk in data.chunks(self.batch_size) {
            let mut stmt = tx.prepare(&sql)?;
            
            for item in chunk {
                let params = params_builder(item);
                let params_refs: Vec<&dyn rusqlite::ToSql> = params
                    .iter()
                    .map(|p| p.as_ref())
                    .collect();
                
                stmt.execute(&params_refs[..])?;
                total_inserted += 1;
            }
        }
        
        // Commit the transaction
        tx.commit()?;
        
        log::debug!("Batch inserted {} rows into table {}", total_inserted, table);
        Ok(total_inserted)
    }
    
    /// Update multiple rows in a table in batches
    pub fn update_batch<F, T>(
        &mut self,
        table: &str,
        update_columns: &[&str],
        where_columns: &[&str],
        data: &[T],
        params_builder: F
    ) -> Result<usize>
    where
        F: Fn(&T) -> Vec<Box<dyn rusqlite::ToSql>>,
    {
        if data.is_empty() {
            return Ok(0);
        }
        
        // Start a transaction
        let tx = self.conn.transaction()?;
        
        // Build the update SQL
        let set_clause = update_columns
            .iter()
            .map(|col| format!("{} = ?", col))
            .collect::<Vec<_>>()
            .join(", ");
            
        let where_clause = where_columns
            .iter()
            .map(|col| format!("{} = ?", col))
            .collect::<Vec<_>>()
            .join(" AND ");
            
        let sql = format!(
            "UPDATE {} SET {} WHERE {}",
            table,
            set_clause,
            where_clause
        );
        
        let mut total_updated = 0;
        
        // Process in batches
        for chunk in data.chunks(self.batch_size) {
            let mut stmt = tx.prepare(&sql)?;
            
            for item in chunk {
                let params = params_builder(item);
                let params_refs: Vec<&dyn rusqlite::ToSql> = params
                    .iter()
                    .map(|p| p.as_ref())
                    .collect();
                
                let updated = stmt.execute(&params_refs[..])?;
                total_updated += updated;
            }
        }
        
        // Commit the transaction
        tx.commit()?;
        
        log::debug!("Batch updated {} rows in table {}", total_updated, table);
        Ok(total_updated)
    }
    
    /// Delete multiple rows from a table in batches
    pub fn delete_batch<F, T>(
        &mut self,
        table: &str,
        where_columns: &[&str],
        data: &[T],
        params_builder: F
    ) -> Result<usize>
    where
        F: Fn(&T) -> Vec<Box<dyn rusqlite::ToSql>>,
    {
        if data.is_empty() {
            return Ok(0);
        }
        
        // Start a transaction
        let tx = self.conn.transaction()?;
        
        // Build the delete SQL
        let where_clause = where_columns
            .iter()
            .map(|col| format!("{} = ?", col))
            .collect::<Vec<_>>()
            .join(" AND ");
            
        let sql = format!(
            "DELETE FROM {} WHERE {}",
            table,
            where_clause
        );
        
        let mut total_deleted = 0;
        
        // Process in batches
        for chunk in data.chunks(self.batch_size) {
            let mut stmt = tx.prepare(&sql)?;
            
            for item in chunk {
                let params = params_builder(item);
                let params_refs: Vec<&dyn rusqlite::ToSql> = params
                    .iter()
                    .map(|p| p.as_ref())
                    .collect();
                
                let deleted = stmt.execute(&params_refs[..])?;
                total_deleted += deleted;
            }
        }
        
        // Commit the transaction
        tx.commit()?;
        
        log::debug!("Batch deleted {} rows from table {}", total_deleted, table);
        Ok(total_deleted)
    }
    
    /// Execute a prepared statement multiple times with different parameter sets
    pub fn execute_batch<F, T>(
        &mut self,
        sql: &str,
        data: &[T],
        params_builder: F
    ) -> Result<usize>
    where
        F: Fn(&T) -> Vec<Box<dyn rusqlite::ToSql>>,
    {
        if data.is_empty() {
            return Ok(0);
        }
        
        // Start a transaction
        let tx = self.conn.transaction()?;
        
        let mut total_affected = 0;
        
        // Process in batches
        for chunk in data.chunks(self.batch_size) {
            // Check if statement is in cache
            let mut stmt = if !self.statement_cache.contains_key(sql) {
                let prepared = tx.prepare(sql)?;
                self.statement_cache.insert(sql.to_string(), prepared);
                self.statement_cache.get_mut(sql).unwrap()
            } else {
                self.statement_cache.get_mut(sql).unwrap()
            };
            
            for item in chunk {
                let params = params_builder(item);
                let params_refs: Vec<&dyn rusqlite::ToSql> = params
                    .iter()
                    .map(|p| p.as_ref())
                    .collect();
                
                let affected = stmt.execute(&params_refs[..])?;
                total_affected += affected;
            }
        }
        
        // Commit the transaction
        tx.commit()?;
        
        log::debug!("Batch operation affected {} rows", total_affected);
        Ok(total_affected)
    }
    
    /// Insert many rows with a single SQL statement (using SQLite's VALUES clause)
    pub fn insert_many<F, T>(
        &mut self,
        table: &str,
        columns: &[&str],
        data: &[T],
        params_builder: F
    ) -> Result<usize>
    where
        F: Fn(&T) -> Vec<Box<dyn rusqlite::ToSql>>,
    {
        if data.is_empty() {
            return Ok(0);
        }
        
        // Start a transaction
        let tx = self.conn.transaction()?;
        
        let mut total_inserted = 0;
        
        // Process in batches with multiple VALUE sets in a single INSERT
        for chunk in data.chunks(self.batch_size) {
            // Prepare the multi-value insert SQL
            let placeholders = vec!["?"; columns.len()].join(", ");
            let mut values_clauses = Vec::new();
            let mut all_params: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();
            
            for item in chunk {
                values_clauses.push(format!("({})", placeholders));
                let params = params_builder(item);
                all_params.extend(params);
            }
            
            let sql = format!(
                "INSERT INTO {} ({}) VALUES {}",
                table,
                columns.join(", "),
                values_clauses.join(", ")
            );
            
            let params_refs: Vec<&dyn rusqlite::ToSql> = all_params
                .iter()
                .map(|p| p.as_ref())
                .collect();
            
            let affected = tx.execute(&sql, &params_refs[..])?;
            total_inserted += affected;
        }
        
        // Commit the transaction
        tx.commit()?;
        
        log::debug!("Inserted {} rows into table {}", total_inserted, table);
        Ok(total_inserted)
    }
    
    /// Clear the statement cache
    pub fn clear_cache(&mut self) {
        self.statement_cache.clear();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::Connection;
    
    #[test]
    fn test_bulk_insert() {
        let conn = Connection::open_in_memory().unwrap();
        
        // Create a test table
        conn.execute(
            "CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT, value REAL)",
            [],
        ).unwrap();
        
        // Test data
        #[derive(Debug)]
        struct TestItem {
            id: i64,
            name: String,
            value: f64,
        }
        
        let data = vec![
            TestItem { id: 1, name: "Item 1".to_string(), value: 1.1 },
            TestItem { id: 2, name: "Item 2".to_string(), value: 2.2 },
            TestItem { id: 3, name: "Item 3".to_string(), value: 3.3 },
        ];
        
        // Use the bulk operator
        let mut bulk_op = BulkOperator::new(&conn);
        let inserted = bulk_op.insert_batch(
            "test",
            &["id", "name", "value"],
            &data,
            |item| {
                vec![
                    Box::new(item.id) as Box<dyn rusqlite::ToSql>,
                    Box::new(item.name.clone()) as Box<dyn rusqlite::ToSql>,
                    Box::new(item.value) as Box<dyn rusqlite::ToSql>,
                ]
            },
        ).unwrap();
        
        assert_eq!(inserted, 3);
        
        // Verify the data was inserted
        let count: i64 = conn.query_row("SELECT COUNT(*) FROM test", [], |row| row.get(0)).unwrap();
        assert_eq!(count, 3);
    }
}
