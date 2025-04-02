# LumosDB TypeScript Client

TypeScript client library for interacting with LumosDB API.

## Installation

```bash
# Using npm
npm install lumosdb-client

# Using Yarn
yarn add lumosdb-client

# Using Bun
bun add lumosdb-client
```

## Usage

### Initializing the Client

```typescript
import { LumosDBClient } from 'lumosdb-client';

// Create a client instance
const client = new LumosDBClient('http://localhost:3000');

// Optionally add authentication
client.setApiKey('your-api-key');
```

### Database Operations

```typescript
// Get all tables
const tables = await client.db.getTables();

// Get table schema
const userTable = await client.db.getTableInfo('users');

// Execute a query
const result = await client.db.query('SELECT * FROM users WHERE age > ?', [18]);

// Execute an update
const updated = await client.db.execute(
  'UPDATE users SET name = ? WHERE id = ?',
  ['John Doe', 1]
);

// Create a table
await client.db.createTable(`
  CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL
  )
`);

// Drop a table
await client.db.dropTable('products');
```

### Vector Operations

```typescript
// Get all collections
const collections = await client.vector.getCollections();

// Create a vector collection
await client.vector.createCollection('documents', 128);

// Add vector
await client.vector.addVector('documents', {
  id: 'doc1',
  values: [0.1, 0.2, ... 0.9], // 128-dimensional vector
  metadata: { title: 'Document 1', category: 'tech' }
});

// Batch add vectors
await client.vector.addVectors('documents', [
  {
    id: 'doc2',
    values: [0.2, 0.3, ... 0.8],
    metadata: { title: 'Document 2', category: 'finance' }
  },
  {
    id: 'doc3',
    values: [0.3, 0.4, ... 0.7],
    metadata: { title: 'Document 3', category: 'tech' }
  }
]);

// Search for similar vectors
const results = await client.vector.search(
  'documents',
  [0.1, 0.2, ... 0.9], // Query vector
  5, // Top K results
  { category: 'tech' } // Optional metadata filter
);
```

### Health Checks

```typescript
// Check API health
const health = await client.health.check();
console.log(`API Status: ${health.status}`);
console.log(`Version: ${health.version}`);
console.log(`Uptime: ${health.uptime} seconds`);
```

## Error Handling

All methods will throw an error if the API returns an error response:

```typescript
try {
  const tables = await client.db.getTables();
} catch (error) {
  console.error('API Error:', error.message);
}
```

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-org/lumosdb-client.git
cd lumosdb-client

# Install dependencies
bun install

# Build the library
bun run build
```

### Running Tests

```bash
bun run test
```

## License

MIT
