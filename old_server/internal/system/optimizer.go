package system

import (
	"fmt"
	"sync"
	"time"
)

// OptimizerAction represents an action taken by the optimizer
type OptimizerAction struct {
	Timestamp time.Time
	Type      string
	Resource  ResourceType
	Reason    string
	Details   map[string]interface{}
}

// OptimizationMode represents the mode of optimization
type OptimizationMode string

const (
	// OptimizationModePerformance optimizes for performance (uses more resources)
	OptimizationModePerformance OptimizationMode = "performance"
	// OptimizationModeBalanced balances between performance and resource usage
	OptimizationModeBalanced OptimizationMode = "balanced"
	// OptimizationModeEconomy optimizes for minimal resource usage
	OptimizationModeEconomy OptimizationMode = "economy"
)

// ResourceLimits represents resource limits for the application
type ResourceLimits struct {
	MaxCPUPercent        float64
	MaxMemoryPercent     float64
	MaxDiskIOBytesPerSec uint64
	MaxConcurrentQueries int
	MaxCacheSize         uint64
}

// ResourceOptimizer automatically adjusts resource usage based on system load
type ResourceOptimizer struct {
	mu              sync.RWMutex
	monitor         *ResourceMonitor
	mode            OptimizationMode
	actionHistory   []OptimizerAction
	historySize     int
	checkInterval   time.Duration
	stopChan        chan struct{}
	maxLimits       ResourceLimits
	currentLimits   ResourceLimits
	baseLimits      ResourceLimits
	alertChan       chan Alert
	adjustListeners []func(ResourceLimits)
}

// NewResourceOptimizer creates a new resource optimizer
func NewResourceOptimizer(monitor *ResourceMonitor, mode OptimizationMode, historySize int) *ResourceOptimizer {
	// Set base resource limits based on mode
	baseLimits := ResourceLimits{}
	switch mode {
	case OptimizationModePerformance:
		baseLimits = ResourceLimits{
			MaxCPUPercent:        80.0,
			MaxMemoryPercent:     75.0,
			MaxDiskIOBytesPerSec: 100 * 1024 * 1024, // 100 MB/s
			MaxConcurrentQueries: 32,
			MaxCacheSize:         2 * 1024 * 1024 * 1024, // 2 GB
		}
	case OptimizationModeBalanced:
		baseLimits = ResourceLimits{
			MaxCPUPercent:        60.0,
			MaxMemoryPercent:     60.0,
			MaxDiskIOBytesPerSec: 50 * 1024 * 1024, // 50 MB/s
			MaxConcurrentQueries: 16,
			MaxCacheSize:         1 * 1024 * 1024 * 1024, // 1 GB
		}
	case OptimizationModeEconomy:
		baseLimits = ResourceLimits{
			MaxCPUPercent:        40.0,
			MaxMemoryPercent:     40.0,
			MaxDiskIOBytesPerSec: 20 * 1024 * 1024, // 20 MB/s
			MaxConcurrentQueries: 8,
			MaxCacheSize:         512 * 1024 * 1024, // 512 MB
		}
	default:
		// Default to balanced
		baseLimits = ResourceLimits{
			MaxCPUPercent:        60.0,
			MaxMemoryPercent:     60.0,
			MaxDiskIOBytesPerSec: 50 * 1024 * 1024, // 50 MB/s
			MaxConcurrentQueries: 16,
			MaxCacheSize:         1 * 1024 * 1024 * 1024, // 1 GB
		}
	}

	// Maximum possible limits
	maxLimits := ResourceLimits{
		MaxCPUPercent:        90.0,
		MaxMemoryPercent:     85.0,
		MaxDiskIOBytesPerSec: 200 * 1024 * 1024, // 200 MB/s
		MaxConcurrentQueries: 64,
		MaxCacheSize:         4 * 1024 * 1024 * 1024, // 4 GB
	}

	alertChan := make(chan Alert, 100)
	monitor.RegisterAlertListener(alertChan)

	return &ResourceOptimizer{
		monitor:         monitor,
		mode:            mode,
		actionHistory:   make([]OptimizerAction, 0, historySize),
		historySize:     historySize,
		checkInterval:   30 * time.Second,
		stopChan:        make(chan struct{}),
		maxLimits:       maxLimits,
		currentLimits:   baseLimits,
		baseLimits:      baseLimits,
		alertChan:       alertChan,
		adjustListeners: make([]func(ResourceLimits), 0),
	}
}

// Start starts the optimizer
func (o *ResourceOptimizer) Start() {
	go o.optimize()
	go o.handleAlerts()
}

// Stop stops the optimizer
func (o *ResourceOptimizer) Stop() {
	close(o.stopChan)
	o.monitor.UnregisterAlertListener(o.alertChan)
}

