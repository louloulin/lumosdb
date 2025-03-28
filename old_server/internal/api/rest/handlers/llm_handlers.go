package handlers

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/lumos-db/server/internal/ai/llm"
)

// NLToSQLRequest represents a natural language to SQL conversion request
type NLToSQLRequest struct {
	Query           string   `json:"query" binding:"required"`
	AvailableTables []string `json:"available_tables,omitempty"`
}

// LLMHandler handles LLM operations
type LLMHandler struct {
	service *llm.LLMService
}

// NewLLMHandler creates a new LLM handler
func NewLLMHandler(config llm.Config) *LLMHandler {
	service := llm.NewLLMService(config)
	return &LLMHandler{
		service: service,
	}
}

// ConvertNLToSQL converts natural language to SQL
func (h *LLMHandler) ConvertNLToSQL(c *gin.Context) {
	var req NLToSQLRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// If tables weren't provided, get available tables
	availableTables := req.AvailableTables
	if len(availableTables) == 0 {
		// Get default tables from the database
		availableTables = []string{"users", "products", "orders", "categories"}
	}

	// Generate SQL from natural language
	sql, err := h.service.GenerateSQLFromNaturalLanguage(context.Background(), req.Query, availableTables)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate SQL: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"query": req.Query,
		"sql":   sql,
	})
}
