import { ApiClient } from '../core/api-client';
import { 
  QueryRequest, 
  QueryResult, 
  ExecuteRequest, 
  ExecuteResult,
  TableInfo
} from '../types/db';
import { throwIfError } from '../utils/error';

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
   */
  async execute(sql: string, params: any[] = []): Promise<ExecuteResult> {
    const request: ExecuteRequest = { sql, params };
    const response = await this.apiClient.post<ExecuteResult>(`${this.basePath}/execute`, request);
    throwIfError(response);
    return response.data as ExecuteResult;
  }
  
  /**
   * 获取所有表
   * @returns 表名列表
   */
  async getTables(): Promise<string[]> {
    const response = await this.apiClient.get<{ tables: string[] }>(`${this.basePath}/tables`);
    throwIfError(response);
    return response.data?.tables || [];
  }
  
  /**
   * 获取表信息
   * @param tableName 表名
   * @returns 表详细信息
   */
  async getTableInfo(tableName: string): Promise<TableInfo> {
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
    const response = await this.apiClient.delete(`${this.basePath}/tables/${tableName}`);
    throwIfError(response);
  }
} 