import { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { ApiConfig } from './api-config';
// Import the mock service for development
import { mockRealtimeService } from './mock-realtime-service';

// WebSocket connection states
export enum ConnectionState {
  CONNECTING = 'connecting',
  OPEN = 'open',
  CLOSING = 'closing',
  CLOSED = 'closed',
}

// Subscription types
export enum SubscriptionType {
  TABLE_CHANGES = 'table_changes',
  VECTOR_CHANGES = 'vector_changes',
  SYSTEM_EVENTS = 'system_events',
}

// Subscription options
export interface SubscriptionOptions {
  type: SubscriptionType;
  target?: string; // Table name or collection name
  filter?: Record<string, any>; // Optional filter criteria
}

// Event types
export enum EventType {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete',
  SYSTEM = 'system',
}

// Event data structure
export interface RealtimeEvent {
  id: string;
  type: EventType;
  table?: string;
  collection?: string;
  record?: Record<string, any>;
  timestamp: number;
}

// Realtime client implementation
export class RealtimeClient {
  private socket: WebSocket | null = null;
  private connectionState: ConnectionState = ConnectionState.CLOSED;
  private subscriptions: Map<string, (event: RealtimeEvent) => void> = new Map();
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectMaxAttempts: number = 5;
  private reconnectDelay: number = 1000; // Start with 1s delay
  private mockMode: boolean = process.env.NODE_ENV === 'development';
  private mockListeners: Map<string, () => void> = new Map();
  
  constructor(private url: string = `${ApiConfig.apiBaseUrl.replace(/^http/, 'ws')}/realtime`) {
    // Initialize with WebSocket URL based on API config
  }
  
  // Connect to the realtime server
  connect() {
    if (this.socket && (this.connectionState === ConnectionState.OPEN || 
        this.connectionState === ConnectionState.CONNECTING)) {
      return;
    }
    
    this.connectionState = ConnectionState.CONNECTING;
    
    // Use mock service in development
    if (this.mockMode) {
      console.log('Using mock realtime service for development');
      this.connectionState = ConnectionState.OPEN;
      mockRealtimeService.start();
      
      // Resubscribe to all existing subscriptions
      this.subscriptions.forEach((callback, key) => {
        const subscription = JSON.parse(key) as SubscriptionOptions;
        this.setupMockSubscription(subscription, callback);
      });
      
      return;
    }
    
    try {
      this.socket = new WebSocket(this.url);
      
      this.socket.onopen = this.handleOpen.bind(this);
      this.socket.onmessage = this.handleMessage.bind(this);
      this.socket.onclose = this.handleClose.bind(this);
      this.socket.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }
  
  // Handle WebSocket open event
  private handleOpen() {
    this.connectionState = ConnectionState.OPEN;
    this.reconnectAttempts = 0;
    
    // Resubscribe to all existing subscriptions
    this.subscriptions.forEach((_, key) => {
      const subscription = JSON.parse(key) as SubscriptionOptions;
      this.sendSubscription(subscription);
    });
  }
  
  // Handle WebSocket message event
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data) as RealtimeEvent;
      
      // Find relevant subscriptions and notify
      this.subscriptions.forEach((callback, key) => {
        const subscription = JSON.parse(key) as SubscriptionOptions;
        
        if (this.eventMatchesSubscription(data, subscription)) {
          callback(data);
        }
      });
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }
  
  // Check if an event matches a subscription
  private eventMatchesSubscription(event: RealtimeEvent, subscription: SubscriptionOptions): boolean {
    // Match system events
    if (subscription.type === SubscriptionType.SYSTEM_EVENTS && event.type === EventType.SYSTEM) {
      return true;
    }
    
    // Match table changes
    if (subscription.type === SubscriptionType.TABLE_CHANGES && 
        (event.type === EventType.INSERT || event.type === EventType.UPDATE || event.type === EventType.DELETE)) {
      // If no specific table is targeted or matches the event's table
      if (!subscription.target || subscription.target === event.table) {
        return true;
      }
    }
    
    // Match vector changes
    if (subscription.type === SubscriptionType.VECTOR_CHANGES && 
        (event.type === EventType.INSERT || event.type === EventType.UPDATE || event.type === EventType.DELETE)) {
      // If no specific collection is targeted or matches the event's collection
      if (!subscription.target || subscription.target === event.collection) {
        return true;
      }
    }
    
    return false;
  }
  
  // Handle WebSocket close event
  private handleClose(event: CloseEvent) {
    this.connectionState = ConnectionState.CLOSED;
    
    if (event.code !== 1000) { // Not a normal closure
      this.scheduleReconnect();
    }
  }
  
  // Handle WebSocket error event
  private handleError(error: Event) {
    console.error('WebSocket error:', error);
  }
  
  // Schedule a reconnection attempt
  private scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts < this.reconnectMaxAttempts) {
      this.reconnectAttempts++;
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      this.reconnectTimer = setTimeout(() => {
        this.connect();
      }, delay);
      
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.reconnectMaxAttempts})`);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }
  
  // Subscribe to real-time updates
  subscribe(options: SubscriptionOptions, callback: (event: RealtimeEvent) => void): () => void {
    const key = JSON.stringify(options);
    this.subscriptions.set(key, callback);
    
    // Use mock service in development
    if (this.mockMode) {
      if (this.connectionState === ConnectionState.OPEN) {
        this.setupMockSubscription(options, callback);
      } else if (this.connectionState === ConnectionState.CLOSED) {
        this.connect();
      }
    } else {
      if (this.connectionState === ConnectionState.OPEN) {
        this.sendSubscription(options);
      } else if (this.connectionState === ConnectionState.CLOSED) {
        this.connect();
      }
    }
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(options);
    };
  }
  
  // Set up a mock subscription
  private setupMockSubscription(options: SubscriptionOptions, callback: (event: RealtimeEvent) => void) {
    const key = JSON.stringify(options);
    
    // Remove existing listener if any
    if (this.mockListeners.has(key)) {
      const removeListener = this.mockListeners.get(key);
      if (removeListener) removeListener();
      this.mockListeners.delete(key);
    }
    
    // Add new listener
    const removeListener = mockRealtimeService.addEventListener((event) => {
      // Filter events based on subscription type
      if (this.eventMatchesSubscription(event, options)) {
        callback(event);
      }
    });
    
    this.mockListeners.set(key, removeListener);
  }
  
  // Send subscription message to server
  private sendSubscription(options: SubscriptionOptions) {
    if (this.socket && this.connectionState === ConnectionState.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'subscribe',
        ...options
      }));
    }
  }
  
  // Unsubscribe from real-time updates
  unsubscribe(options: SubscriptionOptions) {
    const key = JSON.stringify(options);
    this.subscriptions.delete(key);
    
    if (this.socket && this.connectionState === ConnectionState.OPEN) {
      this.socket.send(JSON.stringify({
        action: 'unsubscribe',
        ...options
      }));
    }
  }
  
  // Disconnect from the realtime server
  disconnect() {
    if (this.mockMode) {
      this.connectionState = ConnectionState.CLOSING;
      
      // Clear all mock listeners
      this.mockListeners.forEach((removeListener) => {
        if (removeListener) removeListener();
      });
      this.mockListeners.clear();
      
      // Stop the mock service
      mockRealtimeService.stop();
      
      this.connectionState = ConnectionState.CLOSED;
      return;
    }
    
    if (this.socket && this.connectionState !== ConnectionState.CLOSED) {
      this.connectionState = ConnectionState.CLOSING;
      this.socket.close(1000, 'Client disconnected');
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  
  // Get current connection state
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }
}

// Create a singleton instance
export const realtimeClient = new RealtimeClient();

// React hook for using realtime subscriptions
export function useRealtimeSubscription(options: SubscriptionOptions) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  
  useEffect(() => {
    // Check connection state
    setIsConnected(realtimeClient.getConnectionState() === ConnectionState.OPEN);
    
    // Subscribe to events
    const unsubscribe = realtimeClient.subscribe(options, (event) => {
      setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
    });
    
    // Connect if not already connected
    realtimeClient.connect();
    
    // Clean up subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [options]);
  
  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);
  
  return { events, isConnected, clearEvents };
}

// React hook for connection status
export function useRealtimeConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    realtimeClient.getConnectionState()
  );
  
  useEffect(() => {
    // Check connection status periodically
    const interval = setInterval(() => {
      const currentState = realtimeClient.getConnectionState();
      setConnectionState(currentState);
    }, 1000);
    
    // Connect if not already connected
    if (realtimeClient.getConnectionState() === ConnectionState.CLOSED) {
      realtimeClient.connect();
    }
    
    // Clean up interval on unmount
    return () => {
      clearInterval(interval);
    };
  }, []);
  
  const connect = useCallback(() => {
    realtimeClient.connect();
    toast.success("正在连接到实时数据服务");
  }, []);
  
  const disconnect = useCallback(() => {
    realtimeClient.disconnect();
    toast.info("已断开实时数据连接");
  }, []);
  
  return { connectionState, connect, disconnect };
} 