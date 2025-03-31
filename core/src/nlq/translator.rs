use std::sync::Arc;
use serde::{Serialize, Deserialize};
use async_trait::async_trait;
use crate::{LumosError, Result};
use super::{context::QueryContext, schema::DbSchema};

/// Represents a SQL query with its corresponding explanation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqlQueryResult {
    /// The generated SQL query
    pub sql: String,
    
    /// An explanation of how the SQL query was generated
    pub explanation: String,
    
    /// Confidence score (0.0 to 1.0) indicating how confident the system is in the translation
    pub confidence: f64,
    
    /// Alternative SQL queries that could also work
    pub alternatives: Vec<String>,
}

/// Represents the result of explaining a SQL query
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SqlExplanationResult {
    /// The original SQL query
    pub sql: String,
    
    /// A natural language explanation of what the SQL query does
    pub explanation: String,
    
    /// A breakdown of the query by clause
    pub breakdown: Vec<ClauseExplanation>,
}

/// Represents an explanation of a SQL clause
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClauseExplanation {
    /// The type of clause (SELECT, FROM, WHERE, GROUP BY, etc.)
    pub clause_type: String,
    
    /// The content of the clause
    pub content: String,
    
    /// The explanation of the clause
    pub explanation: String,
}

/// The type of LLM provider
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub enum LlmProvider {
    /// OpenAI API
    OpenAI,
    
    /// HuggingFace API
    HuggingFace,
    
    /// Anthropic API
    Anthropic,
    
    /// Local LLM (e.g., through Ollama)
    Local,
    
    /// Embedded LLM (runs locally within the application)
    Embedded,
}

/// Configuration for an LLM-based translator
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LlmTranslatorConfig {
    /// The provider of the LLM
    pub provider: LlmProvider,
    
    /// The model name to use
    pub model: String,
    
    /// The API key for the provider
    pub api_key: Option<String>,
    
    /// The API endpoint URL
    pub endpoint: Option<String>,
    
    /// Maximum number of tokens to generate
    pub max_tokens: Option<usize>,
    
    /// Temperature (controls randomness)
    pub temperature: Option<f64>,
    
    /// System prompt to use
    pub system_prompt: Option<String>,
}

impl Default for LlmTranslatorConfig {
    fn default() -> Self {
        Self {
            provider: LlmProvider::OpenAI,
            model: "gpt-4o".to_string(),
            api_key: None,
            endpoint: None,
            max_tokens: Some(1000),
            temperature: Some(0.2),
            system_prompt: None,
        }
    }
}

/// A trait for translating natural language queries to SQL
#[async_trait]
pub trait NlQueryTranslator: Send + Sync {
    /// Translates a natural language query to SQL
    async fn translate(&self, query: &str, context: &QueryContext) -> Result<SqlQueryResult>;
    
    /// Explains a SQL query in natural language
    async fn explain_sql(&self, sql: &str, context: &QueryContext) -> Result<SqlExplanationResult>;
}

/// An LLM-based natural language to SQL translator
#[derive(Debug, Clone)]
pub struct LlmTranslator {
    /// Configuration for the translator
    pub config: LlmTranslatorConfig,
}

impl LlmTranslator {
    /// Creates a new LLM-based translator with the given configuration
    pub fn new(config: LlmTranslatorConfig) -> Self {
        Self { config }
    }
    
