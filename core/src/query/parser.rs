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

    /// Check if a query is a write operation
    pub fn is_write_query(&self, sql: &str) -> Result<bool> {
        let query_type = self.parse_query_type(sql)?;
        
        Ok(matches!(query_type, 
            QueryType::Insert | 
            QueryType::Update | 
            QueryType::Delete | 
            QueryType::Create | 
            QueryType::Alter | 
            QueryType::Drop
        ))
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
