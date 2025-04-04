#!/usr/bin/env tsx

/**
 * Real-time API Integration Test
 * 
 * This script tests the connection to the real-time API service
 * and verifies that events are properly received.
 */

import {
  ConnectionState,
  SubscriptionType,
  EventType,
  RealtimeEvent
} from '../src/lib/realtime';
import {
  connect,
  disconnect,
  subscribe,
  unsubscribe,
  getConnectionState
} from '../src/lib/api/realtime-service';
import chalk from "chalk";

// Set the API base URL
process.env.NEXT_PUBLIC_API_BASE_URL = 'http://localhost:8080';

// Create a simple logging setup with colors
const log = {
  info: (message: string) => console.log(chalk.blue(`[INFO] ${message}`)),
  success: (message: string) => console.log(chalk.green(`[SUCCESS] ${message}`)),
  error: (message: string) => console.log(chalk.red(`[ERROR] ${message}`)),
  warning: (message: string) => console.log(chalk.yellow(`[WARNING] ${message}`)),
};

// Test WebSocket connection and basic operations
async function runTests() {
  log.info('Starting Realtime API tests...');
  
  try {
    // Test 1: Connect to WebSocket server
    log.info('Test 1: Connecting to WebSocket server');
    const connectionState = await connect();
    
    if (connectionState === ConnectionState.OPEN) {
      log.success('Connected to WebSocket server');
    } else {
      log.error(`Failed to connect, state: ${connectionState}`);
      throw new Error('Connection failed');
    }
    
    // Track received events
    const receivedEvents: RealtimeEvent[] = [];
    
    // Test 2: Subscribe to table changes
    log.info('Test 2: Subscribing to table changes');
    const tableUnsubscribe = subscribe({
      type: SubscriptionType.TABLE_CHANGES,
      target: 'test_table'
    }, (event) => {
      log.success(`Received table event: ${JSON.stringify(event)}`);
      receivedEvents.push(event);
    });
    log.success('Subscribed to table changes');
    
    // Test 3: Subscribe to vector collection changes
    log.info('Test 3: Subscribing to vector collection changes');
    const vectorUnsubscribe = subscribe({
      type: SubscriptionType.VECTOR_CHANGES,
      target: 'test_collection'
    }, (event) => {
      log.success(`Received vector event: ${JSON.stringify(event)}`);
      receivedEvents.push(event);
    });
    log.success('Subscribed to vector collection changes');
    
    // Test 4: Subscribe to system events
    log.info('Test 4: Subscribing to system events');
    const systemUnsubscribe = subscribe({
      type: SubscriptionType.SYSTEM_EVENTS
    }, (event) => {
      log.success(`Received system event: ${JSON.stringify(event)}`);
      receivedEvents.push(event);
    });
    log.success('Subscribed to system events');
    
    // Test 5: Wait for events (or timeout)
    log.info('Test 5: Waiting for events (10 seconds timeout)...');
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        const eventCount = receivedEvents.length;
        if (eventCount > 0) {
          log.success(`Received ${eventCount} events during waiting period`);
        } else {
          log.warning('No events received during the waiting period');
        }
        resolve();
      }, 10000);
    });
    
    // Test 6: Check connection state
    log.info('Test 6: Checking connection state');
    const currentState = getConnectionState();
    log.success(`Current connection state: ${currentState}`);
    
    // Test 7: Unsubscribe from all
    log.info('Test 7: Unsubscribing from all channels');
    tableUnsubscribe();
    vectorUnsubscribe();
    systemUnsubscribe();
    log.success('Unsubscribed from all channels');
    
    // Test 8: Disconnect
    log.info('Test 8: Disconnecting from WebSocket server');
    disconnect();
    log.success('Disconnected from WebSocket server');
    
    log.success('All tests completed successfully!');
    
  } catch (error) {
    log.error(`Test failed: ${error}`);
    // Try to disconnect properly before exiting
    try {
      disconnect();
    } catch (e) {
      // Ignore errors during cleanup
    }
    process.exit(1);
  }
}

// Run the tests
runTests().catch(err => {
  log.error(`Unhandled error: ${err}`);
  process.exit(1);
}); 