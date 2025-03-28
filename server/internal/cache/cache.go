package cache

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// CacheLevel represents the level of cache
type CacheLevel int

const (
	// CacheLevelMemory represents memory cache (fastest, volatile)
	CacheLevelMemory CacheLevel = iota
	// CacheLevelDisk represents disk cache (slower, persistent)
	CacheLevelDisk
	// CacheLevelDistributed represents distributed cache (slowest, shared)
	CacheLevelDistributed
)

// CacheItem represents an item in the cache
type CacheItem struct {
	Key       string
	Value     []byte
	Metadata  map[string]interface{}
	CreatedAt time.Time
	ExpiresAt time.Time
	Size      int64
}

// CacheOptions represents configuration options for a cache
type CacheOptions struct {
	TTL            time.Duration
	MaxSize        int64
	EvictionPolicy string
	DiskPath       string
	ServerAddrs    []string
}

// CacheStats represents statistics for a cache
type CacheStats struct {
	Level     CacheLevel
	Size      int64
	MaxSize   int64
	ItemCount int
	HitCount  int64
	MissCount int64
	HitRate   float64
}

// DistributedOptions represents distributed cache specific options
type DistributedOptions struct {
	Username      string
	Password      string
	MaxRetries    int
	RetryInterval time.Duration
	ClusterMode   bool
}

// Cache is the interface that must be implemented by all caches
type Cache interface {
	Get(ctx context.Context, key string) (CacheItem, bool, error)
	Set(ctx context.Context, item CacheItem) error
	Delete(ctx context.Context, key string) error
	Clear(ctx context.Context) error
	Contains(ctx context.Context, key string) (bool, error)
	GetStats(ctx context.Context) (CacheStats, error)
	GetLevel() CacheLevel
}

// MemoryCache implements in-memory caching
type MemoryCache struct {
	items          map[string]CacheItem
	mu             sync.RWMutex
	maxSize        int64
	currentSize    int64
	evictionPolicy string
	hitCount       int64
	missCount      int64
}

// NewMemoryCache creates a new memory cache
func NewMemoryCache(options CacheOptions) *MemoryCache {
	return &MemoryCache{
		items:          make(map[string]CacheItem),
		maxSize:        options.MaxSize,
		evictionPolicy: options.EvictionPolicy,
	}
}

// Get retrieves an item from the cache
func (c *MemoryCache) Get(ctx context.Context, key string) (CacheItem, bool, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, found := c.items[key]
	if !found {
		c.missCount++
		return CacheItem{}, false, nil
	}

	// Check if the item has expired
	if !item.ExpiresAt.IsZero() && item.ExpiresAt.Before(time.Now()) {
		c.missCount++
		return CacheItem{}, false, nil
	}

	c.hitCount++
	return item, true, nil
}

// Set adds an item to the cache
func (c *MemoryCache) Set(ctx context.Context, item CacheItem) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Check if we need to make room
	if c.currentSize+item.Size > c.maxSize {
		c.evict(item.Size)
	}

	// Update or add the item
	oldItem, exists := c.items[item.Key]
	if exists {
		c.currentSize -= oldItem.Size
	}

	c.items[item.Key] = item
	c.currentSize += item.Size

	return nil
}

// Delete removes an item from the cache
func (c *MemoryCache) Delete(ctx context.Context, key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	item, exists := c.items[key]
	if exists {
		c.currentSize -= item.Size
		delete(c.items, key)
	}

	return nil
}

// Clear removes all items from the cache
func (c *MemoryCache) Clear(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.items = make(map[string]CacheItem)
	c.currentSize = 0

	return nil
}

// Contains checks if an item exists in the cache
func (c *MemoryCache) Contains(ctx context.Context, key string) (bool, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	item, exists := c.items[key]
	if !exists {
		return false, nil
	}

	// Check if the item has expired
	if !item.ExpiresAt.IsZero() && item.ExpiresAt.Before(time.Now()) {
		return false, nil
	}

	return true, nil
}

