package stream

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// BaseProcessor provides common functionality for stream processors
type BaseProcessor struct {
	config    *ProcessorConfig
	running   bool
	lock      sync.RWMutex
	startTime time.Time
	metrics   map[string]interface{}
}

// NewBaseProcessor creates a new BaseProcessor instance
func NewBaseProcessor(config *ProcessorConfig) *BaseProcessor {
	return &BaseProcessor{
		config:  config,
		metrics: make(map[string]interface{}),
	}
}

// GetConfig returns the processor configuration
func (p *BaseProcessor) GetConfig() *ProcessorConfig {
	p.lock.RLock()
	defer p.lock.RUnlock()
	return p.config
}

// UpdateConfig updates the processor configuration
func (p *BaseProcessor) UpdateConfig(config *ProcessorConfig) error {
	p.lock.Lock()
	defer p.lock.Unlock()

	if p.running {
		return fmt.Errorf("cannot update configuration while processor is running")
	}

	p.config = config
	return nil
}

// Start starts the processor
func (p *BaseProcessor) Start(ctx context.Context) error {
	p.lock.Lock()
	defer p.lock.Unlock()

	if p.running {
		return fmt.Errorf("processor is already running")
	}

	p.running = true
	p.startTime = time.Now()
	return nil
}

// Stop stops the processor
func (p *BaseProcessor) Stop(ctx context.Context) error {
	p.lock.Lock()
	defer p.lock.Unlock()

	if !p.running {
		return fmt.Errorf("processor is not running")
	}

	p.running = false
	return nil
}

// DefaultFilterProcessor implements a filter processor
type DefaultFilterProcessor struct {
	*BaseProcessor
	condition func(*DataEvent) bool
}

// NewFilterProcessor creates a new DefaultFilterProcessor instance
func NewFilterProcessor(config *ProcessorConfig, condition func(*DataEvent) bool) *DefaultFilterProcessor {
	return &DefaultFilterProcessor{
		BaseProcessor: NewBaseProcessor(config),
		condition:     condition,
	}
}

// Process processes a single event
func (p *DefaultFilterProcessor) Process(ctx context.Context, event *DataEvent) (*ProcessingResult, error) {
	start := time.Now()
	result := &ProcessingResult{
		ProcessorID: p.config.ID,
		InputEvent:  event,
		Timestamp:   start,
	}

	if !p.condition(event) {
		result.Duration = time.Since(start)
		return result, nil
	}

	result.OutputEvent = event
	result.Duration = time.Since(start)
	return result, nil
}

// ProcessBatch processes multiple events
func (p *DefaultFilterProcessor) ProcessBatch(ctx context.Context, events []*DataEvent) ([]*ProcessingResult, error) {
	results := make([]*ProcessingResult, len(events))
	for i, event := range events {
		result, err := p.Process(ctx, event)
		if err != nil {
			return nil, err
		}
		results[i] = result
	}
	return results, nil
}

// DefaultTransformProcessor implements a transform processor
type DefaultTransformProcessor struct {
	*BaseProcessor
	transform func(*DataEvent) (*DataEvent, error)
}

// NewTransformProcessor creates a new DefaultTransformProcessor instance
func NewTransformProcessor(config *ProcessorConfig, transform func(*DataEvent) (*DataEvent, error)) *DefaultTransformProcessor {
	return &DefaultTransformProcessor{
		BaseProcessor: NewBaseProcessor(config),
		transform:     transform,
	}
}

// Process processes a single event
func (p *DefaultTransformProcessor) Process(ctx context.Context, event *DataEvent) (*ProcessingResult, error) {
	start := time.Now()
	result := &ProcessingResult{
		ProcessorID: p.config.ID,
		InputEvent:  event,
		Timestamp:   start,
	}

	transformed, err := p.transform(event)
	if err != nil {
		result.Error = err.Error()
		result.Duration = time.Since(start)
		return result, err
	}

	result.OutputEvent = transformed
	result.Duration = time.Since(start)
	return result, nil
}

