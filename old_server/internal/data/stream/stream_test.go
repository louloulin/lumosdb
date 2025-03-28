package stream

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// MockSource is a mock implementation of StreamSource for testing
type MockSource struct {
	events     chan *DataEvent
	errors     chan error
	started    bool
	startError error
	stopError  error
	lock       sync.RWMutex
}

func NewMockSource() *MockSource {
	return &MockSource{
		events: make(chan *DataEvent),
		errors: make(chan error),
	}
}

func (s *MockSource) Start(ctx context.Context) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	if s.startError != nil {
		return s.startError
	}
	s.started = true
	return nil
}

func (s *MockSource) Stop(ctx context.Context) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	if s.stopError != nil {
		return s.stopError
	}
	s.started = false
	return nil
}

func (s *MockSource) Events() <-chan *DataEvent {
	return s.events
}

func (s *MockSource) Errors() <-chan error {
	return s.errors
}

// MockSink is a mock implementation of StreamSink for testing
type MockSink struct {
	events     []*DataEvent
	started    bool
	startError error
	stopError  error
	writeError error
	lock       sync.RWMutex
}

func NewMockSink() *MockSink {
	return &MockSink{
		events: make([]*DataEvent, 0),
	}
}

func (s *MockSink) Start(ctx context.Context) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	if s.startError != nil {
		return s.startError
	}
	s.started = true
	return nil
}

func (s *MockSink) Stop(ctx context.Context) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	if s.stopError != nil {
		return s.stopError
	}
	s.started = false
	return nil
}

func (s *MockSink) Write(ctx context.Context, event *DataEvent) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	if s.writeError != nil {
		return s.writeError
	}
	s.events = append(s.events, event)
	return nil
}

func (s *MockSink) WriteBatch(ctx context.Context, events []*DataEvent) error {
	s.lock.Lock()
	defer s.lock.Unlock()
	if s.writeError != nil {
		return s.writeError
	}
	s.events = append(s.events, events...)
	return nil
}

func TestFilterProcessor(t *testing.T) {
	config := &ProcessorConfig{
		ID:          "test-filter",
		Name:        "Test Filter",
		Type:        FilterProcessor,
		Description: "Test filter processor",
		Enabled:     true,
	}

	t.Run("Filter Events", func(t *testing.T) {
		processor := NewFilterProcessor(config, func(event *DataEvent) bool {
			value, ok := event.Data["value"].(int)
			return ok && value > 5
		})

		ctx := context.Background()
		err := processor.Start(ctx)
		assert.NoError(t, err)

		// Test events
		events := []*DataEvent{
			{
				ID:   "1",
				Data: map[string]interface{}{"value": 3},
			},
			{
				ID:   "2",
				Data: map[string]interface{}{"value": 7},
			},
		}

		// Process events
		for _, event := range events {
			result, err := processor.Process(ctx, event)
			assert.NoError(t, err)
			assert.NotNil(t, result)

			if event.Data["value"].(int) > 5 {
				assert.Equal(t, event, result.OutputEvent)
			} else {
				assert.Nil(t, result.OutputEvent)
			}
		}

		err = processor.Stop(ctx)
		assert.NoError(t, err)
	})
}

func TestTransformProcessor(t *testing.T) {
	config := &ProcessorConfig{
		ID:          "test-transform",
		Name:        "Test Transform",
		Type:        TransformProcessor,
		Description: "Test transform processor",
		Enabled:     true,
	}

	t.Run("Transform Events", func(t *testing.T) {
		processor := NewTransformProcessor(config, func(event *DataEvent) (*DataEvent, error) {
			value, ok := event.Data["value"].(int)
			if !ok {
				return nil, fmt.Errorf("invalid value type")
			}

			event.Data["value"] = value * 2
			return event, nil
		})

		ctx := context.Background()
		err := processor.Start(ctx)
		assert.NoError(t, err)

		// Test event
		event := &DataEvent{
			ID:   "1",
			Data: map[string]interface{}{"value": 5},
		}

		result, err := processor.Process(ctx, event)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Equal(t, 10, result.OutputEvent.Data["value"])

		err = processor.Stop(ctx)
		assert.NoError(t, err)
	})
}

