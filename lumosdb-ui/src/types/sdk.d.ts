/**
 * SDK类型声明文件
 * 用于提供SDK客户端的类型定义
 */

declare module '@sdk' {
  export class ApiClient {
    constructor(baseURL: string, options?: Record<string, unknown>);
    get<T>(url: string): Promise<{ data: T; status: number }>;
    post<T>(url: string, data?: Record<string, unknown>): Promise<{ data: T; status: number }>;
    put<T>(url: string, data?: Record<string, unknown>): Promise<{ data: T; status: number }>;
    delete<T>(url: string): Promise<{ data: T; status: number }>;
  }

  export interface QueryResult {
    rows?: Array<Record<string, unknown>>;
    columns?: string[];
    rowsAffected?: number;
    error?: string;
  }

  export interface ExecuteResult {
    rowsAffected: number;
    error?: string;
  }

  export interface TableInfo {
    name: string;
    columns: Array<{
      name: string;
      type: string;
      primaryKey: boolean;
      nullable: boolean;
    }>;
  }

  export class DbClient {
    constructor(apiClient: ApiClient);
    query(sql: string, params?: Array<unknown>): Promise<QueryResult>;
    execute(sql: string, params?: Array<unknown>): Promise<ExecuteResult>;
    getTables(): Promise<string[]>;
    getTableInfo(tableName: string): Promise<TableInfo>;
    createTable(createTableSql: string): Promise<void>;
    dropTable(tableName: string): Promise<void>;
  }

  export interface VectorCollection {
    name: string;
    dimension: number;
    vectorCount: number;
    distanceFunction: string;
    createdAt: string;
  }

  export interface VectorItem {
    id: string;
    vector: number[];
    metadata?: Record<string, unknown>;
  }

  export interface VectorSearchResult {
    id: string;
    score: number;
    metadata?: Record<string, unknown>;
  }

  export interface AddVectorsResult {
    ids: string[];
  }

  export interface CollectionStats {
    vectorCount: number;
    dimension: number;
    indexType?: string;
    createdAt: string;
    metadataFields?: string[];
  }

  export interface TextSearchParams {
    text: string;
    limit?: number;
    filter?: Record<string, unknown>;
  }

  export class VectorClient {
    constructor(apiClient: ApiClient);
    listCollections(): Promise<VectorCollection[]>;
    createCollection(options: {
      name: string;
      dimension: number;
      distanceFunction: string;
    }): Promise<void>;
    deleteCollection(name: string): Promise<void>;
    addVectors(collectionName: string, vectors: VectorItem[]): Promise<AddVectorsResult>;
    getVectors(collectionName: string, ids: string[]): Promise<VectorItem[]>;
    search(collectionName: string, options: {
      vector: number[];
      limit?: number;
      filter?: Record<string, unknown>;
    }): Promise<VectorSearchResult[]>;
    searchByText(collectionName: string, params: TextSearchParams): Promise<VectorSearchResult[]>;
    getCollectionStats(collectionName: string): Promise<CollectionStats>;
  }

  export interface HealthCheckResult {
    status: 'ok' | 'error';
    version?: string;
    uptime?: number;
    timestamp?: string;
    dbConnected?: boolean;
    message?: string;
  }

  export class HealthClient {
    constructor(apiClient: ApiClient);
    check(): Promise<HealthCheckResult>;
    getSystemInfo(): Promise<Record<string, unknown>>;
  }

  export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'developer' | 'viewer';
    avatar?: string;
    createdAt: string;
    lastLogin?: string;
  }

  export interface LoginResult {
    user: User;
    token: string;
  }

  export interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    createdAt: string;
    lastUsed?: string;
    expiresAt?: string;
    createdBy: string;
    permissions: Array<'read' | 'write' | 'delete'>;
  }

  export class AuthClient {
    constructor(apiClient: ApiClient);
    login(email: string, password: string): Promise<LoginResult>;
    register(data: { email: string; password: string; name: string }): Promise<LoginResult>;
    getCurrentUser(): Promise<User | null>;
    getApiKeys(): Promise<ApiKey[]>;
    createApiKey(data: { name: string; permissions: Array<'read' | 'write' | 'delete'> }): Promise<ApiKey>;
    deleteApiKey(id: string): Promise<void>;
  }

  export class LumosDBClient {
    db: DbClient;
    vector: VectorClient;
    health: HealthClient;
    auth: AuthClient;
    
    constructor(baseURL: string, apiKey?: string);
    setApiKey(apiKey: string): void;
  }
  
  export * from '@sdk/types/core';
  export * from '@sdk/types/db';
  export * from '@sdk/types/vector';
  export * from '@sdk/types/health';
  export * from '@sdk/types/auth';
} 