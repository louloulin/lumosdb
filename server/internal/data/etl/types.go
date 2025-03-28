package etl

import (
	"context"
	"time"
)

// TransformFunc 表示数据转换函数
type TransformFunc func(data interface{}) (interface{}, error)

// DataSource 表示ETL中的数据源接口
type DataSource interface {
	// Open 初始化数据源连接
	Open(ctx context.Context) error

	// Close 关闭数据源连接
	Close() error

	// Extract 从数据源提取数据
	Extract(ctx context.Context, options map[string]interface{}) (chan interface{}, error)

	// Name 返回数据源名称
	Name() string

	// Metadata 返回数据源元数据
	Metadata() map[string]interface{}
}

// DataSink 表示ETL中的数据目标接口
type DataSink interface {
	// Open 初始化数据目标连接
	Open(ctx context.Context) error

	// Close 关闭数据目标连接
	Close() error

	// Load 将数据加载到目标
	Load(ctx context.Context, data interface{}) error

	// BatchLoad 批量加载数据到目标
	BatchLoad(ctx context.Context, dataBatch []interface{}) error

	// Name 返回数据目标名称
	Name() string
}

// Pipeline 表示ETL管道
type Pipeline struct {
	ID          string
	Name        string
	Description string
	Source      DataSource
	Transforms  []TransformFunc
	Sink        DataSink
	BatchSize   int
	Timeout     time.Duration
	Metadata    map[string]interface{}
}

// PipelineOptions 包含创建管道的选项
type PipelineOptions struct {
	BatchSize    int
	Timeout      time.Duration
	RetryCount   int
	Parallelism  int
	ErrorHandler func(error)
	Metadata     map[string]interface{}
}

// DefaultPipelineOptions 返回默认管道选项
func DefaultPipelineOptions() PipelineOptions {
	return PipelineOptions{
		BatchSize:   100,
		Timeout:     time.Minute * 30,
		RetryCount:  3,
		Parallelism: 1,
		ErrorHandler: func(err error) {
			// 默认只记录错误，具体实现会使用logger
		},
		Metadata: make(map[string]interface{}),
	}
}

// PipelineStatus 表示管道执行状态
type PipelineStatus string

const (
	StatusPending   PipelineStatus = "pending"
	StatusRunning   PipelineStatus = "running"
	StatusCompleted PipelineStatus = "completed"
	StatusFailed    PipelineStatus = "failed"
	StatusCancelled PipelineStatus = "cancelled"
)

// PipelineStats 包含管道执行统计信息
type PipelineStats struct {
	StartTime      time.Time
	EndTime        time.Time
	Duration       time.Duration
	RecordsRead    int64
	RecordsWritten int64
	RecordsSkipped int64
	RecordsFailed  int64
	Status         PipelineStatus
	Errors         []error
}

// PipelineExecution 表示管道的一次执行
type PipelineExecution struct {
	PipelineID  string
	ExecutionID string
	StartTime   time.Time
	EndTime     time.Time
	Status      PipelineStatus
	Stats       PipelineStats
	Parameters  map[string]interface{}
	Logs        []string
}

// PipelineManager 管理ETL管道的接口
type PipelineManager interface {
	// CreatePipeline 创建新的ETL管道
	CreatePipeline(ctx context.Context, name string, desc string, source DataSource, transforms []TransformFunc, sink DataSink, options PipelineOptions) (*Pipeline, error)

	// GetPipeline 获取管道信息
	GetPipeline(ctx context.Context, id string) (*Pipeline, error)

	// ListPipelines 列出所有管道
	ListPipelines(ctx context.Context) ([]*Pipeline, error)

	// UpdatePipeline 更新管道配置
	UpdatePipeline(ctx context.Context, pipeline *Pipeline) error

	// DeletePipeline 删除管道
	DeletePipeline(ctx context.Context, id string) error

	// ExecutePipeline 执行管道
	ExecutePipeline(ctx context.Context, id string, params map[string]interface{}) (string, error)

	// GetExecution 获取执行信息
	GetExecution(ctx context.Context, executionID string) (*PipelineExecution, error)

	// CancelExecution 取消正在执行的管道
	CancelExecution(ctx context.Context, executionID string) error

	// GetExecutionStats 获取执行统计
	GetExecutionStats(ctx context.Context, executionID string) (*PipelineStats, error)
}

// ETLError 表示ETL过程中的错误
type ETLError struct {
	Phase   string      // 错误发生的阶段: extract, transform, load
	Message string      // 错误信息
	Source  string      // 错误来源
	Data    interface{} // 导致错误的数据
	Err     error       // 原始错误
}

// Error 实现error接口
func (e *ETLError) Error() string {
	return e.Message
}

// Unwrap 返回原始错误
func (e *ETLError) Unwrap() error {
	return e.Err
}

// DataTransformer 表示数据转换器接口
type DataTransformer interface {
	// Transform 转换单条数据
	Transform(ctx context.Context, data interface{}) (interface{}, error)

	// Name 返回转换器名称
	Name() string

	// Description 返回转换器描述
	Description() string
}

// SourceType 表示数据源类型
type SourceType string

const (
	SourceTypeDatabase SourceType = "database"
	SourceTypeFile     SourceType = "file"
	SourceTypeAPI      SourceType = "api"
	SourceTypeStream   SourceType = "stream"
	SourceTypeCustom   SourceType = "custom"
)

// SinkType 表示数据目标类型
type SinkType string

const (
	SinkTypeDatabase SinkType = "database"
	SinkTypeFile     SinkType = "file"
	SinkTypeAPI      SinkType = "api"
	SinkTypeStream   SinkType = "stream"
	SinkTypeCustom   SinkType = "custom"
)
