package system

import (
	"fmt"
	"runtime"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/mem"
	"github.com/shirou/gopsutil/v3/process"
)

// ResourceType represents the type of system resource
type ResourceType string

const (
	// ResourceCPU represents CPU resource
	ResourceCPU ResourceType = "cpu"
	// ResourceMemory represents memory resource
	ResourceMemory ResourceType = "memory"
	// ResourceDisk represents disk resource
	ResourceDisk ResourceType = "disk"
	// ResourceAll represents all resources
	ResourceAll ResourceType = "all"
)

// Threshold represents a resource usage threshold
type Threshold struct {
	ResourceType ResourceType
	Warning      float64 // Warning level (percentage)
	Critical     float64 // Critical level (percentage)
}

// Usage represents resource usage data
type Usage struct {
	Timestamp time.Time
	CPU       float64 // Percentage
	Memory    float64 // Percentage
	Disk      float64 // Percentage
	DiskRead  uint64  // Bytes/s
	DiskWrite uint64  // Bytes/s
}

// SystemInfo represents system information
type SystemInfo struct {
	OS              string
	Platform        string
	PlatformVersion string
	KernelVersion   string
	Hostname        string
	CPUCores        int
	TotalMemory     uint64
	TotalDisk       uint64
}

// Alert represents a resource usage alert
type Alert struct {
	Timestamp    time.Time
	ResourceType ResourceType
	Level        string // "warning" or "critical"
	Value        float64
	Message      string
}

// ResourceMonitor monitors system resources
type ResourceMonitor struct {
	mu               sync.RWMutex
	usageHistory     []Usage
	historySize      int
	samplingInterval time.Duration
	thresholds       map[ResourceType]Threshold
	alertListeners   []chan Alert
	stopChan         chan struct{}
	pid              int32 // Process ID for the current process
	process          *process.Process
	lastCPUTimes     cpu.TimesStat
	lastDiskIO       *process.IOCountersStat
	systemInfo       SystemInfo
}

// NewResourceMonitor creates a new resource monitor
func NewResourceMonitor(samplingInterval time.Duration, historySize int) (*ResourceMonitor, error) {
	pid := int32(process.GetPid())
	proc, err := process.NewProcess(pid)
	if err != nil {
		return nil, fmt.Errorf("failed to get process: %v", err)
	}

	// Get system information
	hostInfo, err := host.Info()
	if err != nil {
		return nil, fmt.Errorf("failed to get host info: %v", err)
	}

	memInfo, err := mem.VirtualMemory()
	if err != nil {
		return nil, fmt.Errorf("failed to get memory info: %v", err)
	}

	// Get disk information for the root partition
	diskInfo, err := disk.Usage("/")
	if err != nil {
		return nil, fmt.Errorf("failed to get disk info: %v", err)
	}

	// Set default thresholds
	thresholds := map[ResourceType]Threshold{
		ResourceCPU: {
			ResourceType: ResourceCPU,
			Warning:      70.0,
			Critical:     90.0,
		},
		ResourceMemory: {
			ResourceType: ResourceMemory,
			Warning:      80.0,
			Critical:     95.0,
		},
		ResourceDisk: {
			ResourceType: ResourceDisk,
			Warning:      85.0,
			Critical:     95.0,
		},
	}

	return &ResourceMonitor{
		usageHistory:     make([]Usage, 0, historySize),
		historySize:      historySize,
		samplingInterval: samplingInterval,
		thresholds:       thresholds,
		alertListeners:   make([]chan Alert, 0),
		stopChan:         make(chan struct{}),
		pid:              pid,
		process:          proc,
		systemInfo: SystemInfo{
			OS:              hostInfo.OS,
			Platform:        hostInfo.Platform,
			PlatformVersion: hostInfo.PlatformVersion,
			KernelVersion:   hostInfo.KernelVersion,
			Hostname:        hostInfo.Hostname,
			CPUCores:        runtime.NumCPU(),
			TotalMemory:     memInfo.Total,
			TotalDisk:       diskInfo.Total,
		},
	}, nil
}

// Start starts monitoring resources
func (m *ResourceMonitor) Start() error {
	var err error

	// Get initial CPU times
	m.lastCPUTimes, err = m.process.Times()
	if err != nil {
		return fmt.Errorf("failed to get initial CPU times: %v", err)
	}

	// Get initial disk IO
	m.lastDiskIO, err = m.process.IOCounters()
	if err != nil {
		return fmt.Errorf("failed to get initial disk IO: %v", err)
	}

	// Start monitoring goroutine
	go m.monitor()

	return nil
}