// optimize periodically checks and adjusts resource usage
func (o *ResourceOptimizer) optimize() {
	ticker := time.NewTicker(o.checkInterval)
	defer ticker.Stop()

	for {
		select {
		case <-o.stopChan:
			return
		case <-ticker.C:
			o.checkAndAdjust()
		}
	}
}

// handleAlerts processes alerts from the monitor
func (o *ResourceOptimizer) handleAlerts() {
	for {
		select {
		case <-o.stopChan:
			return
		case alert := <-o.alertChan:
			o.reactToAlert(alert)
		}
	}
}

// reactToAlert adjusts resources based on alerts
func (o *ResourceOptimizer) reactToAlert(alert Alert) {
	o.mu.Lock()
	defer o.mu.Unlock()

	action := OptimizerAction{
		Timestamp: time.Now(),
		Type:      "alert_reaction",
		Resource:  alert.ResourceType,
		Reason:    fmt.Sprintf("Reacting to %s alert: %s", alert.Level, alert.Message),
		Details:   map[string]interface{}{"alert": alert},
	}

	if alert.Level == "critical" {
		// Take immediate action for critical alerts
		switch alert.ResourceType {
		case ResourceCPU:
			o.currentLimits.MaxCPUPercent = o.currentLimits.MaxCPUPercent * 0.7
			o.currentLimits.MaxConcurrentQueries = int(float64(o.currentLimits.MaxConcurrentQueries) * 0.7)
			action.Details["adjusted_cpu_limit"] = o.currentLimits.MaxCPUPercent
			action.Details["adjusted_query_limit"] = o.currentLimits.MaxConcurrentQueries
		case ResourceMemory:
			o.currentLimits.MaxMemoryPercent = o.currentLimits.MaxMemoryPercent * 0.7
			o.currentLimits.MaxCacheSize = uint64(float64(o.currentLimits.MaxCacheSize) * 0.7)
			action.Details["adjusted_memory_limit"] = o.currentLimits.MaxMemoryPercent
			action.Details["adjusted_cache_limit"] = o.currentLimits.MaxCacheSize
		case ResourceDisk:
			o.currentLimits.MaxDiskIOBytesPerSec = uint64(float64(o.currentLimits.MaxDiskIOBytesPerSec) * 0.7)
			action.Details["adjusted_disk_io_limit"] = o.currentLimits.MaxDiskIOBytesPerSec
		}

		// Notify listeners of the adjustment
		o.notifyAdjustment()
	} else if alert.Level == "warning" {
		// Take moderate action for warning alerts
		switch alert.ResourceType {
		case ResourceCPU:
			o.currentLimits.MaxCPUPercent = o.currentLimits.MaxCPUPercent * 0.85
			o.currentLimits.MaxConcurrentQueries = int(float64(o.currentLimits.MaxConcurrentQueries) * 0.85)
			action.Details["adjusted_cpu_limit"] = o.currentLimits.MaxCPUPercent
			action.Details["adjusted_query_limit"] = o.currentLimits.MaxConcurrentQueries
		case ResourceMemory:
			o.currentLimits.MaxMemoryPercent = o.currentLimits.MaxMemoryPercent * 0.85
			o.currentLimits.MaxCacheSize = uint64(float64(o.currentLimits.MaxCacheSize) * 0.85)
			action.Details["adjusted_memory_limit"] = o.currentLimits.MaxMemoryPercent
			action.Details["adjusted_cache_limit"] = o.currentLimits.MaxCacheSize
		case ResourceDisk:
			o.currentLimits.MaxDiskIOBytesPerSec = uint64(float64(o.currentLimits.MaxDiskIOBytesPerSec) * 0.85)
			action.Details["adjusted_disk_io_limit"] = o.currentLimits.MaxDiskIOBytesPerSec
		}

		// Notify listeners of the adjustment
		o.notifyAdjustment()
	}

	// Record the action
	o.recordAction(action)
}

