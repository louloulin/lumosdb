/**
 * Real implementation of the real-time client that uses the realtime-service.ts
 * This replaces the mock implementation in mock-realtime-service.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { API_BASE_URL } from './api-config';
import * as realtimeService from './api/realtime-service';

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

// Realtime client implementation using the real service
export class RealtimeClient {
  private connectionState: ConnectionState = ConnectionState.CLOSED;
  private subscriptions: Map<string, (event: RealtimeEvent) => void> = new Map();
  private unsubscribeFunctions: Map<string, () => void> = new Map();
  
  constructor(private url: string = `${API_BASE_URL.replace(/^http/, 'ws')}/realtime`) {
    // Initialize the real service with the WebSocket URL
    realtimeService.initializeRealtimeService({
      url: this.url
    });
  }
  
  // Connect to the realtime server
  async connect(): Promise<ConnectionState> {
    if (this.connectionState === ConnectionState.OPEN || 
        this.connectionState === ConnectionState.CONNECTING) {
      return this.connectionState;
    }
    
    this.connectionState = ConnectionState.CONNECTING;
    
    try {
      const newState = await realtimeService.connect();
      this.connectionState = newState;
      
      // Resubscribe to all existing subscriptions
      if (newState === ConnectionState.OPEN) {
        this.subscriptions.forEach((callback, key) => {
          const subscription = JSON.parse(key) as SubscriptionOptions;
          this.sendSubscription(subscription, callback);
        });
      }
      
      return newState;
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.connectionState = ConnectionState.CLOSED;
      return ConnectionState.CLOSED;
    }
  }
  
  // Subscribe to real-time updates
  subscribe(options: SubscriptionOptions, callback: (event: RealtimeEvent) => void): () => void {
    const key = JSON.stringify(options);
    this.subscriptions.set(key, callback);
    
    if (this.connectionState === ConnectionState.OPEN) {
      this.sendSubscription(options, callback);
    } else if (this.connectionState === ConnectionState.CLOSED) {
      this.connect();
    }
    
    // Return unsubscribe function
    return () => {
      this.unsubscribe(options);
    };
  }
  
  // Send subscription to the server
  private sendSubscription(options: SubscriptionOptions, callback: (event: RealtimeEvent) => void) {
    const key = JSON.stringify(options);
    
    // Remove any existing subscription
    if (this.unsubscribeFunctions.has(key)) {
      const unsubscribe = this.unsubscribeFunctions.get(key);
      if (unsubscribe) unsubscribe();
      this.unsubscribeFunctions.delete(key);
    }
    
    // Subscribe using the real service
    const unsubscribe = realtimeService.subscribe(options, callback);
    this.unsubscribeFunctions.set(key, unsubscribe);
  }
  
  // Unsubscribe from updates
  unsubscribe(options: SubscriptionOptions) {
    const key = JSON.stringify(options);
    
    if (this.unsubscribeFunctions.has(key)) {
      const unsubscribe = this.unsubscribeFunctions.get(key);
      if (unsubscribe) unsubscribe();
      this.unsubscribeFunctions.delete(key);
    }
    
    this.subscriptions.delete(key);
  }
  
  // Disconnect from the server
  disconnect() {
    if (this.connectionState === ConnectionState.CLOSED) {
      return;
    }
    
    // Unsubscribe from all subscriptions
    this.unsubscribeFunctions.forEach(unsubscribe => {
      if (unsubscribe) unsubscribe();
    });
    
    // Clear all subscriptions
    this.subscriptions.clear();
    this.unsubscribeFunctions.clear();
    
    // Disconnect from the server
    realtimeService.disconnect();
    
    this.connectionState = ConnectionState.CLOSED;
  }
  
  // Get the current connection state
  getConnectionState(): ConnectionState {
    return realtimeService.getConnectionState();
  }
}

// Create a singleton instance
const realtimeClient = new RealtimeClient();

// React hook for subscribing to real-time updates
export function useRealtimeSubscription(options: SubscriptionOptions) {
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    setLoading(true);
    
    try {
      // Subscribe to events
      const unsubscribe = realtimeService.subscribe(options, (event) => {
        setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
      });
      
      setLoading(false);
      
      // Cleanup on unmount
      return () => {
        unsubscribe();
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [JSON.stringify(options)]);
  
  return { events, loading, error };
}

// React hook for managing WebSocket connection
export function useRealtimeConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(
    realtimeClient.getConnectionState()
  );
  
  const connect = useCallback(async () => {
    try {
      const state = await realtimeClient.connect();
      setConnectionState(state);
      return state;
    } catch (error) {
      setConnectionState(ConnectionState.CLOSED);
      console.error("Failed to connect:", error);
      toast.error("Failed to connect to realtime service");
      return ConnectionState.CLOSED;
    }
  }, []);
  
  const disconnect = useCallback(() => {
    realtimeClient.disconnect();
    setConnectionState(ConnectionState.CLOSED);
  }, []);
  
  return { connectionState, connect, disconnect };
}

// Export singleton methods for convenience
export const connect = () => realtimeClient.connect();
export const disconnect = () => realtimeClient.disconnect();
export const getConnectionState = () => realtimeClient.getConnectionState();
export const subscribe = (options: SubscriptionOptions, callback: (event: RealtimeEvent) => void) => 
  realtimeClient.subscribe(options, callback);
export const unsubscribe = (options: SubscriptionOptions) => 
  realtimeClient.unsubscribe(options); 