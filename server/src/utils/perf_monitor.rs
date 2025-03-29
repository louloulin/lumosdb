use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use log::{debug, info};

/// 简单的性能监控器，用于跟踪操作执行时间和统计信息
#[derive(Debug, Clone)]
pub struct PerfMonitor {
    name: String,
    total_calls: Arc<AtomicU64>,
    total_duration_ns: Arc<AtomicU64>,
    min_duration_ns: Arc<AtomicU64>,
    max_duration_ns: Arc<AtomicU64>,
}

impl PerfMonitor {
    /// 创建新的性能监控器
    pub fn new(name: &str) -> Self {
        Self {
            name: name.to_string(),
            total_calls: Arc::new(AtomicU64::new(0)),
            total_duration_ns: Arc::new(AtomicU64::new(0)),
            min_duration_ns: Arc::new(AtomicU64::new(u64::MAX)),
            max_duration_ns: Arc::new(AtomicU64::new(0)),
        }
    }
    
    /// 开始一个新的计时操作
    pub fn start(&self) -> PerfTimer {
        PerfTimer {
            monitor: self.clone(),
            start_time: Instant::now(),
        }
    }
    
    /// 直接记录一个持续时间
    pub fn record_duration(&self, duration: Duration) {
        let duration_ns = duration.as_nanos() as u64;
        
        self.total_calls.fetch_add(1, Ordering::Relaxed);
        self.total_duration_ns.fetch_add(duration_ns, Ordering::Relaxed);
        
        // 更新最小值
        let mut current_min = self.min_duration_ns.load(Ordering::Relaxed);
        while duration_ns < current_min {
            match self.min_duration_ns.compare_exchange(
                current_min, 
                duration_ns, 
                Ordering::Relaxed, 
                Ordering::Relaxed
            ) {
                Ok(_) => break,
                Err(actual) => current_min = actual,
            }
        }
        
        // 更新最大值
        let mut current_max = self.max_duration_ns.load(Ordering::Relaxed);
        while duration_ns > current_max {
            match self.max_duration_ns.compare_exchange(
                current_max, 
                duration_ns, 
                Ordering::Relaxed, 
                Ordering::Relaxed
            ) {
                Ok(_) => break,
                Err(actual) => current_max = actual,
            }
        }
    }
    
    /// 获取统计信息
    pub fn get_stats(&self) -> PerfStats {
        let total_calls = self.total_calls.load(Ordering::Relaxed);
        let total_duration_ns = self.total_duration_ns.load(Ordering::Relaxed);
        let min_duration_ns = self.min_duration_ns.load(Ordering::Relaxed);
        let max_duration_ns = self.max_duration_ns.load(Ordering::Relaxed);
        
        let avg_duration_ns = if total_calls > 0 {
            total_duration_ns / total_calls
        } else {
            0
        };
        
        PerfStats {
            name: self.name.clone(),
            total_calls,
            avg_duration: Duration::from_nanos(avg_duration_ns),
            min_duration: if min_duration_ns == u64::MAX { Duration::from_nanos(0) } else { Duration::from_nanos(min_duration_ns) },
            max_duration: Duration::from_nanos(max_duration_ns),
            total_duration: Duration::from_nanos(total_duration_ns),
        }
    }
    
    /// 记录并输出统计信息
    pub fn log_stats(&self) {
        let stats = self.get_stats();
        info!(
            "Performance stats for '{}': calls={}, avg={:?}, min={:?}, max={:?}, total={:?}",
            stats.name, stats.total_calls, stats.avg_duration, stats.min_duration, stats.max_duration, stats.total_duration
        );
    }
}

/// 性能计时器，用于测量单个操作的执行时间
pub struct PerfTimer {
    monitor: PerfMonitor,
    start_time: Instant,
}

impl Drop for PerfTimer {
    fn drop(&mut self) {
        let duration = self.start_time.elapsed();
        self.monitor.record_duration(duration);
        debug!(
            "Operation '{}' took {:?}",
            self.monitor.name, duration
        );
    }
}

/// 性能统计信息
#[derive(Debug, Clone)]
pub struct PerfStats {
    pub name: String,
    pub total_calls: u64,
    pub avg_duration: Duration,
    pub min_duration: Duration,
    pub max_duration: Duration,
    pub total_duration: Duration,
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::thread;
    
    #[test]
    fn test_performance_monitor() {
        let monitor = PerfMonitor::new("test_operation");
        
        // 模拟几个不同持续时间的操作
        {
            let _timer = monitor.start();
            thread::sleep(Duration::from_millis(10));
        }
        
        {
            let _timer = monitor.start();
            thread::sleep(Duration::from_millis(20));
        }
        
        {
            let _timer = monitor.start();
            thread::sleep(Duration::from_millis(5));
        }
        
        // 检查统计信息
        let stats = monitor.get_stats();
        
        assert_eq!(stats.total_calls, 3);
        assert!(stats.min_duration.as_millis() >= 5);
        assert!(stats.max_duration.as_millis() >= 20);
        assert!(stats.avg_duration.as_millis() > 0);
    }
} 