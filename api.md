# LumosDB 前后端对接计划

## 概述

本文档描述了LumosDB UI(Next.js前端)与Rust后端服务器的API对接计划。LumosDB是一个轻量级数据平台，专为AI代理设计，它提供了数据库操作和向量搜索等功能。

## 当前架构

### 后端（Rust）

- **框架**：Actix-web
- **主要功能**：
  - 数据库操作（SQL查询、执行、管理表等）
  - 向量搜索（创建向量集合、添加向量、搜索相似向量等）
  - 健康检查API

### 前端（Next.js）

- **框架**：Next.js + shadcn/ui
- **构建工具**：Bun
- **AI集成**：使用Mastra框架创建AI代理

## API对接计划

### 1. 数据库操作API

#### 1.1 配置基础HTTP客户端

在前端创建一个基础HTTP客户端，用于与后端API通信：

```typescript
// src/lib/api-client.ts
import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 添加请求拦截器（用于认证等）
apiClient.interceptors.request.use((config) => {
  // 可以在这里添加认证token等
  return config;
});

// 添加响应拦截器
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 统一错误处理
    return Promise.reject(error);
  }
);
```

#### 1.2 数据库操作服务

创建数据库操作相关的API服务：

```typescript
// src/services/db-service.ts
import { apiClient } from '@/lib/api-client';

export interface QueryResult {
  columns: string[];
  rows: any[][];
}

export interface ExecuteResult {
  affected_rows: number;
}

export interface TableInfo {
  name: string;
  columns: {
    name: string;
    type: string;
    notnull: boolean;
    pk: boolean;
  }[];
}

export const dbService = {
  // 执行SQL查询
  async query(sql: string): Promise<QueryResult> {
    const response = await apiClient.post('/api/db/query', { sql });
    return response.data.data;
  },

  // 执行SQL语句（增删改）
  async execute(sql: string): Promise<ExecuteResult> {
    const response = await apiClient.post('/api/db/execute', { sql });
    return response.data.data;
  },

  // 获取所有表
  async getTables(): Promise<string[]> {
    const response = await apiClient.get('/api/db/tables');
    return response.data.data.tables;
  },

  // 获取表详情
  async getTableInfo(tableName: string): Promise<TableInfo> {
    const response = await apiClient.get(`/api/db/tables/${tableName}`);
    return response.data.data;
  },

  // 创建表
  async createTable(createTableSql: string): Promise<void> {
    await apiClient.post('/api/db/tables', { sql: createTableSql });
  },

  // 删除表
  async dropTable(tableName: string): Promise<void> {
    await apiClient.delete(`/api/db/tables/${tableName}`);
  }
};
```

### 2. 向量搜索API

创建向量操作相关的API服务：

```typescript
// src/services/vector-service.ts
import { apiClient } from '@/lib/api-client';

export interface Collection {
  name: string;
  dimension: number;
  distance: string;
  count: number;
}

export interface SearchResult {
  id: string;
  score: number;
  vector?: number[];
  metadata?: Record<string, any>;
}

export const vectorService = {
  // 获取所有向量集合
  async listCollections(): Promise<Collection[]> {
    const response = await apiClient.get('/api/vector/collections');
    return response.data.data.collections;
  },

  // 创建新的向量集合
  async createCollection(name: string, dimension: number): Promise<void> {
    await apiClient.post('/api/vector/collections', { name, dimension });
  },

  // 获取集合详情
  async getCollection(name: string): Promise<Collection> {
    const response = await apiClient.get(`/api/vector/collections/${name}`);
    return response.data.data;
  },

  // 删除集合
  async deleteCollection(name: string): Promise<void> {
    await apiClient.delete(`/api/vector/collections/${name}`);
  },

  // 添加向量
  async addEmbeddings(
    collectionName: string,
    ids: string[],
    embeddings: number[][],
    metadata?: Record<string, any>[]
  ): Promise<{ added: number }> {
    const response = await apiClient.post(`/api/vector/collections/${collectionName}/embeddings`, {
      ids,
      embeddings,
      metadata
    });
    return response.data.data;
  },

  // 搜索相似向量
  async searchSimilar(
    collectionName: string,
    vector: number[],
    topK: number
  ): Promise<SearchResult[]> {
    const response = await apiClient.post(`/api/vector/collections/${collectionName}/search`, {
      vector,
      top_k: topK
    });
    return response.data.data.results;
  }
};
```

### 3. 与AI助手集成

将后端API与AI助手集成，使AI助手能够执行真实的数据库操作：

