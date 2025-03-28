package llm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/cloudwego/eino/schema"
)

// LLMService provides language model capabilities
type LLMService struct {
	config Config
	client *http.Client
}

// NewLLMService creates a new LLM service with the given configuration
func NewLLMService(config Config) *LLMService {
	return &LLMService{
		config: config,
		client: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

// ChatRequest represents a chat completion request
type ChatRequest struct {
	Model       string           `json:"model"`
	Messages    []schema.Message `json:"messages"`
	MaxTokens   int              `json:"max_tokens,omitempty"`
	Temperature float32          `json:"temperature,omitempty"`
	Stream      bool             `json:"stream,omitempty"`
}

// ChatResponse represents a chat completion response
type ChatResponse struct {
	ID      string   `json:"id"`
	Object  string   `json:"object"`
	Created int64    `json:"created"`
	Model   string   `json:"model"`
	Choices []Choice `json:"choices"`
	Usage   Usage    `json:"usage"`
}

// Choice represents a response choice in a chat completion
type Choice struct {
	Index        int            `json:"index"`
	Message      schema.Message `json:"message"`
	FinishReason string         `json:"finish_reason"`
}

// Usage represents token usage information
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// GenerateCompletion generates a chat completion using the configured LLM
func (s *LLMService) GenerateCompletion(ctx context.Context, messages []schema.Message) (*schema.Message, error) {
	// Create the request
	req := ChatRequest{
		Model:       s.config.ModelName,
		Messages:    messages,
		MaxTokens:   s.config.MaxTokens,
		Temperature: s.config.Temperature,
	}

	// Determine the API endpoint URL
	endpoint := "https://api.openai.com/v1/chat/completions"
	if s.config.EndpointURL != "" {
		endpoint = s.config.EndpointURL
	}

	// Serialize the request
	reqBody, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", endpoint, strings.NewReader(string(reqBody)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+s.config.APIKey)

	// Execute the request
	resp, err := s.client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Handle error responses
	if resp.StatusCode != http.StatusOK {
		var errorResponse struct {
			Error struct {
				Message string `json:"message"`
				Type    string `json:"type"`
			} `json:"error"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&errorResponse); err != nil {
			return nil, fmt.Errorf("request failed with status %d", resp.StatusCode)
		}
		return nil, fmt.Errorf("LLM request failed: %s (%s)", errorResponse.Error.Message, errorResponse.Error.Type)
	}

	// Parse the response
	var chatResp ChatResponse
	if err := json.NewDecoder(resp.Body).Decode(&chatResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract the generated message
	if len(chatResp.Choices) == 0 {
		return nil, errors.New("no completion choices returned")
	}

	return &chatResp.Choices[0].Message, nil
}

// GenerateSQLFromNaturalLanguage generates SQL from a natural language description
func (s *LLMService) GenerateSQLFromNaturalLanguage(ctx context.Context, query string, availableTables []string) (string, error) {
	// Prepare system message with available tables info
	tablesInfo := strings.Join(availableTables, ", ")
	systemPrompt := fmt.Sprintf(
		"You are a SQL expert. Convert natural language into SQL. Available tables: %s. "+
			"Return only the SQL query without explanations or markdown formatting.",
		tablesInfo,
	)

	// Create messages for the chat
	messages := []schema.Message{
		{
			Role:    "system",
			Content: systemPrompt,
		},
		{
			Role:    "user",
			Content: query,
		},
	}

	// Generate completion
	response, err := s.GenerateCompletion(ctx, messages)
	if err != nil {
		return "", err
	}

	// Extract SQL from the response
	sql := response.Content

	// Clean up any markdown formatting that might have been added
	sql = strings.TrimSpace(sql)
	sql = strings.TrimPrefix(sql, "```sql")
	sql = strings.TrimPrefix(sql, "```")
	sql = strings.TrimSuffix(sql, "```")
	sql = strings.TrimSpace(sql)

	return sql, nil
}
