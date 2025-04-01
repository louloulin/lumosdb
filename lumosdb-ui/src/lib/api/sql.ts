// Mock database schema for SQLite tables
const mockSchema = {
  users: [
    { name: "id", type: "INTEGER", primary: true, nullable: false },
    { name: "name", type: "TEXT", primary: false, nullable: false },
    { name: "email", type: "TEXT", primary: false, nullable: false },
    { name: "created_at", type: "TEXT", primary: false, nullable: true },
  ],
  orders: [
    { name: "id", type: "INTEGER", primary: true, nullable: false },
    { name: "user_id", type: "INTEGER", primary: false, nullable: false },
    { name: "total", type: "REAL", primary: false, nullable: false },
    { name: "status", type: "TEXT", primary: false, nullable: false },
    { name: "created_at", type: "TEXT", primary: false, nullable: true },
  ],
  products: [
    { name: "id", type: "INTEGER", primary: true, nullable: false },
    { name: "name", type: "TEXT", primary: false, nullable: false },
    { name: "price", type: "REAL", primary: false, nullable: false },
    { name: "description", type: "TEXT", primary: false, nullable: true },
    { name: "category_id", type: "INTEGER", primary: false, nullable: true },
  ],
  categories: [
    { name: "id", type: "INTEGER", primary: true, nullable: false },
    { name: "name", type: "TEXT", primary: false, nullable: false },
  ],
  inventory: [
    { name: "id", type: "INTEGER", primary: true, nullable: false },
    { name: "product_id", type: "INTEGER", primary: false, nullable: false },
    { name: "quantity", type: "INTEGER", primary: false, nullable: false },
    { name: "location", type: "TEXT", primary: false, nullable: true },
  ],
};