// GetStats returns cache statistics
func (c *MemoryCache) GetStats(ctx context.Context) (CacheStats, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	hitRate := 0.0
	if c.hitCount+c.missCount > 0 {
		hitRate = float64(c.hitCount) / float64(c.hitCount+c.missCount)
	}

	return CacheStats{
		Level:     CacheLevelMemory,
		Size:      c.currentSize,
		MaxSize:   c.maxSize,
		ItemCount: len(c.items),
		HitCount:  c.hitCount,
		MissCount: c.missCount,
		HitRate:   hitRate,
	}, nil
}

// GetLevel returns the cache level
func (c *MemoryCache) GetLevel() CacheLevel {
	return CacheLevelMemory
}

// evict removes items to make room for new items
func (c *MemoryCache) evict(neededSize int64) {
	if c.evictionPolicy == "LRU" {
		// Find the least recently used items
		var oldestItems []string
		var oldestTime time.Time

		for key, item := range c.items {
			if oldestTime.IsZero() || item.CreatedAt.Before(oldestTime) {
				oldestItems = []string{key}
				oldestTime = item.CreatedAt
			} else if item.CreatedAt.Equal(oldestTime) {
				oldestItems = append(oldestItems, key)
			}
		}

		// Remove items until we have enough space
		for _, key := range oldestItems {
			if c.currentSize+neededSize <= c.maxSize {
				break
			}
			item := c.items[key]
			c.currentSize -= item.Size
			delete(c.items, key)
		}
	} else {
		// Simple random eviction
		for key, item := range c.items {
			if c.currentSize+neededSize <= c.maxSize {
				break
			}
			c.currentSize -= item.Size
			delete(c.items, key)
		}
	}
}

// DiskCache implements disk-based caching
type DiskCache struct {
	basePath       string
	maxSize        int64
	currentSize    int64
	mu             sync.RWMutex
	evictionPolicy string
	hitCount       int64
	missCount      int64
}

// NewDiskCache creates a new disk cache
func NewDiskCache(options CacheOptions) (*DiskCache, error) {
	// Create the cache directory if it doesn't exist
	if err := os.MkdirAll(options.DiskPath, 0755); err != nil {
		return nil, err
	}

	// Calculate current size
	var currentSize int64
	err := filepath.Walk(options.DiskPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			currentSize += info.Size()
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	return &DiskCache{
		basePath:       options.DiskPath,
		maxSize:        options.MaxSize,
		currentSize:    currentSize,
		evictionPolicy: options.EvictionPolicy,
	}, nil
}

// Get retrieves an item from the cache
func (c *DiskCache) Get(ctx context.Context, key string) (CacheItem, bool, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	// Check if file exists
	filePath := filepath.Join(c.basePath, key)
	metaPath := filePath + ".meta"

	_, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		c.missCount++
		return CacheItem{}, false, nil
	}

	// Read metadata
	metaData, err := ioutil.ReadFile(metaPath)
	if err != nil {
		return CacheItem{}, false, err
	}

	var item CacheItem
	if err := json.Unmarshal(metaData, &item); err != nil {
		return CacheItem{}, false, err
	}

	// Check if the item has expired
	if !item.ExpiresAt.IsZero() && item.ExpiresAt.Before(time.Now()) {
		c.missCount++
		// Delete expired item
		os.Remove(filePath)
		os.Remove(metaPath)
		return CacheItem{}, false, nil
	}

	// Read the value
	value, err := ioutil.ReadFile(filePath)
	if err != nil {
		return CacheItem{}, false, err
	}

	item.Value = value
	c.hitCount++
	return item, true, nil
}

// Set adds an item to the cache
func (c *DiskCache) Set(ctx context.Context, item CacheItem) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Check if we need to make room
	if c.currentSize+item.Size > c.maxSize {
		if err := c.evict(item.Size); err != nil {
			return err
		}
	}

	// Write the file
	filePath := filepath.Join(c.basePath, item.Key)
	metaPath := filePath + ".meta"

	// Check if file already exists
	if info, err := os.Stat(filePath); err == nil {
		c.currentSize -= info.Size()
	}

	// Write the value
	if err := ioutil.WriteFile(filePath, item.Value, 0644); err != nil {
		return err
	}

	// Write metadata without the value
	metaItem := item
	metaItem.Value = nil
	metaData, err := json.Marshal(metaItem)
	if err != nil {
		return err
	}

	if err := ioutil.WriteFile(metaPath, metaData, 0644); err != nil {
		return err
	}

	c.currentSize += item.Size

	return nil
}

