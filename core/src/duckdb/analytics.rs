use duckdb::{Connection, ToSql};
use crate::{LumosError, Result};
use serde_json::Value as JsonValue;
use std::collections::HashMap;

/// Analytics engine built on top of DuckDB
pub struct AnalyticsEngine<'a> {
    /// Reference to the DuckDB connection
    conn: &'a Connection,
}

/// Result of an analytics query
#[derive(Debug, Clone)]
pub struct AnalyticsResult {
    /// Column names
    pub columns: Vec<String>,
    /// Data rows as JSON values
    pub rows: Vec<Vec<JsonValue>>,
    /// Execution time in milliseconds
    pub execution_time_ms: u64,
    /// Number of rows processed
    pub rows_processed: usize,
}

impl<'a> AnalyticsEngine<'a> {
    /// Create a new analytics engine with a DuckDB connection
    pub fn new(conn: &'a Connection) -> Self {
        Self { conn }
    }

    /// Execute an analytics query and return the results
    pub fn execute_query(&self, query: &str, params: &[&dyn ToSql]) -> Result<AnalyticsResult> {
        log::debug!("Executing analytics query: {}", query);
        
        let start_time = std::time::Instant::now();
        
        // Prepare and execute the query
        let mut stmt = self.conn.prepare(query)
            .map_err(|e| LumosError::DuckDb(format!("Failed to prepare query: {}", e)))?;
        
        let column_count = stmt.column_count();
        let mut columns = Vec::with_capacity(column_count);
        
        for i in 0..column_count {
            let column_name = stmt.column_name(i)
                .map_err(|e| LumosError::DuckDb(format!("Failed to get column name: {}", e)))?
                .unwrap_or_else(|| format!("Column_{}", i))
                .to_string();
            
            columns.push(column_name);
        }
        
        // Execute the query and collect the results
        let mut rows = Vec::new();
        let mut rows_processed = 0;
        
        let mut rows_iter = stmt.query(params)
            .map_err(|e| LumosError::DuckDb(format!("Failed to execute query: {}", e)))?;
        
        while let Some(row) = rows_iter.next()
            .map_err(|e| LumosError::DuckDb(format!("Failed to fetch row: {}", e)))? {
            
            let mut json_row = Vec::with_capacity(column_count);
            
            for i in 0..column_count {
                let value = match row.get_ref(i) {
                    Ok(duckdb::types::ValueRef::Null) => JsonValue::Null,
                    Ok(duckdb::types::ValueRef::Integer(i)) => JsonValue::from(i),
                    Ok(duckdb::types::ValueRef::Real(f)) => JsonValue::from(f),
                    Ok(duckdb::types::ValueRef::Text(s)) => JsonValue::from(s),
                    Ok(duckdb::types::ValueRef::Blob(_)) => JsonValue::from("<BLOB>"),
                    Err(e) => {
                        log::warn!("Failed to get value: {}", e);
                        JsonValue::Null
                    }
                };
                
                json_row.push(value);
            }
            
            rows.push(json_row);
            rows_processed += 1;
        }
        
        let execution_time_ms = start_time.elapsed().as_millis() as u64;
        
        log::debug!(
            "Query executed in {}ms, processed {} rows, returned {} rows",
            execution_time_ms, rows_processed, rows.len()
        );
        
        Ok(AnalyticsResult {
            columns,
            rows,
            execution_time_ms,
            rows_processed,
        })
    }

    /// Generate summary statistics for a table or query result
    pub fn generate_summary(&self, table_or_query: &str) -> Result<HashMap<String, JsonValue>> {
        log::debug!("Generating summary for: {}", table_or_query);
        
        // Check if input is a table name or a query
        let is_simple_table = !table_or_query.to_lowercase().contains("select") 
            && !table_or_query.contains("(") 
            && !table_or_query.contains(")");
        
        let query = if is_simple_table {
            format!("SUMMARIZE {}", table_or_query)
        } else {
            format!("SUMMARIZE ({})", table_or_query)
        };
        
        let result = self.execute_query(&query, &[])?;
        let mut summary = HashMap::new();
        
        // Convert the result to a more usable format
        for (i, column) in result.columns.iter().enumerate() {
            let values: Vec<JsonValue> = result.rows.iter()
                .map(|row| row[i].clone())
                .collect();
            
            summary.insert(column.clone(), JsonValue::Array(values));
        }
        
        Ok(summary)
    }

