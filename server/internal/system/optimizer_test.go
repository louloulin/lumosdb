package system

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// TestNewResourceOptimizer tests the creation of a new resource optimizer
func TestNewResourceOptimizer(t *testing.T) {
	// Create a monitor first
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Create optimizers with different modes
	performanceOptimizer := NewResourceOptimizer(monitor, OptimizationModePerformance, 100)
	assert.NotNil(t, performanceOptimizer)

	balancedOptimizer := NewResourceOptimizer(monitor, OptimizationModeBalanced, 100)
	assert.NotNil(t, balancedOptimizer)

	economyOptimizer := NewResourceOptimizer(monitor, OptimizationModeEconomy, 100)
	assert.NotNil(t, economyOptimizer)

	// Check that the limits vary according to the mode
	performanceLimits := performanceOptimizer.GetCurrentLimits()
	balancedLimits := balancedOptimizer.GetCurrentLimits()
	economyLimits := economyOptimizer.GetCurrentLimits()

	// Performance mode should have higher limits than balanced
	assert.Greater(t, performanceLimits.MaxCPUPercent, balancedLimits.MaxCPUPercent)
	assert.Greater(t, performanceLimits.MaxMemoryPercent, balancedLimits.MaxMemoryPercent)
	assert.Greater(t, performanceLimits.MaxDiskIOBytesPerSec, balancedLimits.MaxDiskIOBytesPerSec)
	assert.Greater(t, performanceLimits.MaxConcurrentQueries, balancedLimits.MaxConcurrentQueries)
	assert.Greater(t, performanceLimits.MaxCacheSize, balancedLimits.MaxCacheSize)

	// Balanced mode should have higher limits than economy
	assert.Greater(t, balancedLimits.MaxCPUPercent, economyLimits.MaxCPUPercent)
	assert.Greater(t, balancedLimits.MaxMemoryPercent, economyLimits.MaxMemoryPercent)
	assert.Greater(t, balancedLimits.MaxDiskIOBytesPerSec, economyLimits.MaxDiskIOBytesPerSec)
	assert.Greater(t, balancedLimits.MaxConcurrentQueries, economyLimits.MaxConcurrentQueries)
	assert.Greater(t, balancedLimits.MaxCacheSize, economyLimits.MaxCacheSize)
}

// TestResourceOptimizerStartStop tests starting and stopping the resource optimizer
func TestResourceOptimizerStartStop(t *testing.T) {
	// Create a monitor first
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)
	err = monitor.Start()
	assert.NoError(t, err)

	// Create optimizer
	optimizer := NewResourceOptimizer(monitor, OptimizationModeBalanced, 100)

	// Start the optimizer
	optimizer.Start()

	// Wait for a bit
	time.Sleep(200 * time.Millisecond)

	// Stop the optimizer
	optimizer.Stop()

	// Stop the monitor
	monitor.Stop()
}

// TestResourceOptimizerSetMode tests changing the optimization mode
func TestResourceOptimizerSetMode(t *testing.T) {
	// Create a monitor first
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Create optimizer
	optimizer := NewResourceOptimizer(monitor, OptimizationModeBalanced, 100)

	// Check initial limits
	initialLimits := optimizer.GetCurrentLimits()
	assert.Equal(t, 60.0, initialLimits.MaxCPUPercent)
	assert.Equal(t, 60.0, initialLimits.MaxMemoryPercent)

	// Change to performance mode
	optimizer.SetMode(OptimizationModePerformance)

	// Check updated limits (should be halfway between balanced and performance)
	updatedLimits := optimizer.GetCurrentLimits()
	assert.InDelta(t, 70.0, updatedLimits.MaxCPUPercent, 0.1)    // (60 + 80) / 2 = 70
	assert.InDelta(t, 67.5, updatedLimits.MaxMemoryPercent, 0.1) // (60 + 75) / 2 = 67.5

	// Check the action history
	actions := optimizer.GetActionHistory()
	assert.NotEmpty(t, actions)
	assert.Equal(t, "mode_change", actions[0].Type)
}

