use std::collections::HashMap;
use std::hash::Hash;
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use log::{debug, info};
use std::collections::VecDeque;

// LRU缓存实现
pub struct LruCache<K, V>
where
    K: Eq + Hash + Clone,
    V: Clone,
{
    cache: Arc<RwLock<HashMap<K, V>>>,
    lru_queue: Arc<RwLock<VecDeque<K>>>,
    ttl: Option<Duration>,
    expiry_times: Arc<RwLock<HashMap<K, Instant>>>,
    capacity: usize,
}

impl<K, V> LruCache<K, V>
where
    K: Eq + Hash + Clone,
    V: Clone,
{
    // 创建新的LRU缓存
    pub fn new(capacity: usize) -> Self {
        Self {
            cache: Arc::new(RwLock::new(HashMap::with_capacity(capacity))),
            lru_queue: Arc::new(RwLock::new(VecDeque::with_capacity(capacity))),
            ttl: None,
            expiry_times: Arc::new(RwLock::new(HashMap::with_capacity(capacity))),
            capacity,
        }
    }
    
    // 设置缓存项的生存时间(TTL)
    pub fn with_ttl(mut self, ttl: Duration) -> Self {
        self.ttl = Some(ttl);
        self
    }
    
    // 获取缓存项，更新LRU队列
    pub fn get(&self, key: &K) -> Option<V> {
        // 检查是否过期
        if self.is_expired(key) {
            // 过期了，删除
            self.remove(key);
            return None;
        }
        
        // 从缓存获取值
        let value = {
            let cache = self.cache.read().unwrap();
            cache.get(key).cloned()
        };
        
        // 如果找到了，更新LRU队列
        if value.is_some() {
            self.move_to_front(key);
        }
        
        value
    }
    
    // 设置缓存项
    pub fn set(&self, key: K, value: V) {
        // 检查是否已经存在
        let exists = {
            let cache = self.cache.read().unwrap();
            cache.contains_key(&key)
        };
        
        // 如果已经存在，更新值和队列
        if exists {
            {
                let mut cache = self.cache.write().unwrap();
                cache.insert(key.clone(), value);
            }
            self.move_to_front(&key);
            
            // 更新过期时间(如果有)
            if let Some(ttl) = self.ttl {
                let mut expiry_times = self.expiry_times.write().unwrap();
                expiry_times.insert(key, Instant::now() + ttl);
            }
        } else {
            // 如果达到容量，需要移除最久未使用的项
            if self.is_full() {
                self.evict_lru();
            }
            
            // 添加新项
            {
                let mut cache = self.cache.write().unwrap();
                cache.insert(key.clone(), value);
            }
            
            // 添加到队列前端
            {
                let mut queue = self.lru_queue.write().unwrap();
                queue.push_front(key.clone());
            }
            
            // 设置过期时间(如果有)
            if let Some(ttl) = self.ttl {
                let mut expiry_times = self.expiry_times.write().unwrap();
                expiry_times.insert(key, Instant::now() + ttl);
            }
        }
    }
    
    // 删除缓存项
    pub fn remove(&self, key: &K) -> bool {
        let removed = {
            let mut cache = self.cache.write().unwrap();
            cache.remove(key).is_some()
        };
        
        if removed {
            // 从LRU队列中移除
            {
                let mut queue = self.lru_queue.write().unwrap();
                let position = queue.iter().position(|k| k == key);
                if let Some(index) = position {
                    queue.remove(index);
                }
            }
            
            // 移除过期时间
            {
                let mut expiry_times = self.expiry_times.write().unwrap();
                expiry_times.remove(key);
            }
        }
        
        removed
    }
    
    // 清空缓存
    pub fn clear(&self) {
        {
            let mut cache = self.cache.write().unwrap();
            cache.clear();
        }
        {
            let mut queue = self.lru_queue.write().unwrap();
            queue.clear();
        }
        {
            let mut expiry_times = self.expiry_times.write().unwrap();
            expiry_times.clear();
        }
        
        info!("LRU Cache cleared");
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
        // 如果没有TTL，直接返回
        if self.ttl.is_none() {
            return 0;
        }
        
        let now = Instant::now();
        let mut keys_to_remove = Vec::new();
        
        // 找出所有过期的key
        {
            let expiry_times = self.expiry_times.read().unwrap();
            for (key, expiry) in expiry_times.iter() {
                if now > *expiry {
                    keys_to_remove.push(key.clone());
                }
            }
        }
        
        // 移除过期项
        for key in &keys_to_remove {
            self.remove(key);
        }
        
        let count = keys_to_remove.len();
        if count > 0 {
            debug!("Cleaned up {} expired LRU cache items", count);
        }
        
        count
    }
    
    // 检查key是否过期
    fn is_expired(&self, key: &K) -> bool {
        if let Some(_) = self.ttl {
            let expiry_times = self.expiry_times.read().unwrap();
            if let Some(expiry) = expiry_times.get(key) {
                return Instant::now() > *expiry;
            }
        }
        false
    }
    
    // 检查缓存是否已满
    fn is_full(&self) -> bool {
        let cache = self.cache.read().unwrap();
        cache.len() >= self.capacity
    }
    
    // 移除最久未使用的项
    fn evict_lru(&self) {
        // 获取最久未使用的key
        let lru_key = {
            let mut queue = self.lru_queue.write().unwrap();
            queue.pop_back()
        };
        
        // 如果找到了key，从缓存和过期时间中移除
        if let Some(key) = lru_key {
            {
                let mut cache = self.cache.write().unwrap();
                cache.remove(&key);
            }
            {
                let mut expiry_times = self.expiry_times.write().unwrap();
                expiry_times.remove(&key);
            }
            
            debug!("Evicted LRU cache item: {:?}", key);
        }
    }
    
    // 将key移动到队列前端
    fn move_to_front(&self, key: &K) {
        let mut queue = self.lru_queue.write().unwrap();
        
        // 查找key在队列中的位置
        let position = queue.iter().position(|k| k == key);
        
        if let Some(index) = position {
            // 移除当前位置
            queue.remove(index);
        }
        
        // 添加到队列前端
        queue.push_front(key.clone());
    }
} 