    /// Constructs a prompt for SQL translation
    fn build_translation_prompt(&self, query: &str, context: &QueryContext) -> String {
        let mut prompt = String::new();
        
        // Add system prompt if available
        if let Some(system_prompt) = &self.config.system_prompt {
            prompt.push_str(system_prompt);
            prompt.push_str("\n\n");
        } else {
            prompt.push_str("You are a SQL expert assistant. Your task is to convert natural language queries into SQL for database queries. \
                            Please provide accurate SQL queries based on the database schema and context provided. \
                            Always return valid SQL that corresponds exactly to what the user is asking for.\n\n");
        }
        
        // Add database schema information
        prompt.push_str("# Database Schema Information\n");
        if let Ok(schema) = context.get_schema() {
            prompt.push_str(&schema.to_summary());
        } else {
            prompt.push_str("No schema information available. Generate SQL based on the query alone.\n");
        }
        
        // Add context information
        prompt.push_str("\n# Query Context\n");
        if !context.variables.is_empty() {
            prompt.push_str("Context Variables:\n");
            for (key, value) in &context.variables {
                prompt.push_str(&format!("- {}: {}\n", key, value));
            }
        } else {
            prompt.push_str("No context variables available.\n");
        }
        
        // Add query history if available
        if !context.query_history.is_empty() {
            prompt.push_str("\n# Recent Query History\n");
            let recent_queries = context.get_recent_queries(3);
            for (i, hist) in recent_queries.iter().enumerate() {
                prompt.push_str(&format!("Query {}: \"{}\"\n", i + 1, hist.nl_query));
                prompt.push_str(&format!("SQL: {}\n\n", hist.sql_query));
            }
        }
        
        // Add dialect information
        prompt.push_str(&format!("\n# Target SQL Dialect: {}\n", context.preferences.sql_dialect));
        
        // Add the actual query
        prompt.push_str("\n# Natural Language Query\n");
        prompt.push_str(query);
        
        // Add instructions
        prompt.push_str("\n\n# Instructions\n");
        prompt.push_str("Please convert the above natural language query into a valid SQL query for the specified dialect.\n");
        prompt.push_str("Return your response in the following JSON format:\n");
        prompt.push_str("```json\n");
        prompt.push_str("{\n");
        prompt.push_str("  \"sql\": \"[the SQL query]\",\n");
        prompt.push_str("  \"explanation\": \"[explanation of how the SQL query works]\",\n");
        prompt.push_str("  \"confidence\": [a number between 0 and 1 indicating your confidence],\n");
        prompt.push_str("  \"alternatives\": [\"alternative SQL query 1\", \"alternative SQL query 2\"]\n");
        prompt.push_str("}\n");
        prompt.push_str("```\n");
        
        prompt
    }
    
    /// Constructs a prompt for SQL explanation
    fn build_explanation_prompt(&self, sql: &str, context: &QueryContext) -> String {
        let mut prompt = String::new();
        
        // Add system prompt if available
        if let Some(system_prompt) = &self.config.system_prompt {
            prompt.push_str(system_prompt);
            prompt.push_str("\n\n");
        } else {
            prompt.push_str("You are a SQL expert assistant. Your task is to explain SQL queries in natural language. \
                            Please provide clear, concise explanations of what the SQL query does, breaking it down by clause.\n\n");
        }
        
        // Add database schema information
        prompt.push_str("# Database Schema Information\n");
        if let Ok(schema) = context.get_schema() {
            prompt.push_str(&schema.to_summary());
        } else {
            prompt.push_str("No schema information available. Explain the SQL based on standard SQL syntax.\n");
        }
        
        // Add the SQL query
        prompt.push_str("\n# SQL Query\n");
        prompt.push_str("```sql\n");
        prompt.push_str(sql);
        prompt.push_str("\n```\n");
        
        // Add instructions
        prompt.push_str("\n# Instructions\n");
        prompt.push_str("Please explain the above SQL query in natural language. Break down the explanation by clause.\n");
        
        // Add verbosity level
        let verbosity = match context.preferences.verbosity {
            super::context::VerbosityLevel::Minimal => "minimal",
            super::context::VerbosityLevel::Normal => "normal",
            super::context::VerbosityLevel::Detailed => "detailed",
        };
        prompt.push_str(&format!("Provide a {} level of detail in your explanation.\n", verbosity));
        
        prompt.push_str("Return your response in the following JSON format:\n");
        prompt.push_str("```json\n");
        prompt.push_str("{\n");
        prompt.push_str("  \"explanation\": \"[overall explanation of what the query does]\",\n");
        prompt.push_str("  \"breakdown\": [\n");
        prompt.push_str("    {\n");
        prompt.push_str("      \"clause_type\": \"[e.g., SELECT, FROM, WHERE, etc.]\",\n");
        prompt.push_str("      \"content\": \"[the content of this clause]\",\n");
        prompt.push_str("      \"explanation\": \"[explanation of what this clause does]\"\n");
        prompt.push_str("    },\n");
        prompt.push_str("    ...\n");
        prompt.push_str("  ]\n");
        prompt.push_str("}\n");
        prompt.push_str("```\n");
        
        prompt
    }
    
