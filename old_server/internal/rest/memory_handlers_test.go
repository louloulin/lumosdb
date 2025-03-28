package rest

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/gorilla/mux"
	"github.com/lumos-db/server/internal/ai/memory"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/zap"
)

// 测试Server结构体，用于简化测试
type testServer struct {
	*Server
	store *memory.SQLiteStore
}

// 设置测试服务器
func setupTestServer(t *testing.T) *testServer {
	// 创建临时数据库文件
	tempFile, err := os.CreateTemp("", "memory_api_test_*.db")
	require.NoError(t, err)
	tempFile.Close()

	// 创建存储和记忆管理器
	store, err := memory.NewSQLiteStore(tempFile.Name())
	require.NoError(t, err)

	// 创建Logger
	logger, _ := zap.NewDevelopment()

	// 创建服务器
	server := &Server{
		router: mux.NewRouter(),
		Logger: logger,
	}

	// 创建记忆管理器
	memoryManager := memory.NewMemoryManager(store, memory.MemoryManagerConfig{
		AgentID:       "test-agent",
		DefaultUserID: "test-user",
		DefaultTTL:    time.Hour * 24,
	})

	server.memoryManager = memoryManager

	// 注册API处理程序
	server.RegisterMemoryHandlers(server.router)

	// 设置清理函数
	t.Cleanup(func() {
		store.Close()
		os.Remove(tempFile.Name())
	})

	return &testServer{
		Server: server,
		store:  store,
	}
}

// 测试存储记忆API
func TestStoreMemoryAPI(t *testing.T) {
	s := setupTestServer(t)

	// 准备请求
	req := MemoryRequest{
		Content:    "This is a test memory",
		Type:       memory.ConversationMemory,
		Importance: memory.MediumImportance,
		Metadata: map[string]interface{}{
			"role": "user",
		},
	}

	body, err := json.Marshal(req)
	require.NoError(t, err)

	// 创建HTTP请求
	httpReq, err := http.NewRequest("POST", "/api/memory", bytes.NewBuffer(body))
	require.NoError(t, err)
	httpReq.Header.Set("Content-Type", "application/json")

	// 执行请求
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, httpReq)

	// 检查响应
	assert.Equal(t, http.StatusCreated, w.Code)

	var response map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// 验证ID已返回
	assert.NotEmpty(t, response["id"])

	// 验证记忆已存储
	ctx := context.Background()
	memories, err := s.memoryManager.RecallByType(ctx, memory.ConversationMemory, 10)
	assert.NoError(t, err)
	assert.Len(t, memories, 1)
	assert.Equal(t, "This is a test memory", memories[0].Content)
}

// 测试查询记忆API
func TestQueryMemoriesAPI(t *testing.T) {
	s := setupTestServer(t)

	// 存储一些记忆
	ctx := context.Background()
	_, err := s.memoryManager.StoreMemory(ctx, "Memory 1", memory.ConversationMemory, memory.MediumImportance)
	require.NoError(t, err)

	_, err = s.memoryManager.StoreMemory(ctx, "Memory 2", memory.FactMemory, memory.HighImportance)
	require.NoError(t, err)

	// 测试查询所有记忆
	httpReq, err := http.NewRequest("GET", "/api/memory", nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)

	var allMemories []MemoryResponse
	err = json.Unmarshal(w.Body.Bytes(), &allMemories)
	require.NoError(t, err)
	assert.Len(t, allMemories, 2)

	// 测试按类型过滤
	httpReq, err = http.NewRequest("GET", "/api/memory?type=conversation", nil)
	require.NoError(t, err)

	w = httptest.NewRecorder()
	s.router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)

	var convMemories []MemoryResponse
	err = json.Unmarshal(w.Body.Bytes(), &convMemories)
	require.NoError(t, err)
	assert.Len(t, convMemories, 1)
	assert.Equal(t, "Memory 1", convMemories[0].Content)
}

// 测试获取会话历史API
func TestGetConversationHistoryAPI(t *testing.T) {
	s := setupTestServer(t)

	// 存储会话记忆
	ctx := context.Background()
	_, err := s.memoryManager.StoreConversationMemory(ctx, "Hello", "user")
	require.NoError(t, err)

	_, err = s.memoryManager.StoreConversationMemory(ctx, "Hi there!", "assistant")
	require.NoError(t, err)

	// 获取会话历史
	httpReq, err := http.NewRequest("GET", "/api/memory/conversation", nil)
	require.NoError(t, err)

	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, httpReq)

	assert.Equal(t, http.StatusOK, w.Code)

	var convHistory []MemoryResponse
	err = json.Unmarshal(w.Body.Bytes(), &convHistory)
	require.NoError(t, err)
	assert.Len(t, convHistory, 2)
}

// 测试更新记忆重要性API
func TestUpdateImportanceAPI(t *testing.T) {
	s := setupTestServer(t)

	// 存储一条记忆
	ctx := context.Background()
	id, err := s.memoryManager.StoreMemory(ctx, "Important fact", memory.FactMemory, memory.MediumImportance)
	require.NoError(t, err)

	// 准备更新请求
	reqBody := map[string]interface{}{
		"importance": memory.CriticalImportance,
	}

	body, err := json.Marshal(reqBody)
	require.NoError(t, err)

	// 创建HTTP请求
	httpReq, err := http.NewRequest("PUT", "/api/memory/"+string(id)+"/importance", bytes.NewBuffer(body))
	require.NoError(t, err)
	httpReq.Header.Set("Content-Type", "application/json")

	// 执行请求
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, httpReq)

	// 检查响应
	assert.Equal(t, http.StatusNoContent, w.Code)

	// 验证更新已生效
	entry, err := s.store.GetByID(ctx, id)
	assert.NoError(t, err)
	assert.Equal(t, memory.CriticalImportance, entry.Importance)
}

// 测试删除记忆API
func TestDeleteMemoryAPI(t *testing.T) {
	s := setupTestServer(t)

	// 存储一条记忆
	ctx := context.Background()
	id, err := s.memoryManager.StoreMemory(ctx, "Memory to delete", memory.ConversationMemory, memory.MediumImportance)
	require.NoError(t, err)

	// 创建HTTP请求
	httpReq, err := http.NewRequest("DELETE", "/api/memory/"+string(id), nil)
	require.NoError(t, err)

	// 执行请求
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, httpReq)

	// 检查响应
	assert.Equal(t, http.StatusNoContent, w.Code)

	// 验证记忆已删除
	memories, err := s.memoryManager.RecallByType(ctx, memory.ConversationMemory, 10)
	assert.NoError(t, err)
	assert.Len(t, memories, 0)
}

// 测试开始新会话API
func TestStartNewSessionAPI(t *testing.T) {
	s := setupTestServer(t)

	// 获取初始会话ID
	initialSessionID := s.memoryManager.GetSessionID()

	// 创建HTTP请求
	httpReq, err := http.NewRequest("POST", "/api/memory/session", nil)
	require.NoError(t, err)

	// 执行请求
	w := httptest.NewRecorder()
	s.router.ServeHTTP(w, httpReq)

	// 检查响应
	assert.Equal(t, http.StatusOK, w.Code)

	var response map[string]string
	err = json.Unmarshal(w.Body.Bytes(), &response)
	require.NoError(t, err)

	// 验证会话ID已更改
	assert.NotEmpty(t, response["session_id"])
	assert.NotEqual(t, initialSessionID, response["session_id"])
}
