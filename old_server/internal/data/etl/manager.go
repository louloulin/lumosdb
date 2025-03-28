package etl

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// Manager 实现PipelineManager接口，管理ETL管道
type Manager struct {
	logger      *zap.Logger
	engine      *Engine
	pipelines   map[string]*Pipeline
	pipelinesMu sync.RWMutex
}

// NewManager 创建新的管道管理器
func NewManager(logger *zap.Logger, workers int) *Manager {
	engine := NewEngine(logger, workers)

	return &Manager{
		logger:    logger,
		engine:    engine,
		pipelines: make(map[string]*Pipeline),
	}
}

// CreatePipeline 创建新的ETL管道
func (m *Manager) CreatePipeline(ctx context.Context, name string, desc string, source DataSource, transforms []TransformFunc, sink DataSink, options PipelineOptions) (*Pipeline, error) {
	if name == "" {
		return nil, fmt.Errorf("pipeline name cannot be empty")
	}

	if source == nil || sink == nil {
		return nil, fmt.Errorf("source and sink cannot be nil")
	}

	// 生成唯一ID
	id := uuid.New().String()

	// 创建管道
	pipeline := &Pipeline{
		ID:          id,
		Name:        name,
		Description: desc,
		Source:      source,
		Transforms:  transforms,
		Sink:        sink,
		BatchSize:   options.BatchSize,
		Timeout:     options.Timeout,
		Metadata:    options.Metadata,
	}

	// 保存管道
	m.pipelinesMu.Lock()
	m.pipelines[id] = pipeline
	m.pipelinesMu.Unlock()

	m.logger.Info("Pipeline created",
		zap.String("pipeline_id", id),
		zap.String("name", name),
		zap.String("source", source.Name()),
		zap.String("sink", sink.Name()))

	return pipeline, nil
}

// GetPipeline 获取管道信息
func (m *Manager) GetPipeline(ctx context.Context, id string) (*Pipeline, error) {
	m.pipelinesMu.RLock()
	pipeline, exists := m.pipelines[id]
	m.pipelinesMu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("pipeline not found: %s", id)
	}

	return pipeline, nil
}

// ListPipelines 列出所有管道
func (m *Manager) ListPipelines(ctx context.Context) ([]*Pipeline, error) {
	m.pipelinesMu.RLock()
	defer m.pipelinesMu.RUnlock()

	pipelines := make([]*Pipeline, 0, len(m.pipelines))
	for _, pipeline := range m.pipelines {
		pipelines = append(pipelines, pipeline)
	}

	return pipelines, nil
}

// UpdatePipeline 更新管道配置
func (m *Manager) UpdatePipeline(ctx context.Context, pipeline *Pipeline) error {
	if pipeline == nil || pipeline.ID == "" {
		return fmt.Errorf("invalid pipeline or pipeline ID")
	}

	m.pipelinesMu.Lock()
	defer m.pipelinesMu.Unlock()

	_, exists := m.pipelines[pipeline.ID]
	if !exists {
		return fmt.Errorf("pipeline not found: %s", pipeline.ID)
	}

	m.pipelines[pipeline.ID] = pipeline

	m.logger.Info("Pipeline updated",
		zap.String("pipeline_id", pipeline.ID),
		zap.String("name", pipeline.Name))

	return nil
}

// DeletePipeline 删除管道
func (m *Manager) DeletePipeline(ctx context.Context, id string) error {
	m.pipelinesMu.Lock()
	defer m.pipelinesMu.Unlock()

	_, exists := m.pipelines[id]
	if !exists {
		return fmt.Errorf("pipeline not found: %s", id)
	}

	delete(m.pipelines, id)

	m.logger.Info("Pipeline deleted", zap.String("pipeline_id", id))

	return nil
}

// ExecutePipeline 执行管道
func (m *Manager) ExecutePipeline(ctx context.Context, id string, params map[string]interface{}) (string, error) {
	// 获取管道
	pipeline, err := m.GetPipeline(ctx, id)
	if err != nil {
		return "", err
	}

	// 执行管道
	executionID, err := m.engine.ExecutePipeline(ctx, pipeline, params)
	if err != nil {
		return "", err
	}

	return executionID, nil
}

// GetExecution 获取执行信息
func (m *Manager) GetExecution(ctx context.Context, executionID string) (*PipelineExecution, error) {
	return m.engine.GetExecution(executionID)
}

// CancelExecution 取消正在执行的管道
func (m *Manager) CancelExecution(ctx context.Context, executionID string) error {
	return m.engine.CancelExecution(executionID)
}

// GetExecutionStats 获取执行统计
func (m *Manager) GetExecutionStats(ctx context.Context, executionID string) (*PipelineStats, error) {
	execution, err := m.engine.GetExecution(executionID)
	if err != nil {
		return nil, err
	}

	return &execution.Stats, nil
}

// CleanupExecutions 清理旧的执行记录
func (m *Manager) CleanupExecutions(maxAge time.Duration) int {
	return m.engine.CleanupExecutions(maxAge)
}

// StartCleanupScheduler 启动定期清理调度器
func (m *Manager) StartCleanupScheduler(interval, maxAge time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			count := m.CleanupExecutions(maxAge)
			if count > 0 {
				m.logger.Info("Cleaned up old executions", zap.Int("count", count))
			}
		}
	}()
}
