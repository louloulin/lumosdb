package cache

import (
	"context"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestMemoryCache(t *testing.T) {
	ctx := context.Background()
	options := CacheOptions{
		TTL:            1 * time.Minute,
		MaxSize:        1024 * 1024,
		EvictionPolicy: "LRU",
	}

	cache := NewMemoryCache(options)

	// Test empty cache
	item, found, err := cache.Get(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, found)
	assert.Equal(t, CacheItem{}, item)

	// Test adding and retrieving an item
	testItem := CacheItem{
		Key:       "test-key",
		Value:     []byte("test-value"),
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(1 * time.Minute),
		Size:      10,
	}

	err = cache.Set(ctx, testItem)
	assert.NoError(t, err)

	item, found, err = cache.Get(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, found)
	assert.Equal(t, testItem.Key, item.Key)
	assert.Equal(t, testItem.Value, item.Value)

	// Test Contains
	exists, err := cache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, exists)

	exists, err = cache.Contains(ctx, "non-existent-key")
	assert.NoError(t, err)
	assert.False(t, exists)

	// Test Delete
	err = cache.Delete(ctx, "test-key")
	assert.NoError(t, err)

	exists, err = cache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, exists)

	// Test expiration
	expiredItem := CacheItem{
		Key:       "expired-key",
		Value:     []byte("expired-value"),
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(-1 * time.Second), // Already expired
		Size:      12,
	}

	err = cache.Set(ctx, expiredItem)
	assert.NoError(t, err)

	_, found, err = cache.Get(ctx, "expired-key")
	assert.NoError(t, err)
	assert.False(t, found)

	// Test eviction (LRU)
	cache = NewMemoryCache(CacheOptions{
		TTL:            1 * time.Minute,
		MaxSize:        100, // Small cache to force eviction
		EvictionPolicy: "LRU",
	})

	// Add first item
	item1 := CacheItem{
		Key:       "key1",
		Value:     []byte("value1"),
		CreatedAt: time.Now(),
		Size:      50,
	}
	err = cache.Set(ctx, item1)
	assert.NoError(t, err)

	// Add second item, should trigger eviction of first
	item2 := CacheItem{
		Key:       "key2",
		Value:     []byte("value2"),
		CreatedAt: time.Now().Add(1 * time.Second),
		Size:      60,
	}
	err = cache.Set(ctx, item2)
	assert.NoError(t, err)

	// First item should be evicted
	_, found, err = cache.Get(ctx, "key1")
	assert.NoError(t, err)
	assert.False(t, found)

	// Second item should still be there
	_, found, err = cache.Get(ctx, "key2")
	assert.NoError(t, err)
	assert.True(t, found)

	// Test Clear
	err = cache.Clear(ctx)
	assert.NoError(t, err)

	stats, err := cache.GetStats(ctx)
	assert.NoError(t, err)
	assert.Equal(t, int64(0), stats.Size)
	assert.Equal(t, 0, stats.ItemCount)
}

func TestDiskCache(t *testing.T) {
	ctx := context.Background()

	// Create a temporary directory for the cache
	tempDir, err := os.MkdirTemp("", "disk-cache-test")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	options := CacheOptions{
		TTL:            1 * time.Minute,
		MaxSize:        1024 * 1024,
		EvictionPolicy: "LRU",
		DiskPath:       tempDir,
	}

	cache, err := NewDiskCache(options)
	assert.NoError(t, err)

	// Test empty cache
	item, found, err := cache.Get(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, found)
	assert.Equal(t, CacheItem{}, item)

	// Test adding and retrieving an item
	testItem := CacheItem{
		Key:       "test-key",
		Value:     []byte("test-value"),
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(1 * time.Minute),
		Size:      10,
	}

	err = cache.Set(ctx, testItem)
	assert.NoError(t, err)

	// Verify files were created
	_, err = os.Stat(filepath.Join(tempDir, "test-key"))
	assert.NoError(t, err)
	_, err = os.Stat(filepath.Join(tempDir, "test-key.meta"))
	assert.NoError(t, err)

	item, found, err = cache.Get(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, found)
	assert.Equal(t, testItem.Key, item.Key)
	assert.Equal(t, testItem.Value, item.Value)

	// Test Contains
	exists, err := cache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, exists)

	exists, err = cache.Contains(ctx, "non-existent-key")
	assert.NoError(t, err)
	assert.False(t, exists)

	// Test Delete
	err = cache.Delete(ctx, "test-key")
	assert.NoError(t, err)

	exists, err = cache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, exists)

	// Verify files were deleted
	_, err = os.Stat(filepath.Join(tempDir, "test-key"))
	assert.True(t, os.IsNotExist(err))
	_, err = os.Stat(filepath.Join(tempDir, "test-key.meta"))
	assert.True(t, os.IsNotExist(err))

	// Test eviction (need multiple items to exceed cache size)
	// Create a small cache to ensure eviction
	smallCacheDir, err := os.MkdirTemp("", "small-disk-cache-test")
	assert.NoError(t, err)
	defer os.RemoveAll(smallCacheDir)

	smallCache, err := NewDiskCache(CacheOptions{
		TTL:            1 * time.Minute,
		MaxSize:        200, // Small enough to force eviction
		EvictionPolicy: "LRU",
		DiskPath:       smallCacheDir,
	})
	assert.NoError(t, err)

	// Add first item
	item1 := CacheItem{
		Key:       "key1",
		Value:     []byte("value1"),
		CreatedAt: time.Now().Add(-2 * time.Second), // Older
		Size:      100,
	}
	err = smallCache.Set(ctx, item1)
	assert.NoError(t, err)

	// Add second item (should trigger eviction of first due to LRU policy)
	item2 := CacheItem{
		Key:       "key2",
		Value:     []byte("value2"),
		CreatedAt: time.Now().Add(-1 * time.Second), // Newer
		Size:      150,
	}
	err = smallCache.Set(ctx, item2)
	assert.NoError(t, err)

	// First item should be evicted
	_, found, err = smallCache.Get(ctx, "key1")
	assert.NoError(t, err)
	assert.False(t, found)

	// Second item should still be there
	_, found, err = smallCache.Get(ctx, "key2")
	assert.NoError(t, err)
	assert.True(t, found)

	// Test Clear
	err = smallCache.Clear(ctx)
	assert.NoError(t, err)

	// Verify directory is empty
	files, err := os.ReadDir(smallCacheDir)
	assert.NoError(t, err)
	assert.Equal(t, 0, len(files))

	// Test stats
	stats, err := smallCache.GetStats(ctx)
	assert.NoError(t, err)
	assert.Equal(t, int64(0), stats.Size)
	assert.Equal(t, 0, stats.ItemCount)
}

