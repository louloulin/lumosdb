package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/lumos-db/server/internal/api/rest/handlers"
	"github.com/stretchr/testify/assert"
)

func TestQuery(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a test router
	r := gin.Default()
	dbHandler := handlers.NewDBHandler()
	r.POST("/query", dbHandler.Query)

	// Create a request body
	query := handlers.QueryRequest{
		SQL:    "SELECT * FROM users",
		Params: map[string]interface{}{"limit": 10},
	}
	jsonValue, _ := json.Marshal(query)

	// Create a test request
	req, _ := http.NewRequest("POST", "/query", bytes.NewBuffer(jsonValue))
	req.Header.Set("Content-Type", "application/json")

	// Create a response recorder
	w := httptest.NewRecorder()

	// Perform the request
	r.ServeHTTP(w, req)

	// Check the response
	assert.Equal(t, http.StatusOK, w.Code)

	// Parse the response body
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)

	// Validate the response
	assert.Nil(t, err)
	assert.Contains(t, response, "columns")
	assert.Contains(t, response, "rows")
	assert.Contains(t, response, "rowCount")
}

func TestListTables(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a test router
	r := gin.Default()
	dbHandler := handlers.NewDBHandler()
	r.GET("/tables", dbHandler.ListTables)

	// Create a test request
	req, _ := http.NewRequest("GET", "/tables", nil)

	// Create a response recorder
	w := httptest.NewRecorder()

	// Perform the request
	r.ServeHTTP(w, req)

	// Check the response
	assert.Equal(t, http.StatusOK, w.Code)

	// Parse the response body
	var response map[string]interface{}
	err := json.Unmarshal(w.Body.Bytes(), &response)

	// Validate the response
	assert.Nil(t, err)
	assert.Contains(t, response, "tables")
	tables, ok := response["tables"].([]interface{})
	assert.True(t, ok)
	assert.GreaterOrEqual(t, len(tables), 0)
}

func TestGetTableInfo(t *testing.T) {
	// Set Gin to test mode
	gin.SetMode(gin.TestMode)

	// Create a test router
	r := gin.Default()
	dbHandler := handlers.NewDBHandler()
	r.GET("/tables/:name", dbHandler.GetTableInfo)

	// Create a test request
	req, _ := http.NewRequest("GET", "/tables/users", nil)

	// Create a response recorder
	w := httptest.NewRecorder()

	// Perform the request
	r.ServeHTTP(w, req)

	// Check the response
	assert.Equal(t, http.StatusOK, w.Code)

	// Parse the response body
	var tableInfo handlers.TableInfo
	err := json.Unmarshal(w.Body.Bytes(), &tableInfo)

	// Validate the response
	assert.Nil(t, err)
	assert.Equal(t, "users", tableInfo.Name)
	assert.GreaterOrEqual(t, len(tableInfo.Columns), 1)
}
