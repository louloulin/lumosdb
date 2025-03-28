use crate::{
    LumosError, Result,
    query::{Query, QueryResult, QueryParam, EngineType},
    sqlite::SqliteEngine,
    duckdb::DuckDbEngine
};
use serde_json::Value as JsonValue;

/// Execute a query on SQLite
pub fn execute_on_sqlite(engine: &SqliteEngine, query: &Query) -> Result<QueryResult> {
    let conn = engine.connection()?;
    
    // Convert query parameters to SQLite parameters
    let params: Vec<&dyn rusqlite::ToSql> = query.params.iter()
        .map(|p| -> &dyn rusqlite::ToSql {
            match p {
                QueryParam::String(s) => s,
                QueryParam::Integer(i) => i,
                QueryParam::Float(f) => f,
                QueryParam::Boolean(b) => b,
                QueryParam::Null => &() as &dyn rusqlite::ToSql,
            }
        })
        .collect();
    
    // Prepare the statement
    let mut stmt = conn.prepare(&query.sql)?;
    
    // Get column information
    let column_count = stmt.column_count();
    let mut columns = Vec::with_capacity(column_count);
    
    for i in 0..column_count {
        if let Some(name) = stmt.column_name(i)? {
            columns.push(name.to_string());
        } else {
            columns.push(format!("column_{}", i));
        }
    }
    
    // Execute the query
    let mut rows_result = Vec::new();
    let mut rows_affected = 0;
    
    match query.query_type {
        crate::query::QueryType::Select => {
            // Query rows and convert to JSON format
            let mut rows = stmt.query(&params[..])?;
            
            while let Some(row) = rows.next()? {
                let mut json_row = Vec::with_capacity(column_count);
                
                for i in 0..column_count {
                    let value = match row.get_ref(i)? {
                        rusqlite::types::ValueRef::Null => JsonValue::Null,
                        rusqlite::types::ValueRef::Integer(i) => JsonValue::from(i),
                        rusqlite::types::ValueRef::Real(f) => JsonValue::from(f),
                        rusqlite::types::ValueRef::Text(s) => JsonValue::from(std::str::from_utf8(s).unwrap_or_default()),
                        rusqlite::types::ValueRef::Blob(b) => JsonValue::from(format!("<BLOB: {} bytes>", b.len())),
                    };
                    
                    json_row.push(value);
                }
                
                rows_result.push(json_row);
            }
        },
        _ => {
            // For non-SELECT queries, execute and get the number of affected rows
            rows_affected = stmt.execute(&params[..])?;
        }
    }
    
    Ok(QueryResult {
        columns,
        rows: rows_result,
        rows_affected,
        engine_used: EngineType::Sqlite,
        execution_time_ms: 0, // Will be filled in by the caller
    })
}

/// Execute a query on DuckDB
pub fn execute_on_duckdb(engine: &DuckDbEngine, query: &Query) -> Result<QueryResult> {
    let conn = engine.connection()?;
    
    // Convert query parameters to DuckDB parameters
    let params: Vec<&dyn duckdb::ToSql> = query.params.iter()
        .map(|p| -> &dyn duckdb::ToSql {
            match p {
                QueryParam::String(s) => s,
                QueryParam::Integer(i) => i,
                QueryParam::Float(f) => f,
                QueryParam::Boolean(b) => b,
                QueryParam::Null => &() as &dyn duckdb::ToSql,
            }
        })
        .collect();
    
    // Prepare the statement
    let mut stmt = conn.prepare(&query.sql)
        .map_err(|e| LumosError::DuckDb(e.to_string()))?;
    
    // Get column information
    let column_count = stmt.column_count();
    let mut columns = Vec::with_capacity(column_count);
    
    for i in 0..column_count {
        if let Some(name) = stmt.column_name(i)
            .map_err(|e| LumosError::DuckDb(e.to_string()))? {
            columns.push(name.to_string());
        } else {
            columns.push(format!("column_{}", i));
        }
    }
    
    // Execute the query
    let mut rows_result = Vec::new();
    let mut rows_affected = 0;
    
    match query.query_type {
        crate::query::QueryType::Select => {
            // Query rows and convert to JSON format
            let mut rows = stmt.query(&params[..])
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
            
            while let Some(row) = rows.next()
                .map_err(|e| LumosError::DuckDb(e.to_string()))? {
                
                let mut json_row = Vec::with_capacity(column_count);
                
                for i in 0..column_count {
                    let value = match row.get_ref(i)
                        .map_err(|e| LumosError::DuckDb(e.to_string()))? {
                        duckdb::types::ValueRef::Null => JsonValue::Null,
                        duckdb::types::ValueRef::Integer(i) => JsonValue::from(i),
                        duckdb::types::ValueRef::Real(f) => JsonValue::from(f),
                        duckdb::types::ValueRef::Text(s) => JsonValue::from(s),
                        duckdb::types::ValueRef::Blob(_) => JsonValue::from("<BLOB>"),
                    };
                    
                    json_row.push(value);
                }
                
                rows_result.push(json_row);
            }
        },
        _ => {
            // For non-SELECT queries, execute and get the number of affected rows
            rows_affected = stmt.execute(&params[..])
                .map_err(|e| LumosError::DuckDb(e.to_string()))?;
        }
    }
    
    Ok(QueryResult {
        columns,
        rows: rows_result,
        rows_affected,
        engine_used: EngineType::DuckDb,
        execution_time_ms: 0, // Will be filled in by the caller
    })
}
