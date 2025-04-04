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

  test('execute should throw error when used for SELECT queries', async () => {
    const selectSql = 'SELECT * FROM users';
    const mockResponse: ApiResponse<ExecuteResult> = {
      success: false,
      error: { 
        code: 'DATABASE_EXECUTE_ERROR', 
        message: 'Execute failed: SQLite error: Execute returned results - did you mean to call query?' 
      }
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 验证抛出错误，并检查错误消息
    await expect(dbClient.execute(selectSql)).rejects.toThrow('Execute returned results - did you mean to call query?');
    
    // 由于检测到SELECT语句会提前抛出错误，因此API实际上不会被调用
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });

  test('getTableInfo should throw error when table does not exist', async () => {
    const nonExistentTable = 'non_existent_table';
    const mockResponse: ApiResponse<TableInfo> = {
      success: false,
      error: { 
        code: 'TABLE_NOT_FOUND', 
        message: `Table '${nonExistentTable}' not found` 
      }
    };
    
    // 设置mock返回值
    mockApiClient.get.mockResolvedValue(mockResponse);
    
    // 验证抛出错误，并检查错误消息包含表名
    await expect(dbClient.getTableInfo(nonExistentTable)).rejects.toThrow(`Table '${nonExistentTable}' not found`);
    expect(mockApiClient.get).toHaveBeenCalledWith(`/api/db/tables/${nonExistentTable}`);
  });

  test('query should handle quoted table names correctly', async () => {
    const mockSql = 'SELECT * FROM "table with spaces"';
    const mockResult: QueryResult = {
      columns: ['id', 'name'],
      rows: [[1, 'John']],
      count: 1
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 调用方法
    const result = await dbClient.query(mockSql);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/query', { sql: mockSql, params: [] });
    expect(result).toBe(mockResult);
  });

  test('execute should handle quoted table names correctly', async () => {
    const mockSql = 'INSERT INTO "table with spaces" (id, name) VALUES (1, "test")';
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
    const result = await dbClient.execute(mockSql);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/execute', { sql: mockSql, params: [] });
    expect(result).toBe(mockResult);
  });

  test('execute should handle SQL syntax errors correctly', async () => {
    const invalidSql = 'INSERT INTO users VALUES (1, 2, 3)'; // Missing columns declaration
    const mockResponse: ApiResponse<ExecuteResult> = {
      success: false,
      error: { 
        code: 'SQL_SYNTAX_ERROR', 
        message: 'near "VALUES": syntax error' 
      }
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 验证抛出错误
    await expect(dbClient.execute(invalidSql)).rejects.toThrow('near "VALUES": syntax error');
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/execute', { sql: invalidSql, params: [] });
  });

  test('query should correctly handle special characters in table and column names', async () => {
    const sql = 'SELECT "user id", "email address" FROM "users table"';
    const mockResult: QueryResult = {
      columns: ['user id', 'email address'],
      rows: [['user1', 'user1@example.com']],
      count: 1
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    const result = await dbClient.query(sql);
    
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/query', { sql, params: [] });
    expect(result).toBe(mockResult);
  });

  test('execute should handle SQL injection attempts properly', async () => {
    // 模拟一个包含SQL注入尝试的参数
    const unsafeSql = "INSERT INTO users (name) VALUES (?)";
    const unsafeParams = ["Robert'); DROP TABLE users; --"];
    
    const mockResult: ExecuteResult = {
      affected_rows: 1 // 应该只插入一行，而不是执行恶意SQL
    };
    
    const mockResponse: ApiResponse<ExecuteResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    const result = await dbClient.execute(unsafeSql, unsafeParams);
    
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/execute', { 
      sql: unsafeSql, 
      params: unsafeParams 
    });
    expect(result.affected_rows).toBe(1);
  });

  test('query should handle empty result sets correctly', async () => {
    const sql = 'SELECT * FROM users WHERE id = 999';
    const mockResult: QueryResult = {
      columns: ['id', 'name'],
      rows: [], // 空结果集
      count: 0
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    const result = await dbClient.query(sql);
    
    expect(result.rows).toHaveLength(0);
    expect(result.count).toBe(0);
  });

  test('execute should handle transactions correctly', async () => {
    const transactionSql = 'BEGIN TRANSACTION; INSERT INTO users (name) VALUES (?); COMMIT;';
    const params = ['New User'];
    
    const mockResult: ExecuteResult = {
      affected_rows: 1
    };
    
    const mockResponse: ApiResponse<ExecuteResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    const result = await dbClient.execute(transactionSql, params);
    
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/execute', { 
      sql: transactionSql, 
      params 
    });
    expect(result.affected_rows).toBe(1);
  });

  test('getTables should handle error cases properly', async () => {
    const mockResponse: ApiResponse<{ tables: string[] }> = {
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: 'Failed to get tables list due to permission issues'
      }
    };
    
    mockApiClient.get.mockResolvedValue(mockResponse);
    
    await expect(dbClient.getTables()).rejects.toThrow('Failed to get tables list due to permission issues');
  });

  test('getTableInfo should handle tables with Unicode characters in names', async () => {
    const unicodeTableName = 'table_with_中文_name';
    const mockColumns: ColumnInfo[] = [
      { name: 'id', type: 'INTEGER', notnull: true, pk: true },
      { name: '中文列', type: 'TEXT', notnull: false, pk: false } // Unicode column name
    ];
    
    const mockTableInfo: TableInfo = {
      name: unicodeTableName,
      columns: mockColumns
    };
    
    const mockResponse: ApiResponse<TableInfo> = {
      success: true,
      data: mockTableInfo
    };
    
    mockApiClient.get.mockResolvedValue(mockResponse);
    const result = await dbClient.getTableInfo(unicodeTableName);
    
    expect(mockApiClient.get).toHaveBeenCalledWith(`/api/db/tables/${unicodeTableName}`);
    expect(result.name).toBe(unicodeTableName);
    expect(result.columns[1].name).toBe('中文列');
  });

  // 测试executeSql方法 - SELECT查询
  test('executeSql should use query method for SELECT statements', async () => {
    const selectSql = 'SELECT * FROM users WHERE id = ?';
    const params = [123];
    const mockResult: QueryResult = {
      columns: ['id', 'name'],
      rows: [[123, 'Test User']],
      count: 1
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 先创建dbClient.query的spy来监视它是否被调用
    const querySpy = jest.spyOn(dbClient, 'query');
    const executeSpy = jest.spyOn(dbClient, 'execute');
    
    // 调用executeSql
    const result = await dbClient.executeSql(selectSql, params);
    
    // 验证调用了query而不是execute
    expect(querySpy).toHaveBeenCalledWith(selectSql, params);
    expect(executeSpy).not.toHaveBeenCalled();
    expect(result).toEqual(mockResult);
    
    // 清理spies
    querySpy.mockRestore();
    executeSpy.mockRestore();
  });
  
  // 测试executeSql方法 - INSERT操作
  test('executeSql should use execute method for INSERT statements', async () => {
    const insertSql = 'INSERT INTO users (name) VALUES (?)';
    const params = ['New User'];
    const mockResult: ExecuteResult = {
      affected_rows: 1
    };
    
    const mockResponse: ApiResponse<ExecuteResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 创建spies
    const querySpy = jest.spyOn(dbClient, 'query');
    const executeSpy = jest.spyOn(dbClient, 'execute');
    
    // 调用executeSql
    const result = await dbClient.executeSql(insertSql, params);
    
    // 验证调用了execute而不是query
    expect(executeSpy).toHaveBeenCalledWith(insertSql, params);
    expect(querySpy).not.toHaveBeenCalled();
    expect(result).toEqual(mockResult);
    
    // 清理spies
    querySpy.mockRestore();
    executeSpy.mockRestore();
  });
  
  // 测试executeSql方法 - PRAGMA查询
  test('executeSql should use query method for PRAGMA statements', async () => {
    const pragmaSql = 'PRAGMA table_info("users")';
    const mockResult: QueryResult = {
      columns: ['cid', 'name', 'type', 'notnull', 'dflt_value', 'pk'],
      rows: [[0, 'id', 'INTEGER', 1, null, 1], [1, 'name', 'TEXT', 1, null, 0]],
      count: 2
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 创建spies
    const querySpy = jest.spyOn(dbClient, 'query');
    const executeSpy = jest.spyOn(dbClient, 'execute');
    
    // 调用executeSql
    const result = await dbClient.executeSql(pragmaSql);
    
    // 验证调用了query而不是execute
    expect(querySpy).toHaveBeenCalledWith(pragmaSql, []);
    expect(executeSpy).not.toHaveBeenCalled();
    expect(result).toEqual(mockResult);
    
    // 清理spies
    querySpy.mockRestore();
    executeSpy.mockRestore();
  });
  
  // 测试executeSql方法 - 处理SQL注入
  test('executeSql should safely handle potential SQL injection in queries', async () => {
    const maliciousSql = "SELECT * FROM users WHERE name = 'Robert'; DROP TABLE users; --'";
    const mockResult: QueryResult = {
      columns: ['id', 'name'],
      rows: [], // 空结果因为查询应该作为单个语句处理
      count: 0
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 监视query方法
    const querySpy = jest.spyOn(dbClient, 'query');
    
    // 调用executeSql
    await dbClient.executeSql(maliciousSql);
    
    // 验证SQL被原样传递，不应该自动执行第二个语句
    expect(querySpy).toHaveBeenCalledWith(maliciousSql, []);
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/query', { 
      sql: maliciousSql, 
      params: [] 
    });
    
    // 清理spy
    querySpy.mockRestore();
  });
  
  // 测试tableExists方法
  test('tableExists should return true when table exists', async () => {
    const tableName = 'existing_table';
    const mockResult: QueryResult = {
      columns: ['name'],
      rows: [['existing_table']],
      count: 1
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    const exists = await dbClient.tableExists(tableName);
    
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/query', { 
      sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, 
      params: [tableName] 
    });
    expect(exists).toBe(true);
  });
  
  test('tableExists should return false when table does not exist', async () => {
    const tableName = 'non_existing_table';
    const mockResult: QueryResult = {
      columns: ['name'],
      rows: [], // 空结果表示表不存在
      count: 0
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    const exists = await dbClient.tableExists(tableName);
    
    expect(exists).toBe(false);
  });
  
  test('tableExists should return false when query throws an error', async () => {
    const tableName = 'problem_table';
    const mockResponse: ApiResponse<QueryResult> = {
      success: false,
      error: { code: 'ERROR', message: 'Database error' }
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    const exists = await dbClient.tableExists(tableName);
    
    expect(exists).toBe(false);
  });

  // 附加测试 - 检验表名包含特殊字符时的情况
  test('query should correctly handle table names with special characters', async () => {
    const specialTableName = 'table-with.special_chars+123';
    const sql = `SELECT * FROM "${specialTableName}" WHERE id = ?`;
    const params = [1];
    
    const mockResult: QueryResult = {
      columns: ['id', 'name'],
      rows: [[1, 'Test']],
      count: 1
    };
    
    const mockResponse: ApiResponse<QueryResult> = {
      success: true,
      data: mockResult
    };
    
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    const result = await dbClient.query(sql, params);
    
    // 验证SQL语句和参数被正确传递
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/query', { 
      sql, 
      params 
    });
    
    // 验证结果正确
    expect(result).toEqual(mockResult);
  });
  
  // 检验executeSql的自动选择行为是否正确处理各种SQL语句
  test('executeSql should automatically choose correct method for different SQL statements', async () => {
    // 设置响应模拟
    const queryResult: QueryResult = {
      columns: ['count'],
      rows: [[5]],
      count: 1
    };
    
    const executeResult: ExecuteResult = {
      affected_rows: 2
    };
    
    const queryResponse: ApiResponse<QueryResult> = {
      success: true,
      data: queryResult
    };
    
    const executeResponse: ApiResponse<ExecuteResult> = {
      success: true,
      data: executeResult
    };
    
    // 创建spies来监视query和execute方法
    const querySpy = jest.spyOn(dbClient, 'query');
    const executeSpy = jest.spyOn(dbClient, 'execute');
    
    // 测试不同的SQL语句类型
    const testCases = [
      { sql: 'SELECT * FROM test', type: 'query', response: queryResponse },
      { sql: 'INSERT INTO test VALUES (1, "test")', type: 'execute', response: executeResponse },
      { sql: 'UPDATE test SET name = "updated" WHERE id = 1', type: 'execute', response: executeResponse },
      { sql: 'DELETE FROM test WHERE id = 1', type: 'execute', response: executeResponse },
      { sql: 'PRAGMA table_info(test)', type: 'query', response: queryResponse },
      { sql: 'EXPLAIN QUERY PLAN SELECT * FROM test', type: 'query', response: queryResponse },
    ];
    
    for (const testCase of testCases) {
      // 重置和设置mock
      jest.clearAllMocks();
      mockApiClient.post.mockResolvedValue(testCase.response);
      
      // 执行SQL
      await dbClient.executeSql(testCase.sql);
      
      // 验证调用了正确的方法
      if (testCase.type === 'query') {
        expect(querySpy).toHaveBeenCalledWith(testCase.sql, []);
        expect(executeSpy).not.toHaveBeenCalled();
      } else {
        expect(executeSpy).toHaveBeenCalledWith(testCase.sql, []);
        expect(querySpy).not.toHaveBeenCalled();
      }
    }
    
    // 清理
    querySpy.mockRestore();
    executeSpy.mockRestore();
  });
  
  // 测试函数如何处理包含Unicode和特殊字符的tableName
  test('tableExists should properly handle Unicode and special characters in table names', async () => {
    const specialTableNames = [
      'table_123',
      'table-with-hyphens',
      'table.with.dots',
      'table中文名',
      'table_name$with@special#chars'
    ];
    
    for (const tableName of specialTableNames) {
      // 设置mock返回一个存在的表
      const mockResult: QueryResult = {
        columns: ['name'],
        rows: [[tableName]],
        count: 1
      };
      
      const mockResponse: ApiResponse<QueryResult> = {
        success: true,
        data: mockResult
      };
      
      mockApiClient.post.mockResolvedValue(mockResponse);
      
      // 调用tableExists方法
      const exists = await dbClient.tableExists(tableName);
      
      // 验证
      expect(mockApiClient.post).toHaveBeenCalledWith('/api/db/query', { 
        sql: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`, 
        params: [tableName] 
      });
      expect(exists).toBe(true);
    }
  });
}); 