# LumosDB TypeScript API客户端实现计划 [已实现]

## 概述

本文档详细描述了基于LumosDB Rust后端服务的TypeScript客户端API实现计划。LumosDB客户端库将提供一套完整的类型安全的API，用于与LumosDB服务器进行交互，支持数据库操作和向量搜索功能。

## API结构分析 [已实现]

LumosDB服务器提供了以下主要API组：

1. **健康检查API** - 用于检查服务器状态
2. **数据库操作API** - 用于执行SQL查询和管理数据库表
3. **向量操作API** - 用于创建和管理向量集合，执行相似度搜索

## TypeScript客户端实现 [已实现]

### 1. 核心类型定义 [已实现]

首先，我们需要定义与后端匹配的核心数据类型：

```typescript
// src/types/core.ts

/** API响应包装器 */
export interface ApiResponse<T> {
  /** 操作是否成功 */
  success: boolean;
  /** 响应数据（成功时） */
  data?: T;
  /** 错误信息（失败时） */
  error?: ApiError;
}

/** API错误信息 */
export interface ApiError {
  /** 错误代码 */
  code: string;
  /** 错误消息 */
  message: string;
}

/** 健康检查响应 */
export interface HealthResponse {
  /** 服务状态 */
  status: string;
  /** 服务版本 */
  version: string;
  /** 时间戳（Unix秒） */
  timestamp: number;
}
```

### 2. 数据库操作类型 [已实现]

```typescript
// src/types/db.ts

/** 查询请求 */
export interface QueryRequest {
  /** SQL查询语句 */
  sql: string;
  /** 参数（若有） */
  params?: string[];
}

/** 查询结果 */
export interface QueryResult {
  /** 列名 */
  columns: string[];
  /** 数据行（二维数组） */
  rows: any[][];
  /** 结果行数 */
  count: number;
}

/** 执行请求 */
export interface ExecuteRequest {
  /** SQL执行语句 */
  sql: string;
  /** 参数（若有） */
  params?: string[];
}

/** 执行结果 */
export interface ExecuteResult {
  /** 受影响的行数 */
  affected_rows: number;
}

/** 表信息 */
export interface TableInfo {
  /** 表名 */
  name: string;
  /** 列信息 */
  columns: ColumnInfo[];
}

/** 列信息 */
export interface ColumnInfo {
  /** 列名 */
  name: string;
  /** 数据类型 */
  type: string;
  /** 是否非空 */
  notnull: boolean;
  /** 是否主键 */
  pk: boolean;
}
```

### 3. 向量搜索类型 [已实现]

```typescript
// src/types/vector.ts

/** 向量集合 */
export interface Collection {
  /** 集合名称 */
  name: string;
  /** 向量维度 */
  dimension: number;
  /** 距离计算方式 */
  distance: string;
  /** 向量数量 */
  count: number;
}

/** 向量嵌入 */
export interface Embedding {
  /** 向量ID */
  id: string;
  /** 向量数据 */
  vector: number[];
  /** 元数据（可选） */
  metadata?: Record<string, any>;
}

/** 创建集合请求 */
export interface CreateCollectionRequest {
  /** 集合名称 */
  name: string;
  /** 向量维度 */
  dimension: number;
}

/** 添加向量请求 */
export interface AddEmbeddingsRequest {
  /** 向量ID列表 */
  ids: string[];
  /** 向量数据列表 */
  embeddings: number[][];
  /** 元数据列表（可选） */
  metadata?: Record<string, any>[];
}

/** 搜索请求 */
export interface SearchRequest {
  /** 查询向量 */
  vector: number[];
  /** 返回结果数量 */
  top_k: number;
}

/** 搜索结果 */
export interface SearchResult {
  /** 向量ID */
  id: string;
  /** 相似度分数 */
  score: number;
  /** 向量数据（可选） */
  vector?: number[];
  /** 元数据（可选） */
  metadata?: Record<string, any>;
}
```

### 4. API客户端实现 [已实现]

#### 4.1 基础HTTP客户端 [已实现]

