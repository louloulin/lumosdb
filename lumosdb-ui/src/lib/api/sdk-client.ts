import { LumosDBClient } from '@sdk';
import { API_BASE_URL } from '../api-config';

/**
 * SDK客户端单例
 * 用于全局统一管理SDK实例
 */
class SDKClientSingleton {
  private static instance: SDKClientSingleton;
  private client: LumosDBClient | null = null;
  private apiKey: string | null = null;

  private constructor() {
    // 私有构造函数，防止直接实例化
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): SDKClientSingleton {
    if (!SDKClientSingleton.instance) {
      SDKClientSingleton.instance = new SDKClientSingleton();
    }
    return SDKClientSingleton.instance;
  }

  /**
   * 初始化SDK客户端
   * @param apiKey 可选的API密钥
   */
  public initialize(apiKey?: string): void {
    if (this.client && !apiKey) return;
    if (this.client && apiKey && apiKey === this.apiKey) return;

    this.client = new LumosDBClient(API_BASE_URL, apiKey);
    this.apiKey = apiKey || null;
    console.log('LumosDB SDK客户端已初始化');
  }

  /**
   * 获取SDK客户端实例
   * 如果未初始化，则使用默认配置初始化
   */
  public getClient(): LumosDBClient {
    if (!this.client) {
      this.initialize();
    }
    return this.client!;
  }

  /**
   * 设置API密钥
   * @param apiKey API密钥
   */
  public setApiKey(apiKey: string): void {
    if (this.client) {
      this.client.setApiKey(apiKey);
      this.apiKey = apiKey;
    } else {
      this.initialize(apiKey);
    }
  }

  /**
   * 检查客户端是否已初始化
   */
  public isInitialized(): boolean {
    return !!this.client;
  }
}

// 导出单例实例
export const sdkClient = SDKClientSingleton.getInstance();

// 导出便捷函数，用于在组件中直接获取各种客户端
export const getDbClient = () => sdkClient.getClient().db;
export const getVectorClient = () => sdkClient.getClient().vector;
export const getHealthClient = () => sdkClient.getClient().health;

// 初始化SDK客户端
// 如果存在本地存储的API密钥，则使用它初始化
export const initializeSDK = () => {
  try {
    // 检查是否在浏览器环境
    if (typeof window !== 'undefined') {
      const storedApiKey = localStorage.getItem('lumos_api_key');
      if (storedApiKey) {
        sdkClient.initialize(storedApiKey);
      } else {
        sdkClient.initialize();
      }
    }
  } catch (error) {
    console.error('初始化SDK时出错:', error);
    // 默认初始化
    sdkClient.initialize();
  }
}; 