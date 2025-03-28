use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryRequest {
    pub sql: String,
    #[serde(default)]
    pub params: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct QueryResponse {
    pub columns: Vec<String>,
    pub rows: Vec<HashMap<String, String>>,
    pub row_count: usize,
}

#[derive(Debug, Deserialize)]
pub struct ExecuteRequest {
    pub sql: String,
    #[serde(default)]
    pub params: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ExecuteResponse {
    pub rows_affected: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TableInfo {
    pub name: String,
    pub rows: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ColumnInfo {
    pub name: String,
    pub data_type: String,
    pub is_nullable: bool,
    pub is_primary_key: bool,
} 