// ProcessBatch processes multiple events
func (p *DefaultTransformProcessor) ProcessBatch(ctx context.Context, events []*DataEvent) ([]*ProcessingResult, error) {
	results := make([]*ProcessingResult, len(events))
	for i, event := range events {
		result, err := p.Process(ctx, event)
		if err != nil {
			return nil, err
		}
		results[i] = result
	}
	return results, nil
}

// DefaultWindowedProcessor implements a windowed processor
type DefaultWindowedProcessor struct {
	*BaseProcessor
	windowConfig *WindowConfig
	buffer       map[string][]*DataEvent
	bufferLock   sync.RWMutex
	process      func([]*DataEvent) ([]*DataEvent, error)
}

// NewWindowedProcessor creates a new DefaultWindowedProcessor instance
func NewWindowedProcessor(config *ProcessorConfig, windowConfig *WindowConfig, process func([]*DataEvent) ([]*DataEvent, error)) *DefaultWindowedProcessor {
	return &DefaultWindowedProcessor{
		BaseProcessor: NewBaseProcessor(config),
		windowConfig:  windowConfig,
		buffer:        make(map[string][]*DataEvent),
		process:       process,
	}
}

// Process processes a single event
func (p *DefaultWindowedProcessor) Process(ctx context.Context, event *DataEvent) (*ProcessingResult, error) {
	start := time.Now()
	result := &ProcessingResult{
		ProcessorID: p.config.ID,
		InputEvent:  event,
		Timestamp:   start,
	}

	p.bufferLock.Lock()
	windowKey := p.getWindowKey(event.Timestamp)
	p.buffer[windowKey] = append(p.buffer[windowKey], event)
	p.bufferLock.Unlock()

	// Check if window is ready for processing
	if p.shouldProcessWindow(windowKey) {
		processed, err := p.processWindow(windowKey)
		if err != nil {
			result.Error = err.Error()
			result.Duration = time.Since(start)
			return result, err
		}
		if len(processed) > 0 {
			result.OutputEvent = processed[0] // Return first processed event
		}
	}

	result.Duration = time.Since(start)
	return result, nil
}

// ProcessBatch processes multiple events
func (p *DefaultWindowedProcessor) ProcessBatch(ctx context.Context, events []*DataEvent) ([]*ProcessingResult, error) {
	results := make([]*ProcessingResult, len(events))
	for i, event := range events {
		result, err := p.Process(ctx, event)
		if err != nil {
			return nil, err
		}
		results[i] = result
	}
	return results, nil
}

// getWindowKey generates a key for the time window
func (p *DefaultWindowedProcessor) getWindowKey(t time.Time) string {
	switch p.windowConfig.Type {
	case TumblingWindow:
		windowStart := t.Truncate(p.windowConfig.Size)
		return windowStart.Format(time.RFC3339)
	case SlidingWindow:
		windowStart := t.Truncate(p.windowConfig.Slide)
		return windowStart.Format(time.RFC3339)
	case SessionWindow:
		return t.Format(time.RFC3339)
	default:
		return t.Format(time.RFC3339)
	}
}

// shouldProcessWindow determines if a window should be processed
func (p *DefaultWindowedProcessor) shouldProcessWindow(windowKey string) bool {
	p.bufferLock.RLock()
	defer p.bufferLock.RUnlock()

	if len(p.buffer[windowKey]) == 0 {
		return false
	}

	windowStart, _ := time.Parse(time.RFC3339, windowKey)
	now := time.Now()

	switch p.windowConfig.Type {
	case TumblingWindow:
		return now.Sub(windowStart) >= p.windowConfig.Size
	case SlidingWindow:
		return now.Sub(windowStart) >= p.windowConfig.Size
	case SessionWindow:
		return now.Sub(windowStart) >= p.windowConfig.MaxDelay
	default:
		return false
	}
}

// processWindow processes events in a window
func (p *DefaultWindowedProcessor) processWindow(windowKey string) ([]*DataEvent, error) {
	p.bufferLock.Lock()
	events := p.buffer[windowKey]
	delete(p.buffer, windowKey)
	p.bufferLock.Unlock()

	if len(events) == 0 {
		return nil, nil
	}

	return p.process(events)
}