    /// Mocked implementation of LLM call for development purposes
    async fn mock_llm_call(&self, prompt: &str, is_translation: bool) -> Result<String> {
        // In a real implementation, this would call the LLM API
        // For now, we'll return mock responses
        
        if is_translation {
            // Mock translation response
            Ok(r#"{
  "sql": "SELECT * FROM users WHERE age > 25 ORDER BY name",
  "explanation": "This query selects all columns from the users table where the age is greater than 25, and orders the results by name.",
  "confidence": 0.95,
  "alternatives": [
    "SELECT * FROM users WHERE age > 25 ORDER BY name ASC",
    "SELECT id, name, age FROM users WHERE age > 25 ORDER BY name"
  ]
}"#.to_string())
        } else {
            // Mock explanation response
            Ok(r#"{
  "explanation": "This query retrieves all columns from the users table for users over 25 years old, sorted by their names alphabetically.",
  "breakdown": [
    {
      "clause_type": "SELECT",
      "content": "*",
      "explanation": "Selects all columns from the users table"
    },
    {
      "clause_type": "FROM",
      "content": "users",
      "explanation": "Specifies that we're querying the users table"
    },
    {
      "clause_type": "WHERE",
      "content": "age > 25",
      "explanation": "Filters the results to only include users with age greater than 25"
    },
    {
      "clause_type": "ORDER BY",
      "content": "name",
      "explanation": "Sorts the results by the name column in ascending order"
    }
  ]
}"#.to_string())
        }
    }
}

#[async_trait]
impl NlQueryTranslator for LlmTranslator {
    async fn translate(&self, query: &str, context: &QueryContext) -> Result<SqlQueryResult> {
        // Build the prompt
        let prompt = self.build_translation_prompt(query, context);
        
        // In a real implementation, this would call the LLM API
        // For development purposes, we'll use a mock implementation
        let response = self.mock_llm_call(&prompt, true).await?;
        
        // Parse the response
        match serde_json::from_str::<SqlQueryResult>(&response) {
            Ok(result) => Ok(result),
            Err(e) => Err(LumosError::Other(format!("Failed to parse LLM response: {}", e))),
        }
    }
    
    async fn explain_sql(&self, sql: &str, context: &QueryContext) -> Result<SqlExplanationResult> {
        // Build the prompt
        let prompt = self.build_explanation_prompt(sql, context);
        
        // In a real implementation, this would call the LLM API
        // For development purposes, we'll use a mock implementation
        let response = self.mock_llm_call(&prompt, false).await?;
        
        // Parse the response
        match serde_json::from_str::<SqlExplanationResult>(&response) {
            Ok(mut result) => {
                result.sql = sql.to_string(); // Ensure the SQL is included in the result
                Ok(result)
            },
            Err(e) => Err(LumosError::Other(format!("Failed to parse LLM response: {}", e))),
        }
    }
}

/// A simple rule-based translator for basic queries
pub struct RuleBasedTranslator;

impl RuleBasedTranslator {
    /// Creates a new rule-based translator
    pub fn new() -> Self {
        Self
    }
}

