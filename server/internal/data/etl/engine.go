package etl

import (
	"context"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"
)

// Engine 实现ETL处理引擎
type Engine struct {
	logger       *zap.Logger
	executions   map[string]*execution
	executionsMu sync.RWMutex
	workers      int
	workerPool   chan struct{}
	defaultOpts  PipelineOptions
}

// 内部执行状态，用于跟踪执行过程
type execution struct {
	pipeline    *Pipeline
	params      map[string]interface{}
	ctx         context.Context
	cancel      context.CancelFunc
	stats       PipelineStats
	logs        []string
	executionID string
	mu          sync.RWMutex
}

// NewEngine 创建新的ETL引擎
func NewEngine(logger *zap.Logger, workers int) *Engine {
	if workers <= 0 {
		workers = 5 // 默认工作线程数
	}

	defaultOpts := DefaultPipelineOptions()

	return &Engine{
		logger:      logger,
		executions:  make(map[string]*execution),
		workers:     workers,
		workerPool:  make(chan struct{}, workers),
		defaultOpts: defaultOpts,
	}
}

// ExecutePipeline 执行ETL管道
func (e *Engine) ExecutePipeline(ctx context.Context, pipeline *Pipeline, params map[string]interface{}) (string, error) {
	if pipeline == nil {
		return "", fmt.Errorf("pipeline cannot be nil")
	}

	if pipeline.Source == nil || pipeline.Sink == nil {
		return "", fmt.Errorf("pipeline must have both source and sink")
	}

	// 创建执行ID
	executionID := uuid.New().String()

	// 创建可取消的上下文
	execCtx, cancel := context.WithTimeout(ctx, pipeline.Timeout)

	// 初始化执行状态
	exec := &execution{
		pipeline:    pipeline,
		params:      params,
		ctx:         execCtx,
		cancel:      cancel,
		executionID: executionID,
		stats: PipelineStats{
			StartTime: time.Now(),
			Status:    StatusPending,
		},
	}

	// 保存执行状态
	e.executionsMu.Lock()
	e.executions[executionID] = exec
	e.executionsMu.Unlock()

	// 启动异步执行
	go e.runPipeline(exec)

	return executionID, nil
}

// runPipeline 异步执行管道
func (e *Engine) runPipeline(exec *execution) {
	// 获取工作线程槽位
	e.workerPool <- struct{}{}
	defer func() {
		<-e.workerPool // 释放工作线程槽位
	}()

	pipeline := exec.pipeline
	ctx := exec.ctx

	// 标记为运行中
	exec.mu.Lock()
	exec.stats.Status = StatusRunning
	exec.mu.Unlock()

	e.logger.Info("Starting pipeline execution",
		zap.String("pipeline_id", pipeline.ID),
		zap.String("execution_id", exec.executionID),
		zap.String("name", pipeline.Name))

	// 打开数据源
	if err := pipeline.Source.Open(ctx); err != nil {
		e.handleExecutionError(exec, fmt.Errorf("failed to open source: %w", err))
		return
	}
	defer pipeline.Source.Close()

	// 打开数据目标
	if err := pipeline.Sink.Open(ctx); err != nil {
		e.handleExecutionError(exec, fmt.Errorf("failed to open sink: %w", err))
		return
	}
	defer pipeline.Sink.Close()

	// 提取数据
	e.logExecution(exec, "Starting data extraction from %s", pipeline.Source.Name())
	dataChan, err := pipeline.Source.Extract(ctx, exec.params)
	if err != nil {
		e.handleExecutionError(exec, fmt.Errorf("failed to extract data: %w", err))
		return
	}

	// 处理批次大小
	batchSize := pipeline.BatchSize
	if batchSize <= 0 {
		batchSize = e.defaultOpts.BatchSize
	}

	batch := make([]interface{}, 0, batchSize)
	recordsRead := int64(0)
	recordsWritten := int64(0)
	recordsFailed := int64(0)

	// 处理数据
	for {
		select {
		case <-ctx.Done():
			// 上下文取消，可能是超时或手动取消
			if ctx.Err() == context.DeadlineExceeded {
				e.logExecution(exec, "Pipeline execution timed out")
				exec.mu.Lock()
				exec.stats.Status = StatusFailed
				exec.stats.Errors = append(exec.stats.Errors, ctx.Err())
				exec.mu.Unlock()
			} else {
				e.logExecution(exec, "Pipeline execution cancelled")
				exec.mu.Lock()
				exec.stats.Status = StatusCancelled
				exec.mu.Unlock()
			}
			return

		case data, ok := <-dataChan:
			if !ok {
				// 通道关闭，提取完成
				// 处理剩余的批次
				if len(batch) > 0 {
					if err := e.processBatch(ctx, exec, batch, &recordsWritten, &recordsFailed); err != nil {
						e.handleExecutionError(exec, err)
						return
					}
				}

				// 更新统计信息并完成执行
				exec.mu.Lock()
				exec.stats.Status = StatusCompleted
				exec.stats.EndTime = time.Now()
				exec.stats.Duration = exec.stats.EndTime.Sub(exec.stats.StartTime)
				exec.stats.RecordsRead = recordsRead
				exec.stats.RecordsWritten = recordsWritten
				exec.stats.RecordsFailed = recordsFailed
				exec.mu.Unlock()

				e.logExecution(exec, "Pipeline execution completed successfully. Read: %d, Written: %d, Failed: %d",
					recordsRead, recordsWritten, recordsFailed)
				return
			}

			// 增加读取计数
			atomic.AddInt64(&recordsRead, 1)

			// 应用转换
			transformedData, err := e.applyTransforms(ctx, exec, data)
			if err != nil {
				// 记录转换错误但继续处理
				atomic.AddInt64(&recordsFailed, 1)
				e.logExecution(exec, "Transformation error: %v", err)
				continue
			}

			// 添加到批次
			batch = append(batch, transformedData)

			// 如果达到批次大小，处理批次
			if len(batch) >= batchSize {
				if err := e.processBatch(ctx, exec, batch, &recordsWritten, &recordsFailed); err != nil {
					e.handleExecutionError(exec, err)
					return
				}

				// 重置批次
				batch = make([]interface{}, 0, batchSize)
			}
		}
	}
}