// Stop stops monitoring resources
func (m *ResourceMonitor) Stop() {
	close(m.stopChan)
}

// monitor continuously monitors resource usage
func (m *ResourceMonitor) monitor() {
	ticker := time.NewTicker(m.samplingInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.stopChan:
			return
		case <-ticker.C:
			if err := m.collectData(); err != nil {
				fmt.Printf("Error collecting resource data: %v\n", err)
			}
		}
	}
}

// collectData collects resource usage data
func (m *ResourceMonitor) collectData() error {
	// Get CPU usage
	cpuTimes, err := m.process.Times()
	if err != nil {
		return fmt.Errorf("failed to get CPU times: %v", err)
	}

	cpuTotal := cpuTimes.Total() - m.lastCPUTimes.Total()
	elapsed := cpuTimes.Timestamp - m.lastCPUTimes.Timestamp
	cpuPercent := 100 * cpuTotal / elapsed / float64(runtime.NumCPU())
	m.lastCPUTimes = cpuTimes

	// Get memory usage
	memInfo, err := m.process.MemoryInfo()
	if err != nil {
		return fmt.Errorf("failed to get memory info: %v", err)
	}
	memPercent := 100 * float64(memInfo.RSS) / float64(m.systemInfo.TotalMemory)

	// Get disk usage
	diskInfo, err := disk.Usage("/")
	if err != nil {
		return fmt.Errorf("failed to get disk info: %v", err)
	}
	diskPercent := diskInfo.UsedPercent

	// Get disk IO
	diskIO, err := m.process.IOCounters()
	if err != nil {
		return fmt.Errorf("failed to get disk IO: %v", err)
	}

	// Calculate disk read/write rates
	readRate := uint64(0)
	writeRate := uint64(0)
	if m.lastDiskIO != nil {
		readDiff := diskIO.ReadBytes - m.lastDiskIO.ReadBytes
		writeDiff := diskIO.WriteBytes - m.lastDiskIO.WriteBytes
		timeDiff := float64(m.samplingInterval) / float64(time.Second)
		readRate = uint64(float64(readDiff) / timeDiff)
		writeRate = uint64(float64(writeDiff) / timeDiff)
	}
	m.lastDiskIO = diskIO

	// Create usage object
	usage := Usage{
		Timestamp: time.Now(),
		CPU:       cpuPercent,
		Memory:    memPercent,
		Disk:      diskPercent,
		DiskRead:  readRate,
		DiskWrite: writeRate,
	}

	// Update history
	m.mu.Lock()
	m.usageHistory = append(m.usageHistory, usage)
	if len(m.usageHistory) > m.historySize {
		m.usageHistory = m.usageHistory[1:]
	}
	m.mu.Unlock()

	// Check thresholds and send alerts
	m.checkThresholds(usage)

	return nil
}

// checkThresholds checks if any resource usage exceeds thresholds
func (m *ResourceMonitor) checkThresholds(usage Usage) {
	// Check CPU threshold
	cpuThreshold := m.thresholds[ResourceCPU]
	if usage.CPU >= cpuThreshold.Critical {
		m.sendAlert(Alert{
			Timestamp:    usage.Timestamp,
			ResourceType: ResourceCPU,
			Level:        "critical",
			Value:        usage.CPU,
			Message:      fmt.Sprintf("CPU usage is critical: %.2f%%", usage.CPU),
		})
	} else if usage.CPU >= cpuThreshold.Warning {
		m.sendAlert(Alert{
			Timestamp:    usage.Timestamp,
			ResourceType: ResourceCPU,
			Level:        "warning",
			Value:        usage.CPU,
			Message:      fmt.Sprintf("CPU usage is high: %.2f%%", usage.CPU),
		})
	}

	// Check memory threshold
	memThreshold := m.thresholds[ResourceMemory]
	if usage.Memory >= memThreshold.Critical {
		m.sendAlert(Alert{
			Timestamp:    usage.Timestamp,
			ResourceType: ResourceMemory,
			Level:        "critical",
			Value:        usage.Memory,
			Message:      fmt.Sprintf("Memory usage is critical: %.2f%%", usage.Memory),
		})
	} else if usage.Memory >= memThreshold.Warning {
		m.sendAlert(Alert{
			Timestamp:    usage.Timestamp,
			ResourceType: ResourceMemory,
			Level:        "warning",
			Value:        usage.Memory,
			Message:      fmt.Sprintf("Memory usage is high: %.2f%%", usage.Memory),
		})
	}

	// Check disk threshold
	diskThreshold := m.thresholds[ResourceDisk]
	if usage.Disk >= diskThreshold.Critical {
		m.sendAlert(Alert{
			Timestamp:    usage.Timestamp,
			ResourceType: ResourceDisk,
			Level:        "critical",
			Value:        usage.Disk,
			Message:      fmt.Sprintf("Disk usage is critical: %.2f%%", usage.Disk),
		})
	} else if usage.Disk >= diskThreshold.Warning {
		m.sendAlert(Alert{
			Timestamp:    usage.Timestamp,
			ResourceType: ResourceDisk,
			Level:        "warning",
			Value:        usage.Disk,
			Message:      fmt.Sprintf("Disk usage is high: %.2f%%", usage.Disk),
		})
	}
}