func TestWindowedProcessor(t *testing.T) {
	config := &ProcessorConfig{
		ID:          "test-window",
		Name:        "Test Window",
		Type:        WindowProcessor,
		Description: "Test window processor",
		Enabled:     true,
	}

	windowConfig := &WindowConfig{
		Type:     TumblingWindow,
		Size:     time.Second,
		MaxDelay: time.Second,
	}

	t.Run("Window Processing", func(t *testing.T) {
		processor := NewWindowedProcessor(config, windowConfig, func(events []*DataEvent) ([]*DataEvent, error) {
			if len(events) == 0 {
				return nil, nil
			}

			// Sum all values in the window
			sum := 0
			for _, event := range events {
				if value, ok := event.Data["value"].(int); ok {
					sum += value
				}
			}

			// Create result event
			result := &DataEvent{
				ID:   "result",
				Data: map[string]interface{}{"sum": sum},
			}

			return []*DataEvent{result}, nil
		})

		ctx := context.Background()
		err := processor.Start(ctx)
		assert.NoError(t, err)

		// Test events
		now := time.Now()
		events := []*DataEvent{
			{
				ID:        "1",
				Data:      map[string]interface{}{"value": 1},
				Timestamp: now,
			},
			{
				ID:        "2",
				Data:      map[string]interface{}{"value": 2},
				Timestamp: now,
			},
		}

		// Process events
		for _, event := range events {
			result, err := processor.Process(ctx, event)
			assert.NoError(t, err)
			assert.NotNil(t, result)
		}

		// Wait for window to complete
		time.Sleep(2 * time.Second)

		err = processor.Stop(ctx)
		assert.NoError(t, err)
	})
}

func TestPipelineManager(t *testing.T) {
	manager := NewPipelineManager()
	ctx := context.Background()

	t.Run("Pipeline Lifecycle", func(t *testing.T) {
		source := NewMockSource()
		sink := NewMockSink()

		pipeline := &Pipeline{
			Name:        "Test Pipeline",
			Description: "Test pipeline for unit tests",
			Source:      source,
			Processors: []StreamProcessor{
				NewFilterProcessor(&ProcessorConfig{
					ID:      "filter",
					Type:    FilterProcessor,
					Enabled: true,
				}, func(event *DataEvent) bool {
					return true
				}),
			},
			Sink: sink,
		}

		// Create pipeline
		err := manager.CreatePipeline(ctx, pipeline)
		assert.NoError(t, err)
		assert.NotEmpty(t, pipeline.ID)

		// Get pipeline
		retrieved, err := manager.GetPipeline(ctx, pipeline.ID)
		assert.NoError(t, err)
		assert.Equal(t, pipeline.Name, retrieved.Name)

		// Start pipeline
		err = manager.StartPipeline(ctx, pipeline.ID)
		assert.NoError(t, err)

		// Send test event
		event := &DataEvent{
			ID:   "test",
			Type: "test",
			Data: map[string]interface{}{"value": 1},
		}
		source.events <- event

		// Wait for processing
		time.Sleep(100 * time.Millisecond)

		// Stop pipeline
		err = manager.StopPipeline(ctx, pipeline.ID)
		assert.NoError(t, err)

		// Check metrics
		metrics, err := manager.GetPipelineMetrics(ctx, pipeline.ID)
		assert.NoError(t, err)
		assert.NotNil(t, metrics)

		// Delete pipeline
		err = manager.DeletePipeline(ctx, pipeline.ID)
		assert.NoError(t, err)

		// Verify pipeline is deleted
		_, err = manager.GetPipeline(ctx, pipeline.ID)
		assert.Error(t, err)
	})

	t.Run("Pipeline Error Handling", func(t *testing.T) {
		source := NewMockSource()
		source.startError = fmt.Errorf("start error")

		pipeline := &Pipeline{
			Name:   "Error Pipeline",
			Source: source,
			Sink:   NewMockSink(),
		}

		err := manager.CreatePipeline(ctx, pipeline)
		assert.NoError(t, err)

		err = manager.StartPipeline(ctx, pipeline.ID)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "start error")
	})
}
