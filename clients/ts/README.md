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

## 最近更新

### 错误处理和特殊字符支持改进

1. 修复了 `DbClient.execute()` 用于SELECT语句时的错误消息，使其与后端一致
2. 改进 `DbClient.getTableInfo()` 方法，现在能正确处理Unicode字符和特殊字符
3. 优化了 `prepareSqlWithSafeTableNames()` 函数，确保保留SQL关键字的原始大小写
4. 增强了 `tableExists()` 方法的稳定性，能处理各种表名格式和异常情况
5. 添加针对 `executeSql()` 方法的全面测试，验证其自动选择适当方法的能力

### 测试覆盖

增加了以下测试场景:

- 处理包含特殊字符的表名
- 用于检验 `executeSql()` 方法处理不同SQL类型的行为
- 确认SQL注入防护机制的有效性
- 验证错误处理和边缘情况的正确响应

## 使用示例

```typescript
import { LumosDBClient } from 'lumosdb-client';

// Create a client instance
const client = new LumosDBClient('http://localhost:3000');

// Optionally add authentication
client.setApiKey('your-api-key');
```
