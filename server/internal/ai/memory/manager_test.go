package memory

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func setupTestMemoryStore(t *testing.T) *SQLiteStore {
	// 使用临时文件作为测试数据库
	tempFile, err := os.CreateTemp("", "memory_test_*.db")
	require.NoError(t, err)
	tempFile.Close()

	// 创建SQLite存储
	store, err := NewSQLiteStore(tempFile.Name())
	require.NoError(t, err)

	// 在测试结束后清理
	t.Cleanup(func() {
		store.Close()
		os.Remove(tempFile.Name())
	})

	return store
}

func TestMemoryManager_StoreAndRecall(t *testing.T) {
	// 设置测试存储
	store := setupTestMemoryStore(t)

	// 创建内存管理器
	manager := NewMemoryManager(store, MemoryManagerConfig{
		AgentID:       "test-agent",
		DefaultUserID: "test-user",
		DefaultTTL:    time.Hour * 24,
		PruneEnabled:  false,
	})

	ctx := context.Background()

	// 测试存储记忆
	id, err := manager.StoreMemory(ctx, "This is a test memory", ConversationMemory, MediumImportance)
	assert.NoError(t, err)
	assert.NotEmpty(t, id)

	// 测试回忆记忆
	memories, err := manager.RecallByType(ctx, ConversationMemory, 10)
	assert.NoError(t, err)
	assert.Len(t, memories, 1)
	assert.Equal(t, "This is a test memory", memories[0].Content)
	assert.Equal(t, ConversationMemory, memories[0].Type)
	assert.Equal(t, MediumImportance, memories[0].Importance)

	// 测试存储会话记忆
	convID, err := manager.StoreConversationMemory(ctx, "What is the weather today?", "user")
	assert.NoError(t, err)

	// 测试回忆会话记忆
	convMemories, err := manager.RecallConversationHistory(ctx, 10)
	assert.NoError(t, err)
	assert.Len(t, convMemories, 2) // 包括前面添加的一条

	// 检查最新的会话记忆
	found := false
	for _, m := range convMemories {
		if string(m.ID) == string(convID) {
			found = true
			assert.Equal(t, "What is the weather today?", m.Content)
			assert.Equal(t, map[string]interface{}{"role": "user"}, m.Metadata)
		}
	}
	assert.True(t, found, "会话记忆未找到")

	// 测试存储事实记忆
	factID, err := manager.StoreFactMemory(ctx, "Beijing is the capital of China")
	assert.NoError(t, err)

	// 测试根据类型回忆
	factMemories, err := manager.RecallByType(ctx, FactMemory, 10)
	assert.NoError(t, err)
	assert.Len(t, factMemories, 1)
	assert.Equal(t, "Beijing is the capital of China", factMemories[0].Content)
	assert.Equal(t, HighImportance, factMemories[0].Importance)

	// 测试相似记忆回忆
	similarMemories, err := manager.RecallRecentSimilar(ctx, "capital", 10)
	assert.NoError(t, err)
	assert.GreaterOrEqual(t, len(similarMemories), 1, "应至少找到一条相似记忆")

	// 测试修改重要性
	err = manager.MarkCritical(ctx, factID)
	assert.NoError(t, err)

	// 验证重要性已更新
	updatedMemory, err := store.GetByID(ctx, factID)
	assert.NoError(t, err)
	assert.Equal(t, CriticalImportance, updatedMemory.Importance)
}