// checkAndAdjust checks resource usage and adjusts limits if needed
func (o *ResourceOptimizer) checkAndAdjust() {
	o.mu.Lock()
	defer o.mu.Unlock()

	// Get current usage
	usage, err := o.monitor.GetCurrentUsage()
	if err != nil {
		fmt.Printf("Error getting current usage: %v\n", err)
		return
	}

	// Get average usage over the last 5 minutes
	avgUsage, err := o.monitor.GetAverageUsage(5 * time.Minute)
	if err != nil {
		fmt.Printf("Error getting average usage: %v\n", err)
		return
	}

	// Check if we need to adjust limits based on current and average usage
	var adjustments bool
	action := OptimizerAction{
		Timestamp: time.Now(),
		Type:      "periodic_adjustment",
		Resource:  ResourceAll,
		Reason:    "Periodic check of resource usage",
		Details:   map[string]interface{}{"current_usage": usage, "average_usage": avgUsage},
	}

	// Check CPU usage
	if avgUsage.CPU < o.currentLimits.MaxCPUPercent*0.5 && o.currentLimits.MaxCPUPercent < o.maxLimits.MaxCPUPercent {
		// CPU usage is low, we can increase the limit
		o.currentLimits.MaxCPUPercent = minFloat64(o.currentLimits.MaxCPUPercent*1.1, o.maxLimits.MaxCPUPercent)
		o.currentLimits.MaxConcurrentQueries = minInt(o.currentLimits.MaxConcurrentQueries+2, o.maxLimits.MaxConcurrentQueries)
		action.Details["adjusted_cpu_limit"] = o.currentLimits.MaxCPUPercent
		action.Details["adjusted_query_limit"] = o.currentLimits.MaxConcurrentQueries
		adjustments = true
	} else if avgUsage.CPU > o.currentLimits.MaxCPUPercent*0.8 {
		// CPU usage is high, we should decrease the limit
		o.currentLimits.MaxCPUPercent = o.currentLimits.MaxCPUPercent * 0.9
		o.currentLimits.MaxConcurrentQueries = maxInt(o.currentLimits.MaxConcurrentQueries-2, 1)
		action.Details["adjusted_cpu_limit"] = o.currentLimits.MaxCPUPercent
		action.Details["adjusted_query_limit"] = o.currentLimits.MaxConcurrentQueries
		adjustments = true
	}

	// Check memory usage
	if avgUsage.Memory < o.currentLimits.MaxMemoryPercent*0.5 && o.currentLimits.MaxMemoryPercent < o.maxLimits.MaxMemoryPercent {
		// Memory usage is low, we can increase the limit
		o.currentLimits.MaxMemoryPercent = minFloat64(o.currentLimits.MaxMemoryPercent*1.1, o.maxLimits.MaxMemoryPercent)
		o.currentLimits.MaxCacheSize = minUint64(uint64(float64(o.currentLimits.MaxCacheSize)*1.1), o.maxLimits.MaxCacheSize)
		action.Details["adjusted_memory_limit"] = o.currentLimits.MaxMemoryPercent
		action.Details["adjusted_cache_limit"] = o.currentLimits.MaxCacheSize
		adjustments = true
	} else if avgUsage.Memory > o.currentLimits.MaxMemoryPercent*0.8 {
		// Memory usage is high, we should decrease the limit
		o.currentLimits.MaxMemoryPercent = o.currentLimits.MaxMemoryPercent * 0.9
		o.currentLimits.MaxCacheSize = uint64(float64(o.currentLimits.MaxCacheSize) * 0.9)
		action.Details["adjusted_memory_limit"] = o.currentLimits.MaxMemoryPercent
		action.Details["adjusted_cache_limit"] = o.currentLimits.MaxCacheSize
		adjustments = true
	}

	// Check disk I/O
	totalIO := usage.DiskRead + usage.DiskWrite
	if totalIO < o.currentLimits.MaxDiskIOBytesPerSec*50/100 && o.currentLimits.MaxDiskIOBytesPerSec < o.maxLimits.MaxDiskIOBytesPerSec {
		// Disk I/O is low, we can increase the limit
		o.currentLimits.MaxDiskIOBytesPerSec = minUint64(uint64(float64(o.currentLimits.MaxDiskIOBytesPerSec)*1.1), o.maxLimits.MaxDiskIOBytesPerSec)
		action.Details["adjusted_disk_io_limit"] = o.currentLimits.MaxDiskIOBytesPerSec
		adjustments = true
	} else if totalIO > o.currentLimits.MaxDiskIOBytesPerSec*80/100 {
		// Disk I/O is high, we should decrease the limit
		o.currentLimits.MaxDiskIOBytesPerSec = uint64(float64(o.currentLimits.MaxDiskIOBytesPerSec) * 0.9)
		action.Details["adjusted_disk_io_limit"] = o.currentLimits.MaxDiskIOBytesPerSec
		adjustments = true
	}

	if adjustments {
		// Record the action
		o.recordAction(action)

		// Notify listeners of the adjustment
		o.notifyAdjustment()
	}
}

// recordAction records an optimizer action in the history
func (o *ResourceOptimizer) recordAction(action OptimizerAction) {
	o.actionHistory = append(o.actionHistory, action)
	if len(o.actionHistory) > o.historySize {
		o.actionHistory = o.actionHistory[1:]
	}
}

