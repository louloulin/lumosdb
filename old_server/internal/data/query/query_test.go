package query

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

// MockQueryEngine is a mock implementation of QueryEngine for testing
type MockQueryEngine struct {
	name      string
	executed  bool
	lastQuery string
	lastPlan  PlanNode
}

func NewMockQueryEngine(name string) *MockQueryEngine {
	return &MockQueryEngine{
		name: name,
	}
}

func (e *MockQueryEngine) Execute(ctx context.Context, query string, args ...interface{}) (*QueryResult, error) {
	e.executed = true
	e.lastQuery = query

	return &QueryResult{
		Columns:       []string{"result"},
		Rows:          [][]interface{}{{"mock result"}},
		ExecutionTime: 0,
		QueryPlan:     "Mock Plan",
	}, nil
}

func (e *MockQueryEngine) ExecuteWithPlan(ctx context.Context, plan PlanNode) (*QueryResult, error) {
	e.executed = true
	e.lastPlan = plan

	return &QueryResult{
		Columns:       []string{"result"},
		Rows:          [][]interface{}{{"mock result with plan"}},
		ExecutionTime: 0,
		QueryPlan:     "Mock Plan with custom plan node",
	}, nil
}

func (e *MockQueryEngine) GetName() string {
	return e.name
}

func (e *MockQueryEngine) WasExecuted() bool {
	return e.executed
}

func TestQueryOptimizer(t *testing.T) {
	optimizer := NewQueryOptimizer()

	testCases := []struct {
		name     string
		query    string
		expected string
	}{
		{
			name:     "Simple Query",
			query:    "SELECT * FROM users",
			expected: "SELECT * FROM users", // No optimization for simple query
		},
		{
			name:     "Query with WHERE",
			query:    "SELECT * FROM users WHERE id > 10",
			expected: "SELECT * FROM users WHERE id > 10", // No optimization in our simplified implementation
		},
		{
			name:     "Query with JOIN",
			query:    "SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id",
			expected: "SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id", // No optimization in our simplified implementation
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result, err := optimizer.Optimize(tc.query)
			assert.NoError(t, err)
			assert.Equal(t, tc.expected, result)
		})
	}
}

func TestQueryPlanner(t *testing.T) {
	optimizer := NewQueryOptimizer()
	planner := NewQueryPlanner(optimizer)

	testCases := []struct {
		name     string
		query    string
		planType string
	}{
		{
			name:     "Simple Query",
			query:    "SELECT * FROM users",
			planType: "Scan",
		},
		{
			name:     "Query with JOIN",
			query:    "SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id",
			planType: "Inner Join",
		},
		{
			name:     "Query with GROUP BY",
			query:    "SELECT category, COUNT(*) FROM products GROUP BY category",
			planType: "Aggregation",
		},
		{
			name:     "Query with ORDER BY",
			query:    "SELECT * FROM users ORDER BY name",
			planType: "Sort",
		},
		{
			name:     "Query with LIMIT",
			query:    "SELECT * FROM users LIMIT 10",
			planType: "Limit",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			plan, err := planner.Plan(tc.query)
			assert.NoError(t, err)
			assert.Equal(t, tc.planType, plan.Type())

			// Test explain plan
			explanation := planner.ExplainPlan(plan, "")
			assert.NotEmpty(t, explanation)
		})
	}
}

func TestQueryRouter(t *testing.T) {
	transactionalEngine := NewMockQueryEngine("SQLite")
	analyticalEngine := NewMockQueryEngine("DuckDB")

	router := NewQueryRouter(transactionalEngine, analyticalEngine)

	testCases := []struct {
		name           string
		query          string
		expectedType   QueryType
		expectedEngine string
	}{
		{
			name:           "Simple SELECT",
			query:          "SELECT * FROM users",
			expectedType:   TransactionalQuery,
			expectedEngine: "SQLite",
		},
		{
			name:           "INSERT",
			query:          "INSERT INTO users (name, email) VALUES ('John', 'john@example.com')",
			expectedType:   TransactionalQuery,
			expectedEngine: "SQLite",
		},
		{
			name:           "UPDATE",
			query:          "UPDATE users SET name = 'John' WHERE id = 1",
			expectedType:   TransactionalQuery,
			expectedEngine: "SQLite",
		},
		{
			name:           "DELETE",
			query:          "DELETE FROM users WHERE id = 1",
			expectedType:   TransactionalQuery,
			expectedEngine: "SQLite",
		},
		{
			name:           "Query with JOIN",
			query:          "SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id",
			expectedType:   HybridQuery,
			expectedEngine: "DuckDB",
		},
		{
			name:           "Query with GROUP BY",
			query:          "SELECT category, COUNT(*) FROM products GROUP BY category",
			expectedType:   AnalyticalQuery,
			expectedEngine: "DuckDB",
		},
		{
			name:           "Query with ORDER BY",
			query:          "SELECT * FROM users ORDER BY name",
			expectedType:   AnalyticalQuery,
			expectedEngine: "DuckDB",
		},
		{
			name:           "Query with aggregate functions",
			query:          "SELECT AVG(price) FROM products",
			expectedType:   AnalyticalQuery,
			expectedEngine: "DuckDB",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			// Reset engines
			transactionalEngine.executed = false
			analyticalEngine.executed = false

			// Test query classification
			queryType := router.ClassifyQuery(tc.query)
			assert.Equal(t, tc.expectedType, queryType)

			// Test query routing
			ctx := context.Background()
			result, err := router.RouteQuery(ctx, tc.query)
			assert.NoError(t, err)
			assert.NotNil(t, result)

			// Check which engine was used
			if tc.expectedEngine == "SQLite" {
				assert.True(t, transactionalEngine.WasExecuted())
				assert.False(t, analyticalEngine.WasExecuted())
			} else {
				assert.False(t, transactionalEngine.WasExecuted())
				assert.True(t, analyticalEngine.WasExecuted())
			}

			// Test explain query
			explanation, err := router.ExplainQuery(tc.query)
			assert.NoError(t, err)
			assert.NotEmpty(t, explanation)
		})
	}
}

func TestSQLiteEngine(t *testing.T) {
	// This is a mock implementation since we don't want to create a real database in unit tests
	engine := &SQLiteEngine{
		db: nil, // In a real test, we would use an in-memory SQLite database
	}

	assert.Equal(t, "SQLite", engine.GetName())
}

func TestDuckDBEngine(t *testing.T) {
	// This is a mock implementation since we don't want to create a real database in unit tests
	engine := &DuckDBEngine{
		db: nil, // In a real test, we would use an in-memory DuckDB database
	}

	assert.Equal(t, "DuckDB", engine.GetName())
}
