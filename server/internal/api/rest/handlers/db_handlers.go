package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// QueryRequest represents a database query request
type QueryRequest struct {
	SQL       string                 `json:"sql" binding:"required"`
	Params    map[string]interface{} `json:"params"`
	UseEngine string                 `json:"use_engine,omitempty"` // "sqlite", "duckdb", or empty for auto
}

// ExecuteRequest represents a database execution request
type ExecuteRequest struct {
	SQL       string                 `json:"sql" binding:"required"`
	Params    map[string]interface{} `json:"params"`
	UseEngine string                 `json:"use_engine,omitempty"` // "sqlite", "duckdb", or empty for auto
}

// TableInfo represents information about a database table
type TableInfo struct {
	Name    string       `json:"name"`
	Columns []ColumnInfo `json:"columns"`
}

// ColumnInfo represents information about a table column
type ColumnInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
}

// DBHandler handles database operations
type DBHandler struct {
	// Add dependencies here (e.g., connection to Rust core)
}

// NewDBHandler creates a new database handler
func NewDBHandler() *DBHandler {
	return &DBHandler{}
}

// Query executes a database query and returns the results
func (h *DBHandler) Query(c *gin.Context) {
	var req QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Interface with core Rust library to execute query
	// For now, return mock data
	c.JSON(http.StatusOK, gin.H{
		"columns": []string{"id", "name", "value"},
		"rows": []map[string]interface{}{
			{"id": 1, "name": "Item 1", "value": 10.5},
			{"id": 2, "name": "Item 2", "value": 20.75},
		},
		"rowCount": 2,
	})
}

// Execute executes a database statement
func (h *DBHandler) Execute(c *gin.Context) {
	var req ExecuteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Interface with core Rust library to execute statement
	// For now, return mock data
	c.JSON(http.StatusOK, gin.H{
		"affectedRows": 1,
		"lastInsertId": 42,
	})
}

// ListTables returns a list of all tables in the database
func (h *DBHandler) ListTables(c *gin.Context) {
	// TODO: Interface with core Rust library to get tables
	// For now, return mock data
	c.JSON(http.StatusOK, gin.H{
		"tables": []string{"users", "products", "orders"},
	})
}

// GetTableInfo returns detailed information about a specific table
func (h *DBHandler) GetTableInfo(c *gin.Context) {
	tableName := c.Param("name")
	if tableName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Table name is required"})
		return
	}

	// TODO: Interface with core Rust library to get table info
	// For now, return mock data
	tableInfo := TableInfo{
		Name: tableName,
		Columns: []ColumnInfo{
			{Name: "id", Type: "INTEGER", Nullable: false},
			{Name: "name", Type: "TEXT", Nullable: false},
			{Name: "created_at", Type: "TIMESTAMP", Nullable: true},
		},
	}

	c.JSON(http.StatusOK, tableInfo)
}