// Delete removes an item from the cache
func (c *DiskCache) Delete(ctx context.Context, key string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	filePath := filepath.Join(c.basePath, key)
	metaPath := filePath + ".meta"

	// Check if file exists
	info, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		return nil
	}

	c.currentSize -= info.Size()

	// Remove the files
	if err := os.Remove(filePath); err != nil {
		return err
	}

	if err := os.Remove(metaPath); err != nil && !os.IsNotExist(err) {
		return err
	}

	return nil
}

// Clear removes all items from the cache
func (c *DiskCache) Clear(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Remove all files in the cache directory
	dir, err := os.Open(c.basePath)
	if err != nil {
		return err
	}
	defer dir.Close()

	names, err := dir.Readdirnames(-1)
	if err != nil {
		return err
	}

	for _, name := range names {
		if err := os.Remove(filepath.Join(c.basePath, name)); err != nil {
			return err
		}
	}

	c.currentSize = 0

	return nil
}

// Contains checks if an item exists in the cache
func (c *DiskCache) Contains(ctx context.Context, key string) (bool, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	// Check if file exists
	filePath := filepath.Join(c.basePath, key)
	metaPath := filePath + ".meta"

	_, err := os.Stat(filePath)
	if os.IsNotExist(err) {
		return false, nil
	}

	// Read metadata
	metaData, err := ioutil.ReadFile(metaPath)
	if err != nil {
		return false, err
	}

	var item CacheItem
	if err := json.Unmarshal(metaData, &item); err != nil {
		return false, err
	}

	// Check if the item has expired
	if !item.ExpiresAt.IsZero() && item.ExpiresAt.Before(time.Now()) {
		return false, nil
	}

	return true, nil
}

// GetStats returns cache statistics
func (c *DiskCache) GetStats(ctx context.Context) (CacheStats, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	// Count items
	itemCount := 0
	err := filepath.Walk(c.basePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() && filepath.Ext(path) != ".meta" {
			itemCount++
		}
		return nil
	})

	if err != nil {
		return CacheStats{}, err
	}

	hitRate := 0.0
	if c.hitCount+c.missCount > 0 {
		hitRate = float64(c.hitCount) / float64(c.hitCount+c.missCount)
	}

	return CacheStats{
		Level:     CacheLevelDisk,
		Size:      c.currentSize,
		MaxSize:   c.maxSize,
		ItemCount: itemCount,
		HitCount:  c.hitCount,
		MissCount: c.missCount,
		HitRate:   hitRate,
	}, nil
}

// GetLevel returns the cache level
func (c *DiskCache) GetLevel() CacheLevel {
	return CacheLevelDisk
}