```typescript
// src/core/api-client.ts
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiResponse, ApiError } from '../types/core';

export class ApiClient {
  private client: AxiosInstance;
  
  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });
    
    // 响应拦截器处理统一的响应格式
    this.client.interceptors.response.use(
      (response) => response.data,
      (error) => {
        // 处理HTTP错误
        if (error.response) {
          const apiError: ApiError = {
            code: `HTTP_${error.response.status}`,
            message: error.response.data?.message || error.message,
          };
          
          return Promise.reject({
            success: false,
            error: apiError,
          });
        }
        
        // 处理网络错误
        const apiError: ApiError = {
          code: 'NETWORK_ERROR',
          message: error.message || 'Network error occurred',
        };
        
        return Promise.reject({
          success: false,
          error: apiError,
        });
      }
    );
  }
  
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.client.get<any, ApiResponse<T>>(url, config);
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.client.post<any, ApiResponse<T>>(url, data, config);
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.client.put<any, ApiResponse<T>>(url, data, config);
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.client.delete<any, ApiResponse<T>>(url, config);
  }
}
```

#### 4.2 数据库客户端 [已实现]

```typescript
// src/clients/db-client.ts
import { ApiClient } from '../core/api-client';
import { 
  QueryRequest, 
  QueryResult, 
  ExecuteRequest, 
  ExecuteResult,
  TableInfo
} from '../types/db';

export class DbClient {
  private apiClient: ApiClient;
  private basePath = '/api/db';
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  /**
   * 执行SQL查询
   * @param sql SQL查询语句
   * @param params 参数（如果有）
   * @returns 查询结果
   */
  async query(sql: string, params: string[] = []): Promise<QueryResult> {
    const request: QueryRequest = { sql, params };
    const response = await this.apiClient.post<QueryResult>(`${this.basePath}/query`, request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Query failed');
    }
    
    return response.data;
  }
  
  /**
   * 执行SQL语句（增删改操作）
   * @param sql SQL执行语句
   * @param params 参数（如果有）
   * @returns 执行结果
   */
  async execute(sql: string, params: string[] = []): Promise<ExecuteResult> {
    const request: ExecuteRequest = { sql, params };
    const response = await this.apiClient.post<ExecuteResult>(`${this.basePath}/execute`, request);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Execute failed');
    }
    
    return response.data;
  }
  
  /**
   * 获取所有表
   * @returns 表名列表
   */
  async getTables(): Promise<string[]> {
    const response = await this.apiClient.get<{ tables: string[] }>(`${this.basePath}/tables`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get tables');
    }
    
    return response.data.tables;
  }
  
  /**
   * 获取表信息
   * @param tableName 表名
   * @returns 表详细信息
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
    const response = await this.apiClient.get<TableInfo>(`${this.basePath}/tables/${tableName}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get table info');
    }
    
    return response.data;
  }
  
  /**
   * 创建表
   * @param createTableSql 创建表的SQL语句
   * @returns 创建结果
   */
  async createTable(createTableSql: string): Promise<void> {
    const response = await this.apiClient.post(`${this.basePath}/tables`, { sql: createTableSql });
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create table');
    }
  }
  
  /**
   * 删除表
   * @param tableName 表名
   * @returns 删除结果
   */
  async dropTable(tableName: string): Promise<void> {
    const response = await this.apiClient.delete(`${this.basePath}/tables/${tableName}`);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to drop table');
    }
  }
}
```

#### 4.3 向量客户端 [已实现]

```typescript
// src/clients/vector-client.ts
import { ApiClient } from '../core/api-client';
import {
  Collection,
  CreateCollectionRequest,
  AddEmbeddingsRequest,
  SearchRequest,
  SearchResult
} from '../types/vector';

export class VectorClient {
  private apiClient: ApiClient;
  private basePath = '/api/vector';
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  /**
   * 获取所有向量集合
   * @returns 集合列表
   */
  async listCollections(): Promise<Collection[]> {
    const response = await this.apiClient.get<{ collections: Collection[] }>(`${this.basePath}/collections`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to list collections');
    }
    
    return response.data.collections;
  }
  
