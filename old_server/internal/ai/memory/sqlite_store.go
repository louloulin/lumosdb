package memory

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	_ "github.com/mattn/go-sqlite3"
)

// SQLiteStore 实现基于SQLite的记忆存储
type SQLiteStore struct {
	db *sql.DB
}

// NewSQLiteStore 创建一个新的SQLite记忆存储
func NewSQLiteStore(dbPath string) (*SQLiteStore, error) {
	db, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	store := &SQLiteStore{db: db}
	if err := store.initialize(); err != nil {
		db.Close()
		return nil, err
	}

	return store, nil
}

// initialize 初始化数据库表结构
func (s *SQLiteStore) initialize() error {
	// 创建记忆表
	_, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS memories (
			id TEXT PRIMARY KEY,
			agent_id TEXT NOT NULL,
			user_id TEXT,
			session_id TEXT,
			type TEXT NOT NULL,
			content TEXT NOT NULL,
			metadata TEXT,
			embedding BLOB,
			created_at TIMESTAMP NOT NULL,
			last_accessed_at TIMESTAMP,
			access_count INTEGER DEFAULT 0,
			importance INTEGER NOT NULL,
			expires_at TIMESTAMP
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to create memories table: %w", err)
	}

	// 创建索引
	queries := []string{
		`CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories (agent_id)`,
		`CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories (user_id)`,
		`CREATE INDEX IF NOT EXISTS idx_memories_type ON memories (type)`,
		`CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories (created_at)`,
		`CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories (importance)`,
		`CREATE INDEX IF NOT EXISTS idx_memories_expires_at ON memories (expires_at)`,
	}

	for _, query := range queries {
		if _, err := s.db.Exec(query); err != nil {
			return fmt.Errorf("failed to create index: %w", err)
		}
	}

	return nil
}

// Close 关闭数据库连接
func (s *SQLiteStore) Close() error {
	return s.db.Close()
}

// Store 存储一条记忆
func (s *SQLiteStore) Store(ctx context.Context, memory MemoryEntry) (MemoryID, error) {
	if memory.ID == "" {
		memory.ID = MemoryID(uuid.New().String())
	}

	if memory.CreatedAt.IsZero() {
		memory.CreatedAt = time.Now()
	}

	// 序列化元数据
	var metadataBytes []byte
	var err error
	if memory.Metadata != nil {
		metadataBytes, err = json.Marshal(memory.Metadata)
		if err != nil {
			return "", fmt.Errorf("failed to marshal metadata: %w", err)
		}
	}

	// 执行插入
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO memories (
			id, agent_id, user_id, session_id, type, content, metadata, embedding,
			created_at, last_accessed_at, access_count, importance, expires_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`,
		string(memory.ID),
		memory.AgentID,
		memory.UserID,
		memory.SessionID,
		string(memory.Type),
		memory.Content,
		metadataBytes,
		serializeEmbedding(memory.Embedding),
		memory.CreatedAt,
		memory.LastAccessedAt,
		memory.AccessCount,
		int(memory.Importance),
		memory.ExpiresAt,
	)

	if err != nil {
		return "", fmt.Errorf("failed to store memory: %w", err)
	}

	return memory.ID, nil
}

// BatchStore 批量存储多条记忆
func (s *SQLiteStore) BatchStore(ctx context.Context, memories []MemoryEntry) ([]MemoryID, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to begin transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO memories (
			id, agent_id, user_id, session_id, type, content, metadata, embedding,
			created_at, last_accessed_at, access_count, importance, expires_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		return nil, fmt.Errorf("failed to prepare statement: %w", err)
	}
	defer stmt.Close()

	ids := make([]MemoryID, len(memories))
	now := time.Now()

	for i, memory := range memories {
		if memory.ID == "" {
			memory.ID = MemoryID(uuid.New().String())
		}
		ids[i] = memory.ID

		if memory.CreatedAt.IsZero() {
			memory.CreatedAt = now
		}

		// 序列化元数据
		var metadataBytes []byte
		if memory.Metadata != nil {
			metadataBytes, err = json.Marshal(memory.Metadata)
			if err != nil {
				return nil, fmt.Errorf("failed to marshal metadata: %w", err)
			}
		}

		_, err = stmt.ExecContext(ctx,
			string(memory.ID),
			memory.AgentID,
			memory.UserID,
			memory.SessionID,
			string(memory.Type),
			memory.Content,
			metadataBytes,
			serializeEmbedding(memory.Embedding),
			memory.CreatedAt,
			memory.LastAccessedAt,
			memory.AccessCount,
			int(memory.Importance),
			memory.ExpiresAt,
		)

		if err != nil {
			return nil, fmt.Errorf("failed to store memory at index %d: %w", i, err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("failed to commit transaction: %w", err)
	}

	return ids, nil
}

// GetByID 根据ID获取记忆
func (s *SQLiteStore) GetByID(ctx context.Context, id MemoryID) (*MemoryEntry, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT 
			id, agent_id, user_id, session_id, type, content, metadata, embedding,
			created_at, last_accessed_at, access_count, importance, expires_at
		FROM memories
		WHERE id = ?
	`, string(id))

	memory, err := scanMemory(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // 未找到记录
		}
		return nil, fmt.Errorf("failed to get memory: %w", err)
	}

	// 更新访问时间和计数
	if err := s.UpdateAccessTime(ctx, id); err != nil {
		return nil, fmt.Errorf("failed to update access time: %w", err)
	}

	return memory, nil
}

