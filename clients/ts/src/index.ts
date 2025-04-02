import { ApiClient } from './core/api-client';
import { DbClient } from './clients/db-client';
import { VectorClient } from './clients/vector-client';
import { HealthClient } from './clients/health-client';

/**
 * LumosDB客户端主类
 * 提供数据库、向量和健康检查等操作
 */
export class LumosDBClient {
  /** API客户端 */
  private apiClient: ApiClient;
  
  /** 数据库客户端 */
  public db: DbClient;
  
  /** 向量客户端 */
  public vector: VectorClient;
  
  /** 健康检查客户端 */
  public health: HealthClient;
  
  /**
   * 创建LumosDB客户端实例
   * @param baseURL API基础URL
   * @param apiKey API密钥(可选)
   */
  constructor(baseURL: string, apiKey?: string) {
    // 创建API客户端
    this.apiClient = new ApiClient(baseURL, {
      headers: apiKey ? {
        'Authorization': `Bearer ${apiKey}`
      } : undefined
    });
    
    // 初始化各个子客户端
    this.db = new DbClient(this.apiClient);
    this.vector = new VectorClient(this.apiClient);
    this.health = new HealthClient(this.apiClient);
  }
  
  /**
   * 设置API密钥
   * @param apiKey API密钥
   */
  setApiKey(apiKey: string): void {
    this.apiClient = new ApiClient(this.apiClient['client'].defaults.baseURL as string, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    });
    
    // 更新各个子客户端的API客户端
    this.db = new DbClient(this.apiClient);
    this.vector = new VectorClient(this.apiClient);
    this.health = new HealthClient(this.apiClient);
  }
}

// 导出所有类型
export * from './types/core';
export * from './types/db';
export * from './types/vector';
export * from './types/health'; 