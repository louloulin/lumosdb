use std::collections::HashMap;
use std::hash::Hash;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use log::{debug, info};

// 缓存项结构
struct CacheItem<V> {
    value: V,
    expiry: Option<Instant>,
    last_accessed: Instant,
}

// 内存缓存实现
pub struct MemoryCache<K, V> 
where 
    K: Eq + Hash + Clone + std::fmt::Debug + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    cache: Arc<RwLock<HashMap<K, CacheItem<V>>>>,
    ttl: Option<Duration>,
    max_size: Option<usize>,
}

impl<K, V> MemoryCache<K, V> 
where 
    K: Eq + Hash + Clone + std::fmt::Debug + Send + Sync + 'static,
    V: Clone + Send + Sync + 'static,
{
    // 创建新的内存缓存
    pub fn new() -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::new())),
            ttl: None,
            max_size: None,
        }
    }
    
    // 设置缓存项的生存时间(TTL)
    pub fn with_ttl(mut self, ttl: Duration) -> Self {
        self.ttl = Some(ttl);
        self
    }
    
    // 设置缓存最大容量
    pub fn with_max_size(mut self, size: usize) -> Self {
        self.max_size = Some(size);
        self
    }
    
    // 获取缓存项，更新最后访问时间
    pub fn get(&self, key: &K) -> Option<V> {
        let mut cache = self.cache.write().unwrap();
        
        if let Some(item) = cache.get_mut(key) {
            // 检查是否过期
            if let Some(expiry) = item.expiry {
                if Instant::now() > expiry {
                    // 项已过期，删除
                    cache.remove(key);
                    debug!("Cache item expired: {:?}", key);
                    return None;
                }
            }
            
            // 更新最后访问时间
            item.last_accessed = Instant::now();
            return Some(item.value.clone());
        }
        
        None
    }
    
    // 设置缓存项
    pub fn set(&self, key: K, value: V) {
        let mut cache = self.cache.write().unwrap();
        
        // 检查是否达到最大容量
        if let Some(max_size) = self.max_size {
            if cache.len() >= max_size && !cache.contains_key(&key) {
                // 达到最大容量，需要移除最旧的项
                self.evict_oldest(&mut cache);
            }
        }
        
        let now = Instant::now();
        let expiry = self.ttl.map(|ttl| now + ttl);
        
        cache.insert(key, CacheItem {
            value,
            expiry,
            last_accessed: now,
        });
    }
    
    // 删除缓存项
    pub fn remove(&self, key: &K) -> bool {
        let mut cache = self.cache.write().unwrap();
        cache.remove(key).is_some()
    }
    
    // 清空缓存
    pub fn clear(&self) {
        let mut cache = self.cache.write().unwrap();
        cache.clear();
        info!("Cache cleared");
    }
    
    // 获取缓存项数量
    pub fn len(&self) -> usize {
        let cache = self.cache.read().unwrap();
        cache.len()
    }
    
    // 缓存是否为空
    pub fn is_empty(&self) -> bool {
        let cache = self.cache.read().unwrap();
        cache.is_empty()
    }
    
    // 清理过期的缓存项
    pub fn cleanup(&self) -> usize {
        let mut cache = self.cache.write().unwrap();
        let now = Instant::now();
        
        let before_count = cache.len();
        
        // 移除所有过期项
        cache.retain(|_, item| {
            if let Some(expiry) = item.expiry {
                return now <= expiry;
            }
            true
        });
        
        let removed = before_count - cache.len();
        if removed > 0 {
            debug!("Cleaned up {} expired cache items", removed);
        }
        
        removed
    }
    
    // 移除最旧的缓存项
    fn evict_oldest(&self, cache: &mut HashMap<K, CacheItem<V>>) {
        if cache.is_empty() {
            return;
        }
        
        // 查找最旧的项
        let oldest_key = cache.iter()
            .min_by_key(|(_, item)| item.last_accessed)
            .map(|(k, _)| k.clone());
        
        if let Some(key) = oldest_key {
            cache.remove(&key);
            debug!("Evicted oldest cache item: {:?}", key);
        }
    }
} 