package query

import (
	"fmt"
	"regexp"
	"strings"
)

// OptimizationRule represents a rule that can be applied to optimize a query
type OptimizationRule interface {
	// Name returns the name of the rule
	Name() string

	// Apply applies the rule to the given query and returns the optimized query
	Apply(query string) (string, error)

	// Applicable returns true if the rule is applicable to the given query
	Applicable(query string) bool
}

// QueryOptimizer optimizes SQL queries for better performance
type QueryOptimizer struct {
	rules []OptimizationRule
}

// NewQueryOptimizer creates a new query optimizer with default rules
func NewQueryOptimizer() *QueryOptimizer {
	optimizer := &QueryOptimizer{
		rules: []OptimizationRule{},
	}

	// Add default rules
	optimizer.AddRule(NewPushDownPredicateRule())
	optimizer.AddRule(NewColumnPruningRule())
	optimizer.AddRule(NewJoinReorderingRule())
	optimizer.AddRule(NewAggregationPushDownRule())
	optimizer.AddRule(NewLimitPushDownRule())
	optimizer.AddRule(NewCommonSubexpressionRule())

	return optimizer
}

// AddRule adds a new optimization rule to the optimizer
func (o *QueryOptimizer) AddRule(rule OptimizationRule) {
	o.rules = append(o.rules, rule)
}

// Optimize optimizes the given query using all applicable rules
func (o *QueryOptimizer) Optimize(query string) (string, error) {
	optimized := query

	for _, rule := range o.rules {
		if rule.Applicable(optimized) {
			var err error
			optimized, err = rule.Apply(optimized)
			if err != nil {
				return query, fmt.Errorf("error applying rule %s: %v", rule.Name(), err)
			}
		}
	}

	return optimized, nil
}

// GetOptimizationExplanation returns an explanation of how the query was optimized
func (o *QueryOptimizer) GetOptimizationExplanation(originalQuery string, optimizedQuery string) string {
	if originalQuery == optimizedQuery {
		return "No optimizations were applied to the query."
	}

	var explanation strings.Builder
	explanation.WriteString("The following optimizations were applied:\n")

	for _, rule := range o.rules {
		if rule.Applicable(originalQuery) {
			optimized, err := rule.Apply(originalQuery)
			if err == nil && optimized != originalQuery {
				explanation.WriteString(fmt.Sprintf("- %s\n", rule.Name()))
			}
		}
	}

	return explanation.String()
}

// PushDownPredicateRule pushes down WHERE predicates to reduce the amount of data processed
type PushDownPredicateRule struct{}

// NewPushDownPredicateRule creates a new push down predicate rule
func NewPushDownPredicateRule() *PushDownPredicateRule {
	return &PushDownPredicateRule{}
}

// Name returns the name of the rule
func (r *PushDownPredicateRule) Name() string {
	return "Predicate Push Down"
}

// Applicable returns true if the rule is applicable to the given query
func (r *PushDownPredicateRule) Applicable(query string) bool {
	return strings.Contains(strings.ToUpper(query), "WHERE") &&
		(strings.Contains(strings.ToUpper(query), "JOIN") ||
			strings.Contains(strings.ToUpper(query), "UNION") ||
			strings.Contains(strings.ToUpper(query), "FROM") && strings.Contains(query, "(SELECT"))
}

// Apply applies the rule to the given query and returns the optimized query
func (r *PushDownPredicateRule) Apply(query string) (string, error) {
	// This is a simplified implementation that would need to be expanded
	// with a proper SQL parser in a production environment

	// For subqueries in FROM clause
	pattern := regexp.MustCompile(`(?i)FROM\s*\(\s*SELECT(.*?)WHERE\s+(.*?)\s+GROUP BY`)
	if pattern.MatchString(query) {
		// Extract the predicate and add it to the subquery if possible
		// This is a simplified approach and would need to be more sophisticated in practice
		optimized := pattern.ReplaceAllString(query, `FROM (SELECT$1WHERE $2 GROUP BY`)
		return optimized, nil
	}

	return query, nil
}

// ColumnPruningRule removes unnecessary columns from the query
type ColumnPruningRule struct{}

// NewColumnPruningRule creates a new column pruning rule
func NewColumnPruningRule() *ColumnPruningRule {
	return &ColumnPruningRule{}
}

// Name returns the name of the rule
func (r *ColumnPruningRule) Name() string {
	return "Column Pruning"
}

// Applicable returns true if the rule is applicable to the given query
func (r *ColumnPruningRule) Applicable(query string) bool {
	// Check if query has a SELECT statement with specific columns (not SELECT *)
	selectPattern := regexp.MustCompile(`(?i)SELECT\s+(?!\*)`)
	return selectPattern.MatchString(query)
}