func TestMultiLevelCache(t *testing.T) {
	ctx := context.Background()

	// Create a temporary directory for the disk cache
	tempDir, err := os.MkdirTemp("", "multi-level-cache-test")
	assert.NoError(t, err)
	defer os.RemoveAll(tempDir)

	// Create memory cache
	memoryCache := NewMemoryCache(CacheOptions{
		TTL:            1 * time.Minute,
		MaxSize:        1024 * 1024,
		EvictionPolicy: "LRU",
	})

	// Create disk cache
	diskCache, err := NewDiskCache(CacheOptions{
		TTL:            5 * time.Minute,
		MaxSize:        5 * 1024 * 1024,
		EvictionPolicy: "LRU",
		DiskPath:       tempDir,
	})
	assert.NoError(t, err)

	// Create multi-level cache
	multiCache := NewMultiLevelCache([]Cache{memoryCache, diskCache}, true)

	// Test empty cache
	item, found, err := multiCache.Get(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, found)
	assert.Equal(t, CacheItem{}, item)

	// Test adding an item
	testItem := CacheItem{
		Key:       "test-key",
		Value:     []byte("test-value"),
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(1 * time.Minute),
		Size:      10,
	}

	err = multiCache.Set(ctx, testItem)
	assert.NoError(t, err)

	// Verify item exists in all cache levels
	exists, err := memoryCache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, exists)

	exists, err = diskCache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, exists)

	// Test retrieving the item (should come from memory cache)
	item, found, err = multiCache.Get(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, found)
	assert.Equal(t, testItem.Key, item.Key)
	assert.Equal(t, testItem.Value, item.Value)

	// Test warmup (first delete from memory, then get should repopulate from disk to memory)
	err = memoryCache.Delete(ctx, "test-key")
	assert.NoError(t, err)

	exists, err = memoryCache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, exists)

	exists, err = diskCache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, exists)

	// Get from multi-cache should populate memory from disk (but needs a bit of time)
	item, found, err = multiCache.Get(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, found)
	assert.Equal(t, testItem.Key, item.Key)
	assert.Equal(t, testItem.Value, item.Value)

	// Wait a bit for warmup to complete
	time.Sleep(50 * time.Millisecond)

	// Item should now be in memory cache
	exists, err = memoryCache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.True(t, exists)

	// Test Delete (should remove from all levels)
	err = multiCache.Delete(ctx, "test-key")
	assert.NoError(t, err)

	exists, err = memoryCache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, exists)

	exists, err = diskCache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, exists)

	// Test Clear (should clear all levels)
	err = multiCache.Set(ctx, testItem)
	assert.NoError(t, err)

	err = multiCache.Clear(ctx)
	assert.NoError(t, err)

	exists, err = memoryCache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, exists)

	exists, err = diskCache.Contains(ctx, "test-key")
	assert.NoError(t, err)
	assert.False(t, exists)

	// Test stats
	err = multiCache.Set(ctx, testItem)
	assert.NoError(t, err)

	stats, err := multiCache.GetStats(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 2, len(stats))
	assert.Contains(t, stats, CacheLevelMemory)
	assert.Contains(t, stats, CacheLevelDisk)
	assert.Equal(t, 1, stats[CacheLevelMemory].ItemCount)
	assert.Equal(t, 1, stats[CacheLevelDisk].ItemCount)
}

func TestCacheKey(t *testing.T) {
	// Test with different parameters
	key1 := CacheKey("user", 123)
	assert.Equal(t, "user:123", key1)

	key2 := CacheKey("query", "SELECT * FROM users", 10, true)
	assert.Equal(t, "query:SELECT * FROM users:10:true", key2)

	key3 := CacheKey("complex", map[string]interface{}{"id": 1, "name": "test"})
	assert.Equal(t, "complex:map[id:1 name:test]", key3)
}
