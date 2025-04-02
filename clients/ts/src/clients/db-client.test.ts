import { DbClient } from './db-client';
import { ApiClient } from '../core/api-client';
import { QueryResult, ExecuteResult, TableInfo, ColumnInfo } from '../types/db';
import { ApiResponse } from '../types/core';

// 模拟ApiClient
jest.mock('../core/api-client');

describe('DbClient', () => {
  let dbClient: DbClient;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    // 创建模拟的ApiClient实例
    mockApiClient = new ApiClient('') as jest.Mocked<ApiClient>;
    // 创建DbClient实例，传入模拟的ApiClient
    dbClient = new DbClient(mockApiClient);
  });

  test('query should call apiClient.post with correct parameters and return data', async () => {
    const mockSql = 'SELECT * FROM users';
    const mockParams = ['param1'];
    const mockResult: QueryResult = {
      columns: ['id', 'name'],
      rows: [[1, 'John'], [2, 'Jane']],
      count: 2
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 调用方法
    const result = await dbClient.query(mockSql, mockParams);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/query', { sql: mockSql, params: mockParams });
    expect(result).toBe(mockResult);
  });

  test('query should throw error when response is not successful', async () => {
    const mockSql = 'SELECT * FROM users';
    const mockResponse: ApiResponse<QueryResult> = {
      success: false,
      error: { code: 'ERROR', message: 'Query failed' }
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 验证抛出错误
    await expect(dbClient.query(mockSql)).rejects.toThrow('Query failed');
  });

  test('execute should call apiClient.post with correct parameters and return data', async () => {
    const mockSql = 'INSERT INTO users (name) VALUES (?)';
    const mockParams = ['John'];
    const mockResult: ExecuteResult = {
      affected_rows: 1
    };
    
    const mockResponse: ApiResponse<ExecuteResult> = {
      success: true,
      data: mockResult
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 调用方法
    const result = await dbClient.execute(mockSql, mockParams);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/execute', { sql: mockSql, params: mockParams });
    expect(result).toBe(mockResult);
  });

  test('getTables should call apiClient.get and return tables list', async () => {
    const mockTables = ['users', 'products'];
    const mockResponse: ApiResponse<{ tables: string[] }> = {
      success: true,
      data: { tables: mockTables }
    };
    
    // 设置mock返回值
    mockApiClient.get.mockResolvedValue(mockResponse);
    
    // 调用方法
    const result = await dbClient.getTables();
    
    // 验证
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/db/tables');
    expect(result).toEqual(mockTables);
  });

  test('getTableInfo should call apiClient.get with correct table name and return info', async () => {
    const mockTableName = 'users';
    const mockColumns: ColumnInfo[] = [
      { name: 'id', type: 'INTEGER', notnull: true, pk: true },
      { name: 'name', type: 'TEXT', notnull: true, pk: false }
    ];
    
    const mockTableInfo: TableInfo = {
      name: mockTableName,
      columns: mockColumns
    };
    
    const mockResponse: ApiResponse<TableInfo> = {
      success: true,
      data: mockTableInfo
    };
    
    // 设置mock返回值
    mockApiClient.get.mockResolvedValue(mockResponse);
    
    // 调用方法
    const result = await dbClient.getTableInfo(mockTableName);
    
    // 验证
    expect(mockApiClient.get).toHaveBeenCalledWith(`/api/db/tables/${mockTableName}`);
    expect(result).toBe(mockTableInfo);
  });

  test('createTable should call apiClient.post with correct SQL', async () => {
    const mockSql = 'CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL)';
    const mockResponse: ApiResponse<void> = {
      success: true
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 调用方法
    await dbClient.createTable(mockSql);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/tables', { sql: mockSql });
  });

  test('dropTable should call apiClient.delete with correct table name', async () => {
    const mockTableName = 'users';
    const mockResponse: ApiResponse<void> = {
      success: true
    };
    
    // 设置mock返回值
    mockApiClient.delete.mockResolvedValue(mockResponse);
    
    // 调用方法
    await dbClient.dropTable(mockTableName);
    
    // 验证
    expect(mockApiClient.delete).toHaveBeenCalledWith(`/api/db/tables/${mockTableName}`);
  });
}); 