  /**
   * 创建新的向量集合
   * @param name 集合名称
   * @param dimension 向量维度
   * @returns 创建结果
   */
  async createCollection(name: string, dimension: number): Promise<void> {
    const request: CreateCollectionRequest = { name, dimension };
    const response = await this.apiClient.post(`${this.basePath}/collections`, request);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create collection');
    }
  }
  
  /**
   * 获取集合详情
   * @param name 集合名称
   * @returns 集合详情
   */
  async getCollection(name: string): Promise<Collection> {
    const response = await this.apiClient.get<Collection>(`${this.basePath}/collections/${name}`);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to get collection');
    }
    
    return response.data;
  }
  
  /**
   * 删除集合
   * @param name 集合名称
   * @returns 删除结果
   */
  async deleteCollection(name: string): Promise<void> {
    const response = await this.apiClient.delete(`${this.basePath}/collections/${name}`);
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete collection');
    }
  }
  
  /**
   * 添加向量到集合
   * @param collectionName 集合名称
   * @param ids 向量ID列表
   * @param embeddings 向量数据列表
   * @param metadata 元数据列表（可选）
   * @returns 添加结果
   */
  async addEmbeddings(
    collectionName: string,
    ids: string[],
    embeddings: number[][],
    metadata?: Record<string, any>[]
  ): Promise<{ added: number }> {
    const request: AddEmbeddingsRequest = { ids, embeddings, metadata };
    const response = await this.apiClient.post<{ added: number }>(
      `${this.basePath}/collections/${collectionName}/embeddings`,
      request
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to add embeddings');
    }
    
    return response.data;
  }
  
  /**
   * 在集合中搜索相似向量
   * @param collectionName 集合名称
   * @param vector 查询向量
   * @param topK 返回结果数量
   * @returns 搜索结果
   */
  async searchSimilar(
    collectionName: string,
    vector: number[],
    topK: number = 10
  ): Promise<SearchResult[]> {
    const request: SearchRequest = { vector, top_k: topK };
    const response = await this.apiClient.post<{ results: SearchResult[] }>(
      `${this.basePath}/collections/${collectionName}/search`,
      request
    );
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to search similar vectors');
    }
    
    return response.data.results;
  }
  
  /**
   * 创建向量索引
   * @param collectionName 集合名称
   * @param indexType 索引类型
   * @param parameters 索引参数
   * @returns 创建结果
   */
  async createIndex(
    collectionName: string,
    indexType: string,
    parameters?: Record<string, any>
  ): Promise<void> {
    const response = await this.apiClient.post(
      `${this.basePath}/collections/${collectionName}/index/${indexType}`,
      { parameters }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create index');
    }
  }
  
  /**
   * 删除向量索引
   * @param collectionName 集合名称
   * @returns 删除结果
   */
  async deleteIndex(collectionName: string): Promise<void> {
    const response = await this.apiClient.delete(
      `${this.basePath}/collections/${collectionName}/index`
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete index');
    }
  }
}
```

#### 4.4 健康检查客户端 [已实现]

```typescript
// src/clients/health-client.ts
import { ApiClient } from '../core/api-client';
import { HealthResponse } from '../types/core';

export class HealthClient {
  private apiClient: ApiClient;
  private basePath = '/health';
  
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  /**
   * 检查服务器健康状态
   * @returns 健康状态信息
   */
  async check(): Promise<HealthResponse> {
    const response = await this.apiClient.get<HealthResponse>(this.basePath);
    
    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Health check failed');
    }
    
    return response.data;
  }
}
```

#### 4.5 主客户端 [已实现]

```typescript
// src/index.ts
import { ApiClient } from './core/api-client';
import { DbClient } from './clients/db-client';
import { VectorClient } from './clients/vector-client';
import { HealthClient } from './clients/health-client';

export * from './types/core';
export * from './types/db';
export * from './types/vector';

/**
 * LumosDB客户端配置
 */
export interface LumosDBConfig {
  /** 服务器基础URL */
  baseURL: string;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 认证令牌（如果需要） */
  authToken?: string;
}

/**
 * LumosDB客户端
 */
export class LumosDB {
  /** 数据库操作客户端 */
  readonly db: DbClient;
  /** 向量操作客户端 */
  readonly vector: VectorClient;
  /** 健康检查客户端 */
  readonly health: HealthClient;
  
  private apiClient: ApiClient;
  
  /**
   * 创建LumosDB客户端实例
   * @param config 客户端配置
   */
  constructor(config: LumosDBConfig) {
    this.apiClient = new ApiClient(config.baseURL, {
      timeout: config.timeout || 30000,
      headers: config.authToken ? {
        'Authorization': `Bearer ${config.authToken}`
      } : undefined,
    });
    
    this.db = new DbClient(this.apiClient);
    this.vector = new VectorClient(this.apiClient);
    this.health = new HealthClient(this.apiClient);
  }
}

