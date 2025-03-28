package stream

import (
	"context"
	"time"
)

// DataEvent represents a single data event in the stream
type DataEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Source    string                 `json:"source"`
	Data      map[string]interface{} `json:"data"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Timestamp time.Time              `json:"timestamp"`
}

// ProcessorType represents the type of stream processor
type ProcessorType string

const (
	// Filter processors filter events based on conditions
	FilterProcessor ProcessorType = "filter"
	// Transform processors modify event data
	TransformProcessor ProcessorType = "transform"
	// Aggregate processors combine multiple events
	AggregateProcessor ProcessorType = "aggregate"
	// Enrich processors add additional data to events
	EnrichProcessor ProcessorType = "enrich"
	// Window processors group events by time windows
	WindowProcessor ProcessorType = "window"
)

// WindowType represents the type of time window
type WindowType string

const (
	// Tumbling windows have fixed size and don't overlap
	TumblingWindow WindowType = "tumbling"
	// Sliding windows move continuously
	SlidingWindow WindowType = "sliding"
	// Session windows group events by activity periods
	SessionWindow WindowType = "session"
)

// ProcessorConfig defines the configuration for a stream processor
type ProcessorConfig struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Type        ProcessorType          `json:"type"`
	Description string                 `json:"description"`
	Config      map[string]interface{} `json:"config"`
	Enabled     bool                   `json:"enabled"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// WindowConfig defines the configuration for a time window
type WindowConfig struct {
	Type          WindowType             `json:"type"`
	Size          time.Duration          `json:"size"`
	Slide         time.Duration          `json:"slide,omitempty"`
	MaxDelay      time.Duration          `json:"max_delay"`
	AllowLateData bool                   `json:"allow_late_data"`
	LateDataTTL   time.Duration          `json:"late_data_ttl,omitempty"`
	TriggerConfig map[string]interface{} `json:"trigger_config,omitempty"`
}

// ProcessingResult represents the result of stream processing
type ProcessingResult struct {
	ProcessorID string        `json:"processor_id"`
	InputEvent  *DataEvent    `json:"input_event"`
	OutputEvent *DataEvent    `json:"output_event,omitempty"`
	Error       string        `json:"error,omitempty"`
	Duration    time.Duration `json:"duration"`
	Timestamp   time.Time     `json:"timestamp"`
}

// StreamProcessor defines the interface for processing stream data
type StreamProcessor interface {
	// Process processes a single event
	Process(ctx context.Context, event *DataEvent) (*ProcessingResult, error)

	// ProcessBatch processes multiple events
	ProcessBatch(ctx context.Context, events []*DataEvent) ([]*ProcessingResult, error)

	// GetConfig returns the processor configuration
	GetConfig() *ProcessorConfig

	// UpdateConfig updates the processor configuration
	UpdateConfig(config *ProcessorConfig) error

	// Start starts the processor
	Start(ctx context.Context) error

	// Stop stops the processor
	Stop(ctx context.Context) error
}

// StreamSource defines the interface for stream data sources
type StreamSource interface {
	// Start starts reading from the source
	Start(ctx context.Context) error

	// Stop stops reading from the source
	Stop(ctx context.Context) error

	// Events returns the channel for receiving events
	Events() <-chan *DataEvent

	// Errors returns the channel for receiving errors
	Errors() <-chan error
}

// StreamSink defines the interface for stream data sinks
type StreamSink interface {
	// Start starts the sink
	Start(ctx context.Context) error

	// Stop stops the sink
	Stop(ctx context.Context) error

	// Write writes an event to the sink
	Write(ctx context.Context, event *DataEvent) error

	// WriteBatch writes multiple events to the sink
	WriteBatch(ctx context.Context, events []*DataEvent) error
}

// Pipeline represents a stream processing pipeline
type Pipeline struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Source      StreamSource           `json:"source"`
	Processors  []StreamProcessor      `json:"processors"`
	Sink        StreamSink             `json:"sink"`
	Config      map[string]interface{} `json:"config"`
	Status      string                 `json:"status"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// PipelineManager defines the interface for managing stream processing pipelines
type PipelineManager interface {
	// CreatePipeline creates a new pipeline
	CreatePipeline(ctx context.Context, pipeline *Pipeline) error

	// UpdatePipeline updates an existing pipeline
	UpdatePipeline(ctx context.Context, pipeline *Pipeline) error

	// DeletePipeline deletes a pipeline
	DeletePipeline(ctx context.Context, pipelineID string) error

	// GetPipeline retrieves a pipeline by ID
	GetPipeline(ctx context.Context, pipelineID string) (*Pipeline, error)

	// ListPipelines lists all pipelines
	ListPipelines(ctx context.Context) ([]*Pipeline, error)

	// StartPipeline starts a pipeline
	StartPipeline(ctx context.Context, pipelineID string) error

	// StopPipeline stops a pipeline
	StopPipeline(ctx context.Context, pipelineID string) error

	// GetPipelineStatus gets the status of a pipeline
	GetPipelineStatus(ctx context.Context, pipelineID string) (string, error)

	// GetPipelineMetrics gets metrics for a pipeline
	GetPipelineMetrics(ctx context.Context, pipelineID string) (map[string]interface{}, error)
}
