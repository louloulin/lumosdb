import { 
  ConnectionState, 
  EventType, 
  RealtimeEvent, 
  SubscriptionOptions, 
  SubscriptionType
} from '../realtime';
import { handleError } from './error-handler';
import { API_BASE_URL } from '../api-config';

// WebSocket连接配置
interface WebSocketConfig {
  url: string;
  reconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  protocols?: string | string[];
}

// WebSocket事件处理器
type WebSocketEventHandler = (event: RealtimeEvent) => void;

/**
 * 实时数据服务
 * 负责管理WebSocket连接和实时数据订阅
 */
class RealtimeService {
  private socket: WebSocket | null = null;
  private connectionState: ConnectionState = ConnectionState.CLOSED;
  private subscriptions: Map<string, Set<WebSocketEventHandler>> = new Map();
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private authToken: string | null = null;

  private config: WebSocketConfig = {
    url: '',
    reconnect: true,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
  };

  /**
   * 初始化实时服务
   * @param config WebSocket配置
   */
  initialize(config?: Partial<WebSocketConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // 如果没有指定URL，从API配置中获取基础URL
    if (!this.config.url) {
      try {
        // 使用API配置的基础URL作为WebSocket连接基础
        const baseUrl = API_BASE_URL;
        if (baseUrl) {
          this.config.url = `${baseUrl.replace(/^http/, 'ws')}/realtime`;
        } else {
          console.error('无法获取API基础URL');
        }
      } catch (error) {
        console.error('获取API URL失败', error);
      }
    }
  }

  /**
   * 设置认证令牌
   * @param token 认证令牌
   */
  setAuthToken(token: string | null): void {
    this.authToken = token;
    
    // 如果已连接，需要重新连接以应用新的认证令牌
    if (this.connectionState === ConnectionState.OPEN) {
      this.disconnect();
      this.connect();
    }
  }

  /**
   * 连接到WebSocket服务器
   * @returns 连接状态的Promise
   */
  async connect(): Promise<ConnectionState> {
    if (!this.config.url) {
      console.error('WebSocket URL未配置');
      return ConnectionState.CLOSED;
    }

    if (this.socket && (this.connectionState === ConnectionState.OPEN || 
                         this.connectionState === ConnectionState.CONNECTING)) {
      return this.connectionState;
    }

    this.connectionState = ConnectionState.CONNECTING;

    return new Promise((resolve) => {
      try {
        // 构建完整的URL，包括认证令牌
        let url = this.config.url;
        if (this.authToken) {
          url += (url.includes('?') ? '&' : '?') + `token=${this.authToken}`;
        }

        this.socket = new WebSocket(url, this.config.protocols);
        
        this.socket.onopen = () => {
          this.connectionState = ConnectionState.OPEN;
          this.reconnectAttempts = 0;
          
          // 重新订阅所有活跃订阅
          this.resubscribeAll();
          
          resolve(this.connectionState);
        };
        
        this.socket.onmessage = (event: MessageEvent) => {
          this.handleMessage(event);
        };
        
        this.socket.onclose = (event: CloseEvent) => {
          this.connectionState = ConnectionState.CLOSED;
          
          if (this.config.reconnect && event.code !== 1000) {
            this.scheduleReconnect();
          }
          
          resolve(this.connectionState);
        };
        
        this.socket.onerror = (error: Event) => {
          console.error('WebSocket错误:', error);
          resolve(this.connectionState);
        };
      } catch (error) {
        console.error('WebSocket连接错误:', error);
        this.connectionState = ConnectionState.CLOSED;
        
        if (this.config.reconnect) {
          this.scheduleReconnect();
        }
        
        resolve(this.connectionState);
      }
    });
  }

  /**
   * 断开WebSocket连接
   */
  disconnect(): void {
    if (this.socket) {
      this.connectionState = ConnectionState.CLOSING;
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      try {
        this.socket.close(1000, 'Normal closure');
      } catch (error) {
        console.error('关闭WebSocket连接失败:', error);
      }
      
      this.socket = null;
      this.connectionState = ConnectionState.CLOSED;
    }
  }

