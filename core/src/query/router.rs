use crate::{LumosError, Result, query::{Query, QueryType, EngineType}};
use std::collections::HashMap;

/// Router for SQL queries to determine the appropriate engine
pub struct QueryRouter {
    /// Routing rules based on query types
    query_type_rules: HashMap<QueryType, EngineType>,
    /// Table routing rules
    table_routing: HashMap<String, EngineType>,
}

impl QueryRouter {
    /// Create a new query router with default rules
    pub fn new() -> Self {
        let mut query_type_rules = HashMap::new();
        
        // By default, route read operations to DuckDB and write operations to SQLite
        query_type_rules.insert(QueryType::Select, EngineType::DuckDb);
        query_type_rules.insert(QueryType::Insert, EngineType::Sqlite);
        query_type_rules.insert(QueryType::Update, EngineType::Sqlite);
        query_type_rules.insert(QueryType::Delete, EngineType::Sqlite);
        query_type_rules.insert(QueryType::Create, EngineType::Sqlite);
        query_type_rules.insert(QueryType::Alter, EngineType::Sqlite);
        query_type_rules.insert(QueryType::Drop, EngineType::Sqlite);
        query_type_rules.insert(QueryType::Other, EngineType::Sqlite);
        
        Self {
            query_type_rules,
            table_routing: HashMap::new(),
        }
    }

    /// Set the default engine for a query type
    pub fn set_default_engine(&mut self, query_type: QueryType, engine: EngineType) {
        self.query_type_rules.insert(query_type, engine);
    }

    /// Set the preferred engine for a specific table
    pub fn set_table_engine(&mut self, table_name: &str, engine: EngineType) {
        self.table_routing.insert(table_name.to_lowercase(), engine);
    }

    /// Route a query to the appropriate engine
    pub fn route(&self, query: &Query) -> Result<EngineType> {
        // If engine is already specified, respect that
        if query.engine_type != EngineType::Auto {
            return Ok(query.engine_type);
        }
        
        // For simple cases, use the query type rules
        let default_engine = self.query_type_rules.get(&query.query_type)
            .copied()
            .unwrap_or(EngineType::Sqlite);
        
        // If it's a SELECT query, do more analysis
        if query.query_type == QueryType::Select {
            // Create a parser to analyze the query
            let parser = crate::query::parser::QueryParser::new();
            
            // Check if this is an analytical query
            let is_analytical = parser.is_analytical_query(&query.sql);
            
            // If it's not an analytical query, route simple selects to SQLite
            if !is_analytical {
                return Ok(EngineType::Sqlite);
            }
            
            // For analytical queries, extract table names and check routing rules
            let table_names = parser.extract_table_names(&query.sql);
            
            // If any table is explicitly routed to SQLite, use SQLite
            for table in &table_names {
                if let Some(engine) = self.table_routing.get(&table.to_lowercase()) {
                    if *engine == EngineType::Sqlite {
                        return Ok(EngineType::Sqlite);
                    }
                }
            }
            
            // Otherwise, use DuckDB for analytical queries
            return Ok(EngineType::DuckDb);
        }
        
        Ok(default_engine)
    }

    /// Check if a query should be synchronized between engines
    pub fn should_sync(&self, query: &Query) -> bool {
        // Synchronize write operations (INSERT, UPDATE, DELETE)
        matches!(query.query_type, 
            QueryType::Insert | 
            QueryType::Update | 
            QueryType::Delete
        )
    }
}