// evict removes items to make room for new items
func (c *DiskCache) evict(neededSize int64) error {
	// Get file info for all cache items
	type fileInfo struct {
		path       string
		size       int64
		modTime    time.Time
		metaPath   string
		isMetaFile bool
	}

	var files []fileInfo

	err := filepath.Walk(c.basePath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			isMetaFile := filepath.Ext(path) == ".meta"
			files = append(files, fileInfo{
				path:       path,
				size:       info.Size(),
				modTime:    info.ModTime(),
				isMetaFile: isMetaFile,
				metaPath:   path + ".meta",
			})
		}
		return nil
	})

	if err != nil {
		return err
	}

	// Sort files by modification time (LRU)
	if c.evictionPolicy == "LRU" {
		// Only consider non-meta files
		var dataFiles []fileInfo
		for _, f := range files {
			if !f.isMetaFile {
				dataFiles = append(dataFiles, f)
			}
		}

		// Sort by modification time
		for i := 0; i < len(dataFiles); i++ {
			for j := i + 1; j < len(dataFiles); j++ {
				if dataFiles[i].modTime.After(dataFiles[j].modTime) {
					dataFiles[i], dataFiles[j] = dataFiles[j], dataFiles[i]
				}
			}
		}

		// Remove files until we have enough space
		for _, file := range dataFiles {
			if c.currentSize+neededSize <= c.maxSize {
				break
			}

			// Remove the data file
			if err := os.Remove(file.path); err != nil && !os.IsNotExist(err) {
				return err
			}

			// Remove the meta file
			if err := os.Remove(file.metaPath); err != nil && !os.IsNotExist(err) {
				return err
			}

			c.currentSize -= file.size
		}
	} else {
		// Simple random eviction
		for _, file := range files {
			if !file.isMetaFile && c.currentSize+neededSize <= c.maxSize {
				break
			}

			if !file.isMetaFile {
				// Remove the data file
				if err := os.Remove(file.path); err != nil && !os.IsNotExist(err) {
					return err
				}

				// Remove the meta file
				if err := os.Remove(file.metaPath); err != nil && !os.IsNotExist(err) {
					return err
				}

				c.currentSize -= file.size
			}
		}
	}

	return nil
}

// DistributedCache represents a placeholder for a distributed cache implementation
// In a real implementation, this would be backed by Redis, Memcached, or similar
type DistributedCache struct {
	serverAddrs    []string
	options        DistributedOptions
	maxSize        int64
	evictionPolicy string
	mu             sync.RWMutex
	hitCount       int64
	missCount      int64
}

// NewDistributedCache creates a new distributed cache
func NewDistributedCache(options CacheOptions, distOptions DistributedOptions) (*DistributedCache, error) {
	if len(options.ServerAddrs) == 0 {
		return nil, errors.New("no server addresses provided for distributed cache")
	}

	return &DistributedCache{
		serverAddrs:    options.ServerAddrs,
		options:        distOptions,
		maxSize:        options.MaxSize,
		evictionPolicy: options.EvictionPolicy,
	}, nil
}

// Get retrieves an item from the cache
func (c *DistributedCache) Get(ctx context.Context, key string) (CacheItem, bool, error) {
	// In a real implementation, this would communicate with Redis/Memcached
	// For now, this is just a placeholder
	c.mu.Lock()
	defer c.mu.Unlock()

	c.missCount++
	return CacheItem{}, false, errors.New("distributed cache not implemented")
}

// Set adds an item to the cache
func (c *DistributedCache) Set(ctx context.Context, item CacheItem) error {
	// In a real implementation, this would communicate with Redis/Memcached
	// For now, this is just a placeholder
	return errors.New("distributed cache not implemented")
}

// Delete removes an item from the cache
func (c *DistributedCache) Delete(ctx context.Context, key string) error {
	// In a real implementation, this would communicate with Redis/Memcached
	// For now, this is just a placeholder
	return errors.New("distributed cache not implemented")
}

// Clear removes all items from the cache
func (c *DistributedCache) Clear(ctx context.Context) error {
	// In a real implementation, this would communicate with Redis/Memcached
	// For now, this is just a placeholder
	return errors.New("distributed cache not implemented")
}

// Contains checks if an item exists in the cache
func (c *DistributedCache) Contains(ctx context.Context, key string) (bool, error) {
	// In a real implementation, this would communicate with Redis/Memcached
	// For now, this is just a placeholder
	return false, errors.New("distributed cache not implemented")
}

// GetStats returns cache statistics
func (c *DistributedCache) GetStats(ctx context.Context) (CacheStats, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	hitRate := 0.0
	if c.hitCount+c.missCount > 0 {
		hitRate = float64(c.hitCount) / float64(c.hitCount+c.missCount)
	}

	return CacheStats{
		Level:     CacheLevelDistributed,
		Size:      0,
		MaxSize:   c.maxSize,
		ItemCount: 0,
		HitCount:  c.hitCount,
		MissCount: c.missCount,
		HitRate:   hitRate,
	}, nil
}

