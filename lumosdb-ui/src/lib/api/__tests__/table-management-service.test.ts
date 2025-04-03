import { getTables, getTableInfo, deleteTable, truncateTable } from '../table-management-service';
import { sdkClient } from '../sdk-client';

// 模拟SDK客户端
jest.mock('../sdk-client', () => ({
  sdkClient: {
    getClient: jest.fn()
  }
}));

describe('表管理服务', () => {
  const mockDbClient = {
    getTables: jest.fn(),
    getTableInfo: jest.fn(),
    execute: jest.fn()
  };
  
  const mockClient = {
    db: mockDbClient
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (sdkClient.getClient as jest.Mock).mockReturnValue(mockClient);
  });
  
  describe('getTables', () => {
    it('应成功获取表列表', async () => {
      // 准备模拟数据
      const mockTablesResult = {
        tables: [
          {
            name: 'users',
            row_count: 100,
            size_bytes: 10240,
            columns: [
              { name: 'id', type: 'INTEGER', primary_key: true, nullable: false },
              { name: 'name', type: 'TEXT', nullable: false }
            ],
            created_at: '2023-01-01T00:00:00Z',
            last_modified: '2023-01-02T00:00:00Z'
          },
          {
            name: 'orders',
            row_count: 50,
            size_bytes: 5120,
            columns: [
              { name: 'id', type: 'INTEGER', primary_key: true, nullable: false },
              { name: 'user_id', type: 'INTEGER', nullable: false }
            ],
            created_at: '2023-01-01T00:00:00Z',
            last_modified: '2023-01-02T00:00:00Z'
          }
        ]
      };
      
      mockDbClient.getTables.mockResolvedValue(mockTablesResult);
      
      // 执行
      const result = await getTables('main');
      
      // 断言
      expect(mockDbClient.getTables).toHaveBeenCalledWith({ database: 'main' });
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('users');
      expect(result[0].rowCount).toBe(100);
      expect(result[0].schema).toHaveLength(2);
      expect(result[0].schema[0].name).toBe('id');
      expect(result[0].schema[0].primary).toBe(true);
    });
    
    it('应在未指定数据库时使用默认数据库', async () => {
      // 准备
      mockDbClient.getTables.mockResolvedValue({ tables: [] });
      
      // 执行
      await getTables();
      
      // 断言
      expect(mockDbClient.getTables).toHaveBeenCalledWith({ database: 'main' });
    });
    
    it('应处理空结果', async () => {
      // 准备
      mockDbClient.getTables.mockResolvedValue({ tables: [] });
      
      // 执行
      const result = await getTables();
      
      // 断言
      expect(result).toEqual([]);
    });
    
    it('应处理错误并返回空数组', async () => {
      // 准备
      mockDbClient.getTables.mockRejectedValue(new Error('获取表列表失败'));
      
      // 执行
      const result = await getTables();
      
      // 断言
      expect(result).toEqual([]);
    });
  });
  
  describe('getTableInfo', () => {
    it('应成功获取表信息', async () => {
      // 准备
      const mockTableName = 'users';
      const mockTableInfoResult = {
        table: {
          name: 'users',
          row_count: 100,
          size_bytes: 10240,
          columns: [
            { name: 'id', type: 'INTEGER', primary_key: true, nullable: false },
            { name: 'name', type: 'TEXT', nullable: false }
          ],
          created_at: '2023-01-01T00:00:00Z',
          last_modified: '2023-01-02T00:00:00Z'
        }
      };
      
      mockDbClient.getTableInfo.mockResolvedValue(mockTableInfoResult);
      
      // 执行
      const result = await getTableInfo(mockTableName, 'main');
      
      // 断言
      expect(mockDbClient.getTableInfo).toHaveBeenCalledWith({
        table: mockTableName,
        database: 'main'
      });
      expect(result).not.toBeNull();
      expect(result?.name).toBe('users');
      expect(result?.rowCount).toBe(100);
      expect(result?.schema).toHaveLength(2);
      expect(result?.schema[0].name).toBe('id');
      expect(result?.schema[0].primary).toBe(true);
    });
    
    it('应处理错误并返回null', async () => {
      // 准备
      const mockTableName = 'non_existent_table';
      mockDbClient.getTableInfo.mockRejectedValue(new Error('表不存在'));
      
      // 执行
      const result = await getTableInfo(mockTableName);
      
      // 断言
      expect(result).toBeNull();
    });
  });
  
  describe('deleteTable', () => {
    it('应成功删除表', async () => {
      // 准备
      const mockTableName = 'users';
      mockDbClient.execute.mockResolvedValue({ rowsAffected: 0 });
      
      // 执行
      const result = await deleteTable(mockTableName, 'main');
      
      // 断言
      expect(mockDbClient.execute).toHaveBeenCalledWith({
        sql: `DROP TABLE IF EXISTS ${mockTableName}`,
        database: 'main',
        params: []
      });
      expect(result.success).toBe(true);
    });
    
    it('应处理删除错误', async () => {
      // 准备
      const mockTableName = 'protected_table';
      const mockError = '权限不足，无法删除表';
      mockDbClient.execute.mockResolvedValue({ error: mockError });
      
      // 执行
      const result = await deleteTable(mockTableName);
      
      // 断言
      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
    });
    
    it('应处理异常', async () => {
      // 准备
      const mockTableName = 'users';
      mockDbClient.execute.mockRejectedValue(new Error('网络错误'));
      
      // 执行
      const result = await deleteTable(mockTableName);
      
      // 断言
      expect(result.success).toBe(false);
      expect(result.error).toBe('网络错误');
    });
  });
  
  describe('truncateTable', () => {
    it('应成功清空表数据', async () => {
      // 准备
      const mockTableName = 'users';
      mockDbClient.execute.mockResolvedValue({ rowsAffected: 100 });
      
      // 执行
      const result = await truncateTable(mockTableName, 'main');
      
      // 断言
      expect(mockDbClient.execute).toHaveBeenCalledWith({
        sql: `DELETE FROM ${mockTableName}`,
        database: 'main',
        params: []
      });
      expect(result.success).toBe(true);
    });
    
    it('应处理执行错误', async () => {
      // 准备
      const mockTableName = 'users';
      const mockError = '触发器阻止了清空操作';
      mockDbClient.execute.mockResolvedValue({ error: mockError });
      
      // 执行
      const result = await truncateTable(mockTableName);
      
      // 断言
      expect(result.success).toBe(false);
      expect(result.error).toBe(mockError);
    });
    
    it('应处理异常', async () => {
      // 准备
      const mockTableName = 'users';
      mockDbClient.execute.mockRejectedValue(new Error('数据库已锁定'));
      
      // 执行
      const result = await truncateTable(mockTableName);
      
      // 断言
      expect(result.success).toBe(false);
      expect(result.error).toBe('数据库已锁定');
    });
  });
}); 