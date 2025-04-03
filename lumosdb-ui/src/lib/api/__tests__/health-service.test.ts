import { checkHealth, getSystemInfo } from '../health-service';
import { getHealthClient } from '../sdk-client';

// 模拟SDK客户端
jest.mock('../sdk-client', () => ({
  getHealthClient: jest.fn()
}));

describe('健康检查服务', () => {
  const mockHealthClient = {
    check: jest.fn(),
    getSystemInfo: jest.fn()
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    (getHealthClient as jest.Mock).mockReturnValue(mockHealthClient);
  });
  
  describe('checkHealth', () => {
    it('应返回正常的健康状态', async () => {
      // 准备
      const mockResponse = {
        status: 'ok',
        version: '1.0.0',
        uptime: 3600,
        timestamp: '2023-01-01T00:00:00Z',
        dbConnected: true,
        message: 'Service is healthy'
      };
      
      mockHealthClient.check.mockResolvedValue(mockResponse);
      
      // 执行
      const result = await checkHealth();
      
      // 断言
      expect(mockHealthClient.check).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'ok',
        version: '1.0.0',
        uptime: 3600,
        timestamp: '2023-01-01T00:00:00Z',
        dbStatus: 'connected',
        message: 'Service is healthy'
      });
    });
    
    it('应处理错误状态', async () => {
      // 准备
      const mockResponse = {
        status: 'error',
        version: '1.0.0',
        uptime: 3600,
        timestamp: '2023-01-01T00:00:00Z',
        dbConnected: false,
        message: 'Database connection error'
      };
      
      mockHealthClient.check.mockResolvedValue(mockResponse);
      
      // 执行
      const result = await checkHealth();
      
      // 断言
      expect(mockHealthClient.check).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'error',
        version: '1.0.0',
        uptime: 3600,
        timestamp: '2023-01-01T00:00:00Z',
        dbStatus: 'disconnected',
        message: 'Database connection error'
      });
    });
    
    it('应处理检查异常', async () => {
      // 准备
      const mockError = new Error('Connection failed');
      
      mockHealthClient.check.mockRejectedValue(mockError);
      
      // 执行
      const result = await checkHealth();
      
      // 断言
      expect(mockHealthClient.check).toHaveBeenCalled();
      expect(result.status).toBe('error');
      expect(result.version).toBe('unknown');
      expect(result.dbStatus).toBe('disconnected');
      expect(result.message).toBe(mockError.message);
    });
  });
  
  describe('getSystemInfo', () => {
    it('应返回系统信息', async () => {
      // 准备
      const mockSystemInfo = {
        os: 'Linux',
        cpuUsage: 25.5,
        memoryUsage: 60.2,
        diskUsage: 45.8,
        dbSize: 1024000
      };
      
      mockHealthClient.getSystemInfo.mockResolvedValue(mockSystemInfo);
      
      // 执行
      const result = await getSystemInfo();
      
      // 断言
      expect(mockHealthClient.getSystemInfo).toHaveBeenCalled();
      expect(result).toEqual(mockSystemInfo);
    });
    
    it('应处理获取系统信息异常', async () => {
      // 准备
      const mockError = new Error('Failed to get system info');
      
      mockHealthClient.getSystemInfo.mockRejectedValue(mockError);
      
      // 执行
      const result = await getSystemInfo();
      
      // 断言
      expect(mockHealthClient.getSystemInfo).toHaveBeenCalled();
      expect(result).toEqual({
        error: mockError.message
      });
    });
  });
}); 