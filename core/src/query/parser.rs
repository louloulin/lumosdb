use crate::{LumosError, Result, query::QueryType};
use std::collections::HashMap;

/// Parser for SQL queries
pub struct QueryParser {
    /// Cache of parsed query types
    query_cache: HashMap<String, QueryType>,
}

impl QueryParser {
    /// Create a new query parser
    pub fn new() -> Self {
        Self {
            query_cache: HashMap::new(),
        }
    }

    /// Parse the type of a SQL query
    pub fn parse_query_type(&mut self, sql: &str) -> Result<QueryType> {
        // Check if we have a cached result
        if let Some(query_type) = self.query_cache.get(sql) {
            return Ok(*query_type);
        }
        
        // Normalize the SQL by removing extra whitespace and comments
        let normalized_sql = self.normalize_sql(sql);
        
        // Extract the first token to determine the query type
        let first_word = normalized_sql.split_whitespace()
            .next()
            .ok_or_else(|| LumosError::Query("Empty query".to_string()))?
            .to_uppercase();
        
        let query_type = match first_word.as_str() {
            "SELECT" => QueryType::Select,
            "INSERT" => QueryType::Insert,
            "UPDATE" => QueryType::Update,
            "DELETE" => QueryType::Delete,
            "CREATE" => QueryType::Create,
            "ALTER" => QueryType::Alter,
            "DROP" => QueryType::Drop,
            _ => QueryType::Other,
        };
        
        // Cache the result
        self.query_cache.insert(sql.to_string(), query_type);
        
        Ok(query_type)
    }

    /// Check if a query is analytical (potentially complex, with aggregations, joins, etc.)
    pub fn is_analytical_query(&self, sql: &str) -> bool {
        let normalized_sql = self.normalize_sql(sql).to_uppercase();
        
        // Check for common analytical query patterns
        normalized_sql.contains("GROUP BY") ||
        normalized_sql.contains("HAVING") ||
        normalized_sql.contains("ORDER BY") ||
        normalized_sql.contains("LIMIT") ||
        normalized_sql.contains("JOIN") ||
        normalized_sql.contains("UNION") ||
        normalized_sql.contains("INTERSECT") ||
        normalized_sql.contains("EXCEPT") ||
        // Check for common analytical functions
        normalized_sql.contains("COUNT(") ||
        normalized_sql.contains("SUM(") ||
        normalized_sql.contains("AVG(") ||
        normalized_sql.contains("MIN(") ||
        normalized_sql.contains("MAX(") ||
        normalized_sql.contains("STDDEV") ||
        normalized_sql.contains("VARIANCE") ||
        normalized_sql.contains("PERCENTILE") ||
        normalized_sql.contains("WINDOW") ||
        normalized_sql.contains("OVER(") ||
        normalized_sql.contains("PARTITION BY")
    }

    /// Parse SQL query to determine if it's a write query
    pub fn is_write_query(&mut self, sql: &str) -> Result<bool> {
        let query_type = self.parse_query_type(sql)?;
        
        match query_type {
            QueryType::Select => Ok(false),
            _ => Ok(true),
        }
    }

    /// Normalize SQL by removing comments and extra whitespace
    fn normalize_sql(&self, sql: &str) -> String {
        let mut normalized = String::with_capacity(sql.len());
        let mut in_single_quote = false;
        let mut in_double_quote = false;
        let mut in_comment = false;
        let mut in_multiline_comment = false;
        let mut prev_char = '\0';
        
        for c in sql.chars() {
            match c {
                '\'' if prev_char != '\\' => in_single_quote = !in_single_quote,
                '"' if prev_char != '\\' => in_double_quote = !in_double_quote,
                '-' if prev_char == '-' && !in_single_quote && !in_double_quote => {
                    in_comment = true;
                    // Remove the previous '-' as well
                    normalized.pop();
                },
                '*' if prev_char == '/' && !in_single_quote && !in_double_quote => {
                    in_multiline_comment = true;
                    // Remove the previous '/' as well
                    normalized.pop();
                },
                '/' if prev_char == '*' && in_multiline_comment => {
                    in_multiline_comment = false;
                    // Skip this character too
                    prev_char = c;
                    continue;
                },
                '\n' if in_comment => in_comment = false,
                _ => {
                    if !in_comment && !in_multiline_comment {
                        normalized.push(c);
                    }
                }
            }
            
            prev_char = c;
        }
        
        // Remove extra whitespace
        let mut result = String::with_capacity(normalized.len());
        let mut last_was_space = true; // Start with true to trim leading whitespace
        
        for c in normalized.chars() {
            if c.is_whitespace() {
                if !last_was_space {
                    result.push(' ');
                    last_was_space = true;
                }
            } else {
                result.push(c);
                last_was_space = false;
            }
        }
        
        // Trim trailing whitespace
        result.trim().to_string()
    }