func TestMemoryManager_Session(t *testing.T) {
	// 设置测试存储
	store := setupTestMemoryStore(t)

	// 创建内存管理器
	manager := NewMemoryManager(store, MemoryManagerConfig{
		AgentID:       "test-agent",
		DefaultUserID: "test-user",
	})

	ctx := context.Background()

	// 记录原始会话ID
	originalSessionID := manager.GetSessionID()

	// 存储一条记忆
	_, err := manager.StoreMemory(ctx, "Memory in first session", ConversationMemory, MediumImportance)
	assert.NoError(t, err)

	// 开始新会话
	manager.StartNewSession()
	newSessionID := manager.GetSessionID()

	// 验证会话ID已改变
	assert.NotEqual(t, originalSessionID, newSessionID)

	// 在新会话中存储记忆
	_, err = manager.StoreMemory(ctx, "Memory in second session", ConversationMemory, MediumImportance)
	assert.NoError(t, err)

	// 查询所有会话记忆
	options := DefaultQueryOptions()
	options.Types = []MemoryType{ConversationMemory}
	allMemories, err := manager.RecallMemories(ctx, options)
	assert.NoError(t, err)
	assert.Len(t, allMemories, 2)

	// 查询特定会话记忆
	var firstSessionCount, secondSessionCount int
	for _, m := range allMemories {
		if m.SessionID == originalSessionID {
			firstSessionCount++
			assert.Equal(t, "Memory in first session", m.Content)
		} else if m.SessionID == newSessionID {
			secondSessionCount++
			assert.Equal(t, "Memory in second session", m.Content)
		}
	}

	assert.Equal(t, 1, firstSessionCount, "应有一条第一会话记忆")
	assert.Equal(t, 1, secondSessionCount, "应有一条第二会话记忆")
}

func TestMemoryManager_UserSwitch(t *testing.T) {
	// 设置测试存储
	store := setupTestMemoryStore(t)

	// 创建内存管理器
	manager := NewMemoryManager(store, MemoryManagerConfig{
		AgentID:       "test-agent",
		DefaultUserID: "user1",
	})

	ctx := context.Background()

	// 为用户1存储记忆
	_, err := manager.StoreMemory(ctx, "User1's memory", ConversationMemory, MediumImportance)
	assert.NoError(t, err)

	// 切换到用户2
	manager.SetCurrentUser("user2")

	// 为用户2存储记忆
	_, err = manager.StoreMemory(ctx, "User2's memory", ConversationMemory, MediumImportance)
	assert.NoError(t, err)

	// 验证用户1的记忆
	manager.SetCurrentUser("user1")
	user1Memories, err := manager.RecallByType(ctx, ConversationMemory, 10)
	assert.NoError(t, err)
	assert.Len(t, user1Memories, 1)
	assert.Equal(t, "User1's memory", user1Memories[0].Content)

	// 验证用户2的记忆
	manager.SetCurrentUser("user2")
	user2Memories, err := manager.RecallByType(ctx, ConversationMemory, 10)
	assert.NoError(t, err)
	assert.Len(t, user2Memories, 1)
	assert.Equal(t, "User2's memory", user2Memories[0].Content)
}

func TestMemoryManager_Forget(t *testing.T) {
	// 设置测试存储
	store := setupTestMemoryStore(t)

	// 创建内存管理器
	manager := NewMemoryManager(store, MemoryManagerConfig{
		AgentID:       "test-agent",
		DefaultUserID: "test-user",
	})

	ctx := context.Background()

	// 存储几条记忆
	id1, err := manager.StoreMemory(ctx, "Memory 1", ConversationMemory, MediumImportance)
	assert.NoError(t, err)

	_, err = manager.StoreMemory(ctx, "Memory 2", ConversationMemory, MediumImportance)
	assert.NoError(t, err)

	// 验证有两条记忆
	memories, err := manager.RecallByType(ctx, ConversationMemory, 10)
	assert.NoError(t, err)
	assert.Len(t, memories, 2)

	// 遗忘一条记忆
	err = manager.ForgetMemory(ctx, id1)
	assert.NoError(t, err)

	// 验证只剩一条记忆
	memories, err = manager.RecallByType(ctx, ConversationMemory, 10)
	assert.NoError(t, err)
	assert.Len(t, memories, 1)
	assert.Equal(t, "Memory 2", memories[0].Content)

	// 遗忘所有记忆
	err = manager.ForgetAllUserMemories(ctx)
	assert.NoError(t, err)

	// 验证没有记忆
	memories, err = manager.RecallByType(ctx, ConversationMemory, 10)
	assert.NoError(t, err)
	assert.Len(t, memories, 0)
}