// Query 按条件查询记忆
func (s *SQLiteStore) Query(ctx context.Context, agentID string, userID string, options QueryOptions) ([]MemoryEntry, error) {
	var conditions []string
	var args []interface{}

	// 添加基本条件
	conditions = append(conditions, "agent_id = ?")
	args = append(args, agentID)

	if userID != "" {
		conditions = append(conditions, "user_id = ?")
		args = append(args, userID)
	}

	// 添加过期条件
	if !options.IncludeExpired {
		conditions = append(conditions, "(expires_at IS NULL OR expires_at > ?)")
		args = append(args, time.Now())
	}

	// 添加重要性条件
	if options.MinImportance > 0 {
		conditions = append(conditions, "importance >= ?")
		args = append(args, int(options.MinImportance))
	}

	// 添加类型条件
	if len(options.Types) > 0 {
		placeholders := make([]string, len(options.Types))
		for i, t := range options.Types {
			placeholders[i] = "?"
			args = append(args, string(t))
		}
		conditions = append(conditions, fmt.Sprintf("type IN (%s)", strings.Join(placeholders, ",")))
	}

	// 添加时间范围条件
	if options.StartTime != nil {
		conditions = append(conditions, "created_at >= ?")
		args = append(args, options.StartTime)
	}
	if options.EndTime != nil {
		conditions = append(conditions, "created_at <= ?")
		args = append(args, options.EndTime)
	}

	// 构建完整查询
	query := fmt.Sprintf(`
		SELECT 
			id, agent_id, user_id, session_id, type, content, metadata, embedding,
			created_at, last_accessed_at, access_count, importance, expires_at
		FROM memories
		WHERE %s
		ORDER BY importance DESC, created_at DESC
		LIMIT ?
	`, strings.Join(conditions, " AND "))

	// 添加限制参数
	args = append(args, options.Limit)

	// 执行查询
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to query memories: %w", err)
	}
	defer rows.Close()

	// 读取结果
	var memories []MemoryEntry
	for rows.Next() {
		memory, err := scanMemory(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan memory: %w", err)
		}
		memories = append(memories, *memory)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating memory rows: %w", err)
	}

	return memories, nil
}

// SearchSimilar 搜索语义相似的记忆
// 注意：此实现是基础版本，不包含真正的向量相似度搜索
// 在实际生产环境中，应该使用专门的向量搜索引擎或插件
func (s *SQLiteStore) SearchSimilar(ctx context.Context, agentID string, content string, options QueryOptions) ([]MemoryEntry, error) {
	// 简化实现，基于关键词匹配
	// 注意: 这不是真正的语义相似度搜索，只是关键词匹配的示例

	var conditions []string
	var args []interface{}

	// 添加基本条件
	conditions = append(conditions, "agent_id = ?")
	args = append(args, agentID)

	// 添加内容匹配条件
	conditions = append(conditions, "content LIKE ?")
	args = append(args, "%"+content+"%")

	// 添加过期条件
	if !options.IncludeExpired {
		conditions = append(conditions, "(expires_at IS NULL OR expires_at > ?)")
		args = append(args, time.Now())
	}

	// 添加重要性条件
	if options.MinImportance > 0 {
		conditions = append(conditions, "importance >= ?")
		args = append(args, int(options.MinImportance))
	}

	// 添加类型条件
	if len(options.Types) > 0 {
		placeholders := make([]string, len(options.Types))
		for i, t := range options.Types {
			placeholders[i] = "?"
			args = append(args, string(t))
		}
		conditions = append(conditions, fmt.Sprintf("type IN (%s)", strings.Join(placeholders, ",")))
	}

	// 构建完整查询
	query := fmt.Sprintf(`
		SELECT 
			id, agent_id, user_id, session_id, type, content, metadata, embedding,
			created_at, last_accessed_at, access_count, importance, expires_at
		FROM memories
		WHERE %s
		ORDER BY importance DESC, created_at DESC
		LIMIT ?
	`, strings.Join(conditions, " AND "))

	// 添加限制参数
	args = append(args, options.Limit)

	// 执行查询
	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to search similar memories: %w", err)
	}
	defer rows.Close()

	// 读取结果
	var memories []MemoryEntry
	for rows.Next() {
		memory, err := scanMemory(rows)
		if err != nil {
			return nil, fmt.Errorf("failed to scan memory: %w", err)
		}
		memories = append(memories, *memory)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating memory rows: %w", err)
	}

	return memories, nil
}