#[async_trait]
impl NlQueryTranslator for RuleBasedTranslator {
    async fn translate(&self, query: &str, context: &QueryContext) -> Result<SqlQueryResult> {
        // This is a simplified rule-based translation
        // In a real implementation, this would have more complex rules
        
        let query_lower = query.to_lowercase();
        let schema = context.get_schema().ok();
        
        // Try to determine the table
        let mut table_name = String::new();
        if let Some(schema) = &schema {
            for table in &schema.tables {
                if query_lower.contains(&table.name.to_lowercase()) {
                    table_name = table.name.clone();
                    break;
                }
            }
        }
        
        // If no table was found, use a default
        if table_name.is_empty() {
            table_name = "unknown_table".to_string();
        }
        
        // Generate SQL based on simple rules
        let sql = if query_lower.contains("count") || query_lower.contains("how many") {
            format!("SELECT COUNT(*) FROM {}", table_name)
        } else if query_lower.contains("average") || query_lower.contains("avg") {
            // Try to find the column to average
            let mut column = "column_name";
            if let Some(schema) = &schema {
                if let Some(table) = schema.get_table(&table_name) {
                    for col in &table.columns {
                        if query_lower.contains(&col.name.to_lowercase()) {
                            column = &col.name;
                            break;
                        }
                    }
                }
            }
            format!("SELECT AVG({}) FROM {}", column, table_name)
        } else if query_lower.contains("maximum") || query_lower.contains("max") {
            // Try to find the column for max
            let mut column = "column_name";
            if let Some(schema) = &schema {
                if let Some(table) = schema.get_table(&table_name) {
                    for col in &table.columns {
                        if query_lower.contains(&col.name.to_lowercase()) {
                            column = &col.name;
                            break;
                        }
                    }
                }
            }
            format!("SELECT MAX({}) FROM {}", column, table_name)
        } else if query_lower.contains("minimum") || query_lower.contains("min") {
            // Try to find the column for min
            let mut column = "column_name";
            if let Some(schema) = &schema {
                if let Some(table) = schema.get_table(&table_name) {
                    for col in &table.columns {
                        if query_lower.contains(&col.name.to_lowercase()) {
                            column = &col.name;
                            break;
                        }
                    }
                }
            }
            format!("SELECT MIN({}) FROM {}", column, table_name)
        } else {
            format!("SELECT * FROM {}", table_name)
        };
        
        let result = SqlQueryResult {
            sql,
            explanation: format!("Simple rule-based translation of: '{}'", query),
            confidence: 0.5,
            alternatives: vec![],
        };
        
        Ok(result)
    }
    
