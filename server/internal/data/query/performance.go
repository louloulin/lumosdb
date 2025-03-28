package query

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

// QueryPerformance represents the performance metrics of a query
type QueryPerformance struct {
	Query         string
	ExecutionTime time.Duration
	RowsProcessed int64
	Engine        string
	Timestamp     time.Time
	QueryPlan     string
	QueryType     QueryType
	CacheHit      bool
}

// QueryCache is a cache for query results
type QueryCache struct {
	mu      sync.RWMutex
	cache   map[string]*CacheEntry
	maxSize int
	ttl     time.Duration
	hits    int
	misses  int
}

// CacheEntry represents an entry in the query cache
type CacheEntry struct {
	Result    *QueryResult
	Timestamp time.Time
	Key       string
	Size      int64
}

// NewQueryCache creates a new query cache
func NewQueryCache(maxSize int, ttl time.Duration) *QueryCache {
	return &QueryCache{
		cache:   make(map[string]*CacheEntry),
		maxSize: maxSize,
		ttl:     ttl,
	}
}

// Get retrieves a result from the cache
func (c *QueryCache) Get(key string) (*QueryResult, bool) {
	c.mu.RLock()
	entry, ok := c.cache[key]
	c.mu.RUnlock()

	if !ok {
		c.misses++
		return nil, false
	}

	// Check if the entry has expired
	if time.Since(entry.Timestamp) > c.ttl {
		c.mu.Lock()
		delete(c.cache, key)
		c.mu.Unlock()
		c.misses++
		return nil, false
	}

	c.hits++
	return entry.Result, true
}

// Put adds a result to the cache
func (c *QueryCache) Put(key string, result *QueryResult, size int64) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Check if the cache is full and evict entries if necessary
	if len(c.cache) >= c.maxSize {
		c.evict()
	}

	// Add the new entry
	c.cache[key] = &CacheEntry{
		Result:    result,
		Timestamp: time.Now(),
		Key:       key,
		Size:      size,
	}
}

// evict removes the least recently used entries from the cache
func (c *QueryCache) evict() {
	// Sort entries by timestamp
	var entries []*CacheEntry
	for _, entry := range c.cache {
		entries = append(entries, entry)
	}

	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Timestamp.Before(entries[j].Timestamp)
	})

	// Remove the oldest entries until we have enough space
	for i := 0; i < len(entries)/2; i++ {
		delete(c.cache, entries[i].Key)
	}
}

// Clear clears the cache
func (c *QueryCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.cache = make(map[string]*CacheEntry)
	c.hits = 0
	c.misses = 0
}

// GetStats returns cache statistics
func (c *QueryCache) GetStats() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()

	var totalSize int64
	for _, entry := range c.cache {
		totalSize += entry.Size
	}

	hitRate := 0.0
	if c.hits+c.misses > 0 {
		hitRate = float64(c.hits) / float64(c.hits+c.misses)
	}

	return map[string]interface{}{
		"entries":  len(c.cache),
		"size":     totalSize,
		"max_size": c.maxSize,
		"ttl":      c.ttl,
		"hits":     c.hits,
		"misses":   c.misses,
		"hit_rate": hitRate,
	}
}

// PerformanceMonitor monitors query performance
type PerformanceMonitor struct {
	mu                 sync.RWMutex
	queryStats         map[string]*QueryStatistics
	slowQueryThreshold time.Duration
	historySize        int
	history            []*QueryPerformance
}

// QueryStatistics represents statistics for a specific query
type QueryStatistics struct {
	Query              string
	Count              int64
	TotalTime          time.Duration
	MinTime            time.Duration
	MaxTime            time.Duration
	AvgTime            time.Duration
	TotalRowsProcessed int64
	LastExecuted       time.Time
}

// NewPerformanceMonitor creates a new performance monitor
func NewPerformanceMonitor(slowQueryThreshold time.Duration, historySize int) *PerformanceMonitor {
	return &PerformanceMonitor{
		queryStats:         make(map[string]*QueryStatistics),
		slowQueryThreshold: slowQueryThreshold,
		historySize:        historySize,
		history:            make([]*QueryPerformance, 0, historySize),
	}
}