  /**
   * 获取当前连接状态
   * @returns 连接状态
   */
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * 订阅实时数据
   * @param options 订阅选项
   * @param handler 事件处理函数
   * @returns 取消订阅的函数
   */
  subscribe(options: SubscriptionOptions, handler: WebSocketEventHandler): () => void {
    const key = JSON.stringify(options);
    
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set());
    }
    
    this.subscriptions.get(key)?.add(handler);
    
    // 如果已连接，发送订阅消息
    if (this.connectionState === ConnectionState.OPEN) {
      this.sendSubscription(options);
    }
    // 如果未连接，尝试连接
    else if (this.connectionState === ConnectionState.CLOSED) {
      this.connect();
    }
    
    // 返回取消订阅的函数
    return () => {
      this.unsubscribe(options, handler);
    };
  }

  /**
   * 取消订阅
   * @param options 订阅选项
   * @param handler 事件处理函数，如果未指定则取消所有该选项的订阅
   */
  unsubscribe(options: SubscriptionOptions, handler?: WebSocketEventHandler): void {
    const key = JSON.stringify(options);
    
    if (handler && this.subscriptions.has(key)) {
      const handlers = this.subscriptions.get(key);
      if (handlers) {
        handlers.delete(handler);
        
        if (handlers.size === 0) {
          this.subscriptions.delete(key);
          this.sendUnsubscription(options);
        }
      }
    } 
    else if (!handler && this.subscriptions.has(key)) {
      this.subscriptions.delete(key);
      this.sendUnsubscription(options);
    }
  }

  /**
   * 处理接收到的WebSocket消息
   * @param event WebSocket消息事件
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as RealtimeEvent;
      
      // 查找相关订阅并通知
      this.subscriptions.forEach((handlers, key) => {
        const subscription = JSON.parse(key) as SubscriptionOptions;
        
        if (this.eventMatchesSubscription(data, subscription)) {
          handlers.forEach(handler => {
            try {
              handler(data);
            } catch (error) {
              console.error('处理实时事件时发生错误:', error);
            }
          });
        }
      });
    } catch (error) {
      console.error('解析WebSocket消息失败:', error);
    }
  }

  /**
   * 检查事件是否匹配订阅条件
   * @param event 实时事件
   * @param subscription 订阅选项
   * @returns 是否匹配
   */
  private eventMatchesSubscription(event: RealtimeEvent, subscription: SubscriptionOptions): boolean {
    // 匹配系统事件
    if (subscription.type === SubscriptionType.SYSTEM_EVENTS && event.type === EventType.SYSTEM) {
      return true;
    }
    
    // 匹配表变更
    if (subscription.type === SubscriptionType.TABLE_CHANGES && 
        (event.type === EventType.INSERT || event.type === EventType.UPDATE || event.type === EventType.DELETE)) {
      // 如果没有指定具体的表名或匹配事件的表名
      if (!subscription.target || subscription.target === event.table) {
        // 如果有过滤条件，检查是否满足
        if (subscription.filter && event.record) {
          return this.recordMatchesFilter(event.record, subscription.filter);
        }
        return true;
      }
    }
    
    // 匹配向量变更
    if (subscription.type === SubscriptionType.VECTOR_CHANGES && 
        (event.type === EventType.INSERT || event.type === EventType.UPDATE || event.type === EventType.DELETE)) {
      // 如果没有指定具体的集合名或匹配事件的集合名
      if (!subscription.target || subscription.target === event.collection) {
        // 如果有过滤条件，检查是否满足
        if (subscription.filter && event.record) {
          return this.recordMatchesFilter(event.record, subscription.filter);
        }
        return true;
      }
    }
    
    return false;
  }

  /**
   * 检查记录是否匹配过滤条件
   * @param record 记录
   * @param filter 过滤条件
   * @returns 是否匹配
   */
  private recordMatchesFilter(record: Record<string, unknown>, filter: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(filter)) {
      if (record[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * 发送订阅消息
   * @param options 订阅选项
   */
  private sendSubscription(options: SubscriptionOptions): void {
    if (this.socket && this.connectionState === ConnectionState.OPEN) {
      try {
        this.socket.send(JSON.stringify({
          action: 'subscribe',
          ...options
        }));
      } catch (error) {
        console.error('发送订阅消息失败:', error);
      }
    }
  }

  /**
   * 发送取消订阅消息
   * @param options 订阅选项
   */
  private sendUnsubscription(options: SubscriptionOptions): void {
    if (this.socket && this.connectionState === ConnectionState.OPEN) {
      try {
        this.socket.send(JSON.stringify({
          action: 'unsubscribe',
          ...options
        }));
      } catch (error) {
        console.error('发送取消订阅消息失败:', error);
      }
    }
  }

  /**
   * 重新订阅所有活跃订阅
   */
  private resubscribeAll(): void {
    if (this.connectionState !== ConnectionState.OPEN) {
      return;
    }
    
    this.subscriptions.forEach((_, key) => {
      const subscription = JSON.parse(key) as SubscriptionOptions;
      this.sendSubscription(subscription);
    });
  }

  /**
   * 安排重新连接
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      this.reconnectAttempts++;
      
      // 指数退避策略: 1s, 2s, 4s, 8s, 16s...
      const delay = this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
      
      console.log(`将在${delay}ms后重新连接 (尝试 ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);
    } else {
      console.error('达到最大重连尝试次数');
    }
  }
}

// 单例实例
const realtimeService = new RealtimeService();

/**
 * 获取实时数据服务实例
 * @returns 实时数据服务实例
 */
export function getRealtimeService(): RealtimeService {
  return realtimeService;
}

/**
 * 初始化实时数据服务
 * @param config 配置
 */
export function initializeRealtimeService(config?: Partial<WebSocketConfig>): void {
  realtimeService.initialize(config);
}

/**
 * 设置认证令牌
 * @param token 认证令牌
 */
export function setAuthToken(token: string | null): void {
  realtimeService.setAuthToken(token);
}

/**
 * 连接到实时数据服务
 * @returns 连接状态
 */
export async function connect(): Promise<ConnectionState> {
  try {
    return await realtimeService.connect();
  } catch (error) {
    const apiError = handleError(error);
    console.error('连接到实时数据服务失败:', apiError);
    return ConnectionState.CLOSED;
  }
}

/**
 * 断开实时数据服务连接
 */
export function disconnect(): void {
  realtimeService.disconnect();
}

/**
 * 获取当前连接状态
 * @returns 连接状态
 */
export function getConnectionState(): ConnectionState {
  return realtimeService.getConnectionState();
}

/**
 * 订阅实时数据
 * @param options 订阅选项
 * @param handler 事件处理函数
 * @returns 取消订阅的函数
 */
export function subscribe(options: SubscriptionOptions, handler: WebSocketEventHandler): () => void {
  return realtimeService.subscribe(options, handler);
}

/**
 * 取消订阅
 * @param options 订阅选项
 * @param handler 事件处理函数
 */
export function unsubscribe(options: SubscriptionOptions, handler?: WebSocketEventHandler): void {
  realtimeService.unsubscribe(options, handler);
} 