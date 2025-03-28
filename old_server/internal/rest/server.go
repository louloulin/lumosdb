package rest

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/lumos-db/server/internal/ai/llm"
	"github.com/lumos-db/server/internal/ai/memory"
	"github.com/lumos-db/server/internal/config"
	"github.com/lumos-db/server/internal/storage"
	"go.uber.org/zap"
)

// Server 代表REST API服务器
type Server struct {
	cfg           *config.ServerConfig
	store         storage.Storage
	router        *mux.Router
	httpServer    *http.Server
	Logger        *zap.Logger
	llmService    *llm.LLMService
	memoryManager *memory.MemoryManager
}

// NewServer 创建一个新的REST API服务器
func NewServer(cfg *config.ServerConfig, store storage.Storage, logger *zap.Logger) *Server {
	router := mux.NewRouter()

	// 创建LLM服务
	var llmService *llm.LLMService
	if cfg.LLM != nil {
		llmService = llm.NewLLMService(*cfg.LLM)
	}

	// 创建服务器
	server := &Server{
		cfg:        cfg,
		store:      store,
		router:     router,
		Logger:     logger,
		llmService: llmService,
	}

	return server
}

// createMemoryManager 创建并初始化记忆管理器
func (s *Server) createMemoryManager() error {
	if s.cfg.Memory == nil {
		s.Logger.Info("记忆管理器配置未设置，跳过初始化")
		return nil
	}

	// 创建SQLite存储
	store, err := memory.NewSQLiteStore(s.cfg.Memory.DBPath)
	if err != nil {
		return fmt.Errorf("创建记忆存储失败: %w", err)
	}

	// 创建记忆管理器
	s.memoryManager = memory.NewMemoryManager(store, memory.MemoryManagerConfig{
		AgentID:       s.cfg.Memory.AgentID,
		DefaultUserID: s.cfg.Memory.DefaultUserID,
		DefaultTTL:    time.Duration(s.cfg.Memory.DefaultTTLHours) * time.Hour,
		PruneEnabled:  s.cfg.Memory.PruneEnabled,
	})

	s.Logger.Info("记忆管理器初始化成功")
	return nil
}

// GetMemoryManager 返回记忆管理器实例
func (s *Server) GetMemoryManager() *memory.MemoryManager {
	return s.memoryManager
}

// Start 启动服务器
func (s *Server) Start() error {
	// 设置路由
	s.setupRoutes()

	// 初始化记忆管理器
	if err := s.createMemoryManager(); err != nil {
		return fmt.Errorf("初始化记忆管理器失败: %w", err)
	}

	// 注册记忆处理程序
	s.RegisterMemoryHandlers(s.router)

	// 启动HTTP服务器
	addr := fmt.Sprintf("%s:%d", s.cfg.Host, s.cfg.Port)
	s.httpServer = &http.Server{
		Addr:    addr,
		Handler: s.router,
	}

	s.Logger.Info("服务器启动", zap.String("地址", addr))

	return s.httpServer.ListenAndServe()
}

// setupRoutes 设置服务器路由
func (s *Server) setupRoutes() {
	// 注册API路由
	apiRouter := s.router.PathPrefix("/api").Subrouter()

	// 注册健康检查
	s.router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}).Methods("GET")

	// 注册NL到SQL转换API
	if s.llmService != nil {
		apiRouter.HandleFunc("/nl2sql", s.nl2sqlHandler).Methods("POST")
	}

	// 其他路由可以在这里添加
}

// nl2sqlHandler 处理自然语言到SQL的转换请求
func (s *Server) nl2sqlHandler(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Query     string `json:"query"`
		TableInfo string `json:"table_info,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if req.Query == "" {
		http.Error(w, "query is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	sql, err := s.llmService.GenerateSQLFromNaturalLanguage(ctx, req.Query, req.TableInfo)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"sql": sql,
	})
}
