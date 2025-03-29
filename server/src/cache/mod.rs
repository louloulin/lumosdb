mod memory_cache;
mod lru_cache;

use std::hash::Hash;
use std::time::Duration;

pub use memory_cache::MemoryCache;
pub use lru_cache::LruCache;

/// 缓存特性，定义通用缓存操作
pub trait Cache<K, V>: Send + Sync + 'static
where
    K: Eq + Hash + Clone + std::fmt::Debug + Send + Sync,
    V: Clone + Send + Sync,
{
    /// 从缓存中获取值
    fn get(&self, key: &K) -> Option<V>;
    
    /// 将值设置到缓存中
    fn set(&self, key: K, value: V);
    
    /// 从缓存中移除值
    fn remove(&self, key: &K) -> bool;
    
    /// 清空缓存
    fn clear(&self);
    
    /// 获取缓存元素数量
    fn len(&self) -> usize;
    
    /// 判断缓存是否为空
    fn is_empty(&self) -> bool;
    
    /// 清理过期缓存项，返回清理的数量
    fn cleanup(&self) -> usize;
}

/// 为MemoryCache实现Cache特性
impl<K, V> Cache<K, V> for MemoryCache<K, V>
where
    K: Eq + Hash + Clone + std::fmt::Debug + Send + Sync,
    V: Clone + Send + Sync,
{
    fn get(&self, key: &K) -> Option<V> {
        self.get(key)
    }
    
    fn set(&self, key: K, value: V) {
        self.set(key, value)
    }
    
    fn remove(&self, key: &K) -> bool {
        self.remove(key)
    }
    
    fn clear(&self) {
        self.clear()
    }
    
    fn len(&self) -> usize {
        self.len()
    }
    
    fn is_empty(&self) -> bool {
        self.is_empty()
    }
    
    fn cleanup(&self) -> usize {
        self.cleanup()
    }
}

/// 为LruCache实现Cache特性
impl<K, V> Cache<K, V> for LruCache<K, V>
where
    K: Eq + Hash + Clone + std::fmt::Debug + Send + Sync,
    V: Clone + Send + Sync,
{
    fn get(&self, key: &K) -> Option<V> {
        self.get(key)
    }
    
    fn set(&self, key: K, value: V) {
        self.set(key, value)
    }
    
    fn remove(&self, key: &K) -> bool {
        self.remove(key)
    }
    
    fn clear(&self) {
        self.clear()
    }
    
    fn len(&self) -> usize {
        self.len()
    }
    
    fn is_empty(&self) -> bool {
        self.is_empty()
    }
    
    fn cleanup(&self) -> usize {
        self.cleanup()
    }
}

/// 缓存工厂，用于创建不同类型的缓存
pub struct CacheFactory;

impl CacheFactory {
    /// 创建内存缓存
    pub fn create_memory_cache<K, V>(ttl: Option<Duration>, max_size: Option<usize>) -> Box<dyn Cache<K, V>>
    where
        K: Eq + Hash + Clone + 'static + std::fmt::Debug + Send + Sync,
        V: Clone + 'static + Send + Sync,
    {
        let mut cache = MemoryCache::new();
        
        if let Some(ttl) = ttl {
            cache = cache.with_ttl(ttl);
        }
        
        if let Some(max_size) = max_size {
            cache = cache.with_max_size(max_size);
        }
        
        Box::new(cache)
    }
    
    /// 创建LRU缓存
    pub fn create_lru_cache<K, V>(capacity: usize, ttl: Option<Duration>) -> Box<dyn Cache<K, V>>
    where
        K: Eq + Hash + Clone + 'static + std::fmt::Debug + Send + Sync,
        V: Clone + 'static + Send + Sync,
    {
        let mut cache = LruCache::new(capacity);
        
        if let Some(ttl) = ttl {
            cache = cache.with_ttl(ttl);
        }
        
        Box::new(cache)
    }
} 