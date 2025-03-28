package rest

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/lumos-db/server/internal/ai/memory"
)

// MemoryRequest 表示存储记忆的请求
type MemoryRequest struct {
	Content    string                 `json:"content"`
	Type       memory.MemoryType      `json:"type"`
	Importance memory.Importance      `json:"importance,omitempty"`
	Metadata   map[string]interface{} `json:"metadata,omitempty"`
	TTL        *int64                 `json:"ttl,omitempty"` // 单位秒
}

// MemoryResponse 表示记忆响应
type MemoryResponse struct {
	ID          string                 `json:"id"`
	Content     string                 `json:"content"`
	Type        memory.MemoryType      `json:"type"`
	Importance  memory.Importance      `json:"importance"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	CreatedAt   time.Time              `json:"created_at"`
	AccessCount int                    `json:"access_count"`
}

// memoriesFromEntries 将MemoryEntry转换为MemoryResponse
func memoriesFromEntries(entries []memory.MemoryEntry) []MemoryResponse {
	result := make([]MemoryResponse, len(entries))
	for i, entry := range entries {
		result[i] = MemoryResponse{
			ID:          string(entry.ID),
			Content:     entry.Content,
			Type:        entry.Type,
			Importance:  entry.Importance,
			Metadata:    entry.Metadata,
			CreatedAt:   entry.CreatedAt,
			AccessCount: entry.AccessCount,
		}
	}
	return result
}

// RegisterMemoryHandlers 注册所有与记忆相关的处理程序
func (s *Server) RegisterMemoryHandlers(r *mux.Router) {
	if s.memoryManager == nil {
		s.Logger.Warn("Memory manager not initialized, skipping memory handlers")
		return
	}

	memoryRouter := r.PathPrefix("/api/memory").Subrouter()

	// 存储记忆
	memoryRouter.HandleFunc("", s.storeMemory).Methods("POST")

	// 检索记忆
	memoryRouter.HandleFunc("", s.queryMemories).Methods("GET")

	// 检索会话历史
	memoryRouter.HandleFunc("/conversation", s.getConversationHistory).Methods("GET")

	// 检索相似记忆
	memoryRouter.HandleFunc("/similar", s.getSimilarMemories).Methods("GET")

	// 更新记忆重要性
	memoryRouter.HandleFunc("/{id}/importance", s.updateImportance).Methods("PUT")

	// 删除记忆
	memoryRouter.HandleFunc("/{id}", s.deleteMemory).Methods("DELETE")

	// 删除用户所有记忆
	memoryRouter.HandleFunc("/user", s.deleteAllUserMemories).Methods("DELETE")

	// 开始新会话
	memoryRouter.HandleFunc("/session", s.startNewSession).Methods("POST")
}

// 存储记忆
func (s *Server) storeMemory(w http.ResponseWriter, r *http.Request) {
	var req MemoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// 获取用户ID，如果没有则使用默认用户
	userID := r.Header.Get("X-User-ID")
	if userID != "" {
		s.memoryManager.SetCurrentUser(userID)
	}

	var ttl time.Duration
	if req.TTL != nil {
		ttl = time.Duration(*req.TTL) * time.Second
	}

	ctx := r.Context()
	var id memory.MemoryID
	var err error

	// 根据记忆类型选择合适的存储方法
	switch req.Type {
	case memory.ConversationMemory:
		role, _ := req.Metadata["role"].(string)
		id, err = s.memoryManager.StoreConversationMemory(ctx, req.Content, role)
	case memory.FactMemory:
		id, err = s.memoryManager.StoreFactMemory(ctx, req.Content)
	case memory.PreferenceMemory:
		id, err = s.memoryManager.StorePreferenceMemory(ctx, req.Content)
	default:
		// 使用通用方法存储
		if req.Importance == 0 {
			req.Importance = memory.MediumImportance
		}
		id, err = s.memoryManager.StoreMemory(ctx, req.Content, req.Type, req.Importance)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": string(id)})
}

// 查询记忆
func (s *Server) queryMemories(w http.ResponseWriter, r *http.Request) {
	// 获取用户ID
	userID := r.Header.Get("X-User-ID")
	if userID != "" {
		s.memoryManager.SetCurrentUser(userID)
	}

	// 解析查询参数
	query := r.URL.Query()

	// 创建查询选项
	options := memory.DefaultQueryOptions()

	// 解析限制
	if limitStr := query.Get("limit"); limitStr != "" {
		if limit, err := strconv.Atoi(limitStr); err == nil && limit > 0 {
			options.Limit = limit
		}
	}

	// 解析记忆类型
	if typeStr := query.Get("type"); typeStr != "" {
		options.Types = []memory.MemoryType{memory.MemoryType(typeStr)}
	}

	// 解析最小重要性
	if impStr := query.Get("min_importance"); impStr != "" {
		if imp, err := strconv.Atoi(impStr); err == nil {
			options.MinImportance = memory.Importance(imp)
		}
	}

	// 是否包含过期记忆
	if expiredStr := query.Get("include_expired"); expiredStr == "true" {
		options.IncludeExpired = true
	}

	ctx := r.Context()
	memories, err := s.memoryManager.RecallMemories(ctx, options)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := memoriesFromEntries(memories)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// 获取会话历史
func (s *Server) getConversationHistory(w http.ResponseWriter, r *http.Request) {
	// 获取用户ID
	userID := r.Header.Get("X-User-ID")
	if userID != "" {
		s.memoryManager.SetCurrentUser(userID)
	}

	// 解析限制
	limit := 50
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	ctx := r.Context()
	memories, err := s.memoryManager.RecallConversationHistory(ctx, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := memoriesFromEntries(memories)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// 获取相似记忆
func (s *Server) getSimilarMemories(w http.ResponseWriter, r *http.Request) {
	// 获取用户ID
	userID := r.Header.Get("X-User-ID")
	if userID != "" {
		s.memoryManager.SetCurrentUser(userID)
	}

	// 获取查询内容
	query := r.URL.Query().Get("query")
	if query == "" {
		http.Error(w, "missing query parameter", http.StatusBadRequest)
		return
	}

	// 解析限制
	limit := 10
	if limitStr := r.URL.Query().Get("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	ctx := r.Context()
	memories, err := s.memoryManager.RecallRecentSimilar(ctx, query, limit)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	response := memoriesFromEntries(memories)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// 更新记忆重要性
func (s *Server) updateImportance(w http.ResponseWriter, r *http.Request) {
	// 获取记忆ID
	vars := mux.Vars(r)
	id := memory.MemoryID(vars["id"])

	// 解析请求体
	var req struct {
		Importance memory.Importance `json:"importance"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	var err error

	// 根据重要性级别选择合适的方法
	switch req.Importance {
	case memory.CriticalImportance:
		err = s.memoryManager.MarkCritical(ctx, id)
	case memory.HighImportance:
		err = s.memoryManager.MarkImportant(ctx, id)
	default:
		// 更新为其他级别
		store := s.memoryManager.GetStore()
		entry, err := store.GetByID(ctx, id)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		entry.Importance = req.Importance
		err = store.UpdateImportance(ctx, id, req.Importance)
	}

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// 删除记忆
func (s *Server) deleteMemory(w http.ResponseWriter, r *http.Request) {
	// 获取记忆ID
	vars := mux.Vars(r)
	id := memory.MemoryID(vars["id"])

	ctx := r.Context()
	if err := s.memoryManager.ForgetMemory(ctx, id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// 删除用户所有记忆
func (s *Server) deleteAllUserMemories(w http.ResponseWriter, r *http.Request) {
	// 获取用户ID
	userID := r.Header.Get("X-User-ID")
	if userID != "" {
		s.memoryManager.SetCurrentUser(userID)
	}

	ctx := r.Context()
	if err := s.memoryManager.ForgetAllUserMemories(ctx); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// 开始新会话
func (s *Server) startNewSession(w http.ResponseWriter, r *http.Request) {
	// 获取用户ID
	userID := r.Header.Get("X-User-ID")
	if userID != "" {
		s.memoryManager.SetCurrentUser(userID)
	}

	s.memoryManager.StartNewSession()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"session_id": s.memoryManager.GetSessionID(),
	})
}
