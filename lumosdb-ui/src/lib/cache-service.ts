/**
 * 缓存项接口
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * 缓存配置
 */
interface CacheConfig {
  defaultTTL: number; // 默认缓存时间，单位毫秒
  maxItems: number;   // 最大缓存项数量
}

/**
 * 内存缓存服务
 * 用于缓存API响应和其他数据
 */
class CacheService {
  private cache: Map<string, CacheItem<any>> = new Map();
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 默认5分钟
    maxItems: 100,
  };

  /**
   * 设置缓存配置
   */
  public setConfig(config: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 设置缓存项
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 过期时间（毫秒）
   */
  public set<T>(key: string, data: T, ttl?: number): void {
    const actualTTL = ttl || this.config.defaultTTL;
    const now = Date.now();

    // 如果已达到最大缓存项数量，删除最旧的项
    if (this.cache.size >= this.config.maxItems && !this.cache.has(key)) {
      const oldestKey = this.findOldestCacheKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    // 设置缓存项
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + actualTTL,
    });
  }

  /**
   * 获取缓存项
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期则返回undefined
   */
  public get<T>(key: string): T | undefined {
    const item = this.cache.get(key);
    
    // 检查项是否存在并且未过期
    if (item && Date.now() < item.expiresAt) {
      return item.data as T;
    }
    
    // 如果项过期，则删除它
    if (item) {
      this.cache.delete(key);
    }
    
    return undefined;
  }

  /**
   * 移除缓存项
   * @param key 缓存键
   */
  public remove(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * 清除指定前缀的所有缓存项
   * @param prefix 缓存键前缀
   */
  public clearByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 查找最旧的缓存键
   * @returns 最旧的缓存键
   */
  private findOldestCacheKey(): string | undefined {
    let oldestKey: string | undefined;
    let oldestTimestamp = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTimestamp) {
        oldestTimestamp = item.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}

// 导出单例实例
export const cacheService = new CacheService();

/**
 * 缓存装饰器函数
 * 用于缓存异步函数的结果
 * 
 * @param keyPrefix 缓存键前缀
 * @param ttl 过期时间（毫秒），可选
 * @param keyGenerator 自定义键生成函数，可选
 * @returns 装饰器函数
 */
export function cached<T extends (...args: any[]) => Promise<any>>(
  keyPrefix: string,
  ttl?: number,
  keyGenerator?: (...args: Parameters<T>) => string
) {
  return function(
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value as T;

    descriptor.value = async function(...args: Parameters<T>) {
      // 生成缓存键
      const key = keyGenerator 
        ? `${keyPrefix}:${keyGenerator(...args)}`
        : `${keyPrefix}:${JSON.stringify(args)}`;

      // 检查缓存中是否有数据
      const cachedData = cacheService.get<ReturnType<T>>(key);
      if (cachedData !== undefined) {
        return cachedData;
      }

      // 调用原始方法
      const result = await originalMethod.apply(this, args);

      // 缓存结果
      cacheService.set(key, result, ttl);

      return result;
    };

    return descriptor;
  };
} 