// GetLevel returns the cache level
func (c *DistributedCache) GetLevel() CacheLevel {
	return CacheLevelDistributed
}

// MultiLevelCache implements a multi-level cache system
type MultiLevelCache struct {
	levels        []Cache
	warmupEnabled bool
	mu            sync.RWMutex
}

// NewMultiLevelCache creates a new multi-level cache
func NewMultiLevelCache(levels []Cache, warmupEnabled bool) *MultiLevelCache {
	return &MultiLevelCache{
		levels:        levels,
		warmupEnabled: warmupEnabled,
	}
}

// Get retrieves an item from the cache, checking each level in order
func (c *MultiLevelCache) Get(ctx context.Context, key string) (CacheItem, bool, error) {
	// Try each cache level
	for i, cache := range c.levels {
		item, found, err := cache.Get(ctx, key)
		if err != nil {
			// Log error but continue to next level
			fmt.Printf("Error getting from cache level %d: %v\n", i, err)
			continue
		}

		if found {
			// If found, warm up lower levels if enabled
			if c.warmupEnabled && i > 0 {
				go c.warmup(ctx, item, i)
			}
			return item, true, nil
		}
	}

	return CacheItem{}, false, nil
}

// Set adds an item to all cache levels
func (c *MultiLevelCache) Set(ctx context.Context, item CacheItem) error {
	var firstErr error

	// Set in all levels
	for i, cache := range c.levels {
		if err := cache.Set(ctx, item); err != nil {
			// Log error but continue to next level
			fmt.Printf("Error setting in cache level %d: %v\n", i, err)
			if firstErr == nil {
				firstErr = err
			}
		}
	}

	return firstErr
}

// Delete removes an item from all cache levels
func (c *MultiLevelCache) Delete(ctx context.Context, key string) error {
	var firstErr error

	// Delete from all levels
	for i, cache := range c.levels {
		if err := cache.Delete(ctx, key); err != nil {
			// Log error but continue to next level
			fmt.Printf("Error deleting from cache level %d: %v\n", i, err)
			if firstErr == nil {
				firstErr = err
			}
		}
	}

	return firstErr
}

// Clear removes all items from all cache levels
func (c *MultiLevelCache) Clear(ctx context.Context) error {
	var firstErr error

	// Clear all levels
	for i, cache := range c.levels {
		if err := cache.Clear(ctx); err != nil {
			// Log error but continue to next level
			fmt.Printf("Error clearing cache level %d: %v\n", i, err)
			if firstErr == nil {
				firstErr = err
			}
		}
	}

	return firstErr
}

// Contains checks if an item exists in any cache level
func (c *MultiLevelCache) Contains(ctx context.Context, key string) (bool, error) {
	// Check each level
	for i, cache := range c.levels {
		found, err := cache.Contains(ctx, key)
		if err != nil {
			// Log error but continue to next level
			fmt.Printf("Error checking cache level %d: %v\n", i, err)
			continue
		}

		if found {
			return true, nil
		}
	}

	return false, nil
}

// GetStats returns statistics for all cache levels
func (c *MultiLevelCache) GetStats(ctx context.Context) (map[CacheLevel]CacheStats, error) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	stats := make(map[CacheLevel]CacheStats)

	for _, cache := range c.levels {
		cacheStats, err := cache.GetStats(ctx)
		if err != nil {
			continue
		}
		stats[cache.GetLevel()] = cacheStats
	}

	return stats, nil
}

// warmup adds an item to lower level caches
func (c *MultiLevelCache) warmup(ctx context.Context, item CacheItem, foundLevel int) {
	for i := 0; i < foundLevel; i++ {
		err := c.levels[i].Set(ctx, item)
		if err != nil {
			fmt.Printf("Error warming up cache level %d: %v\n", i, err)
		}
	}
}

// CacheKey generates a cache key for the given parameters
func CacheKey(prefix string, params ...interface{}) string {
	key := prefix
	for _, param := range params {
		key += fmt.Sprintf(":%v", param)
	}
	return key
}