// Apply applies the rule to the given query and returns the optimized query
func (r *ColumnPruningRule) Apply(query string) (string, error) {
	// In a real implementation, we would:
	// 1. Parse the query
	// 2. Identify which columns are actually used in the query
	// 3. Prune unnecessary columns

	// This is a placeholder implementation
	return query, nil
}

// JoinReorderingRule reorders joins to optimize query execution
type JoinReorderingRule struct{}

// NewJoinReorderingRule creates a new join reordering rule
func NewJoinReorderingRule() *JoinReorderingRule {
	return &JoinReorderingRule{}
}

// Name returns the name of the rule
func (r *JoinReorderingRule) Name() string {
	return "Join Reordering"
}

// Applicable returns true if the rule is applicable to the given query
func (r *JoinReorderingRule) Applicable(query string) bool {
	// Check if query has multiple joins
	joinCount := strings.Count(strings.ToUpper(query), "JOIN")
	return joinCount > 1
}

// Apply applies the rule to the given query and returns the optimized query
func (r *JoinReorderingRule) Apply(query string) (string, error) {
	// In a real implementation, we would:
	// 1. Parse the query
	// 2. Analyze join conditions and table statistics
	// 3. Reorder joins to minimize intermediate result sizes

	// This is a placeholder implementation
	return query, nil
}

// AggregationPushDownRule pushes down aggregations to reduce the amount of data processed
type AggregationPushDownRule struct{}

// NewAggregationPushDownRule creates a new aggregation push down rule
func NewAggregationPushDownRule() *AggregationPushDownRule {
	return &AggregationPushDownRule{}
}

// Name returns the name of the rule
func (r *AggregationPushDownRule) Name() string {
	return "Aggregation Push Down"
}

// Applicable returns true if the rule is applicable to the given query
func (r *AggregationPushDownRule) Applicable(query string) bool {
	// Check if query has an aggregation and a subquery or join
	return (strings.Contains(strings.ToUpper(query), "GROUP BY") ||
		strings.Contains(strings.ToUpper(query), "SUM(") ||
		strings.Contains(strings.ToUpper(query), "COUNT(") ||
		strings.Contains(strings.ToUpper(query), "AVG(") ||
		strings.Contains(strings.ToUpper(query), "MIN(") ||
		strings.Contains(strings.ToUpper(query), "MAX(")) &&
		(strings.Contains(strings.ToUpper(query), "JOIN") ||
			strings.Contains(query, "(SELECT"))
}

// Apply applies the rule to the given query and returns the optimized query
func (r *AggregationPushDownRule) Apply(query string) (string, error) {
	// In a real implementation, we would:
	// 1. Parse the query
	// 2. Identify aggregations that can be pushed down
	// 3. Rewrite the query to push down aggregations

	// This is a placeholder implementation
	return query, nil
}

// LimitPushDownRule pushes down LIMIT clauses to reduce the amount of data processed
type LimitPushDownRule struct{}

// NewLimitPushDownRule creates a new limit push down rule
func NewLimitPushDownRule() *LimitPushDownRule {
	return &LimitPushDownRule{}
}

// Name returns the name of the rule
func (r *LimitPushDownRule) Name() string {
	return "Limit Push Down"
}

// Applicable returns true if the rule is applicable to the given query
func (r *LimitPushDownRule) Applicable(query string) bool {
	// Check if query has a LIMIT clause and a subquery or join
	return strings.Contains(strings.ToUpper(query), "LIMIT") &&
		(strings.Contains(strings.ToUpper(query), "JOIN") ||
			strings.Contains(query, "(SELECT"))
}

// Apply applies the rule to the given query and returns the optimized query
func (r *LimitPushDownRule) Apply(query string) (string, error) {
	// In a real implementation, we would:
	// 1. Parse the query
	// 2. Analyze whether the LIMIT can be pushed down
	// 3. Rewrite the query to push down the LIMIT

	// This is a placeholder implementation
	return query, nil
}

// CommonSubexpressionRule eliminates common subexpressions
type CommonSubexpressionRule struct{}

// NewCommonSubexpressionRule creates a new common subexpression rule
func NewCommonSubexpressionRule() *CommonSubexpressionRule {
	return &CommonSubexpressionRule{}
}

// Name returns the name of the rule
func (r *CommonSubexpressionRule) Name() string {
	return "Common Subexpression Elimination"
}

// Applicable returns true if the rule is applicable to the given query
func (r *CommonSubexpressionRule) Applicable(query string) bool {
	// This is a simplistic approach - in practice, we would need to parse the query
	// and analyze it for common subexpressions
	return strings.Count(query, "(SELECT") > 1
}

// Apply applies the rule to the given query and returns the optimized query
func (r *CommonSubexpressionRule) Apply(query string) (string, error) {
	// In a real implementation, we would:
	// 1. Parse the query
	// 2. Identify common subexpressions
	// 3. Rewrite the query to use WITH clauses

	// This is a placeholder implementation
	return query, nil
}
