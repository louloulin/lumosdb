pub mod translator;
pub mod context;
pub mod schema;

pub use translator::{
    NlQueryTranslator, SqlQueryResult, SqlExplanationResult, 
    LlmTranslator, LlmTranslatorConfig, RuleBasedTranslator, CompositeTranslator
};
pub use schema::{DbSchema, TableSchema, ColumnSchema, Relationship, RelationshipType};

use std::sync::Arc;
use crate::Result;
use crate::query::Query;
use serde::{Serialize, Deserialize};
use context::{QueryContext, QueryHistoryItem, QueryPreferences, VerbosityLevel};

/// NLQueryTranslator特性处理向后兼容
#[deprecated(since = "0.1.0", note = "Use the async trait from translator module instead")]
pub trait NLQueryTranslator: Send + Sync {
    /// Translate a natural language query to SQL
    fn translate(&self, query: &str, context: Option<&QueryContext>) -> Result<Query>;
    
    /// Explain how the natural language query was translated
    fn explain(&self, query: &str, context: Option<&QueryContext>) -> Result<String>;
}

/// 兼容性实现
#[derive(Clone)]
struct LegacyTranslatorAdapter<T: translator::NlQueryTranslator + Clone> {
    inner: T,
}

impl<T: translator::NlQueryTranslator + Clone> NLQueryTranslator for LegacyTranslatorAdapter<T> {
    fn translate(&self, query: &str, _context: Option<&QueryContext>) -> Result<Query> {
        // 创建一个临时上下文或使用提供的上下文
        let context = _context.cloned().unwrap_or_default();
        
        // 运行异步代码
        let rt = tokio::runtime::Runtime::new().unwrap();
        let result = rt.block_on(async {
            self.inner.translate(query, &context).await
        })?;
        
        // 将SqlQueryResult转换为Query
        let query = Query::new(&result.sql);
        Ok(query)
    }
    
    fn explain(&self, query: &str, _context: Option<&QueryContext>) -> Result<String> {
        // 创建一个临时上下文或使用提供的上下文
        let context = _context.cloned().unwrap_or_default();
        
        // 运行异步代码生成SQL
        let rt = tokio::runtime::Runtime::new().unwrap();
        let sql_result = rt.block_on(async {
            self.inner.translate(query, &context).await
        })?;
        
        // 返回解释
        Ok(sql_result.explanation)
    }
}

/// Service for handling natural language queries
#[derive(Clone)]
pub struct NLQueryService {
    /// The translator used to convert natural language to SQL
    translator: Arc<dyn translator::NlQueryTranslator>,
    
    /// The context for the queries
    context: QueryContext,
}

impl NLQueryService {
    /// Creates a new NLQuery service with the given translator
    pub fn new(translator: Arc<dyn translator::NlQueryTranslator>) -> Self {
        Self {
            translator,
            context: QueryContext::new(),
        }
    }
    
    /// Creates a new NLQuery service with the given translator and context
    pub fn with_context(translator: Arc<dyn translator::NlQueryTranslator>, context: QueryContext) -> Self {
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
        let execution_time_ms = start_time.elapsed().as_millis() as u64;
        
        // Update the query history
        self.context.add_query_to_history(
            query,
            &translation.sql,
            true,
            Some(execution_time_ms),
            None,
        );
        
        Ok(result)
    }
}

/// Factory for creating NLQueryTranslator instances
pub struct TranslatorFactory;

impl TranslatorFactory {
    /// Creates a rule-based translator
    pub fn create_rule_based() -> Arc<dyn translator::NlQueryTranslator> {
        Arc::new(RuleBasedTranslator::new())
    }
    
    /// Creates an LLM-based translator with default configuration
    pub fn create_llm_default() -> Arc<dyn translator::NlQueryTranslator> {
        Arc::new(LlmTranslator::new(LlmTranslatorConfig::default()))
    }
    
    /// Creates an LLM-based translator with custom configuration
    pub fn create_llm(config: LlmTranslatorConfig) -> Arc<dyn translator::NlQueryTranslator> {
        Arc::new(LlmTranslator::new(config))
    }
    
    /// Creates a composite translator with both rule-based and LLM translators
    pub fn create_composite() -> Arc<dyn translator::NlQueryTranslator> {
        let mut composite = CompositeTranslator::new();
        composite
            .add_translator(Self::create_rule_based())
            .add_translator(Self::create_llm_default());
        Arc::new(composite)
    }
} 