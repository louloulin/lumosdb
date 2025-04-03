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

  /**
   * 备份类型枚举
   */
  export enum BackupType {
    FULL = 'full',
    INCREMENTAL = 'incremental'
  }

  /**
   * 备份状态枚举
   */
  export enum BackupStatus {
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    SCHEDULED = 'scheduled'
  }

  /**
   * 备份选项接口
   */
  export interface BackupOptions {
    databaseType: string;        // 数据库类型：sqlite, duckdb, vector
    databaseName: string;        // 数据库名称
    backupName?: string;         // 备份名称（可选，默认为自动生成）
    backupType: BackupType;      // 备份类型：全量或增量
    compression?: boolean;       // 是否压缩
    encryption?: boolean;        // 是否加密
    scheduledTime?: Date;        // 计划执行时间（可选）
  }

  /**
   * 恢复选项接口
   */
  export interface RestoreOptions {
    backupId: string;            // 备份ID
    overwriteExisting?: boolean; // 是否覆盖现有数据库
    targetDatabase?: string;     // 目标数据库（可选，默认为原数据库）
    validateBeforeRestore?: boolean; // 恢复前是否验证
  }

  /**
   * 备份信息接口
   */
  export interface BackupInfo {
    id: string;
    name: string;
    databaseType: string;
    databaseName: string;
    createdAt: Date;
    size: string;
    sizeBytes: number;
    type: BackupType;
    status: BackupStatus;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
    lastVerified?: Date;
    isValid?: boolean;
  }

  /**
   * 备份结果接口
   */
  export interface BackupResult {
    success: boolean;
    backupId?: string;
    error?: string;
  }

  /**
   * 恢复结果接口
   */
  export interface RestoreResult {
    success: boolean;
    error?: string;
  }

  /**
   * 备份验证结果接口
   */
  export interface VerifyBackupResult {
    success: boolean;
    isValid: boolean;
    error?: string;
  }

  /**
   * 备份客户端类
   */
  export class BackupClient {
    /**
     * 创建备份
     * @param options 备份选项
     * @param progressCallback 进度回调
     * @returns 备份结果
     */
    createBackup(options: BackupOptions, progressCallback?: (progress: number) => void): Promise<BackupResult>;
    
    /**
     * 恢复备份
     * @param options 恢复选项
     * @param progressCallback 进度回调
     * @returns 恢复结果
     */
    restoreBackup(options: RestoreOptions, progressCallback?: (progress: number) => void): Promise<RestoreResult>;
    
    /**
     * 获取备份列表
     * @param databaseType 数据库类型（可选）
     * @returns 备份列表
     */
    getBackups(databaseType?: string): Promise<BackupInfo[]>;
    
    /**
     * 获取备份详情
     * @param backupId 备份ID
     * @returns 备份详情
     */
    getBackupDetails(backupId: string): Promise<BackupInfo | null>;
    
    /**
     * 删除备份
     * @param backupId 备份ID
     * @returns 操作结果
     */
    deleteBackup(backupId: string): Promise<{success: boolean; error?: string}>;
    
    /**
     * 导出备份
     * @param backupId 备份ID
     * @returns 导出结果
     */
    exportBackup(backupId: string): Promise<{success: boolean; error?: string}>;
    
    /**
     * 验证备份
     * @param backupId 备份ID
     * @returns 验证结果
     */
    verifyBackup(backupId: string): Promise<VerifyBackupResult>;
    
    /**
     * 获取支持的数据库类型
     * @returns 数据库类型列表
     */
    getSupportedDatabaseTypes(): Promise<string[]>;
  }

  export class LumosDBClient {
    db: DbClient;
    vector: VectorClient;
    health: HealthClient;
    auth: AuthClient;
    backup: BackupClient;
    
    constructor(baseURL: string, apiKey?: string);
    setApiKey(apiKey: string): void;
  }
  
  export * from '@sdk/types/core';
  export * from '@sdk/types/db';
  export * from '@sdk/types/vector';
  export * from '@sdk/types/health';
  export * from '@sdk/types/auth';
} 