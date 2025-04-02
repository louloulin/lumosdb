import { HealthClient } from './health-client';
import { ApiClient } from '../core/api-client';
import { HealthStatus } from '../types/health';
import { ApiResponse } from '../types/core';

// 模拟ApiClient
jest.mock('../core/api-client');

describe('HealthClient', () => {
  let healthClient: HealthClient;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    // 创建模拟的ApiClient实例
    mockApiClient = new ApiClient('') as jest.Mocked<ApiClient>;
    // 创建HealthClient实例，传入模拟的ApiClient
    healthClient = new HealthClient(mockApiClient);
  });

  test('check should call apiClient.get and return health status', async () => {
    const mockHealthStatus: HealthStatus = {
      status: 'ok',
      version: '1.0.0',
      uptime: 1234,
      cpu_usage: 5.2,
      memory_usage: 123456,
      connections: 5
    };
    
    const mockResponse: ApiResponse<HealthStatus> = {
      success: true,
      data: mockHealthStatus
    };
    
    // 设置mock返回值
    mockApiClient.get.mockResolvedValue(mockResponse);
    
    // 调用方法
    const result = await healthClient.check();
    
    // 验证
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/health');
    expect(result).toBe(mockHealthStatus);
  });

  test('check should throw error when response is not successful', async () => {
    const mockResponse: ApiResponse<HealthStatus> = {
      success: false,
      error: { code: 'ERROR', message: 'Health check failed' }
    };
    
    // 设置mock返回值
    mockApiClient.get.mockResolvedValue(mockResponse);
    
    // 验证抛出错误
    await expect(healthClient.check()).rejects.toThrow('Health check failed');
  });
}); 