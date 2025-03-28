package llm

// Config holds the configuration for LLM integration
type Config struct {
	// Provider specifies the LLM provider to use (openai, etc.)
	Provider string `json:"provider"`

	// ModelName specifies the specific model to use
	ModelName string `json:"model_name"`

	// APIKey is the authentication key for the LLM service
	APIKey string `json:"api_key"`

	// MaxTokens specifies the maximum number of tokens in the response
	MaxTokens int `json:"max_tokens"`

	// Temperature controls the randomness of the output (0.0-1.0)
	Temperature float32 `json:"temperature"`

	// EndpointURL allows overriding the default API endpoint URL
	EndpointURL string `json:"endpoint_url,omitempty"`
}

// DefaultConfig returns a default configuration for the LLM
func DefaultConfig() Config {
	return Config{
		Provider:    "openai",
		ModelName:   "gpt-3.5-turbo",
		MaxTokens:   2048,
		Temperature: 0.7,
	}
}
