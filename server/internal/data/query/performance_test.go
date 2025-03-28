package query

import (
	"context"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestQueryCache(t *testing.T) {
	cache := NewQueryCache(10, 1*time.Minute)

	// Test empty cache
	result, hit := cache.Get("key1")
	assert.False(t, hit)
	assert.Nil(t, result)

	// Test adding and retrieving from cache
	queryResult := &QueryResult{
		Columns: []string{"id", "name"},
		Rows:    [][]interface{}{{1, "test"}},
	}

	cache.Put("key1", queryResult, 100)

	result, hit = cache.Get("key1")
	assert.True(t, hit)
	assert.Equal(t, queryResult, result)

	// Test cache eviction
	smallCache := NewQueryCache(2, 1*time.Minute)

	smallCache.Put("key1", queryResult, 100)
	smallCache.Put("key2", queryResult, 100)
	smallCache.Put("key3", queryResult, 100) // This should trigger eviction

	// Check that first key was evicted
	result, hit = smallCache.Get("key1")
	assert.False(t, hit)

	// Check that other keys are still there
	result, hit = smallCache.Get("key2")
	assert.True(t, hit)

	result, hit = smallCache.Get("key3")
	assert.True(t, hit)

	// Test cache TTL
	shortTTLCache := NewQueryCache(10, 10*time.Millisecond)
	shortTTLCache.Put("key1", queryResult, 100)

	// Key should be available immediately
	result, hit = shortTTLCache.Get("key1")
	assert.True(t, hit)

	// Wait for TTL to expire
	time.Sleep(20 * time.Millisecond)

	// Key should be expired now
	result, hit = shortTTLCache.Get("key1")
	assert.False(t, hit)

	// Test cache stats
	cache = NewQueryCache(10, 1*time.Minute)

	// Add some entries and perform some hits and misses
	cache.Put("key1", queryResult, 100)
	cache.Put("key2", queryResult, 200)

	cache.Get("key1") // Hit
	cache.Get("key1") // Hit
	cache.Get("key2") // Hit
	cache.Get("key3") // Miss

	stats := cache.GetStats()
	assert.Equal(t, 2, stats["entries"])
	assert.Equal(t, int64(300), stats["size"])
	assert.Equal(t, 10, stats["max_size"])
	assert.Equal(t, 3, stats["hits"])
	assert.Equal(t, 1, stats["misses"])
	assert.Equal(t, 0.75, stats["hit_rate"])

	// Test clearing the cache
	cache.Clear()
	stats = cache.GetStats()
	assert.Equal(t, 0, stats["entries"])
	assert.Equal(t, 0, stats["hits"])
	assert.Equal(t, 0, stats["misses"])
}

func TestPerformanceMonitor(t *testing.T) {
	monitor := NewPerformanceMonitor(100*time.Millisecond, 100)

	// Record some query performance
	monitor.RecordQueryPerformance(&QueryPerformance{
		Query:         "SELECT * FROM users",
		ExecutionTime: 50 * time.Millisecond,
		RowsProcessed: 100,
		Engine:        "SQLite",
		Timestamp:     time.Now(),
		QueryType:     TransactionalQuery,
	})

	monitor.RecordQueryPerformance(&QueryPerformance{
		Query:         "SELECT * FROM users",
		ExecutionTime: 30 * time.Millisecond,
		RowsProcessed: 100,
		Engine:        "SQLite",
		Timestamp:     time.Now(),
		QueryType:     TransactionalQuery,
	})

	monitor.RecordQueryPerformance(&QueryPerformance{
		Query:         "SELECT COUNT(*) FROM orders GROUP BY status",
		ExecutionTime: 150 * time.Millisecond, // This is a slow query
		RowsProcessed: 1000,
		Engine:        "DuckDB",
		Timestamp:     time.Now(),
		QueryType:     AnalyticalQuery,
	})

	// Test getting statistics for a specific query
	stats, found := monitor.GetQueryStatistics("SELECT * FROM users")
	assert.True(t, found)
	assert.Equal(t, "SELECT * FROM users", stats.Query)
	assert.Equal(t, int64(2), stats.Count)
	assert.Equal(t, 80*time.Millisecond, stats.TotalTime)
	assert.Equal(t, 30*time.Millisecond, stats.MinTime)
	assert.Equal(t, 50*time.Millisecond, stats.MaxTime)
	assert.Equal(t, 40*time.Millisecond, stats.AvgTime)
	assert.Equal(t, int64(200), stats.TotalRowsProcessed)

	// Test getting all statistics
	allStats := monitor.GetAllQueryStatistics()
	assert.Equal(t, 2, len(allStats))

	// Test getting slow queries
	slowQueries := monitor.GetSlowQueries()
	assert.Equal(t, 1, len(slowQueries))
	assert.Equal(t, "SELECT COUNT(*) FROM orders GROUP BY status", slowQueries[0].Query)

	// Test getting query history
	history := monitor.GetQueryHistory()
	assert.Equal(t, 3, len(history))
}

func TestPerformanceOptimizer(t *testing.T) {
	// Create mock query engines
	transactionalEngine := NewMockQueryEngine("SQLite")
	analyticalEngine := NewMockQueryEngine("DuckDB")

	// Create a QueryRouter with the mock engines
	router := NewQueryRouter(transactionalEngine, analyticalEngine)

	// Create monitor and cache
	monitor := NewPerformanceMonitor(100*time.Millisecond, 100)
	cache := NewQueryCache(100, 1*time.Minute)

	// Create optimizer
	optimizer := NewPerformanceOptimizer(router, monitor, cache)

	// Test query execution (non-cached)
	ctx := context.Background()
	query := "SELECT * FROM users"

	result, err := optimizer.ExecuteQuery(ctx, query)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	// The query should have been executed
	assert.True(t, transactionalEngine.WasExecuted())

	// Reset the executed flag
	transactionalEngine.executed = false

	// Execute the same query again (should be cached)
	result, err = optimizer.ExecuteQuery(ctx, query)
	assert.NoError(t, err)
	assert.NotNil(t, result)

	// The query should not have been executed again
	assert.False(t, transactionalEngine.WasExecuted())

	// Test query suggestions
	// Record a slow query
	monitor.RecordQueryPerformance(&QueryPerformance{
		Query:         "SELECT * FROM large_table",
		ExecutionTime: 150 * time.Millisecond, // This is a slow query
		RowsProcessed: 10000,
		Engine:        "SQLite",
		Timestamp:     time.Now(),
		QueryType:     TransactionalQuery,
	})

	suggestions := optimizer.GetQuerySuggestions()
	assert.NotEmpty(t, suggestions)
	assert.Contains(t, suggestions, "SELECT * FROM large_table")
	assert.Contains(t, suggestions["SELECT * FROM large_table"], "Add a WHERE clause")
}

func TestIsCacheable(t *testing.T) {
	// Create mock query engines
	transactionalEngine := NewMockQueryEngine("SQLite")
	analyticalEngine := NewMockQueryEngine("DuckDB")

	// Create a QueryRouter with the mock engines
	router := NewQueryRouter(transactionalEngine, analyticalEngine)

	// Create monitor and cache
	monitor := NewPerformanceMonitor(100*time.Millisecond, 100)
	cache := NewQueryCache(100, 1*time.Minute)

	// Create optimizer
	optimizer := NewPerformanceOptimizer(router, monitor, cache)

	// Test cacheable queries
	assert.True(t, optimizer.isCacheable("SELECT * FROM users"))
	assert.True(t, optimizer.isCacheable("SELECT id, name FROM users WHERE id > 10"))
	assert.True(t, optimizer.isCacheable("SELECT u.name, p.title FROM users u JOIN posts p ON u.id = p.user_id"))

	// Test non-cacheable queries
	assert.False(t, optimizer.isCacheable("INSERT INTO users (name) VALUES ('test')"))
	assert.False(t, optimizer.isCacheable("UPDATE users SET name = 'test' WHERE id = 1"))
	assert.False(t, optimizer.isCacheable("DELETE FROM users WHERE id = 1"))
	assert.False(t, optimizer.isCacheable("CREATE TABLE test (id INT)"))
	assert.False(t, optimizer.isCacheable("DROP TABLE test"))
	assert.False(t, optimizer.isCacheable("ALTER TABLE users ADD COLUMN email TEXT"))
}

func TestQuerySuggestions(t *testing.T) {
	// Create mock query engines
	transactionalEngine := NewMockQueryEngine("SQLite")
	analyticalEngine := NewMockQueryEngine("DuckDB")

	// Create a QueryRouter with the mock engines
	router := NewQueryRouter(transactionalEngine, analyticalEngine)

	// Create monitor and cache
	monitor := NewPerformanceMonitor(100*time.Millisecond, 100)
	cache := NewQueryCache(100, 1*time.Minute)

	// Create optimizer
	optimizer := NewPerformanceOptimizer(router, monitor, cache)

	// Record various slow queries
	monitor.RecordQueryPerformance(&QueryPerformance{
		Query:         "SELECT * FROM users",
		ExecutionTime: 150 * time.Millisecond,
		RowsProcessed: 1000,
		Engine:        "SQLite",
		Timestamp:     time.Now(),
		QueryType:     TransactionalQuery,
	})

	monitor.RecordQueryPerformance(&QueryPerformance{
		Query:         "SELECT category, COUNT(*) FROM products GROUP BY category",
		ExecutionTime: 200 * time.Millisecond,
		RowsProcessed: 5000,
		Engine:        "DuckDB",
		Timestamp:     time.Now(),
		QueryType:     AnalyticalQuery,
	})

	monitor.RecordQueryPerformance(&QueryPerformance{
		Query:         "SELECT u.name, COUNT(p.id) FROM users u JOIN posts p ON u.id = p.user_id GROUP BY u.name",
		ExecutionTime: 250 * time.Millisecond,
		RowsProcessed: 2000,
		Engine:        "DuckDB",
		Timestamp:     time.Now(),
		QueryType:     HybridQuery,
	})

	// Get suggestions
	suggestions := optimizer.GetQuerySuggestions()

	// Check transactional query suggestions
	transactionalSuggestions := suggestions["SELECT * FROM users"]
	assert.Contains(t, transactionalSuggestions, "Add a WHERE clause")
	assert.Contains(t, transactionalSuggestions, "SELECT *")

	// Check analytical query suggestions
	analyticalSuggestions := suggestions["SELECT category, COUNT(*) FROM products GROUP BY category"]
	assert.Contains(t, analyticalSuggestions, "GROUP BY")
	assert.Contains(t, analyticalSuggestions, "pre-aggregating")

	// Check hybrid query suggestions
	hybridSuggestions := suggestions["SELECT u.name, COUNT(p.id) FROM users u JOIN posts p ON u.id = p.user_id GROUP BY u.name"]
	assert.Contains(t, hybridSuggestions, "splitting the query")
	assert.Contains(t, hybridSuggestions, "JOIN")
	assert.Contains(t, hybridSuggestions, "GROUP BY")
}
