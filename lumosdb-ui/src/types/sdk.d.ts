/**
 * SDK类型声明文件
 * 用于提供SDK客户端的类型定义
 */

declare module '@sdk' {
  export class ApiClient {
    constructor(baseURL: string, options?: any);
    get<T>(url: string): Promise<{ data: T; status: number }>;
    post<T>(url: string, data?: any): Promise<{ data: T; status: number }>;
    put<T>(url: string, data?: any): Promise<{ data: T; status: number }>;
    delete<T>(url: string): Promise<{ data: T; status: number }>;
  }

  export interface QueryResult {
    rows?: any[];
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
    query(sql: string, params?: any[]): Promise<QueryResult>;
    execute(sql: string, params?: any[]): Promise<ExecuteResult>;
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
      filter?: Record<string, any>;
    }): Promise<VectorSearchResult[]>;
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
    getSystemInfo(): Promise<Record<string, any>>;
  }

  export class LumosDBClient {
    db: DbClient;
    vector: VectorClient;
    health: HealthClient;
    
    constructor(baseURL: string, apiKey?: string);
    setApiKey(apiKey: string): void;
  }
  
  export * from '@sdk/types/core';
  export * from '@sdk/types/db';
  export * from '@sdk/types/vector';
  export * from '@sdk/types/health';
} 