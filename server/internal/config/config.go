// LLMConfig 定义LLM服务的配置选项
type LLMConfig struct {
	Provider    string  `json:"provider" yaml:"provider" env:"LUMOS_LLM_PROVIDER"`
	ModelName   string  `json:"model_name" yaml:"model_name" env:"LUMOS_LLM_MODEL_NAME"`
	APIKey      string  `json:"api_key" yaml:"api_key" env:"LUMOS_LLM_API_KEY"`
	MaxTokens   int     `json:"max_tokens" yaml:"max_tokens" env:"LUMOS_LLM_MAX_TOKENS"`
	Temperature float64 `json:"temperature" yaml:"temperature" env:"LUMOS_LLM_TEMPERATURE"`
	EndpointURL string  `json:"endpoint_url" yaml:"endpoint_url" env:"LUMOS_LLM_ENDPOINT_URL"`
}

// MemoryConfig 定义记忆管理系统的配置选项
type MemoryConfig struct {
	DBPath          string `json:"db_path" yaml:"db_path" env:"LUMOS_MEMORY_DB_PATH"`
	AgentID         string `json:"agent_id" yaml:"agent_id" env:"LUMOS_MEMORY_AGENT_ID"`
	DefaultUserID   string `json:"default_user_id" yaml:"default_user_id" env:"LUMOS_MEMORY_DEFAULT_USER_ID"`
	DefaultTTLHours int64  `json:"default_ttl_hours" yaml:"default_ttl_hours" env:"LUMOS_MEMORY_DEFAULT_TTL_HOURS"`
	PruneEnabled    bool   `json:"prune_enabled" yaml:"prune_enabled" env:"LUMOS_MEMORY_PRUNE_ENABLED"`
	EmbeddingModel  string `json:"embedding_model" yaml:"embedding_model" env:"LUMOS_MEMORY_EMBEDDING_MODEL"`
	EmbeddingAPIKey string `json:"embedding_api_key" yaml:"embedding_api_key" env:"LUMOS_MEMORY_EMBEDDING_API_KEY"`
}

// ServerConfig 包含服务器配置信息
type ServerConfig struct {
	// ... existing code ...
	LLM    *LLMConfig    `json:"llm" yaml:"llm"`
	Memory *MemoryConfig `json:"memory" yaml:"memory"`
}

// ... existing code ... 