    /// Extract table names from a query
    pub fn extract_table_names(&self, sql: &str) -> Vec<String> {
        // This is a simplified implementation that may not work for all cases
        // For a production-ready solution, a proper SQL parser would be needed
        
        let normalized_sql = self.normalize_sql(sql).to_uppercase();
        let mut tables = Vec::new();
        
        // Extract tables from FROM clause
        if let Some(from_idx) = normalized_sql.find(" FROM ") {
            let after_from = &normalized_sql[from_idx + 6..];
            
            // Find the end of the FROM clause (next clause starter)
            let mut end_idx = after_from.len();
            for clause in [" WHERE ", " GROUP ", " HAVING ", " ORDER ", " LIMIT "] {
                if let Some(idx) = after_from.find(clause) {
                    if idx < end_idx {
                        end_idx = idx;
                    }
                }
            }
            
            let from_clause = &after_from[..end_idx];
            
            // Split by commas and process each table reference
            for table_ref in from_clause.split(',') {
                let table_ref = table_ref.trim();
                
                // Handle aliased tables
                let table_name = if table_ref.contains(" AS ") {
                    table_ref.split(" AS ").next().unwrap().trim()
                } else if table_ref.contains(' ') {
                    // Implicit alias (e.g., "table t")
                    table_ref.split_whitespace().next().unwrap().trim()
                } else {
                    table_ref
                };
                
                // Remove any parentheses (subqueries)
                if !table_name.starts_with('(') {
                    tables.push(table_name.to_string());
                }
            }
        }
        
        // Extract tables from JOIN clauses
        let mut start_idx = 0;
        while let Some(join_idx) = normalized_sql[start_idx..].find(" JOIN ") {
            let actual_idx = start_idx + join_idx + 6; // Skip past " JOIN "
            start_idx = actual_idx;
            
            // Find the end of the table reference
            let mut end_idx = normalized_sql[actual_idx..].find(" ON ").unwrap_or_else(|| normalized_sql[actual_idx..].len());
            if let Some(using_idx) = normalized_sql[actual_idx..].find(" USING ") {
                if using_idx < end_idx {
                    end_idx = using_idx;
                }
            }
            
            let table_ref = &normalized_sql[actual_idx..actual_idx + end_idx].trim();
            
            // Handle aliased tables
            let table_name = if table_ref.contains(" AS ") {
                table_ref.split(" AS ").next().unwrap().trim()
            } else if table_ref.contains(' ') {
                // Implicit alias (e.g., "table t")
                table_ref.split_whitespace().next().unwrap().trim()
            } else {
                table_ref
            };
            
            // Add the table name
            tables.push(table_name.to_string());
        }
        
        // Convert back to original case and deduplicate
        tables.iter()
            .map(|t| t.to_lowercase())
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect()
    }
}

/// SQL query optimizer
pub struct QueryOptimizer {
    /// Query parser for analyzing queries
    parser: QueryParser,
}

impl QueryOptimizer {
    /// Create a new query optimizer
    pub fn new() -> Self {
        Self {
            parser: QueryParser::new(),
        }
    }

    /// Optimize a SQL query
    pub fn optimize(&self, sql: &str) -> Result<String> {
        // Normalize the SQL first
        let normalized_sql = self.parser.normalize_sql(sql);
        
        // Currently, we only optimize SELECT queries
        if !normalized_sql.trim_start().to_uppercase().starts_with("SELECT") {
            return Ok(normalized_sql);
        }

        // Apply optimizations
        let optimized_sql = self.apply_optimizations(&normalized_sql);
        
        Ok(optimized_sql)
    }