// notifyAdjustment notifies all registered listeners of resource limit adjustments
func (o *ResourceOptimizer) notifyAdjustment() {
	limits := o.currentLimits
	for _, listener := range o.adjustListeners {
		go listener(limits)
	}
}

// RegisterAdjustmentListener registers a listener for resource limit adjustments
func (o *ResourceOptimizer) RegisterAdjustmentListener(listener func(ResourceLimits)) {
	o.mu.Lock()
	defer o.mu.Unlock()

	o.adjustListeners = append(o.adjustListeners, listener)
}

// GetCurrentLimits returns the current resource limits
func (o *ResourceOptimizer) GetCurrentLimits() ResourceLimits {
	o.mu.RLock()
	defer o.mu.RUnlock()

	return o.currentLimits
}

// SetMode sets the optimization mode
func (o *ResourceOptimizer) SetMode(mode OptimizationMode) {
	o.mu.Lock()
	defer o.mu.Unlock()

	o.mode = mode

	// Reset limits based on the new mode
	switch mode {
	case OptimizationModePerformance:
		o.baseLimits = ResourceLimits{
			MaxCPUPercent:        80.0,
			MaxMemoryPercent:     75.0,
			MaxDiskIOBytesPerSec: 100 * 1024 * 1024, // 100 MB/s
			MaxConcurrentQueries: 32,
			MaxCacheSize:         2 * 1024 * 1024 * 1024, // 2 GB
		}
	case OptimizationModeBalanced:
		o.baseLimits = ResourceLimits{
			MaxCPUPercent:        60.0,
			MaxMemoryPercent:     60.0,
			MaxDiskIOBytesPerSec: 50 * 1024 * 1024, // 50 MB/s
			MaxConcurrentQueries: 16,
			MaxCacheSize:         1 * 1024 * 1024 * 1024, // 1 GB
		}
	case OptimizationModeEconomy:
		o.baseLimits = ResourceLimits{
			MaxCPUPercent:        40.0,
			MaxMemoryPercent:     40.0,
			MaxDiskIOBytesPerSec: 20 * 1024 * 1024, // 20 MB/s
			MaxConcurrentQueries: 8,
			MaxCacheSize:         512 * 1024 * 1024, // 512 MB
		}
	}

	// Update current limits based on the new base limits
	// We don't completely reset to base limits to allow for some continuity
	o.currentLimits.MaxCPUPercent = (o.currentLimits.MaxCPUPercent + o.baseLimits.MaxCPUPercent) / 2
	o.currentLimits.MaxMemoryPercent = (o.currentLimits.MaxMemoryPercent + o.baseLimits.MaxMemoryPercent) / 2
	o.currentLimits.MaxDiskIOBytesPerSec = (o.currentLimits.MaxDiskIOBytesPerSec + o.baseLimits.MaxDiskIOBytesPerSec) / 2
	o.currentLimits.MaxConcurrentQueries = (o.currentLimits.MaxConcurrentQueries + o.baseLimits.MaxConcurrentQueries) / 2
	o.currentLimits.MaxCacheSize = (o.currentLimits.MaxCacheSize + o.baseLimits.MaxCacheSize) / 2

	// Notify listeners of the adjustment
	o.notifyAdjustment()

	// Record the action
	o.recordAction(OptimizerAction{
		Timestamp: time.Now(),
		Type:      "mode_change",
		Resource:  ResourceAll,
		Reason:    fmt.Sprintf("Optimization mode changed to %s", mode),
		Details: map[string]interface{}{
			"new_mode":       mode,
			"updated_limits": o.currentLimits,
		},
	})
}

// GetActionHistory returns the action history
func (o *ResourceOptimizer) GetActionHistory() []OptimizerAction {
	o.mu.RLock()
	defer o.mu.RUnlock()

	// Make a copy to avoid data races
	history := make([]OptimizerAction, len(o.actionHistory))
	copy(history, o.actionHistory)

	return history
}

// ResetToBaseLimits resets all limits to base values for the current mode
func (o *ResourceOptimizer) ResetToBaseLimits() {
	o.mu.Lock()
	defer o.mu.Unlock()

	o.currentLimits = o.baseLimits

	// Notify listeners of the adjustment
	o.notifyAdjustment()

	// Record the action
	o.recordAction(OptimizerAction{
		Timestamp: time.Now(),
		Type:      "reset_limits",
		Resource:  ResourceAll,
		Reason:    "Limits reset to base values",
		Details: map[string]interface{}{
			"reset_limits": o.currentLimits,
		},
	})
}

// Helper functions
func minFloat64(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func maxFloat64(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func minUint64(a, b uint64) uint64 {
	if a < b {
		return a
	}
	return b
}

func maxUint64(a, b uint64) uint64 {
	if a > b {
		return a
	}
	return b
}
