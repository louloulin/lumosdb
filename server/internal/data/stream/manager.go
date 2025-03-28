package stream

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// DefaultPipelineManager implements the PipelineManager interface
type DefaultPipelineManager struct {
	pipelines    map[string]*Pipeline
	pipelineLock sync.RWMutex
	metrics      map[string]map[string]interface{}
	metricsLock  sync.RWMutex
}

// NewPipelineManager creates a new DefaultPipelineManager instance
func NewPipelineManager() *DefaultPipelineManager {
	return &DefaultPipelineManager{
		pipelines: make(map[string]*Pipeline),
		metrics:   make(map[string]map[string]interface{}),
	}
}

// CreatePipeline creates a new pipeline
func (m *DefaultPipelineManager) CreatePipeline(ctx context.Context, pipeline *Pipeline) error {
	if pipeline.ID == "" {
		pipeline.ID = uuid.New().String()
	}

	if pipeline.Name == "" {
		return fmt.Errorf("pipeline name is required")
	}

	if pipeline.Source == nil {
		return fmt.Errorf("pipeline source is required")
	}

	if pipeline.Sink == nil {
		return fmt.Errorf("pipeline sink is required")
	}

	pipeline.Status = "created"
	pipeline.CreatedAt = time.Now()
	pipeline.UpdatedAt = pipeline.CreatedAt

	m.pipelineLock.Lock()
	defer m.pipelineLock.Unlock()

	if _, exists := m.pipelines[pipeline.ID]; exists {
		return fmt.Errorf("pipeline with ID %s already exists", pipeline.ID)
	}

	m.pipelines[pipeline.ID] = pipeline
	return nil
}

// UpdatePipeline updates an existing pipeline
func (m *DefaultPipelineManager) UpdatePipeline(ctx context.Context, pipeline *Pipeline) error {
	m.pipelineLock.Lock()
	defer m.pipelineLock.Unlock()

	existing, exists := m.pipelines[pipeline.ID]
	if !exists {
		return fmt.Errorf("pipeline with ID %s not found", pipeline.ID)
	}

	if existing.Status == "running" {
		return fmt.Errorf("cannot update running pipeline")
	}

	pipeline.UpdatedAt = time.Now()
	m.pipelines[pipeline.ID] = pipeline
	return nil
}

// DeletePipeline deletes a pipeline
func (m *DefaultPipelineManager) DeletePipeline(ctx context.Context, pipelineID string) error {
	m.pipelineLock.Lock()
	defer m.pipelineLock.Unlock()

	pipeline, exists := m.pipelines[pipelineID]
	if !exists {
		return fmt.Errorf("pipeline with ID %s not found", pipelineID)
	}

	if pipeline.Status == "running" {
		return fmt.Errorf("cannot delete running pipeline")
	}

	delete(m.pipelines, pipelineID)

	m.metricsLock.Lock()
	delete(m.metrics, pipelineID)
	m.metricsLock.Unlock()

	return nil
}

// GetPipeline retrieves a pipeline by ID
func (m *DefaultPipelineManager) GetPipeline(ctx context.Context, pipelineID string) (*Pipeline, error) {
	m.pipelineLock.RLock()
	defer m.pipelineLock.RUnlock()

	pipeline, exists := m.pipelines[pipelineID]
	if !exists {
		return nil, fmt.Errorf("pipeline with ID %s not found", pipelineID)
	}

	return pipeline, nil
}

// ListPipelines lists all pipelines
func (m *DefaultPipelineManager) ListPipelines(ctx context.Context) ([]*Pipeline, error) {
	m.pipelineLock.RLock()
	defer m.pipelineLock.RUnlock()

	pipelines := make([]*Pipeline, 0, len(m.pipelines))
	for _, pipeline := range m.pipelines {
		pipelines = append(pipelines, pipeline)
	}

	return pipelines, nil
}

// StartPipeline starts a pipeline
func (m *DefaultPipelineManager) StartPipeline(ctx context.Context, pipelineID string) error {
	m.pipelineLock.Lock()
	defer m.pipelineLock.Unlock()

	pipeline, exists := m.pipelines[pipelineID]
	if !exists {
		return fmt.Errorf("pipeline with ID %s not found", pipelineID)
	}

	if pipeline.Status == "running" {
		return fmt.Errorf("pipeline is already running")
	}

	// Start source
	if err := pipeline.Source.Start(ctx); err != nil {
		return fmt.Errorf("failed to start source: %v", err)
	}

	// Start processors
	for _, processor := range pipeline.Processors {
		if err := processor.Start(ctx); err != nil {
			return fmt.Errorf("failed to start processor: %v", err)
		}
	}

	// Start sink
	if err := pipeline.Sink.Start(ctx); err != nil {
		return fmt.Errorf("failed to start sink: %v", err)
	}

	// Start processing goroutine
	go m.processPipeline(ctx, pipeline)

	pipeline.Status = "running"
	pipeline.UpdatedAt = time.Now()

	return nil
}