// RecordQueryPerformance records the performance of a query
func (m *PerformanceMonitor) RecordQueryPerformance(perf *QueryPerformance) {
	m.mu.Lock()
	defer m.mu.Unlock()

	// Update query statistics
	stats, ok := m.queryStats[perf.Query]
	if !ok {
		stats = &QueryStatistics{
			Query:   perf.Query,
			MinTime: perf.ExecutionTime,
			MaxTime: perf.ExecutionTime,
		}
		m.queryStats[perf.Query] = stats
	}

	stats.Count++
	stats.TotalTime += perf.ExecutionTime
	stats.AvgTime = stats.TotalTime / time.Duration(stats.Count)
	stats.TotalRowsProcessed += perf.RowsProcessed
	stats.LastExecuted = perf.Timestamp

	if perf.ExecutionTime < stats.MinTime {
		stats.MinTime = perf.ExecutionTime
	}

	if perf.ExecutionTime > stats.MaxTime {
		stats.MaxTime = perf.ExecutionTime
	}

	// Add to history
	m.history = append(m.history, perf)
	if len(m.history) > m.historySize {
		// Remove the oldest entry
		m.history = m.history[1:]
	}

	// Log slow queries
	if perf.ExecutionTime > m.slowQueryThreshold {
		fmt.Printf("Slow query detected: %s (%.2f ms)\n", perf.Query, float64(perf.ExecutionTime)/float64(time.Millisecond))
	}
}

// GetQueryStatistics returns statistics for a specific query
func (m *PerformanceMonitor) GetQueryStatistics(query string) (*QueryStatistics, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	stats, ok := m.queryStats[query]
	return stats, ok
}

// GetAllQueryStatistics returns statistics for all queries
func (m *PerformanceMonitor) GetAllQueryStatistics() []*QueryStatistics {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var result []*QueryStatistics
	for _, stats := range m.queryStats {
		result = append(result, stats)
	}

	return result
}

// GetSlowQueries returns slow queries (queries that took longer than the threshold)
func (m *PerformanceMonitor) GetSlowQueries() []*QueryStatistics {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var result []*QueryStatistics
	for _, stats := range m.queryStats {
		if stats.MaxTime > m.slowQueryThreshold {
			result = append(result, stats)
		}
	}

	return result
}

// GetQueryHistory returns the query execution history
func (m *PerformanceMonitor) GetQueryHistory() []*QueryPerformance {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return a copy to avoid concurrent modification
	result := make([]*QueryPerformance, len(m.history))
	copy(result, m.history)

	return result
}

// PerformanceOptimizer optimizes query performance
type PerformanceOptimizer struct {
	router  *QueryRouter
	monitor *PerformanceMonitor
	cache   *QueryCache
}

// NewPerformanceOptimizer creates a new performance optimizer
func NewPerformanceOptimizer(router *QueryRouter, monitor *PerformanceMonitor, cache *QueryCache) *PerformanceOptimizer {
	return &PerformanceOptimizer{
		router:  router,
		monitor: monitor,
		cache:   cache,
	}
}