// applyTransforms 应用所有转换函数到数据
func (e *Engine) applyTransforms(ctx context.Context, exec *execution, data interface{}) (interface{}, error) {
	var transformedData = data
	var err error

	for i, transform := range exec.pipeline.Transforms {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
			transformedData, err = transform(transformedData)
			if err != nil {
				return nil, &ETLError{
					Phase:   "transform",
					Message: fmt.Sprintf("Error in transform step %d: %v", i, err),
					Source:  fmt.Sprintf("transform_%d", i),
					Data:    data,
					Err:     err,
				}
			}
		}
	}

	return transformedData, nil
}

// processBatch 处理数据批次
func (e *Engine) processBatch(ctx context.Context, exec *execution, batch []interface{}, recordsWritten *int64, recordsFailed *int64) error {
	// 创建副本，因为我们将重用批次切片
	batchCopy := make([]interface{}, len(batch))
	copy(batchCopy, batch)

	// 批量加载到目标
	err := exec.pipeline.Sink.BatchLoad(ctx, batchCopy)
	if err != nil {
		// 尝试单条加载
		e.logExecution(exec, "Batch load failed, falling back to individual loads: %v", err)

		for _, item := range batchCopy {
			if loadErr := exec.pipeline.Sink.Load(ctx, item); loadErr != nil {
				atomic.AddInt64(recordsFailed, 1)
				e.logExecution(exec, "Load error: %v", loadErr)
			} else {
				atomic.AddInt64(recordsWritten, 1)
			}
		}
	} else {
		// 批量加载成功
		atomic.AddInt64(recordsWritten, int64(len(batchCopy)))
	}

	return nil
}

// handleExecutionError 处理执行过程中的错误
func (e *Engine) handleExecutionError(exec *execution, err error) {
	e.logger.Error("Pipeline execution failed",
		zap.String("pipeline_id", exec.pipeline.ID),
		zap.String("execution_id", exec.executionID),
		zap.Error(err))

	e.logExecution(exec, "Execution failed: %v", err)

	exec.mu.Lock()
	exec.stats.Status = StatusFailed
	exec.stats.EndTime = time.Now()
	exec.stats.Duration = exec.stats.EndTime.Sub(exec.stats.StartTime)
	exec.stats.Errors = append(exec.stats.Errors, err)
	exec.mu.Unlock()
}

// logExecution 记录执行日志
func (e *Engine) logExecution(exec *execution, format string, args ...interface{}) {
	logMsg := fmt.Sprintf(format, args...)

	exec.mu.Lock()
	exec.logs = append(exec.logs, logMsg)
	exec.mu.Unlock()

	e.logger.Info(logMsg,
		zap.String("pipeline_id", exec.pipeline.ID),
		zap.String("execution_id", exec.executionID))
}

// GetExecution 获取执行信息
func (e *Engine) GetExecution(executionID string) (*PipelineExecution, error) {
	e.executionsMu.RLock()
	exec, ok := e.executions[executionID]
	e.executionsMu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("execution not found: %s", executionID)
	}

	exec.mu.RLock()
	defer exec.mu.RUnlock()

	result := &PipelineExecution{
		PipelineID:  exec.pipeline.ID,
		ExecutionID: exec.executionID,
		StartTime:   exec.stats.StartTime,
		EndTime:     exec.stats.EndTime,
		Status:      exec.stats.Status,
		Stats:       exec.stats,
		Parameters:  exec.params,
		Logs:        make([]string, len(exec.logs)),
	}

	// 复制日志，避免数据竞争
	copy(result.Logs, exec.logs)

	return result, nil
}

// CancelExecution 取消正在执行的管道
func (e *Engine) CancelExecution(executionID string) error {
	e.executionsMu.RLock()
	exec, ok := e.executions[executionID]
	e.executionsMu.RUnlock()

	if !ok {
		return fmt.Errorf("execution not found: %s", executionID)
	}

	// 检查是否已完成
	exec.mu.RLock()
	currentStatus := exec.stats.Status
	exec.mu.RUnlock()

	if currentStatus == StatusCompleted || currentStatus == StatusFailed || currentStatus == StatusCancelled {
		return fmt.Errorf("execution already finished with status: %s", currentStatus)
	}

	// 取消执行
	exec.cancel()

	e.logger.Info("Pipeline execution cancelled",
		zap.String("pipeline_id", exec.pipeline.ID),
		zap.String("execution_id", exec.executionID))

	return nil
}

// CleanupExecutions 清理旧的执行记录
func (e *Engine) CleanupExecutions(maxAge time.Duration) int {
	now := time.Now()
	count := 0

	e.executionsMu.Lock()
	defer e.executionsMu.Unlock()

	for id, exec := range e.executions {
		exec.mu.RLock()
		status := exec.stats.Status
		endTime := exec.stats.EndTime
		exec.mu.RUnlock()

		// 如果执行已完成并且超过最大保留时间，删除它
		if (status == StatusCompleted || status == StatusFailed || status == StatusCancelled) &&
			!endTime.IsZero() && now.Sub(endTime) > maxAge {
			delete(e.executions, id)
			count++
		}
	}

	return count
}