// StopPipeline stops a pipeline
func (m *DefaultPipelineManager) StopPipeline(ctx context.Context, pipelineID string) error {
	m.pipelineLock.Lock()
	defer m.pipelineLock.Unlock()

	pipeline, exists := m.pipelines[pipelineID]
	if !exists {
		return fmt.Errorf("pipeline with ID %s not found", pipelineID)
	}

	if pipeline.Status != "running" {
		return fmt.Errorf("pipeline is not running")
	}

	// Stop sink first to prevent data loss
	if err := pipeline.Sink.Stop(ctx); err != nil {
		return fmt.Errorf("failed to stop sink: %v", err)
	}

	// Stop processors
	for _, processor := range pipeline.Processors {
		if err := processor.Stop(ctx); err != nil {
			return fmt.Errorf("failed to stop processor: %v", err)
		}
	}

	// Stop source
	if err := pipeline.Source.Stop(ctx); err != nil {
		return fmt.Errorf("failed to stop source: %v", err)
	}

	pipeline.Status = "stopped"
	pipeline.UpdatedAt = time.Now()

	return nil
}

// GetPipelineStatus gets the status of a pipeline
func (m *DefaultPipelineManager) GetPipelineStatus(ctx context.Context, pipelineID string) (string, error) {
	m.pipelineLock.RLock()
	defer m.pipelineLock.RUnlock()

	pipeline, exists := m.pipelines[pipelineID]
	if !exists {
		return "", fmt.Errorf("pipeline with ID %s not found", pipelineID)
	}

	return pipeline.Status, nil
}

// GetPipelineMetrics gets metrics for a pipeline
func (m *DefaultPipelineManager) GetPipelineMetrics(ctx context.Context, pipelineID string) (map[string]interface{}, error) {
	m.metricsLock.RLock()
	defer m.metricsLock.RUnlock()

	metrics, exists := m.metrics[pipelineID]
	if !exists {
		return nil, fmt.Errorf("metrics for pipeline %s not found", pipelineID)
	}

	return metrics, nil
}

// processPipeline handles the continuous processing of events in a pipeline
func (m *DefaultPipelineManager) processPipeline(ctx context.Context, pipeline *Pipeline) {
	eventCh := pipeline.Source.Events()
	errorCh := pipeline.Source.Errors()

	for {
		select {
		case <-ctx.Done():
			return
		case err := <-errorCh:
			m.updateMetrics(pipeline.ID, "errors", err)
		case event := <-eventCh:
			if event == nil {
				continue
			}

			// Process event through all processors
			var currentEvent = event
			for _, processor := range pipeline.Processors {
				result, err := processor.Process(ctx, currentEvent)
				if err != nil {
					m.updateMetrics(pipeline.ID, "processor_errors", err)
					continue
				}

				if result.OutputEvent == nil {
					// Event was filtered out
					break
				}

				currentEvent = result.OutputEvent
			}

			// Write to sink if event made it through all processors
			if currentEvent != nil {
				if err := pipeline.Sink.Write(ctx, currentEvent); err != nil {
					m.updateMetrics(pipeline.ID, "sink_errors", err)
				} else {
					m.updateMetrics(pipeline.ID, "processed_events", 1)
				}
			}
		}
	}
}

// updateMetrics updates pipeline metrics
func (m *DefaultPipelineManager) updateMetrics(pipelineID string, key string, value interface{}) {
	m.metricsLock.Lock()
	defer m.metricsLock.Unlock()

	if _, exists := m.metrics[pipelineID]; !exists {
		m.metrics[pipelineID] = make(map[string]interface{})
	}

	switch key {
	case "errors", "processor_errors", "sink_errors":
		if errList, ok := m.metrics[pipelineID][key].([]error); ok {
			m.metrics[pipelineID][key] = append(errList, value.(error))
		} else {
			m.metrics[pipelineID][key] = []error{value.(error)}
		}
	case "processed_events":
		if count, ok := m.metrics[pipelineID][key].(int); ok {
			m.metrics[pipelineID][key] = count + value.(int)
		} else {
			m.metrics[pipelineID][key] = value.(int)
		}
	default:
		m.metrics[pipelineID][key] = value
	}
}