// UpdateAccessTime 更新记忆的访问时间和计数
func (s *SQLiteStore) UpdateAccessTime(ctx context.Context, id MemoryID) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE memories
		SET last_accessed_at = ?, access_count = access_count + 1
		WHERE id = ?
	`, time.Now(), string(id))

	if err != nil {
		return fmt.Errorf("failed to update access time: %w", err)
	}

	return nil
}

// UpdateImportance 更新记忆的重要性
func (s *SQLiteStore) UpdateImportance(ctx context.Context, id MemoryID, importance Importance) error {
	_, err := s.db.ExecContext(ctx, `
		UPDATE memories
		SET importance = ?
		WHERE id = ?
	`, int(importance), string(id))

	if err != nil {
		return fmt.Errorf("failed to update importance: %w", err)
	}

	return nil
}

// Delete 删除一条记忆
func (s *SQLiteStore) Delete(ctx context.Context, id MemoryID) error {
	_, err := s.db.ExecContext(ctx, `
		DELETE FROM memories
		WHERE id = ?
	`, string(id))

	if err != nil {
		return fmt.Errorf("failed to delete memory: %w", err)
	}

	return nil
}

// DeleteByAgentAndUser 删除特定Agent和用户的记忆
func (s *SQLiteStore) DeleteByAgentAndUser(ctx context.Context, agentID string, userID string) error {
	var query string
	var args []interface{}

	if userID == "" {
		query = `
			DELETE FROM memories
			WHERE agent_id = ?
		`
		args = []interface{}{agentID}
	} else {
		query = `
			DELETE FROM memories
			WHERE agent_id = ? AND user_id = ?
		`
		args = []interface{}{agentID, userID}
	}

	_, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("failed to delete memories: %w", err)
	}

	return nil
}

// Prune 清理过期记忆
func (s *SQLiteStore) Prune(ctx context.Context) (int, error) {
	result, err := s.db.ExecContext(ctx, `
		DELETE FROM memories
		WHERE expires_at IS NOT NULL AND expires_at < ?
	`, time.Now())

	if err != nil {
		return 0, fmt.Errorf("failed to prune memories: %w", err)
	}

	count, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get affected rows: %w", err)
	}

	return int(count), nil
}

// Helper functions

// scanMemory 从数据库行扫描记忆
func scanMemory(scanner interface{}) (*MemoryEntry, error) {
	var (
		id             string
		agentID        string
		userID         sql.NullString
		sessionID      sql.NullString
		typeStr        string
		content        string
		metadataBytes  []byte
		embeddingBytes []byte
		createdAt      time.Time
		lastAccessedAt sql.NullTime
		accessCount    int
		importance     int
		expiresAt      sql.NullTime
	)

	var err error
	switch s := scanner.(type) {
	case *sql.Row:
		err = s.Scan(
			&id, &agentID, &userID, &sessionID, &typeStr, &content, &metadataBytes, &embeddingBytes,
			&createdAt, &lastAccessedAt, &accessCount, &importance, &expiresAt,
		)
	case *sql.Rows:
		err = s.Scan(
			&id, &agentID, &userID, &sessionID, &typeStr, &content, &metadataBytes, &embeddingBytes,
			&createdAt, &lastAccessedAt, &accessCount, &importance, &expiresAt,
		)
	default:
		return nil, errors.New("unsupported scanner type")
	}

	if err != nil {
		return nil, err
	}

	memory := &MemoryEntry{
		ID:          MemoryID(id),
		AgentID:     agentID,
		Type:        MemoryType(typeStr),
		Content:     content,
		CreatedAt:   createdAt,
		AccessCount: accessCount,
		Importance:  Importance(importance),
	}

	if userID.Valid {
		memory.UserID = userID.String
	}

	if sessionID.Valid {
		memory.SessionID = sessionID.String
	}

	if lastAccessedAt.Valid {
		memory.LastAccessedAt = lastAccessedAt.Time
	}

	if expiresAt.Valid {
		memory.ExpiresAt = &expiresAt.Time
	}

	if len(metadataBytes) > 0 {
		var metadata map[string]interface{}
		if err := json.Unmarshal(metadataBytes, &metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
		memory.Metadata = metadata
	}

	if len(embeddingBytes) > 0 {
		memory.Embedding = deserializeEmbedding(embeddingBytes)
	}

	return memory, nil
}

// serializeEmbedding 序列化向量嵌入
func serializeEmbedding(embedding []float32) []byte {
	if len(embedding) == 0 {
		return nil
	}

	data, _ := json.Marshal(embedding)
	return data
}

// deserializeEmbedding 反序列化向量嵌入
func deserializeEmbedding(data []byte) []float32 {
	if len(data) == 0 {
		return nil
	}

	var embedding []float32
	_ = json.Unmarshal(data, &embedding)
	return embedding
}