// Mock data for tables
const mockData = {
  users: [
    { id: 1, name: "John Doe", email: "john@example.com", created_at: "2023-10-15" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", created_at: "2023-10-16" },
    { id: 3, name: "Bob Johnson", email: "bob@example.com", created_at: "2023-10-17" },
    { id: 4, name: "Alice Brown", email: "alice@example.com", created_at: "2023-10-18" },
    { id: 5, name: "Charlie Wilson", email: "charlie@example.com", created_at: "2023-10-19" },
  ],
  orders: [
    { id: 1, user_id: 1, total: 99.99, status: "completed", created_at: "2023-10-15" },
    { id: 2, user_id: 2, total: 149.99, status: "processing", created_at: "2023-10-16" },
    { id: 3, user_id: 3, total: 29.99, status: "completed", created_at: "2023-10-17" },
    { id: 4, user_id: 1, total: 39.99, status: "completed", created_at: "2023-10-18" },
    { id: 5, user_id: 4, total: 199.99, status: "pending", created_at: "2023-10-19" },
  ],
  products: [
    { id: 1, name: "Laptop", price: 999.99, description: "High-end laptop", category_id: 1 },
    { id: 2, name: "Smartphone", price: 699.99, description: "Latest smartphone", category_id: 1 },
    { id: 3, name: "Headphones", price: 149.99, description: "Noise-cancelling headphones", category_id: 1 },
    { id: 4, name: "T-shirt", price: 19.99, description: "Cotton t-shirt", category_id: 2 },
    { id: 5, name: "Jeans", price: 49.99, description: "Denim jeans", category_id: 2 },
  ],
  categories: [
    { id: 1, name: "Electronics" },
    { id: 2, name: "Clothing" },
    { id: 3, name: "Books" },
    { id: 4, name: "Home" },
  ],
  inventory: [
    { id: 1, product_id: 1, quantity: 25, location: "Warehouse A" },
    { id: 2, product_id: 2, quantity: 50, location: "Warehouse A" },
    { id: 3, product_id: 3, quantity: 100, location: "Warehouse B" },
    { id: 4, product_id: 4, quantity: 200, location: "Warehouse C" },
    { id: 5, product_id: 5, quantity: 150, location: "Warehouse C" },
  ],
};

// Saved queries
export const savedQueries = [
  { 
    id: 1,
    name: "All Users", 
    query: "SELECT * FROM users", 
    createdAt: "2023-10-15",
    database: "sqlite"
  },
  { 
    id: 2,
    name: "Recent Orders", 
    query: "SELECT * FROM orders WHERE created_at > date('now', '-7 days')", 
    createdAt: "2023-11-02",
    database: "sqlite"
  },
  { 
    id: 3,
    name: "Product Inventory", 
    query: "SELECT products.name, SUM(inventory.quantity) as total FROM products JOIN inventory ON products.id = inventory.product_id GROUP BY products.id", 
    createdAt: "2023-09-28",
    database: "sqlite"
  },
  { 
    id: 4,
    name: "Category Products", 
    query: "SELECT categories.name as category, COUNT(products.id) as product_count FROM categories LEFT JOIN products ON categories.id = products.category_id GROUP BY categories.id", 
    createdAt: "2023-12-05",
    database: "sqlite"
  },
  { 
    id: 5,
    name: "User Order Summary", 
    query: "SELECT users.name, COUNT(orders.id) as order_count, SUM(orders.total) as total_spent FROM users LEFT JOIN orders ON users.id = orders.user_id GROUP BY users.id", 
    createdAt: "2024-01-10",
    database: "sqlite"
  },
];

// Very simple SQL parser for demonstration
// Note: This is a simplified version that only handles basic queries
export function executeSQLQuery(query: string): Promise<{ data: any[] | null; error: string | null; duration: number }> {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      try {
        // Convert query to lowercase for easier parsing
        const lowerQuery = query.toLowerCase().trim();
        
        // SELECT query
        if (lowerQuery.startsWith('select')) {
          // Very basic parsing - extract table name
          const fromIndex = lowerQuery.indexOf('from');
          if (fromIndex === -1) {
            resolve({ data: null, error: "Invalid SELECT query: missing FROM clause", duration: 0 });
            return;
          }
          
          const afterFrom = lowerQuery.substring(fromIndex + 4).trim();
          const tableName = afterFrom.split(' ')[0].trim();
          
          // Check if table exists
          if (!mockData[tableName as keyof typeof mockData]) {
            resolve({ data: null, error: `Table '${tableName}' does not exist`, duration: 0 });
            return;
          }
          
          // For simplicity, we'll just return all data from the table
          // In a real implementation, we would parse the SELECT clause, WHERE conditions, etc.
          const data = mockData[tableName as keyof typeof mockData];
          
          resolve({ data, error: null, duration: Math.random() * 0.1 + 0.02 });
          return;
        }
        
        // Fallback for unsupported queries
        resolve({ 
          data: [], 
          error: "This is a mock implementation. Only basic SELECT queries are supported.", 
          duration: Math.random() * 0.1 + 0.02 
        });
      } catch (error) {
        resolve({ 
          data: null, 
          error: `Error executing query: ${error instanceof Error ? error.message : String(error)}`, 
          duration: Math.random() * 0.1 + 0.02 
        });
      }
    }, 500); // 500ms delay
  });
}

// Get all tables
export function getTables(): Promise<string[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(Object.keys(mockSchema));
    }, 300);
  });
}

// Get table schema
export function getTableSchema(tableName: string): Promise<{ columns: any[] | null; error: string | null }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const schema = mockSchema[tableName as keyof typeof mockSchema];
      if (!schema) {
        resolve({ columns: null, error: `Table '${tableName}' does not exist` });
        return;
      }
      
      resolve({ columns: schema, error: null });
    }, 300);
  });
}

// Get table data with pagination
export function getTableData(
  tableName: string, 
  options: { limit?: number; offset?: number }
): Promise<{ data: any[] | null; count: number; error: string | null }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const data = mockData[tableName as keyof typeof mockData];
      if (!data) {
        resolve({ data: null, count: 0, error: `Table '${tableName}' does not exist` });
        return;
      }
      
      const { limit = 10, offset = 0 } = options;
      const paginatedData = data.slice(offset, offset + limit);
      
      resolve({ data: paginatedData, count: data.length, error: null });
    }, 300);
  });
} 