    async fn explain_sql(&self, sql: &str, _context: &QueryContext) -> Result<SqlExplanationResult> {
        // A very simplified SQL explainer
        let mut breakdown = Vec::new();
        
        // Split SQL query by clauses
        let sql_upper = sql.to_uppercase();
        
        if let Some(select_pos) = sql_upper.find("SELECT") {
            // Handle SELECT clause
            let from_pos = sql_upper.find("FROM").unwrap_or(sql.len());
            let select_content = &sql[select_pos + 6..from_pos].trim();
            
            breakdown.push(ClauseExplanation {
                clause_type: "SELECT".to_string(),
                content: select_content.to_string(),
                explanation: if select_content == "*" {
                    "Selects all columns".to_string()
                } else {
                    format!("Selects the following columns: {}", select_content)
                },
            });
        }
        
        if let Some(from_pos) = sql_upper.find("FROM") {
            // Handle FROM clause
            let where_pos = sql_upper.find("WHERE").unwrap_or_else(|| {
                sql_upper.find("GROUP BY").unwrap_or_else(|| {
                    sql_upper.find("ORDER BY").unwrap_or_else(|| {
                        sql_upper.find("LIMIT").unwrap_or(sql.len())
                    })
                })
            });
            
            let from_content = &sql[from_pos + 4..where_pos].trim();
            
            breakdown.push(ClauseExplanation {
                clause_type: "FROM".to_string(),
                content: from_content.to_string(),
                explanation: format!("Gets data from the {} table(s)", from_content),
            });
        }
        
        if let Some(where_pos) = sql_upper.find("WHERE") {
            // Handle WHERE clause
            let end_pos = sql_upper.find("GROUP BY").unwrap_or_else(|| {
                sql_upper.find("ORDER BY").unwrap_or_else(|| {
                    sql_upper.find("LIMIT").unwrap_or(sql.len())
                })
            });
            
            let where_content = &sql[where_pos + 5..end_pos].trim();
            
            breakdown.push(ClauseExplanation {
                clause_type: "WHERE".to_string(),
                content: where_content.to_string(),
                explanation: format!("Filters results by the condition: {}", where_content),
            });
        }
        
        if let Some(order_pos) = sql_upper.find("ORDER BY") {
            // Handle ORDER BY clause
            let limit_pos = sql_upper.find("LIMIT").unwrap_or(sql.len());
            let order_content = &sql[order_pos + 8..limit_pos].trim();
            
            breakdown.push(ClauseExplanation {
                clause_type: "ORDER BY".to_string(),
                content: order_content.to_string(),
                explanation: format!("Orders results by: {}", order_content),
            });
        }
        
        if let Some(limit_pos) = sql_upper.find("LIMIT") {
            // Handle LIMIT clause
            let limit_content = &sql[limit_pos + 5..].trim();
            
            breakdown.push(ClauseExplanation {
                clause_type: "LIMIT".to_string(),
                content: limit_content.to_string(),
                explanation: format!("Limits results to {} rows", limit_content),
            });
        }
        
        let result = SqlExplanationResult {
            sql: sql.to_string(),
            explanation: "This query retrieves data from the database based on specified conditions.".to_string(),
            breakdown,
        };
        
        Ok(result)
    }
}

/// A composite translator that tries multiple translators
pub struct CompositeTranslator {
    /// List of translators to try
    translators: Vec<Arc<dyn NlQueryTranslator>>,
}

impl CompositeTranslator {
    /// Creates a new composite translator
    pub fn new() -> Self {
        Self {
            translators: Vec::new(),
        }
    }
    
    /// Adds a translator to the composite
    pub fn add_translator(&mut self, translator: Arc<dyn NlQueryTranslator>) -> &mut Self {
        self.translators.push(translator);
        self
    }
}

#[async_trait]
impl NlQueryTranslator for CompositeTranslator {
    async fn translate(&self, query: &str, context: &QueryContext) -> Result<SqlQueryResult> {
        if self.translators.is_empty() {
            return Err(LumosError::Other("No translators available".to_string()));
        }
        
        // Try each translator in order
        let mut errors = Vec::new();
        let mut best_result: Option<SqlQueryResult> = None;
        let mut best_confidence = 0.0;
        
        for translator in &self.translators {
            match translator.translate(query, context).await {
                Ok(result) => {
                    if best_result.is_none() || result.confidence > best_confidence {
                        best_confidence = result.confidence;
                        best_result = Some(result);
                    }
                }
                Err(e) => {
                    errors.push(e);
                }
            }
        }
        
        if let Some(result) = best_result {
            Ok(result)
        } else {
            Err(LumosError::Other(format!(
                "All translators failed: {:?}",
                errors
            )))
        }
    }
    
    async fn explain_sql(&self, sql: &str, context: &QueryContext) -> Result<SqlExplanationResult> {
        if self.translators.is_empty() {
            return Err(LumosError::Other("No translators available".to_string()));
        }
        
        // Try each translator until one succeeds
        let mut last_error = None;
        
        for translator in &self.translators {
            match translator.explain_sql(sql, context).await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    last_error = Some(e);
                }
            }
        }
        
        Err(last_error.unwrap_or_else(|| {
            LumosError::Other("All translators failed without specific errors".to_string())
        }))
    }
}