// TestResourceOptimizerReactToAlert tests reacting to resource alerts
func TestResourceOptimizerReactToAlert(t *testing.T) {
	// Create a monitor first
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Create optimizer
	optimizer := NewResourceOptimizer(monitor, OptimizationModeBalanced, 100)

	// Create a sample alert
	alert := Alert{
		Timestamp:    time.Now(),
		ResourceType: ResourceCPU,
		Level:        "critical",
		Value:        95.0,
		Message:      "CPU usage is critical: 95.00%",
	}

	// Get initial limits
	initialLimits := optimizer.GetCurrentLimits()

	// Manually call the reactToAlert method
	optimizer.reactToAlert(alert)

	// Check that limits were reduced
	updatedLimits := optimizer.GetCurrentLimits()
	assert.Less(t, updatedLimits.MaxCPUPercent, initialLimits.MaxCPUPercent)
	assert.Less(t, updatedLimits.MaxConcurrentQueries, initialLimits.MaxConcurrentQueries)

	// Check the action history
	actions := optimizer.GetActionHistory()
	assert.NotEmpty(t, actions)
	assert.Equal(t, "alert_reaction", actions[0].Type)
	assert.Equal(t, ResourceCPU, actions[0].Resource)
}

// TestResourceOptimizerAdjustmentListener tests registering an adjustment listener
func TestResourceOptimizerAdjustmentListener(t *testing.T) {
	// Create a monitor first
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Create optimizer
	optimizer := NewResourceOptimizer(monitor, OptimizationModeBalanced, 100)

	// Create a channel for notifications
	notifyChan := make(chan ResourceLimits, 1)

	// Register a listener
	optimizer.RegisterAdjustmentListener(func(limits ResourceLimits) {
		notifyChan <- limits
	})

	// Create a sample alert to trigger adjustment
	alert := Alert{
		Timestamp:    time.Now(),
		ResourceType: ResourceCPU,
		Level:        "critical",
		Value:        95.0,
		Message:      "CPU usage is critical: 95.00%",
	}

	// Manually call the reactToAlert method
	optimizer.reactToAlert(alert)

	// Wait for notification
	select {
	case limits := <-notifyChan:
		// Check that we received the updated limits
		assert.NotNil(t, limits)
		assert.InDelta(t, 42.0, limits.MaxCPUPercent, 0.1) // 60 * 0.7 = 42
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for adjustment notification")
	}
}

// TestResourceOptimizerResetToBaseLimits tests resetting limits to base values
func TestResourceOptimizerResetToBaseLimits(t *testing.T) {
	// Create a monitor first
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Create optimizer
	optimizer := NewResourceOptimizer(monitor, OptimizationModeBalanced, 100)

	// Create a sample alert to change limits
	alert := Alert{
		Timestamp:    time.Now(),
		ResourceType: ResourceCPU,
		Level:        "critical",
		Value:        95.0,
		Message:      "CPU usage is critical: 95.00%",
	}

	// Manually call the reactToAlert method to change limits
	optimizer.reactToAlert(alert)

	// Check that limits were changed
	changedLimits := optimizer.GetCurrentLimits()
	assert.NotEqual(t, 60.0, changedLimits.MaxCPUPercent)

	// Reset to base limits
	optimizer.ResetToBaseLimits()

	// Check that limits were reset
	resetLimits := optimizer.GetCurrentLimits()
	assert.Equal(t, 60.0, resetLimits.MaxCPUPercent)
	assert.Equal(t, 60.0, resetLimits.MaxMemoryPercent)
	assert.Equal(t, uint64(50*1024*1024), resetLimits.MaxDiskIOBytesPerSec)
	assert.Equal(t, 16, resetLimits.MaxConcurrentQueries)
	assert.Equal(t, uint64(1024*1024*1024), resetLimits.MaxCacheSize)

	// Check the action history
	actions := optimizer.GetActionHistory()
	assert.Equal(t, "reset_limits", actions[len(actions)-1].Type)
}
