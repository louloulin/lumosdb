package llm

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/cloudwego/eino/schema"
	"github.com/stretchr/testify/assert"
)

// MockLLMServer creates a mock HTTP server for testing LLM requests
func MockLLMServer(t *testing.T) *httptest.Server {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, "/v1/chat/completions", r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))
		assert.Equal(t, "Bearer test-api-key", r.Header.Get("Authorization"))

		var req ChatRequest
		json.NewDecoder(r.Body).Decode(&req)

		// Verify that the request has the expected model and messages
		assert.Equal(t, "gpt-3.5-turbo", req.Model)
		assert.GreaterOrEqual(t, len(req.Messages), 1)

		// Prepare mock response
		mockResp := ChatResponse{
			ID:      "mock-id",
			Object:  "chat.completion",
			Created: 1630000000,
			Model:   "gpt-3.5-turbo",
			Choices: []Choice{
				{
					Index: 0,
					Message: schema.Message{
						Role:    "assistant",
						Content: "SELECT * FROM users WHERE name = 'John';",
					},
					FinishReason: "stop",
				},
			},
			Usage: Usage{
				PromptTokens:     50,
				CompletionTokens: 20,
				TotalTokens:      70,
			},
		}

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(mockResp)
	})

	return httptest.NewServer(handler)
}

func TestGenerateCompletion(t *testing.T) {
	// Create mock server
	server := MockLLMServer(t)
	defer server.Close()

	// Create LLM service with mock server URL
	config := Config{
		Provider:    "openai",
		ModelName:   "gpt-3.5-turbo",
		APIKey:      "test-api-key",
		MaxTokens:   100,
		Temperature: 0.7,
		EndpointURL: server.URL + "/v1/chat/completions",
	}
	service := NewLLMService(config)

	// Create test messages
	messages := []schema.Message{
		{
			Role:    "user",
			Content: "Convert to SQL: Find all users named John",
		},
	}

	// Generate completion
	response, err := service.GenerateCompletion(context.Background(), messages)

	// Verify the result
	assert.NoError(t, err)
	assert.NotNil(t, response)
	assert.Equal(t, string("assistant"), string(response.Role))
	assert.Equal(t, "SELECT * FROM users WHERE name = 'John';", response.Content)
}

func TestGenerateSQLFromNaturalLanguage(t *testing.T) {
	// Create mock server
	server := MockLLMServer(t)
	defer server.Close()

	// Create LLM service with mock server URL
	config := Config{
		Provider:    "openai",
		ModelName:   "gpt-3.5-turbo",
		APIKey:      "test-api-key",
		MaxTokens:   100,
		Temperature: 0.7,
		EndpointURL: server.URL + "/v1/chat/completions",
	}
	service := NewLLMService(config)

	// Test natural language to SQL conversion
	sql, err := service.GenerateSQLFromNaturalLanguage(
		context.Background(),
		"Find all users named John",
		[]string{"users", "orders"},
	)

	// Verify the result
	assert.NoError(t, err)
	assert.Equal(t, "SELECT * FROM users WHERE name = 'John';", sql)
}