// 默认导出LumosDB客户端
export default LumosDB;
```

## 使用示例 [已实现]

```typescript
// 示例使用
import { LumosDB } from 'lumosdb';

async function example() {
  // 创建客户端实例
  const client = new LumosDB({
    baseURL: 'http://localhost:8080',
    timeout: 5000,
    // authToken: 'your-auth-token' // 如果需要认证
  });
  
  try {
    // 检查服务器健康状态
    const health = await client.health.check();
    console.log('Server status:', health.status);
    console.log('Server version:', health.version);
    
    // 获取所有表
    const tables = await client.db.getTables();
    console.log('Tables:', tables);
    
    // 执行查询
    const result = await client.db.query('SELECT * FROM users LIMIT 10');
    console.log('Query result:', result);
    
    // 创建向量集合
    await client.vector.createCollection('documents', 384);
    console.log('Vector collection created');
    
    // 添加向量
    const addResult = await client.vector.addEmbeddings(
      'documents',
      ['doc1', 'doc2'],
      [
        Array(384).fill(0).map(() => Math.random()), // 随机向量1
        Array(384).fill(0).map(() => Math.random()), // 随机向量2
      ],
      [
        { title: 'Document 1', url: 'https://example.com/doc1' },
        { title: 'Document 2', url: 'https://example.com/doc2' },
      ]
    );
    console.log(`Added ${addResult.added} vectors`);
    
    // 搜索相似向量
    const searchVector = Array(384).fill(0).map(() => Math.random());
    const searchResults = await client.vector.searchSimilar('documents', searchVector, 5);
    console.log('Search results:', searchResults);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

example();
```

## 开发计划 [阶段1已完成]

### 阶段1：核心实现（1-2周） [已完成]

1. 设置项目结构 [已完成]
   - 初始化TypeScript项目
   - 设置构建系统（例如rollup或webpack）
   - 配置ESLint和Prettier
   - 设置单元测试框架（Jest）

2. 实现核心类型和基础API客户端 [已完成]
   - 实现ApiClient类
   - 定义核心类型接口
   - 实现错误处理机制

3. 实现数据库客户端 [已完成]
   - 实现DbClient类
   - 添加主要数据库操作方法
   - 编写单元测试

### 阶段2：向量功能与集成测试（1-2周） [基本实现]

1. 实现向量搜索客户端 [已完成]
   - 实现VectorClient类
   - 添加向量管理和搜索方法
   - 编写单元测试

2. 实现健康检查客户端 [已完成]
   - 实现HealthClient类
   - 编写单元测试

3. 集成测试 [进行中]
   - 使用真实服务器进行端到端测试
   - 测试所有API方法
   - 修复发现的问题

### 阶段3：增强与文档（1周） [部分完成]

1. 增强功能 [待完成]
   - 添加请求重试和超时管理
   - 实现更高级的错误处理
   - 添加日志记录

2. 编写文档 [基本完成]
   - 生成API文档
   - 编写使用指南
   - 创建示例代码

3. 打包和发布 [待完成]
   - 准备npm包配置
   - 编写README.md
   - 发布到npm或准备私有包

## 技术栈 [已实现]

- **语言**: TypeScript 5.x
- **HTTP客户端**: Axios
- **构建工具**: Rollup/Webpack
- **代码质量**: ESLint, Prettier
- **测试**: Jest
- **文档**: TypeDoc

## 注意事项

1. **类型安全**: 确保API客户端提供完全类型安全的接口，利用TypeScript的类型系统。

2. **错误处理**: 实现一致且用户友好的错误处理机制，确保所有错误都被适当处理。

3. **浏览器兼容性**: 确保客户端在现代浏览器和Node.js环境中都能正常工作。

4. **依赖管理**: 尽量减少外部依赖，主要依赖应该只有Axios用于HTTP请求。

5. **性能**: 关注内存使用和性能优化，尤其是处理大型向量数据时。

6. **认证**: 支持灵活的认证机制，包括Bearer Token、API密钥等。

7. **测试覆盖率**: 保持高测试覆盖率，尤其是核心功能和错误处理路径。 