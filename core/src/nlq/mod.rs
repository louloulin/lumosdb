pub mod translator;
pub mod context;
pub mod schema;

pub use translator::{
    NlQueryTranslator, SqlQueryResult, SqlExplanationResult, 
    LlmTranslator, LlmTranslatorConfig, RuleBasedTranslator, CompositeTranslator
};
pub use context::{QueryContext, QueryHistoryItem, QueryPreferences, VerbosityLevel};
pub use schema::{DbSchema, TableSchema, ColumnSchema, Relationship, RelationshipType};

use std::sync::Arc;
use crate::{LumosError, Result};
use crate::query::Query;
use serde::{Serialize, Deserialize};

/// Natural language query translator interface
pub trait NLQueryTranslator: Send + Sync {
    /// Translate a natural language query to SQL
    fn translate(&self, query: &str, context: Option<&QueryContext>) -> Result<Query>;
    
    /// Explain how the natural language query was translated
    fn explain(&self, query: &str, context: Option<&QueryContext>) -> Result<String>;
}

/// Context for natural language queries
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct QueryContext {
    /// Context information as key-value pairs
    pub context: std::collections::HashMap<String, String>,
    
    /// Previous queries in the conversation
    pub history: Vec<QueryHistoryItem>,
    
    /// Schema information for the database
    pub schema: Option<schema::DbSchema>,
}

/// Query history item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QueryHistoryItem {
    /// Natural language query
    pub natural_query: String,
    
    /// Generated SQL query
    pub sql_query: String,
    
    /// Timestamp of the query
    pub timestamp: std::time::SystemTime,
}

impl QueryContext {
    /// Create a new query context
    pub fn new() -> Self {
        Self::default()
    }
    
    /// Add a key-value pair to the context
    pub fn add_context(&mut self, key: &str, value: &str) {
        self.context.insert(key.to_string(), value.to_string());
    }
    
    /// Add a query to the history
    pub fn add_history(&mut self, natural_query: &str, sql_query: &str) {
        self.history.push(QueryHistoryItem {
            natural_query: natural_query.to_string(),
            sql_query: sql_query.to_string(),
            timestamp: std::time::SystemTime::now(),
        });
    }
    
    /// Set the database schema
    pub fn set_schema(&mut self, schema: schema::DbSchema) {
        self.schema = Some(schema);
    }
}

/// Service for handling natural language queries
#[derive(Clone)]
pub struct NLQueryService {
    /// The translator used to convert natural language to SQL
    translator: Arc<dyn NlQueryTranslator>,
    
    /// The context for the queries
    context: QueryContext,
}

impl NLQueryService {
    /// Creates a new NLQuery service with the given translator
    pub fn new(translator: Arc<dyn NlQueryTranslator>) -> Self {
        Self {
            translator,
            context: QueryContext::new(),
        }
    }
    
    /// Creates a new NLQuery service with the given translator and context
    pub fn with_context(translator: Arc<dyn NlQueryTranslator>, context: QueryContext) -> Self {
        Self {
            translator,
            context,
        }
    }
    
    /// Sets the context for the service
    pub fn set_context(&mut self, context: QueryContext) -> &mut Self {
        self.context = context;
        self
    }
    
    /// Gets the current context
    pub fn get_context(&self) -> &QueryContext {
        &self.context
    }
    
    /// Gets a mutable reference to the current context
    pub fn get_context_mut(&mut self) -> &mut QueryContext {
        &mut self.context
    }
    
    /// Translates a natural language query to SQL
    pub async fn translate(&self, query: &str) -> Result<SqlQueryResult> {
        self.translator.translate(query, &self.context).await
    }
    
    /// Explains a SQL query in natural language
    pub async fn explain_sql(&self, sql: &str) -> Result<SqlExplanationResult> {
        self.translator.explain_sql(sql, &self.context).await
    }
    
    /// Translates and executes a natural language query
    pub async fn execute(&mut self, query: &str, executor: &dyn Fn(&str) -> Result<Query>) -> Result<Query> {
        // Translate the query
        let translation = self.translate(query).await?;
        
        // Execute the SQL
        let start_time = std::time::Instant::now();
        let result = executor(&translation.sql)?;
        let duration = start_time.elapsed();
        
        // Update the query history
        self.context.add_history(&query, &translation.sql);
        
        Ok(result)
    }
}

/// Factory for creating NLQueryTranslator instances
pub struct TranslatorFactory;

impl TranslatorFactory {
    /// Creates a rule-based translator
    pub fn create_rule_based() -> Arc<dyn NlQueryTranslator> {
        Arc::new(RuleBasedTranslator::new())
    }
    
    /// Creates an LLM-based translator with default configuration
    pub fn create_llm_default() -> Arc<dyn NlQueryTranslator> {
        Arc::new(LlmTranslator::new(LlmTranslatorConfig::default()))
    }
    
    /// Creates an LLM-based translator with custom configuration
    pub fn create_llm(config: LlmTranslatorConfig) -> Arc<dyn NlQueryTranslator> {
        Arc::new(LlmTranslator::new(config))
    }
    
    /// Creates a composite translator with both rule-based and LLM translators
    pub fn create_composite() -> Arc<dyn NlQueryTranslator> {
        let mut composite = CompositeTranslator::new();
        composite
            .add_translator(Self::create_rule_based())
            .add_translator(Self::create_llm_default());
        Arc::new(composite)
    }
} 