    /// Perform time series analysis on a table or query
    pub fn time_series_analysis(
        &self,
        table_or_query: &str,
        timestamp_column: &str,
        value_column: &str,
        interval: &str,
        aggregation: &str,
    ) -> Result<AnalyticsResult> {
        log::debug!(
            "Performing time series analysis on '{}', timestamp: {}, value: {}, interval: {}, agg: {}",
            table_or_query, timestamp_column, value_column, interval, aggregation
        );
        
        // Check if input is a table name or a query
        let source = if table_or_query.to_lowercase().contains("select") 
            || table_or_query.contains("(") 
            || table_or_query.contains(")") {
            format!("({})", table_or_query)
        } else {
            table_or_query.to_string()
        };
        
        let query = format!(
            "SELECT 
                time_bucket({timestamp_column}, INTERVAL '{interval}') AS time_bucket,
                {aggregation}({value_column}) AS {aggregation}_value
            FROM {source}
            GROUP BY time_bucket
            ORDER BY time_bucket",
            timestamp_column = timestamp_column,
            interval = interval,
            aggregation = aggregation,
            value_column = value_column,
            source = source
        );
        
        self.execute_query(&query, &[])
    }

    /// Perform correlation analysis between two columns
    pub fn correlation_analysis(
        &self,
        table_or_query: &str,
        column1: &str,
        column2: &str,
    ) -> Result<f64> {
        log::debug!(
            "Calculating correlation between '{}' and '{}' in '{}'", 
            column1, column2, table_or_query
        );
        
        // Check if input is a table name or a query
        let source = if table_or_query.to_lowercase().contains("select") 
            || table_or_query.contains("(") 
            || table_or_query.contains(")") {
            format!("({})", table_or_query)
        } else {
            table_or_query.to_string()
        };
        
        let query = format!(
            "SELECT CORR({}, {}) FROM {}",
            column1, column2, source
        );
        
        let result = self.conn.query_row(&query, [], |row| {
            let corr: Option<f64> = row.get(0)?;
            Ok(corr.unwrap_or(0.0))
        }).map_err(|e| LumosError::DuckDb(format!("Failed to calculate correlation: {}", e)))?;
        
        Ok(result)
    }

    /// Detect anomalies in a time series using z-score
    pub fn detect_anomalies(
        &self,
        table_or_query: &str,
        timestamp_column: &str,
        value_column: &str,
        z_threshold: f64,
    ) -> Result<AnalyticsResult> {
        log::debug!(
            "Detecting anomalies in '{}', timestamp: {}, value: {}, threshold: {}",
            table_or_query, timestamp_column, value_column, z_threshold
        );
        
        // Check if input is a table name or a query
        let source = if table_or_query.to_lowercase().contains("select") 
            || table_or_query.contains("(") 
            || table_or_query.contains(")") {
            format!("({})", table_or_query)
        } else {
            table_or_query.to_string()
        };
        
        let query = format!(
            "WITH stats AS (
                SELECT 
                    AVG({value}) AS avg_value,
                    STDDEV_POP({value}) AS stddev_value
                FROM {source}
            ),
            z_scores AS (
                SELECT 
                    {timestamp},
                    {value},
                    ({value} - stats.avg_value) / NULLIF(stats.stddev_value, 0) AS z_score
                FROM {source}, stats
            )
            SELECT 
                {timestamp} AS timestamp,
                {value} AS value,
                z_score,
                CASE 
                    WHEN ABS(z_score) > {threshold} THEN 'Anomaly'
                    ELSE 'Normal'
                END AS status
            FROM z_scores
            WHERE ABS(z_score) > {threshold}
            ORDER BY {timestamp}",
            timestamp = timestamp_column,
            value = value_column,
            source = source,
            threshold = z_threshold
        );
        
        self.execute_query(&query, &[])
    }
}