```typescript
// src/mastra/agents/dbAgent.ts 更新
import { openai } from "@ai-sdk/openai";
import { Agent, createTool } from "@mastra/core";
import { dbService } from "@/services/db-service";
import { z } from "zod";

// 定义工具
const GenerateSQLParams = z.object({
  query: z.string().describe("用户对数据库的查询请求")
});

const ExecuteSQLParams = z.object({
  sql: z.string().describe("要执行的SQL语句")
});

const GetDatabaseSchemaParams = z.object({});

// 创建工具函数
const generateSQLTool = createTool({
  name: "generateSQL",
  description: "根据用户请求生成SQL查询语句",
  parameters: GenerateSQLParams,
  handler: async ({ query }) => {
    // 这里AI会生成SQL，不需要直接API调用
    return `根据您的请求，我推荐使用以下SQL查询：\n\`\`\`sql\n-- 生成的SQL\n\`\`\``;
  }
});

const executeSQLTool = createTool({
  name: "executeSQL",
  description: "执行SQL查询并返回结果",
  parameters: ExecuteSQLParams,
  handler: async ({ sql }) => {
    try {
      // 决定是查询还是执行操作
      const isQuery = sql.trim().toLowerCase().startsWith("select");
      
      if (isQuery) {
        const result = await dbService.query(sql);
        return JSON.stringify(result);
      } else {
        const result = await dbService.execute(sql);
        return `执行成功，影响了${result.affected_rows}行数据`;
      }
    } catch (error) {
      return `执行SQL时出错: ${error.message}`;
    }
  }
});

const getDatabaseSchemaTool = createTool({
  name: "getDatabaseSchema",
  description: "获取数据库架构信息",
  parameters: GetDatabaseSchemaParams,
  handler: async () => {
    try {
      const tables = await dbService.getTables();
      
      let schemaInfo = "数据库架构:\n";
      
      for (const tableName of tables) {
        const tableInfo = await dbService.getTableInfo(tableName);
        
        schemaInfo += `表名: ${tableInfo.name}\n列:\n`;
        
        for (const column of tableInfo.columns) {
          schemaInfo += `- ${column.name} (${column.type})`;
          if (column.pk) schemaInfo += " [主键]";
          if (column.notnull) schemaInfo += " [非空]";
          schemaInfo += "\n";
        }
        
        schemaInfo += "\n";
      }
      
      return schemaInfo;
    } catch (error) {
      return `获取数据库架构时出错: ${error.message}`;
    }
  }
});

// 构建系统提示
function buildSystemPrompt() {
  return `你是LumosDB的AI助手，专门帮助用户管理和分析数据库。

作为数据库智能助手，你可以:
1. 根据用户需求生成SQL查询
2. 执行SQL查询并返回结果
3. 获取数据库架构信息
4. 分析数据趋势和模式
5. 提供数据库优化建议

在回答用户问题时，请遵循以下原则:
- 保持专业、有帮助的态度
- 提供准确的信息和SQL查询
- 如果不确定答案，坦诚地告诉用户
- 使用简洁明了的语言解释复杂概念

你可以使用以下工具:
- generateSQL: 根据用户请求生成SQL查询语句
- executeSQL: 执行SQL查询并返回结果
- getDatabaseSchema: 获取数据库架构信息

当用户请求生成SQL查询时，请使用generateSQL工具。
当需要执行查询并获取结果时，请使用executeSQL工具。
当需要了解数据库结构时，请使用getDatabaseSchema工具。`;
}

// 创建数据库代理
export const dbAgent = new Agent({
  name: "DB Assistant",
  instructions: buildSystemPrompt(),
  model: openai("gpt-4o-mini"),
  tools: [generateSQLTool, executeSQLTool, getDatabaseSchemaTool]
});
```

### 4. 环境变量配置

需要在前端项目中配置以下环境变量：

```
# .env.local
# LumosDB API配置
NEXT_PUBLIC_API_URL=http://localhost:8080

# OpenAI API配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Mastra配置
MASTRA_ENV=development
NEXT_PUBLIC_MASTRA_API_URL=http://localhost:4111
```

## 实现阶段

### 阶段1：基础连接（1-2周）

1. 配置API客户端
2. 实现基本数据库操作API
3. 集成健康检查API
4. 基本错误处理

### 阶段2：向量搜索集成（1-2周）

1. 实现向量集合管理API
2. 实现向量添加和搜索API
3. 创建向量搜索的UI组件

### 阶段3：AI助手增强（2-3周）

1. 将实际数据库操作集成到AI助手中
2. 使AI助手能够访问真实数据库结构
3. 优化AI助手的响应质量
4. 添加错误处理和边界情况

### 阶段4：测试与优化（1-2周）

1. 端到端测试
2. 性能优化
3. 错误处理完善
4. UI/UX改进

## 技术注意事项

1. **CORS配置**：确保后端服务器配置了正确的CORS，允许前端应用访问API

2. **错误处理**：统一处理API错误，提供友好的用户反馈

3. **认证**：实现合适的认证机制，如JWT或API密钥

4. **性能**：对于大型查询结果，考虑分页加载

5. **安全性**：
   - 防止SQL注入
   - 验证用户输入
   - 限制敏感操作的权限

## 下一步行动项

1. 在前端创建API客户端和服务
2. 更新环境变量配置
3. 修改AI助手以使用实际API
4. 实现基本的数据库操作UI组件
5. 测试与后端的连接 