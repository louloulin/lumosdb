use std::collections::HashMap;
use chrono::{DateTime, Utc};
use serde::{Serialize, Deserialize};
use crate::{LumosError, Result};
use super::schema::DbSchema;

/// Represents a query history item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryHistoryItem {
    /// The natural language query
    pub nl_query: String,
    
    /// The SQL query generated from the natural language query
    pub sql_query: String,
    
    /// The timestamp when the query was executed
    pub timestamp: DateTime<Utc>,
    
    /// Whether the query was successful
    pub successful: bool,
    
    /// The time it took to execute the query (in milliseconds)
    pub execution_time_ms: Option<u64>,
    
    /// Number of rows returned by the query
    pub result_row_count: Option<usize>,
}

/// Represents the context for a series of natural language queries
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct QueryContext {
    /// The database schema
    pub schema: Option<DbSchema>,
    
    /// Context variables (key-value pairs)
    pub variables: HashMap<String, String>,
    
    /// History of queries
    pub query_history: Vec<QueryHistoryItem>,
    
    /// Global preferences
    pub preferences: QueryPreferences,
}

/// User preferences for query generation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryPreferences {
    /// Maximum number of rows to return
    pub max_rows: Option<usize>,
    
    /// Whether to include comments in the generated SQL
    pub include_comments: bool,
    
    /// The preferred SQL dialect (e.g., "sqlite", "postgres")
    pub sql_dialect: String,
    
    /// Verbosity level for explanations
    pub verbosity: VerbosityLevel,
}

/// Verbosity level for explanations
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum VerbosityLevel {
    /// Minimal explanations
    Minimal,
    
    /// Normal explanations
    Normal,
    
    /// Detailed explanations
    Detailed,
}

impl Default for QueryPreferences {
    fn default() -> Self {
        Self {
            max_rows: Some(100),
            include_comments: true,
            sql_dialect: "sqlite".to_string(),
            verbosity: VerbosityLevel::Normal,
        }
    }
}

impl QueryContext {
    /// Create a new query context
    pub fn new() -> Self {
        Self::default()
    }
    
    /// Create a new query context with a database schema
    pub fn with_schema(schema: DbSchema) -> Self {
        Self {
            schema: Some(schema),
            ..Default::default()
        }
    }
    
    /// Add a context variable
    pub fn add_variable(&mut self, key: &str, value: &str) -> &mut Self {
        self.variables.insert(key.to_string(), value.to_string());
        self
    }
    
    /// Get a context variable
    pub fn get_variable(&self, key: &str) -> Option<&String> {
        self.variables.get(key)
    }
    
    /// Add a query to the history
    pub fn add_query_to_history(&mut self, 
        nl_query: &str, 
        sql_query: &str, 
        successful: bool,
        execution_time_ms: Option<u64>,
        result_row_count: Option<usize>
    ) -> &mut Self {
        let history_item = QueryHistoryItem {
            nl_query: nl_query.to_string(),
            sql_query: sql_query.to_string(),
            timestamp: Utc::now(),
            successful,
            execution_time_ms,
            result_row_count,
        };
        
        self.query_history.push(history_item);
        self
    }
    
    /// Get the last N queries from the history
    pub fn get_recent_queries(&self, n: usize) -> Vec<&QueryHistoryItem> {
        let start = self.query_history.len().saturating_sub(n);
        self.query_history[start..].iter().collect()
    }
    
    /// Set the database schema
    pub fn set_schema(&mut self, schema: DbSchema) -> &mut Self {
        self.schema = Some(schema);
        self
    }
    
    /// Get the database schema
    pub fn get_schema(&self) -> Result<&DbSchema> {
        self.schema.as_ref()
            .ok_or_else(|| LumosError::Other("No database schema available".to_string()))
    }
    
    /// Update preferences
    pub fn update_preferences(&mut self, preferences: QueryPreferences) -> &mut Self {
        self.preferences = preferences;
        self
    }
    
    /// Generate a context summary for the LLM
    pub fn to_context_summary(&self) -> String {
        let mut summary = String::new();
        
        // Add schema summary if available
        if let Some(schema) = &self.schema {
            summary.push_str(&schema.to_summary());
            summary.push_str("\n\n");
        }
        
        // Add variables
        if !self.variables.is_empty() {
            summary.push_str("Context Variables:\n");
            for (key, value) in &self.variables {
                summary.push_str(&format!("- {}: {}\n", key, value));
            }
            summary.push_str("\n");
        }
        
        // Add recent queries (last 3)
        if !self.query_history.is_empty() {
            summary.push_str("Recent Queries:\n");
            
            let recent_queries = self.get_recent_queries(3);
            for (i, query) in recent_queries.iter().enumerate() {
                summary.push_str(&format!("Query {}:\n", i + 1));
                summary.push_str(&format!("  Natural Language: {}\n", query.nl_query));
                summary.push_str(&format!("  SQL: {}\n", query.sql_query));
                summary.push_str(&format!("  Successful: {}\n", query.successful));
                if let Some(time) = query.execution_time_ms {
                    summary.push_str(&format!("  Execution Time: {} ms\n", time));
                }
                if let Some(rows) = query.result_row_count {
                    summary.push_str(&format!("  Result Rows: {}\n", rows));
                }
                summary.push_str("\n");
            }
        }
        
        // Add preferences
        summary.push_str("Preferences:\n");
        summary.push_str(&format!("- SQL Dialect: {}\n", self.preferences.sql_dialect));
        if let Some(max_rows) = self.preferences.max_rows {
            summary.push_str(&format!("- Max Rows: {}\n", max_rows));
        }
        summary.push_str(&format!("- Include Comments: {}\n", self.preferences.include_comments));
        
        let verbosity = match self.preferences.verbosity {
            VerbosityLevel::Minimal => "Minimal",
            VerbosityLevel::Normal => "Normal",
            VerbosityLevel::Detailed => "Detailed",
        };
        summary.push_str(&format!("- Verbosity: {}\n", verbosity));
        
        summary
    }
} 