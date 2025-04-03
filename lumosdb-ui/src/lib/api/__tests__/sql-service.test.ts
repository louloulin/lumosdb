import { executeSQLQuery, executeSQL, getTables, getTableSchema, getTableData } from '../sql-service';
import { getDbClient } from '../sdk-client';

// 模拟SDK客户端
jest.mock('../sdk-client', () => ({
  getDbClient: jest.fn()
}));

describe('SQL服务', () => {
  const mockDbClient = {
    query: jest.fn(),
    execute: jest.fn(),
    getTables: jest.fn(),
    getTableInfo: jest.fn(),
    createTable: jest.fn(),
    dropTable: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (getDbClient as jest.Mock).mockReturnValue(mockDbClient);
  });
  
  describe('executeSQLQuery', () => {
    it('应成功执行查询并返回结果', async () => {
      // 准备
      const mockQuery = 'SELECT * FROM users';
      const mockResult = {
        rows: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' }
        ],
        columns: ['id', 'name']
      };
      
      mockDbClient.query.mockResolvedValue(mockResult);
      
      // 执行
      const result = await executeSQLQuery(mockQuery);
      
      // 断言
      expect(mockDbClient.query).toHaveBeenCalledWith(mockQuery);
      expect(result.data).toEqual(mockResult.rows);
      expect(result.columns).toEqual(mockResult.columns);
      expect(result.rowCount).toBe(2);
      expect(result.error).toBeNull();
      expect(result.duration).toBeGreaterThan(0);
    });
    
    it('应处理查询错误', async () => {
      // 准备
      const mockQuery = 'SELECT * FROM non_existent_table';
      const mockError = new Error('表不存在');
      
      mockDbClient.query.mockRejectedValue(mockError);
      
      // 执行
      const result = await executeSQLQuery(mockQuery);
      
      // 断言
      expect(mockDbClient.query).toHaveBeenCalledWith(mockQuery);
      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError.message);
      expect(result.duration).toBe(0);
    });
  });
  
  describe('executeSQL', () => {
    it('应成功执行修改操作', async () => {
      // 准备
      const mockQuery = 'UPDATE users SET name = "Alice" WHERE id = 1';
      const mockResult = {
        rowsAffected: 1
      };
      
      mockDbClient.execute.mockResolvedValue(mockResult);
      
      // 执行
      const result = await executeSQL(mockQuery);
      
      // 断言
      expect(mockDbClient.execute).toHaveBeenCalledWith(mockQuery);
      expect(result.rowsAffected).toBe(1);
      expect(result.error).toBeNull();
      expect(result.duration).toBeGreaterThan(0);
    });
    
    it('应处理执行错误', async () => {
      // 准备
      const mockQuery = 'UPDATE non_existent_table SET name = "Alice"';
      const mockError = new Error('表不存在');
      
      mockDbClient.execute.mockRejectedValue(mockError);
      
      // 执行
      const result = await executeSQL(mockQuery);
      
      // 断言
      expect(mockDbClient.execute).toHaveBeenCalledWith(mockQuery);
      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError.message);
      expect(result.duration).toBe(0);
    });
  });
  
  describe('getTables', () => {
    it('应返回表列表', async () => {
      // 准备
      const mockTables = ['users', 'orders', 'products'];
      mockDbClient.getTables.mockResolvedValue(mockTables);
      
      // 执行
      const result = await getTables();
      
      // 断言
      expect(mockDbClient.getTables).toHaveBeenCalled();
      expect(result).toEqual(mockTables);
    });
    
    it('应处理错误并返回空数组', async () => {
      // 准备
      mockDbClient.getTables.mockRejectedValue(new Error('获取表失败'));
      
      // 执行
      const result = await getTables();
      
      // 断言
      expect(mockDbClient.getTables).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });
  
  describe('getTableSchema', () => {
    it('应返回表结构', async () => {
      // 准备
      const mockTableName = 'users';
      const mockTableInfo = {
        columns: [
          { name: 'id', type: 'INTEGER', primaryKey: true, nullable: false },
          { name: 'name', type: 'TEXT', primaryKey: false, nullable: false }
        ]
      };
      
      mockDbClient.getTableInfo.mockResolvedValue(mockTableInfo);
      
      // 执行
      const result = await getTableSchema(mockTableName);
      
      // 断言
      expect(mockDbClient.getTableInfo).toHaveBeenCalledWith(mockTableName);
      expect(result.columns).toEqual([
        { name: 'id', type: 'INTEGER', primary: true, nullable: false },
        { name: 'name', type: 'TEXT', primary: false, nullable: false }
      ]);
      expect(result.error).toBeNull();
    });
    
    it('应处理获取表结构错误', async () => {
      // 准备
      const mockTableName = 'non_existent_table';
      const mockError = new Error('表不存在');
      
      mockDbClient.getTableInfo.mockRejectedValue(mockError);
      
      // 执行
      const result = await getTableSchema(mockTableName);
      
      // 断言
      expect(mockDbClient.getTableInfo).toHaveBeenCalledWith(mockTableName);
      expect(result.columns).toBeNull();
      expect(result.error).toBe(mockError.message);
    });
  });
  
  describe('getTableData', () => {
    it('应返回分页数据', async () => {
      // 准备
      const mockTableName = 'users';
      const mockOptions = { limit: 10, offset: 0 };
      
      // 模拟两个查询的结果
      mockDbClient.query.mockImplementation((query) => {
        if (query.includes('COUNT(*)')) {
          return Promise.resolve({ rows: [{ total: '100' }] });
        } else {
          return Promise.resolve({
            rows: [
              { id: 1, name: 'Alice' },
              { id: 2, name: 'Bob' }
            ]
          });
        }
      });
      
      // 执行
      const result = await getTableData(mockTableName, mockOptions);
      
      // 断言
      expect(mockDbClient.query).toHaveBeenCalledTimes(2);
      expect(result.data).toEqual([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' }
      ]);
      expect(result.count).toBe(100);
      expect(result.error).toBeNull();
    });
    
    it('应处理获取数据错误', async () => {
      // 准备
      const mockTableName = 'non_existent_table';
      const mockOptions = { limit: 10, offset: 0 };
      const mockError = new Error('表不存在');
      
      mockDbClient.query.mockRejectedValue(mockError);
      
      // 执行
      const result = await getTableData(mockTableName, mockOptions);
      
      // 断言
      expect(mockDbClient.query).toHaveBeenCalled();
      expect(result.data).toBeNull();
      expect(result.count).toBe(0);
      expect(result.error).toBe(mockError.message);
    });
  });
}); 