    /// Apply all available optimizations to the query
    fn apply_optimizations(&self, sql: &str) -> String {
        let mut optimized = sql.to_string();
        
        // Apply predicate pushdown for subqueries
        optimized = self.push_down_predicates(&optimized);
        
        // Apply projection pushdown
        optimized = self.push_down_projections(&optimized);
        
        // Remove unnecessary DISTINCT if possible
        optimized = self.optimize_distinct(&optimized);
        
        // Simplify expressions where possible
        optimized = self.simplify_expressions(&optimized);
        
        optimized
    }

    /// Push down predicates in WHERE clauses to subqueries
    fn push_down_predicates(&self, sql: &str) -> String {
        // This is a simplified implementation that looks for subqueries in FROM clauses
        // and attempts to push applicable predicates down to them
        
        // Check if we have a WHERE clause
        if !sql.to_uppercase().contains(" WHERE ") {
            return sql.to_string();
        }
        
        // Very basic implementation - in a real system this would be much more sophisticated
        // and would use a proper SQL parser to create an AST
        
        // Example: If we have "SELECT * FROM (SELECT * FROM table) t WHERE t.col = 1"
        // we want to transform it to "SELECT * FROM (SELECT * FROM table WHERE col = 1) t"
        
        // This is a very simplified implementation for demonstration
        let sql = sql.to_string();
        
        // For a real implementation, we would:
        // 1. Parse the SQL into an abstract syntax tree (AST)
        // 2. Analyze the WHERE conditions and determine which can be pushed down
        // 3. For each subquery, add the applicable conditions to its WHERE clause
        // 4. Reconstruct the SQL from the modified AST
        
        // For now, we'll return the original SQL with a log message
        log::debug!("Predicate pushdown optimization would be applied here");
        sql
    }

    /// Push down projections to subqueries to reduce the amount of data processed
    fn push_down_projections(&self, sql: &str) -> String {
        // Similar to predicate pushdown, this would analyze the SELECT columns
        // and push only necessary columns down to subqueries
        
        // For a real implementation, we would:
        // 1. Parse the SQL into an AST
        // 2. Analyze which columns are used in the outer query
        // 3. For each subquery, modify its SELECT list to only include necessary columns
        // 4. Reconstruct the SQL from the modified AST
        
        // For now, we'll return the original SQL with a log message
        log::debug!("Projection pushdown optimization would be applied here");
        sql.to_string()
    }

    /// Optimize unnecessary DISTINCT operations
    fn optimize_distinct(&self, sql: &str) -> String {
        // Remove DISTINCT if it's used with a unique key
        
        // Example: "SELECT DISTINCT id, name FROM users" can be simplified to
        // "SELECT id, name FROM users" if id is a primary key
        
        // This requires schema information, so we'll just return the original SQL for now
        log::debug!("DISTINCT optimization would be applied here");
        sql.to_string()
    }

    /// Simplify expressions where possible
    fn simplify_expressions(&self, sql: &str) -> String {
        // Simplify expressions like "SELECT col + 0" to "SELECT col"
        // or "WHERE col = 5 AND col = 5" to "WHERE col = 5"
        
        // This requires a proper expression parser and evaluator
        log::debug!("Expression simplification would be applied here");
        sql.to_string()
    }

    /// Estimate the cost of a query (for use in query planning)
    pub fn estimate_cost(&self, sql: &str) -> u64 {
        // In a real system, this would use statistics about tables to estimate costs
        // For now, we'll use a very simple heuristic based on query complexity
        
        let normalized = self.parser.normalize_sql(sql).to_uppercase();
        
        let mut cost = 100; // Base cost
        
        // Add cost for joins
        let join_count = normalized.matches(" JOIN ").count();
        cost += join_count as u64 * 1000;
        
        // Add cost for complex operations
        if normalized.contains(" GROUP BY ") { cost += 500; }
        if normalized.contains(" HAVING ") { cost += 300; }
        if normalized.contains(" ORDER BY ") { cost += 200; }
        if normalized.contains(" DISTINCT ") { cost += 200; }
        
        // Add cost for subqueries
        let subquery_count = normalized.matches("SELECT").count() - 1;
        if subquery_count > 0 {
            cost += subquery_count as u64 * 500;
        }
        
        cost
    }
}
