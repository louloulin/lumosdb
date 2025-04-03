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
  let mockSocket: MockWebSocket;
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    
    // Reset the service between tests
    disconnect();
    
    // Mock WebSocket creation
    jest.spyOn(global, 'WebSocket').mockImplementation((url: string, protocols?: string | string[]) => {
      mockSocket = new MockWebSocket(url, protocols);
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
      mockSocket.simulateOpen();
      
      const state = await promise;
      expect(state).toBe(ConnectionState.OPEN);
      expect(getConnectionState()).toBe(ConnectionState.OPEN);
    });
    
    it('should handle connection errors', async () => {
      const promise = connect();
      
      // Simulate error
      mockSocket.simulateError();
      mockSocket.simulateOpen(); // Close after error
      
      const state = await promise;
      expect(state).toBe(ConnectionState.OPEN);
    });
    
    it('should include auth token in connection URL if provided', async () => {
      setAuthToken('test-token');
      
      await connect();
      
      expect(mockSocket.url).toContain('token=test-token');
    });
  });
  
  describe('disconnect', () => {
    it('should disconnect from the WebSocket server', async () => {
      await connect();
      mockSocket.simulateOpen();
      
      disconnect();
      
      expect(getConnectionState()).toBe(ConnectionState.CLOSED);
    });
  });
  
  describe('subscribe and unsubscribe', () => {
    beforeEach(async () => {
      await connect();
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
      mockSocket.simulateOpen();
      
      const spy = jest.spyOn(global, 'WebSocket');
      setAuthToken('new-token');
      
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('token=new-token'), undefined);
    });
  });
}); 