// sendAlert sends an alert to all listeners
func (m *ResourceMonitor) sendAlert(alert Alert) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, listener := range m.alertListeners {
		select {
		case listener <- alert:
			// Alert sent successfully
		default:
			// Channel is full, skip this alert for this listener
		}
	}
}

// RegisterAlertListener registers a listener for alerts
func (m *ResourceMonitor) RegisterAlertListener(listener chan Alert) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.alertListeners = append(m.alertListeners, listener)
}

// UnregisterAlertListener unregisters a listener for alerts
func (m *ResourceMonitor) UnregisterAlertListener(listener chan Alert) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i, ch := range m.alertListeners {
		if ch == listener {
			m.alertListeners = append(m.alertListeners[:i], m.alertListeners[i+1:]...)
			break
		}
	}
}

// SetThreshold sets a threshold for a resource
func (m *ResourceMonitor) SetThreshold(threshold Threshold) {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.thresholds[threshold.ResourceType] = threshold
}

// GetUsageHistory returns the usage history
func (m *ResourceMonitor) GetUsageHistory() []Usage {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Make a copy to avoid data races
	history := make([]Usage, len(m.usageHistory))
	copy(history, m.usageHistory)

	return history
}

// GetCurrentUsage returns the current resource usage
func (m *ResourceMonitor) GetCurrentUsage() (Usage, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if len(m.usageHistory) == 0 {
		return Usage{}, fmt.Errorf("no usage data available")
	}

	return m.usageHistory[len(m.usageHistory)-1], nil
}

// GetAverageUsage returns the average resource usage over a time period
func (m *ResourceMonitor) GetAverageUsage(duration time.Duration) (Usage, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	if len(m.usageHistory) == 0 {
		return Usage{}, fmt.Errorf("no usage data available")
	}

	// Find the starting index based on the time duration
	startTime := time.Now().Add(-duration)
	startIdx := 0
	for i, usage := range m.usageHistory {
		if usage.Timestamp.After(startTime) {
			startIdx = i
			break
		}
	}

	// Calculate averages
	count := len(m.usageHistory) - startIdx
	if count == 0 {
		return Usage{}, fmt.Errorf("no usage data available for the specified duration")
	}

	var totalCPU, totalMemory, totalDisk float64
	var totalDiskRead, totalDiskWrite uint64

	for i := startIdx; i < len(m.usageHistory); i++ {
		usage := m.usageHistory[i]
		totalCPU += usage.CPU
		totalMemory += usage.Memory
		totalDisk += usage.Disk
		totalDiskRead += usage.DiskRead
		totalDiskWrite += usage.DiskWrite
	}

	return Usage{
		Timestamp: time.Now(),
		CPU:       totalCPU / float64(count),
		Memory:    totalMemory / float64(count),
		Disk:      totalDisk / float64(count),
		DiskRead:  totalDiskRead / uint64(count),
		DiskWrite: totalDiskWrite / uint64(count),
	}, nil
}

// GetSystemInfo returns system information
func (m *ResourceMonitor) GetSystemInfo() SystemInfo {
	return m.systemInfo
}

// GenerateResourceReport generates a report of resource usage
func (m *ResourceMonitor) GenerateResourceReport(duration time.Duration) (map[string]interface{}, error) {
	currentUsage, err := m.GetCurrentUsage()
	if err != nil {
		return nil, err
	}

	avgUsage, err := m.GetAverageUsage(duration)
	if err != nil {
		return nil, err
	}

	report := map[string]interface{}{
		"timestamp":     time.Now(),
		"period":        duration.String(),
		"system_info":   m.GetSystemInfo(),
		"current_usage": currentUsage,
		"average_usage": avgUsage,
		"thresholds":    m.thresholds,
	}

	return report, nil
}
