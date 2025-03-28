package memory

import (
	"context"
	"time"
)

// MemoryID 是记忆条目的唯一标识符
type MemoryID string

// MemoryType 表示记忆的类型
type MemoryType string

// 常见的记忆类型
const (
	// ConversationMemory 表示对话历史记忆
	ConversationMemory MemoryType = "conversation"

	// FactMemory 表示事实类知识记忆
	FactMemory MemoryType = "fact"

	// TaskMemory 表示任务相关记忆
	TaskMemory MemoryType = "task"

	// PreferenceMemory 表示用户偏好记忆
	PreferenceMemory MemoryType = "preference"
)

// Importance 表示记忆的重要性级别
type Importance int

// 记忆重要性级别
const (
	LowImportance      Importance = 1
	MediumImportance   Importance = 2
	HighImportance     Importance = 3
	CriticalImportance Importance = 4
)

// MemoryEntry 表示一条记忆条目
type MemoryEntry struct {
	// ID 是记忆条目的唯一标识符
	ID MemoryID `json:"id"`

	// AgentID 是记忆所属的Agent标识
	AgentID string `json:"agent_id"`

	// UserID 是记忆相关的用户标识
	UserID string `json:"user_id,omitempty"`

	// SessionID 是对话会话的标识
	SessionID string `json:"session_id,omitempty"`

	// Type 是记忆的类型
	Type MemoryType `json:"type"`

	// Content 是记忆的内容
	Content string `json:"content"`

	// Metadata 是记忆的元数据
	Metadata map[string]interface{} `json:"metadata,omitempty"`

	// Embedding 是记忆内容的向量表示
	Embedding []float32 `json:"embedding,omitempty"`

	// CreatedAt 是记忆创建的时间
	CreatedAt time.Time `json:"created_at"`

	// LastAccessedAt 是记忆最后访问的时间
	LastAccessedAt time.Time `json:"last_accessed_at,omitempty"`

	// AccessCount 是记忆被访问的次数
	AccessCount int `json:"access_count"`

	// Importance 是记忆的重要性评分
	Importance Importance `json:"importance"`

	// ExpiresAt 是记忆过期的时间（如果有）
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

// QueryOptions 包含查询记忆的选项
type QueryOptions struct {
	// Limit 限制返回的结果数量
	Limit int `json:"limit"`

	// IncludeExpired 是否包含已过期的记忆
	IncludeExpired bool `json:"include_expired"`

	// MinImportance 最小重要性级别过滤
	MinImportance Importance `json:"min_importance"`

	// Types 按记忆类型过滤
	Types []MemoryType `json:"types,omitempty"`

	// StartTime 记忆创建时间范围的开始
	StartTime *time.Time `json:"start_time,omitempty"`

	// EndTime 记忆创建时间范围的结束
	EndTime *time.Time `json:"end_time,omitempty"`

	// Metadata 按元数据过滤
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// DefaultQueryOptions 返回默认的查询选项
func DefaultQueryOptions() QueryOptions {
	return QueryOptions{
		Limit:          50,
		IncludeExpired: false,
		MinImportance:  LowImportance,
	}
}

// MemoryStore 接口定义记忆存储的基本操作
type MemoryStore interface {
	// Store 存储一条记忆
	Store(ctx context.Context, memory MemoryEntry) (MemoryID, error)

	// BatchStore 批量存储多条记忆
	BatchStore(ctx context.Context, memories []MemoryEntry) ([]MemoryID, error)

	// GetByID 根据ID获取记忆
	GetByID(ctx context.Context, id MemoryID) (*MemoryEntry, error)

	// Query 按条件查询记忆
	Query(ctx context.Context, agentID string, userID string, options QueryOptions) ([]MemoryEntry, error)

	// SearchSimilar 搜索语义相似的记忆
	SearchSimilar(ctx context.Context, agentID string, content string, options QueryOptions) ([]MemoryEntry, error)

	// UpdateAccessTime 更新记忆的访问时间和计数
	UpdateAccessTime(ctx context.Context, id MemoryID) error

	// UpdateImportance 更新记忆的重要性
	UpdateImportance(ctx context.Context, id MemoryID, importance Importance) error

	// Delete 删除一条记忆
	Delete(ctx context.Context, id MemoryID) error

	// DeleteByAgentAndUser 删除特定Agent和用户的记忆
	DeleteByAgentAndUser(ctx context.Context, agentID string, userID string) error

	// Prune 清理过期记忆
	Prune(ctx context.Context) (int, error)
}