// ExecuteQuery executes a query with performance optimization
func (o *PerformanceOptimizer) ExecuteQuery(ctx context.Context, query string, args ...interface{}) (*QueryResult, error) {
	start := time.Now()

	// Check if the query is in the cache
	cacheKey := query
	for _, arg := range args {
		cacheKey += fmt.Sprintf(":%v", arg)
	}

	result, cacheHit := o.cache.Get(cacheKey)
	if cacheHit {
		// Record cache hit performance
		o.monitor.RecordQueryPerformance(&QueryPerformance{
			Query:         query,
			ExecutionTime: time.Since(start),
			RowsProcessed: int64(len(result.Rows)),
			Engine:        "Cache",
			Timestamp:     time.Now(),
			QueryType:     o.router.ClassifyQuery(query),
			CacheHit:      true,
		})

		return result, nil
	}

	// Execute the query
	result, err := o.router.RouteQuery(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	executionTime := time.Since(start)

	// Record query performance
	o.monitor.RecordQueryPerformance(&QueryPerformance{
		Query:         query,
		ExecutionTime: executionTime,
		RowsProcessed: int64(len(result.Rows)),
		Engine:        result.QueryPlan,
		Timestamp:     time.Now(),
		QueryPlan:     result.QueryPlan,
		QueryType:     o.router.ClassifyQuery(query),
		CacheHit:      false,
	})

	// Cache the result if it's cacheable
	if o.isCacheable(query) {
		size := int64(len(result.Rows) * len(result.Columns) * 8) // Rough estimate of result size
		o.cache.Put(cacheKey, result, size)
	}

	return result, nil
}

// IsCacheable determines if a query is cacheable
func (o *PerformanceOptimizer) isCacheable(query string) bool {
	// Don't cache modification queries
	upperQuery := strings.ToUpper(query)
	if strings.Contains(upperQuery, "INSERT") ||
		strings.Contains(upperQuery, "UPDATE") ||
		strings.Contains(upperQuery, "DELETE") ||
		strings.Contains(upperQuery, "CREATE") ||
		strings.Contains(upperQuery, "DROP") ||
		strings.Contains(upperQuery, "ALTER") {
		return false
	}

	// Cache SELECT queries
	return strings.Contains(upperQuery, "SELECT")
}

// GetQuerySuggestions returns suggestions for optimizing queries
func (o *PerformanceOptimizer) GetQuerySuggestions() map[string]string {
	slowQueries := o.monitor.GetSlowQueries()

	suggestions := make(map[string]string)
	for _, stats := range slowQueries {
		queryType := o.router.ClassifyQuery(stats.Query)

		switch queryType {
		case TransactionalQuery:
			suggestions[stats.Query] = o.getTransactionalQuerySuggestions(stats)
		case AnalyticalQuery:
			suggestions[stats.Query] = o.getAnalyticalQuerySuggestions(stats)
		case HybridQuery:
			suggestions[stats.Query] = o.getHybridQuerySuggestions(stats)
		}
	}

	return suggestions
}

// getTransactionalQuerySuggestions returns suggestions for optimizing transactional queries
func (o *PerformanceOptimizer) getTransactionalQuerySuggestions(stats *QueryStatistics) string {
	query := stats.Query
	upperQuery := strings.ToUpper(query)

	var suggestions []string

	// Check for missing WHERE clause
	if strings.Contains(upperQuery, "SELECT") && !strings.Contains(upperQuery, "WHERE") {
		suggestions = append(suggestions, "Add a WHERE clause to limit the number of rows returned")
	}

	// Check for SELECT *
	if strings.Contains(upperQuery, "SELECT *") {
		suggestions = append(suggestions, "Specify only the columns you need instead of using SELECT *")
	}

	// Check for indices (this would require schema information in a real implementation)
	if strings.Contains(upperQuery, "WHERE") {
		suggestions = append(suggestions, "Ensure that the columns in the WHERE clause are indexed")
	}

	if len(suggestions) == 0 {
		return "No specific suggestions"
	}

	var result string
	for i, suggestion := range suggestions {
		result += fmt.Sprintf("%d. %s\n", i+1, suggestion)
	}

	return result
}

// getAnalyticalQuerySuggestions returns suggestions for optimizing analytical queries
func (o *PerformanceOptimizer) getAnalyticalQuerySuggestions(stats *QueryStatistics) string {
	query := stats.Query
	upperQuery := strings.ToUpper(query)

	var suggestions []string

	// Check for GROUP BY without indices
	if strings.Contains(upperQuery, "GROUP BY") {
		suggestions = append(suggestions, "Ensure that the columns in the GROUP BY clause are indexed")
	}

	// Check for ORDER BY without indices
	if strings.Contains(upperQuery, "ORDER BY") {
		suggestions = append(suggestions, "Ensure that the columns in the ORDER BY clause are indexed")
	}

	// Check for JOIN without indices
	if strings.Contains(upperQuery, "JOIN") {
		suggestions = append(suggestions, "Ensure that the columns used in JOIN conditions are indexed")
	}

	// Check for aggregation functions
	if strings.Contains(upperQuery, "COUNT(") ||
		strings.Contains(upperQuery, "SUM(") ||
		strings.Contains(upperQuery, "AVG(") ||
		strings.Contains(upperQuery, "MIN(") ||
		strings.Contains(upperQuery, "MAX(") {
		suggestions = append(suggestions, "Consider pre-aggregating data if this query is run frequently")
	}

	// Check for subqueries
	if strings.Contains(upperQuery, "SELECT") && strings.Count(upperQuery, "SELECT") > 1 {
		suggestions = append(suggestions, "Consider replacing subqueries with JOINs if possible")
	}

	if len(suggestions) == 0 {
		return "No specific suggestions"
	}

	var result string
	for i, suggestion := range suggestions {
		result += fmt.Sprintf("%d. %s\n", i+1, suggestion)
	}

	return result
}

// getHybridQuerySuggestions returns suggestions for optimizing hybrid queries
func (o *PerformanceOptimizer) getHybridQuerySuggestions(stats *QueryStatistics) string {
	var suggestions []string

	// For hybrid queries, combine suggestions from both transactional and analytical queries
	transactionalSuggestions := o.getTransactionalQuerySuggestions(stats)
	analyticalSuggestions := o.getAnalyticalQuerySuggestions(stats)

	if transactionalSuggestions != "No specific suggestions" {
		suggestions = append(suggestions, "Transactional optimizations:\n"+transactionalSuggestions)
	}

	if analyticalSuggestions != "No specific suggestions" {
		suggestions = append(suggestions, "Analytical optimizations:\n"+analyticalSuggestions)
	}

	// Add hybrid-specific suggestions
	suggestions = append(suggestions, "Consider splitting the query into separate transactional and analytical parts")

	if len(suggestions) == 0 {
		return "No specific suggestions"
	}

	var result string
	for i, suggestion := range suggestions {
		result += fmt.Sprintf("%d. %s\n", i+1, suggestion)
	}

	return result
}
