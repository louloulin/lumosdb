import {
  connect,
  disconnect,
  getConnectionState,
  initializeRealtimeService,
  setAuthToken,
  subscribe,
  unsubscribe
} from '../realtime-service';
import * as sdkClient from '../sdk-client';
import { ConnectionState, EventType, SubscriptionType } from '../../realtime';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getClient } from '../sdk-client';
import * as realtimeService from '../realtime-service';
import { handleApiError } from '../error-handler';

// Mock the SDK client and error handler
vi.mock('../sdk-client', () => ({
  getClient: vi.fn(),
}));

vi.mock('../error-handler', () => ({
  handleApiError: vi.fn(),
}));

// Mock the SDK client
jest.mock('../sdk-client', () => ({
  getClient: jest.fn().mockReturnValue({
    getBaseUrl: jest.fn().mockReturnValue('http://localhost:3000/api')
  })
}));

// Mock WebSocket
class MockWebSocket {
  url: string;
  protocols?: string | string[];
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent) => any) | null = null;
  
  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;
  }
  
  close(code?: number, reason?: string): void {
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }) as any);
    }
  }
  
  send(data: string): void {
    // Mock implementation
  }
  
  // Helper method for tests to simulate receiving messages
  simulateMessage(data: any): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }) as any);
    }
  }
  
  // Helper method for tests to simulate connection open
  simulateOpen(): void {
    if (this.onopen) {
      this.onopen(new Event('open') as any);
    }
  }
  
  // Helper method for tests to simulate error
  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error') as any);
    }
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any;

