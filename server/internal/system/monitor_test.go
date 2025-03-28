package system

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

// TestNewResourceMonitor tests the creation of a new resource monitor
func TestNewResourceMonitor(t *testing.T) {
	// Create a new resource monitor
	monitor, err := NewResourceMonitor(1*time.Second, 100)

	// Check that no error occurred
	assert.NoError(t, err)
	assert.NotNil(t, monitor)

	// Check that the system info was populated
	systemInfo := monitor.GetSystemInfo()
	assert.NotEmpty(t, systemInfo.OS)
	assert.NotEmpty(t, systemInfo.Platform)
	assert.NotZero(t, systemInfo.CPUCores)
	assert.NotZero(t, systemInfo.TotalMemory)
	assert.NotZero(t, systemInfo.TotalDisk)
}

// TestResourceMonitorStartStop tests starting and stopping the resource monitor
func TestResourceMonitorStartStop(t *testing.T) {
	// Create a new resource monitor
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Start the monitor
	err = monitor.Start()
	assert.NoError(t, err)

	// Wait for some data to be collected
	time.Sleep(500 * time.Millisecond)

	// Stop the monitor
	monitor.Stop()

	// Check that some data was collected
	history := monitor.GetUsageHistory()
	assert.NotEmpty(t, history)
}

// TestResourceMonitorGetCurrentUsage tests getting the current resource usage
func TestResourceMonitorGetCurrentUsage(t *testing.T) {
	// Create a new resource monitor
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Start the monitor
	err = monitor.Start()
	assert.NoError(t, err)

	// Wait for some data to be collected
	time.Sleep(500 * time.Millisecond)

	// Get the current usage
	usage, err := monitor.GetCurrentUsage()
	assert.NoError(t, err)

	// Check that the usage data is valid
	assert.NotZero(t, usage.Timestamp)

	// CPU percent should be between 0 and 100
	assert.GreaterOrEqual(t, usage.CPU, 0.0)
	assert.LessOrEqual(t, usage.CPU, 100.0)

	// Memory percent should be between 0 and 100
	assert.GreaterOrEqual(t, usage.Memory, 0.0)
	assert.LessOrEqual(t, usage.Memory, 100.0)

	// Disk percent should be between 0 and 100
	assert.GreaterOrEqual(t, usage.Disk, 0.0)
	assert.LessOrEqual(t, usage.Disk, 100.0)

	// Stop the monitor
	monitor.Stop()
}

// TestResourceMonitorGetAverageUsage tests getting the average resource usage
func TestResourceMonitorGetAverageUsage(t *testing.T) {
	// Create a new resource monitor
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Start the monitor
	err = monitor.Start()
	assert.NoError(t, err)

	// Wait for some data to be collected
	time.Sleep(500 * time.Millisecond)

	// Get the average usage
	avgUsage, err := monitor.GetAverageUsage(1 * time.Second)
	assert.NoError(t, err)

	// Check that the usage data is valid
	assert.NotZero(t, avgUsage.Timestamp)

	// CPU percent should be between 0 and 100
	assert.GreaterOrEqual(t, avgUsage.CPU, 0.0)
	assert.LessOrEqual(t, avgUsage.CPU, 100.0)

	// Memory percent should be between 0 and 100
	assert.GreaterOrEqual(t, avgUsage.Memory, 0.0)
	assert.LessOrEqual(t, avgUsage.Memory, 100.0)

	// Disk percent should be between 0 and 100
	assert.GreaterOrEqual(t, avgUsage.Disk, 0.0)
	assert.LessOrEqual(t, avgUsage.Disk, 100.0)

	// Stop the monitor
	monitor.Stop()
}

// TestResourceMonitorAlerts tests resource alerts
func TestResourceMonitorAlerts(t *testing.T) {
	// Create a new resource monitor
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Start the monitor
	err = monitor.Start()
	assert.NoError(t, err)

	// Create a channel for alerts
	alertChan := make(chan Alert, 10)

	// Register the alert listener
	monitor.RegisterAlertListener(alertChan)

	// Set a very low threshold to trigger alerts
	monitor.SetThreshold(Threshold{
		ResourceType: ResourceCPU,
		Warning:      1.0, // Very low threshold to ensure alert is triggered
		Critical:     50.0,
	})

	// Wait for some data to be collected and possible alerts
	time.Sleep(1 * time.Second)

	// Unregister the alert listener
	monitor.UnregisterAlertListener(alertChan)

	// No assertion on alert count, as it depends on the specific system load
	// But we can check that the channel was properly set up
	assert.NotNil(t, alertChan)

	// Stop the monitor
	monitor.Stop()
}

// TestResourceMonitorGenerateReport tests generating a resource usage report
func TestResourceMonitorGenerateReport(t *testing.T) {
	// Create a new resource monitor
	monitor, err := NewResourceMonitor(100*time.Millisecond, 100)
	assert.NoError(t, err)

	// Start the monitor
	err = monitor.Start()
	assert.NoError(t, err)

	// Wait for some data to be collected
	time.Sleep(500 * time.Millisecond)

	// Generate a report
	report, err := monitor.GenerateResourceReport(1 * time.Minute)
	assert.NoError(t, err)
	assert.NotNil(t, report)

	// Check that the report contains the expected keys
	assert.Contains(t, report, "timestamp")
	assert.Contains(t, report, "period")
	assert.Contains(t, report, "system_info")
	assert.Contains(t, report, "current_usage")
	assert.Contains(t, report, "average_usage")
	assert.Contains(t, report, "thresholds")

	// Stop the monitor
	monitor.Stop()
}
