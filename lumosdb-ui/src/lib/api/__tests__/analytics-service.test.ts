import { sdkClient } from '../sdk-client';
import {
  getAnalyticsTables,
  executeAnalyticsQuery,
  getAnalyticsQuery,
  deleteAnalyticsQuery,
  performTimeSeriesAnalysis,
  detectAnomalies
} from '../analytics-service';
import { handleError } from '../error-handler';

// 模拟SDK客户端
jest.mock('../sdk-client', () => ({
  sdkClient: {
    getClient: jest.fn()
  }
}));

// 模拟错误处理
jest.mock('../error-handler', () => ({
  handleError: jest.fn(),
  getUserFriendlyErrorMessage: jest.fn(error => `User friendly: ${error.message}`)
}));

describe('Analytics Service', () => {
  // 模拟客户端实例
  const mockExecuteRequest = jest.fn();
  const mockClient = {
    executeRequest: mockExecuteRequest
  };

  beforeEach(() => {
    // 清除所有模拟的调用记录
    jest.clearAllMocks();
    // 模拟SDK客户端获取函数
    (sdkClient.getClient as jest.Mock).mockReturnValue(mockClient);
    // 模拟handleError函数
    (handleError as jest.Mock).mockImplementation(error => ({
      code: 'test_error',
      message: error.message,
      details: {}
    }));
  });

  describe('getAnalyticsTables', () => {
    it('should return analytics tables list when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: ['table1', 'table2', 'table3']
      });

      const result = await getAnalyticsTables();
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/analytics/tables');
      expect(result).toEqual(['table1', 'table2', 'table3']);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to get tables');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(getAnalyticsTables()).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to get tables',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('executeAnalyticsQuery', () => {
    it('should format and return query results when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: {
          columns: ['col1', 'col2'],
          rows: [
            ['value1', 123],
            ['value2', 456]
          ],
          execution_time_ms: 100,
          rows_processed: 2
        }
      });

      const result = await executeAnalyticsQuery('SELECT * FROM test');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/analytics/query', {
        query: 'SELECT * FROM test'
      });
      
      expect(result).toEqual({
        data: [
          { col1: 'value1', col2: 123 },
          { col1: 'value2', col2: 456 }
        ],
        error: null,
        duration: 0.1
      });
    });

    it('should return error when query fails', async () => {
      // 模拟请求失败
      const error = new Error('Query syntax error');
      mockExecuteRequest.mockRejectedValueOnce(error);

      const result = await executeAnalyticsQuery('INVALID QUERY');
      
      expect(result).toEqual({
        data: null,
        error: 'User friendly: Query syntax error',
        duration: 0
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('getAnalyticsQuery', () => {
    it('should return query by id when successful', async () => {
      // 模拟成功返回
      const mockQuery = {
        id: 1,
        name: 'Test Query',
        description: 'This is a test query',
        query: 'SELECT * FROM test',
        visualization: 'bar',
        createdAt: '2023-01-01'
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockQuery
      });

      const result = await getAnalyticsQuery(1);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/analytics/queries/1');
      expect(result).toEqual(mockQuery);
    });
  });

  describe('deleteAnalyticsQuery', () => {
    it('should return true when successfully deleted a query', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({});

      const result = await deleteAnalyticsQuery(1);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('DELETE', '/api/analytics/queries/1');
      expect(result).toBe(true);
    });

    it('should throw error when delete fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to delete query');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(deleteAnalyticsQuery(1)).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to delete query',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  // 额外测试 - 测试时间序列分析功能
  describe('performTimeSeriesAnalysis', () => {
    it('should perform time series analysis with correct parameters', async () => {
      // 模拟成功返回
      const mockResult = {
        columns: ['time_bucket', 'avg_value'],
        rows: [
          ['2023-01-01', 123],
          ['2023-01-02', 456]
        ],
        execution_time_ms: 150,
        rows_processed: 2
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockResult
      });

      const options = {
        source: 'sales',
        timestampColumn: 'date',
        valueColumn: 'amount',
        interval: '1 day',
        aggregation: 'avg'
      };

      const result = await performTimeSeriesAnalysis(options);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/analytics/timeseries', options);
      expect(result).toEqual(mockResult);
    });
    
    it('should handle errors during time series analysis', async () => {
      // 模拟请求失败
      const error = new Error('Invalid time column');
      mockExecuteRequest.mockRejectedValueOnce(error);
      
      const options = {
        source: 'sales',
        timestampColumn: 'invalid_date',
        valueColumn: 'amount',
        interval: '1 day',
        aggregation: 'avg'
      };
      
      await expect(performTimeSeriesAnalysis(options)).rejects.toEqual({
        code: 'test_error',
        message: 'Invalid time column',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/analytics/timeseries', options);
    });
  });
  
  // 新增 - 测试异常检测功能
  describe('detectAnomalies', () => {
    it('should detect anomalies with correct parameters', async () => {
      // 模拟成功返回
      const mockResult = {
        columns: ['timestamp', 'value', 'z_score', 'status'],
        rows: [
          ['2023-01-15', 850, 3.5, 'Anomaly'],
          ['2023-03-22', 950, 4.2, 'Anomaly']
        ],
        execution_time_ms: 180,
        rows_processed: 2
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockResult
      });

      const options = {
        source: 'sales',
        timestampColumn: 'date',
        valueColumn: 'amount',
        threshold: 3.0
      };

      const result = await detectAnomalies(options);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/analytics/anomalies', options);
      expect(result).toEqual(mockResult);
    });
    
    it('should handle errors during anomaly detection', async () => {
      // 模拟请求失败
      const error = new Error('Invalid threshold value');
      mockExecuteRequest.mockRejectedValueOnce(error);
      
      const options = {
        source: 'sales',
        timestampColumn: 'date',
        valueColumn: 'amount',
        threshold: -1.0 // 无效的阈值
      };
      
      await expect(detectAnomalies(options)).rejects.toEqual({
        code: 'test_error',
        message: 'Invalid threshold value',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/analytics/anomalies', options);
    });
    
    it('should handle empty anomaly results', async () => {
      // 模拟成功返回但没有检测到异常
      const mockEmptyResult = {
        columns: ['timestamp', 'value', 'z_score', 'status'],
        rows: [],
        execution_time_ms: 150,
        rows_processed: 0
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockEmptyResult
      });

      const options = {
        source: 'sales',
        timestampColumn: 'date',
        valueColumn: 'amount',
        threshold: 5.0 // 高阈值导致没有异常检测
      };

      const result = await detectAnomalies(options);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/analytics/anomalies', options);
      expect(result).toEqual(mockEmptyResult);
      expect(result.rows).toHaveLength(0);
    });
  });
}); 