describe('realtime-service', () => {
  const mockClient = {
    realtimeApi: {
      getRealtimeUrl: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getClient as any).mockReturnValue(mockClient);
    jest.clearAllMocks();
    jest.restoreAllMocks();
    
    // Reset the service between tests
    disconnect();
    
    // Mock WebSocket creation
    jest.spyOn(global, 'WebSocket').mockImplementation((url: string, protocols?: string | string[]) => {
      const mockSocket = new MockWebSocket(url, protocols);
      return mockSocket as any;
    });
    
    // Initialize the service with test configuration
    initializeRealtimeService({
      url: 'ws://localhost:3000/realtime',
      reconnect: false,
      maxReconnectAttempts: 0,
      reconnectDelay: 0
    });
  });
  
  afterEach(() => {
    disconnect();
  });
  
  describe('connect', () => {
    it('should connect to the WebSocket server', async () => {
      const promise = connect();
      
      // Simulate successful connection
      const mockSocket = global.WebSocket as MockWebSocket;
      mockSocket.simulateOpen();
      
      const state = await promise;
      expect(state).toBe(ConnectionState.OPEN);
      expect(getConnectionState()).toBe(ConnectionState.OPEN);
    });
    
    it('should handle connection errors', async () => {
      const promise = connect();
      
      // Simulate error
      const mockSocket = global.WebSocket as MockWebSocket;
      mockSocket.simulateError();
      mockSocket.simulateOpen(); // Close after error
      
      const state = await promise;
      expect(state).toBe(ConnectionState.OPEN);
    });
    
    it('should include auth token in connection URL if provided', async () => {
      setAuthToken('test-token');
      
      await connect();
      
      const mockSocket = global.WebSocket as MockWebSocket;
      expect(mockSocket.url).toContain('token=test-token');
    });
  });
  
  describe('disconnect', () => {
    it('should disconnect from the WebSocket server', async () => {
      await connect();
      const mockSocket = global.WebSocket as MockWebSocket;
      mockSocket.simulateOpen();
      
      disconnect();
      
      expect(getConnectionState()).toBe(ConnectionState.CLOSED);
    });
  });
  
  describe('subscribe and unsubscribe', () => {
    beforeEach(async () => {
      await connect();
      const mockSocket = global.WebSocket as MockWebSocket;
      mockSocket.simulateOpen();
    });
    
    it('should subscribe to real-time events', () => {
      const spy = jest.spyOn(mockSocket, 'send');
      const handler = jest.fn();
      
      const options = {
        type: SubscriptionType.TABLE_CHANGES,
        target: 'users'
      };
      
      const unsubscribeFn = subscribe(options, handler);
      
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"action":"subscribe"'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"type":"TABLE_CHANGES"'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"target":"users"'));
      
      // It should return an unsubscribe function
      expect(typeof unsubscribeFn).toBe('function');
    });
    
    it('should handle incoming events that match subscriptions', () => {
      const handler = jest.fn();
      
      const options = {
        type: SubscriptionType.TABLE_CHANGES,
        target: 'users'
      };
      
      subscribe(options, handler);
      
      const event = {
        type: EventType.INSERT,
        table: 'users',
        record: { id: 1, name: 'Test User' },
        timestamp: new Date().toISOString()
      };
      
      // Simulate receiving a message
      mockSocket.simulateMessage(event);
      
      expect(handler).toHaveBeenCalledWith(event);
    });
    
    it('should not trigger handlers for events that do not match subscriptions', () => {
      const handler = jest.fn();
      
      const options = {
        type: SubscriptionType.TABLE_CHANGES,
        target: 'users'
      };
      
      subscribe(options, handler);
      
      const event = {
        type: EventType.INSERT,
        table: 'products', // Different table
        record: { id: 1, name: 'Test Product' },
        timestamp: new Date().toISOString()
      };
      
      // Simulate receiving a message
      mockSocket.simulateMessage(event);
      
      expect(handler).not.toHaveBeenCalled();
    });
    
    it('should unsubscribe from events', () => {
      const spy = jest.spyOn(mockSocket, 'send');
      const handler = jest.fn();
      
      const options = {
        type: SubscriptionType.TABLE_CHANGES,
        target: 'users'
      };
      
      const unsubscribeFn = subscribe(options, handler);
      
      // Reset the mock to check only the unsubscribe call
      spy.mockClear();
      
      unsubscribeFn();
      
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"action":"unsubscribe"'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"type":"TABLE_CHANGES"'));
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('"target":"users"'));
      
      // After unsubscribing, events should not trigger the handler
      const event = {
        type: EventType.INSERT,
        table: 'users',
        record: { id: 1, name: 'Test User' },
        timestamp: new Date().toISOString()
      };
      
      mockSocket.simulateMessage(event);
      
      expect(handler).not.toHaveBeenCalled();
    });
    
    it('should support event filtering', () => {
      const handler = jest.fn();
      
      const options = {
        type: SubscriptionType.TABLE_CHANGES,
        target: 'users',
        filter: { department: 'engineering' }
      };
      
      subscribe(options, handler);
      
      // Event that matches the filter
      const matchingEvent = {
        type: EventType.INSERT,
        table: 'users',
        record: { id: 1, name: 'Test Engineer', department: 'engineering' },
        timestamp: new Date().toISOString()
      };
      
      // Event that doesn't match the filter
      const nonMatchingEvent = {
        type: EventType.INSERT,
        table: 'users',
        record: { id: 2, name: 'Test Manager', department: 'management' },
        timestamp: new Date().toISOString()
      };
      
      mockSocket.simulateMessage(matchingEvent);
      expect(handler).toHaveBeenCalledWith(matchingEvent);
      
      handler.mockClear();
      
      mockSocket.simulateMessage(nonMatchingEvent);
      expect(handler).not.toHaveBeenCalled();
    });
  });
  
  describe('setAuthToken', () => {
    it('should update the auth token and reconnect if already connected', async () => {
      await connect();
      const mockSocket = global.WebSocket as MockWebSocket;
      mockSocket.simulateOpen();
      
      const spy = jest.spyOn(global, 'WebSocket');
      setAuthToken('new-token');
      
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('token=new-token'), undefined);
    });
  });

  describe('getWebSocketUrl', () => {
    it('should return WebSocket URL when API call is successful', async () => {
      const mockUrl = 'wss://example.com/websocket';
      mockClient.realtimeApi.getRealtimeUrl.mockResolvedValueOnce({ url: mockUrl });

      const result = await realtimeService.getWebSocketUrl();

      expect(mockClient.realtimeApi.getRealtimeUrl).toHaveBeenCalledTimes(1);
      expect(result).toBe(mockUrl);
    });

    it('should handle API error when getting WebSocket URL fails', async () => {
      const mockError = new Error('API error');
      mockClient.realtimeApi.getRealtimeUrl.mockRejectedValueOnce(mockError);
      (handleApiError as any).mockImplementationOnce((err) => {
        throw err;
      });

      await expect(realtimeService.getWebSocketUrl()).rejects.toThrow('API error');
      expect(handleApiError).toHaveBeenCalledWith(mockError);
    });
  });

  describe('subscribeToTableChanges', () => {
    it('should format subscription message for table changes', () => {
      const tableName = 'users';
      
      const result = realtimeService.subscribeToTableChanges(tableName);
      
      expect(result).toEqual({
        type: 'subscribe',
        channel: 'table_changes',
        filter: { table_name: tableName }
      });
    });
  });

  describe('subscribeToVectorCollectionChanges', () => {
    it('should format subscription message for vector collection changes', () => {
      const collectionName = 'embeddings';
      
      const result = realtimeService.subscribeToVectorCollectionChanges(collectionName);
      
      expect(result).toEqual({
        type: 'subscribe',
        channel: 'vector_collection_changes',
        filter: { collection_name: collectionName }
      });
    });
  });

  describe('subscribeToSystemEvents', () => {
    it('should format subscription message for system events', () => {
      const eventTypes = ['backup_created', 'error'];
      
      const result = realtimeService.subscribeToSystemEvents(eventTypes);
      
      expect(result).toEqual({
        type: 'subscribe',
        channel: 'system_events',
        filter: { event_types: eventTypes }
      });
    });

    it('should use empty array when no event types are provided', () => {
      const result = realtimeService.subscribeToSystemEvents();
      
      expect(result).toEqual({
        type: 'subscribe',
        channel: 'system_events',
        filter: { event_types: [] }
      });
    });
  });

  describe('unsubscribe', () => {
    it('should format unsubscribe message', () => {
      const subscriptionId = '123456';
      
      const result = realtimeService.unsubscribe(subscriptionId);
      
      expect(result).toEqual({
        type: 'unsubscribe',
        subscription_id: subscriptionId
      });
    });
  });

  describe('formatEvent', () => {
    it('should format table change event', () => {
      const event = {
        event_type: 'table_change',
        table_name: 'users',
        operation: 'insert',
        timestamp: '2023-01-01T12:00:00Z',
        affected_rows: 5
      };
      
      const result = realtimeService.formatEvent(event);
      
      expect(result).toEqual({
        type: 'Table Change',
        target: 'users',
        operation: 'INSERT',
        details: '5 rows affected',
        timestamp: expect.any(Date),
        raw: event
      });
    });

    it('should format vector collection change event', () => {
      const event = {
        event_type: 'vector_collection_change',
        collection_name: 'embeddings',
        operation: 'update',
        timestamp: '2023-01-01T12:00:00Z',
        vectors_count: 10
      };
      
      const result = realtimeService.formatEvent(event);
      
      expect(result).toEqual({
        type: 'Vector Change',
        target: 'embeddings',
        operation: 'UPDATE',
        details: '10 vectors affected',
        timestamp: expect.any(Date),
        raw: event
      });
    });

    it('should format system event', () => {
      const event = {
        event_type: 'system_event',
        event_name: 'backup_created',
        timestamp: '2023-01-01T12:00:00Z',
        details: { backup_id: 'bk-123', size: '50MB' }
      };
      
      const result = realtimeService.formatEvent(event);
      
      expect(result).toEqual({
        type: 'System Event',
        target: 'backup_created',
        operation: 'INFO',
        details: JSON.stringify({ backup_id: 'bk-123', size: '50MB' }),
        timestamp: expect.any(Date),
        raw: event
      });
    });

    it('should handle unknown event types', () => {
      const event = {
        event_type: 'unknown_type',
        timestamp: '2023-01-01T12:00:00Z',
        data: 'some data'
      };
      
      const result = realtimeService.formatEvent(event);
      
      expect(result).toEqual({
        type: 'Unknown Event',
        target: 'unknown_type',
        operation: 'INFO',
        details: JSON.stringify({ data: 'some data' }),
        timestamp: expect.any(Date),
        raw: event
      });
    });
  });
}); 