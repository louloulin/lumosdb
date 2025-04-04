import { ApiClient } from '../core/api-client';
import { 
  QueryRequest, 
  QueryResult, 
  ExecuteRequest, 
  ExecuteResult,
  TableInfo
} from '../types/db';
import { throwIfError } from '../utils/error';
import { ApiError } from '../types/core';

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
  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    const request: QueryRequest = { sql, params };
    const response = await this.apiClient.post<QueryResult>(`${this.basePath}/query`, request);
    throwIfError(response);
    return response.data as QueryResult;
  }
  
  /**
   * 执行SQL语句（增删改操作）
   * @param sql SQL执行语句
   * @param params 参数（如果有）
   * @returns 执行结果
   * @throws 如果是SELECT查询，会抛出错误
   */
  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    // 检查是否是SELECT查询
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      throw new Error('Execute returned results - did you mean to call query?');
    }
    
    const request: ExecuteRequest = { sql, params };
    const response = await this.apiClient.post<ExecuteResult>(`${this.basePath}/execute`, request);
    throwIfError(response);
    return response.data as ExecuteResult;
  }
  
  /**
   * 安全执行SQL操作
   * 根据SQL类型自动选择query或execute方法
   * @param sql SQL语句
   * @param params 参数（如果有）
   * @returns 查询结果或执行结果
   */
  async executeSql<T extends QueryResult | ExecuteResult>(
    sql: string, 
    params: any[] = []
  ): Promise<T> {
    const trimmedSql = sql.trim().toUpperCase();
    
    // 根据SQL语句类型选择适当的方法
    if (
      trimmedSql.startsWith('SELECT') || 
      trimmedSql.startsWith('PRAGMA') || 
      trimmedSql.startsWith('EXPLAIN')
    ) {
      return this.query(sql, params) as Promise<T>;
    } else {
      return this.execute(sql, params) as Promise<T>;
    }
  }
  
  /**
   * 获取所有表
   * @param schema 模式名称（可选）
   * @returns 表名列表
   */
  async getTables(schema?: string): Promise<string[]> {
    const url = schema 
      ? `${this.basePath}/tables?schema=${encodeURIComponent(schema)}`
      : `${this.basePath}/tables`;
      
    const response = await this.apiClient.get<{ tables: string[] }>(url);
    throwIfError(response);
    return response.data?.tables || [];
  }
  
  /**
   * 获取表信息
   * @param tableName 表名
   * @returns 表详细信息
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
    // 直接使用表名，不进行URL编码
    const response = await this.apiClient.get<TableInfo>(`${this.basePath}/tables/${tableName}`);
    throwIfError(response);
    return response.data as TableInfo;
  }
  
  /**
   * 创建表
   * @param createTableSql 创建表的SQL语句
   * @returns 创建结果
   */
  async createTable(createTableSql: string): Promise<void> {
    const response = await this.apiClient.post(`${this.basePath}/tables`, { sql: createTableSql });
    throwIfError(response);
  }
  
  /**
   * 删除表
   * @param tableName 表名
   * @returns 删除结果
   */
  async dropTable(tableName: string): Promise<void> {
    // 直接使用表名，不进行URL编码
    const response = await this.apiClient.delete(`${this.basePath}/tables/${tableName}`);
    throwIfError(response);
  }
  
  /**
   * 检查表是否存在
   * @param tableName 表名
   * @returns 表是否存在
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const sql = `SELECT name FROM sqlite_master WHERE type='table' AND name=?`;
      const result = await this.query(sql, [tableName]);
      return result.rows.length > 0;
    } catch (error) {
      // 查询出错也视为表不存在
      return false;
    }
  }
} 