import { EventType, RealtimeEvent } from "./realtime";

/**
 * This is a mock service to simulate WebSocket events for demonstration purposes.
 * In a real application, this would be replaced with actual WebSocket communication.
 */
class MockRealtimeService {
  private timers: NodeJS.Timeout[] = [];
  private eventListeners: Array<(event: RealtimeEvent) => void> = [];
  private isActive = false;
  
  // Tables to generate fake events for
  private tableNames = ["users", "products", "orders", "transactions"];
  
  // Vector collections to generate fake events for
  private collectionNames = ["product_embeddings", "customer_profiles", "support_docs"];
  
  // Start generating mock events
  start() {
    if (this.isActive) return;
    this.isActive = true;
    
    // Generate table events
    this.timers.push(setInterval(() => {
      if (!this.isActive) return;
      
      const event = this.generateTableEvent();
      this.notifyListeners(event);
    }, 5000)); // Every 5 seconds
    
    // Generate vector events
    this.timers.push(setInterval(() => {
      if (!this.isActive) return;
      
      const event = this.generateVectorEvent();
      this.notifyListeners(event);
    }, 8000)); // Every 8 seconds
    
    // Generate system events occasionally
    this.timers.push(setInterval(() => {
      if (!this.isActive) return;
      
      const event = this.generateSystemEvent();
      this.notifyListeners(event);
    }, 15000)); // Every 15 seconds
    
    console.log("Mock realtime service started");
  }
  
  // Stop generating mock events
  stop() {
    this.isActive = false;
    this.timers.forEach(timer => clearInterval(timer));
    this.timers = [];
    console.log("Mock realtime service stopped");
  }
  
  // Add an event listener
  addEventListener(callback: (event: RealtimeEvent) => void) {
    this.eventListeners.push(callback);
    return () => {
      this.removeEventListener(callback);
    };
  }
  
  // Remove an event listener
  removeEventListener(callback: (event: RealtimeEvent) => void) {
    this.eventListeners = this.eventListeners.filter(listener => listener !== callback);
  }
  
  // Notify all listeners about a new event
  private notifyListeners(event: RealtimeEvent) {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Error in realtime event listener:", error);
      }
    });
  }
  
  // Generate a random table event
  private generateTableEvent(): RealtimeEvent {
    const eventTypes = [EventType.INSERT, EventType.UPDATE, EventType.DELETE];
    const eventType = this.getRandomItem(eventTypes);
    const tableName = this.getRandomItem(this.tableNames);
    const id = `tb_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const recordId = Math.floor(Math.random() * 1000);
    
    return {
      id,
      type: eventType,
      table: tableName,
      timestamp: Date.now(),
      record: eventType !== EventType.DELETE ? this.generateTableRecord(tableName, recordId) : { id: recordId }
    };
  }
  
  // Generate a random vector event
  private generateVectorEvent(): RealtimeEvent {
    const eventTypes = [EventType.INSERT, EventType.UPDATE, EventType.DELETE];
    const eventType = this.getRandomItem(eventTypes);
    const collectionName = this.getRandomItem(this.collectionNames);
    const id = `vec_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const recordId = Math.floor(Math.random() * 1000);
    
    return {
      id,
      type: eventType,
      collection: collectionName,
      timestamp: Date.now(),
      record: eventType !== EventType.DELETE ? this.generateVectorRecord(collectionName, recordId) : { id: recordId }
    };
  }
  
  // Generate a random system event
  private generateSystemEvent(): RealtimeEvent {
    const systemEvents = [
      "DB backup completed",
      "High memory usage detected",
      "New user registered",
      "API rate limit reached",
      "Vector index optimized",
      "Background task completed"
    ];
    
    const id = `sys_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const eventMessage = this.getRandomItem(systemEvents);
    
    return {
      id,
      type: EventType.SYSTEM,
      timestamp: Date.now(),
      record: {
        id: id,
        message: eventMessage,
        level: this.getRandomItem(["info", "warning", "error"])
      }
    };
  }
  
  // Generate fake record data for a table
  private generateTableRecord(tableName: string, id: number) {
    switch (tableName) {
      case "users":
        return {
          id,
          name: `User ${id}`,
          email: `user${id}@example.com`,
          created_at: new Date().toISOString()
        };
      case "products":
        return {
          id,
          name: `Product ${id}`,
          price: parseFloat((Math.random() * 1000).toFixed(2)),
          stock: Math.floor(Math.random() * 100)
        };
      case "orders":
        return {
          id,
          user_id: Math.floor(Math.random() * 100),
          total: parseFloat((Math.random() * 2000).toFixed(2)),
          status: this.getRandomItem(["pending", "processing", "completed"])
        };
      case "transactions":
        return {
          id,
          order_id: Math.floor(Math.random() * 100),
          amount: parseFloat((Math.random() * 500).toFixed(2)),
          type: this.getRandomItem(["payment", "refund", "deposit"])
        };
      default:
        return {
          id,
          name: `Item ${id}`
        };
    }
  }
  
  // Generate fake vector record data
  private generateVectorRecord(collectionName: string, id: number) {
    switch (collectionName) {
      case "product_embeddings":
        return {
          id,
          product_id: Math.floor(Math.random() * 1000),
          embedding_size: 384,
          metadata: {
            categories: this.getRandomArray(["electronics", "clothing", "furniture", "books"]),
            rating: parseFloat((Math.random() * 5).toFixed(1))
          }
        };
      case "customer_profiles":
        return {
          id,
          user_id: Math.floor(Math.random() * 500),
          embedding_size: 768,
          metadata: {
            preferences: this.getRandomArray(["sports", "tech", "fashion", "food"]),
            activity_score: parseFloat((Math.random() * 100).toFixed(1))
          }
        };
      case "support_docs":
        return {
          id,
          title: `Document ${id}`,
          embedding_size: 1024,
          metadata: {
            topics: this.getRandomArray(["installation", "troubleshooting", "tutorial", "faq"]),
            views: Math.floor(Math.random() * 10000)
          }
        };
      default:
        return {
          id,
          embedding_size: 384
        };
    }
  }
  
  // Helper to get a random item from an array
  private getRandomItem<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }
  
  // Helper to get a random subset of items from an array
  private getRandomArray<T>(array: T[], max = 3): T[] {
    const count = Math.floor(Math.random() * max) + 1;
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

// Export a singleton instance
export const mockRealtimeService = new MockRealtimeService(); 