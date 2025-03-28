package memory

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// MemoryManager 管理Agent的记忆系统
type MemoryManager struct {
	store        MemoryStore
	mutex        sync.RWMutex
	agentID      string
	currentUser  string
	sessionID    string
	defaultTTL   time.Duration
	pruneEnabled bool
}

// MemoryManagerConfig 记忆管理器的配置
type MemoryManagerConfig struct {
	// AgentID 是此管理器为其管理记忆的Agent ID
	AgentID string

	// DefaultUserID 是默认的用户ID
	DefaultUserID string

	// DefaultTTL 是记忆的默认生存时间（0表示永不过期）
	DefaultTTL time.Duration

	// PruneEnabled 是否启用自动清理过期记忆
	PruneEnabled bool
}

// NewMemoryManager 创建一个新的记忆管理器
func NewMemoryManager(store MemoryStore, config MemoryManagerConfig) *MemoryManager {
	if config.AgentID == "" {
		config.AgentID = "default-agent"
	}

	if config.DefaultUserID == "" {
		config.DefaultUserID = "default-user"
	}

	sessionID := uuid.New().String()

	return &MemoryManager{
		store:        store,
		agentID:      config.AgentID,
		currentUser:  config.DefaultUserID,
		sessionID:    sessionID,
		defaultTTL:   config.DefaultTTL,
		pruneEnabled: config.PruneEnabled,
	}
}

// SetCurrentUser 设置当前用户ID
func (m *MemoryManager) SetCurrentUser(userID string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.currentUser = userID
}

// GetCurrentUser 获取当前用户ID
func (m *MemoryManager) GetCurrentUser() string {
	m.mutex.RLock()
	defer m.mutex.RUnlock()
	return m.currentUser
}

// GetSessionID 获取当前会话ID
func (m *MemoryManager) GetSessionID() string {
	return m.sessionID
}

// StoreMemory 存储一条记忆
func (m *MemoryManager) StoreMemory(ctx context.Context, content string, memType MemoryType, importance Importance) (MemoryID, error) {
	if content == "" {
		return "", errors.New("memory content cannot be empty")
	}

	m.mutex.RLock()
	userID := m.currentUser
	sessionID := m.sessionID
	m.mutex.RUnlock()

	var expiresAt *time.Time
	if m.defaultTTL > 0 {
		t := time.Now().Add(m.defaultTTL)
		expiresAt = &t
	}

	memory := MemoryEntry{
		AgentID:     m.agentID,
		UserID:      userID,
		SessionID:   sessionID,
		Type:        memType,
		Content:     content,
		CreatedAt:   time.Now(),
		AccessCount: 0,
		Importance:  importance,
		ExpiresAt:   expiresAt,
	}

	id, err := m.store.Store(ctx, memory)
	if err != nil {
		return "", fmt.Errorf("failed to store memory: %w", err)
	}

	// 如果启用了自动清理，尝试清理过期记忆
	if m.pruneEnabled {
		go func() {
			// 使用新的上下文，防止原始上下文被取消
			pruneCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			_, _ = m.store.Prune(pruneCtx)
		}()
	}

	return id, nil
}

// StoreConversationMemory 存储对话记忆
func (m *MemoryManager) StoreConversationMemory(ctx context.Context, content string, role string) (MemoryID, error) {
	// 为对话记忆添加角色元数据
	memory := MemoryEntry{
		AgentID:     m.agentID,
		UserID:      m.GetCurrentUser(),
		SessionID:   m.sessionID,
		Type:        ConversationMemory,
		Content:     content,
		CreatedAt:   time.Now(),
		AccessCount: 0,
		Importance:  MediumImportance,
		Metadata: map[string]interface{}{
			"role": role,
		},
	}

	// 对话记忆可设置较短的过期时间
	if m.defaultTTL > 0 {
		t := time.Now().Add(m.defaultTTL)
		memory.ExpiresAt = &t
	}

	return m.store.Store(ctx, memory)
}

// StoreFactMemory 存储事实记忆
func (m *MemoryManager) StoreFactMemory(ctx context.Context, fact string) (MemoryID, error) {
	// 事实记忆通常重要性较高，默认不过期
	return m.StoreMemory(ctx, fact, FactMemory, HighImportance)
}

// StorePreferenceMemory 存储用户偏好记忆
func (m *MemoryManager) StorePreferenceMemory(ctx context.Context, preference string, category string) (MemoryID, error) {
	memory := MemoryEntry{
		AgentID:     m.agentID,
		UserID:      m.GetCurrentUser(),
		Type:        PreferenceMemory,
		Content:     preference,
		CreatedAt:   time.Now(),
		AccessCount: 0,
		Importance:  HighImportance,
		Metadata: map[string]interface{}{
			"category": category,
		},
	}

	// 偏好记忆通常长期保存
	return m.store.Store(ctx, memory)
}

// RecallMemories 根据查询条件回忆记忆
func (m *MemoryManager) RecallMemories(ctx context.Context, options QueryOptions) ([]MemoryEntry, error) {
	return m.store.Query(ctx, m.agentID, m.GetCurrentUser(), options)
}

// RecallByType 根据记忆类型回忆
func (m *MemoryManager) RecallByType(ctx context.Context, memoryType MemoryType, limit int) ([]MemoryEntry, error) {
	options := DefaultQueryOptions()
	options.Types = []MemoryType{memoryType}
	if limit > 0 {
		options.Limit = limit
	}

	return m.store.Query(ctx, m.agentID, m.GetCurrentUser(), options)
}

// RecallConversationHistory 回忆对话历史
func (m *MemoryManager) RecallConversationHistory(ctx context.Context, limit int) ([]MemoryEntry, error) {
	options := DefaultQueryOptions()
	options.Types = []MemoryType{ConversationMemory}
	if limit > 0 {
		options.Limit = limit
	}

	return m.store.Query(ctx, m.agentID, m.GetCurrentUser(), options)
}

// RecallRecentSimilar 回忆相似记忆
func (m *MemoryManager) RecallRecentSimilar(ctx context.Context, content string, limit int) ([]MemoryEntry, error) {
	options := DefaultQueryOptions()
	if limit > 0 {
		options.Limit = limit
	}

	return m.store.SearchSimilar(ctx, m.agentID, content, options)
}

// ForgetMemory 遗忘一条记忆
func (m *MemoryManager) ForgetMemory(ctx context.Context, id MemoryID) error {
	return m.store.Delete(ctx, id)
}

// ForgetAllUserMemories 遗忘所有用户记忆
func (m *MemoryManager) ForgetAllUserMemories(ctx context.Context) error {
	return m.store.DeleteByAgentAndUser(ctx, m.agentID, m.GetCurrentUser())
}

// MarkImportant 将记忆标记为重要
func (m *MemoryManager) MarkImportant(ctx context.Context, id MemoryID) error {
	return m.store.UpdateImportance(ctx, id, HighImportance)
}

// MarkCritical 将记忆标记为关键
func (m *MemoryManager) MarkCritical(ctx context.Context, id MemoryID) error {
	return m.store.UpdateImportance(ctx, id, CriticalImportance)
}

// StartNewSession 开始新会话
func (m *MemoryManager) StartNewSession() {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.sessionID = uuid.New().String()
}
