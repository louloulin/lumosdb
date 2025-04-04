import { sdkClient } from '../sdk-client';
import {
  getAnalyticsTables,
  executeAnalyticsQuery,
  getAnalyticsQuery,
  deleteAnalyticsQuery,
  performTimeSeriesAnalysis,
  detectAnomalies,
  createAnalyticsReport,
  getAnalyticsReports,
  getAnalyticsReport,
  updateAnalyticsReport,
  deleteAnalyticsReport,
  generateAnalyticsReport,
  getLatestReportResult,
  getDataMetrics,
  createDataMetric,
  updateDataMetric,
  deleteDataMetric,
  generateDataDashboard,
  AnalyticsReport,
  ReportResult,
  DataMetric
} from '../analytics-service';
import { handleError } from '../error-handler';
import axios from 'axios';
import { API_BASE_URL } from '../../api-config';

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

// Mock axios
jest.mock('axios');

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

describe('Analytics Service - Reports and Metrics', () => {
  let mockClient: any;
  
  beforeEach(() => {
    mockClient = {
      executeRequest: jest.fn(),
    };
    (sdkClient.getClient as jest.Mock).mockReturnValue(mockClient);
    jest.clearAllMocks();
  });
  
  describe('Analytics Reports', () => {
    const testReport: AnalyticsReport = {
      id: 'report-1',
      name: 'Test Report',
      description: 'A test report for unit testing',
      queries: [1, 2, 3],
      createdAt: '2023-08-15T10:00:00Z',
      status: 'draft',
      format: 'html'
    };
    
    const testReportResult: ReportResult = {
      reportId: 'report-1',
      generatedAt: '2023-08-15T11:00:00Z',
      downloadUrl: 'https://example.com/report.html',
      size: 1024,
      format: 'html'
    };

    test('createAnalyticsReport should create a new report', async () => {
      const newReport = { ...testReport };
      delete newReport.id;
      
      mockClient.executeRequest.mockResolvedValueOnce({
        data: testReport
      });
      
      const result = await createAnalyticsReport(newReport);
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'POST', 
        '/api/analytics/reports', 
        newReport
      );
      expect(result).toEqual(testReport);
    });
    
    test('createAnalyticsReport should fallback to direct API call', async () => {
      const newReport = { ...testReport };
      delete newReport.id;
      
      mockClient.executeRequest.mockRejectedValueOnce(new Error('SDK error'));
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: testReport
      });
      
      const result = await createAnalyticsReport(newReport);
      
      expect(axios.post).toHaveBeenCalledWith(
        `${API_BASE_URL}/analytics/reports`, 
        newReport
      );
      expect(result).toEqual(testReport);
    });
    
    test('getAnalyticsReports should retrieve all reports', async () => {
      const reportsArray = [testReport];
      
      mockClient.executeRequest.mockResolvedValueOnce({
        data: reportsArray
      });
      
      const result = await getAnalyticsReports();
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'GET', 
        '/api/analytics/reports'
      );
      expect(result).toEqual(reportsArray);
    });
    
    test('getAnalyticsReport should retrieve a specific report', async () => {
      mockClient.executeRequest.mockResolvedValueOnce({
        data: testReport
      });
      
      const result = await getAnalyticsReport('report-1');
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'GET', 
        '/api/analytics/reports/report-1'
      );
      expect(result).toEqual(testReport);
    });
    
    test('updateAnalyticsReport should update a report', async () => {
      const updates = { name: 'Updated Report Name' };
      const updatedReport = { ...testReport, ...updates };
      
      mockClient.executeRequest.mockResolvedValueOnce({
        data: updatedReport
      });
      
      const result = await updateAnalyticsReport('report-1', updates);
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'PUT', 
        '/api/analytics/reports/report-1',
        updates
      );
      expect(result).toEqual(updatedReport);
    });
    
    test('deleteAnalyticsReport should delete a report', async () => {
      mockClient.executeRequest.mockResolvedValueOnce({});
      
      const result = await deleteAnalyticsReport('report-1');
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'DELETE', 
        '/api/analytics/reports/report-1'
      );
      expect(result).toBe(true);
    });
    
    test('generateAnalyticsReport should generate a report on demand', async () => {
      mockClient.executeRequest.mockResolvedValueOnce({
        data: testReportResult
      });
      
      const parameters = { date: '2023-08-15' };
      const result = await generateAnalyticsReport('report-1', parameters);
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'POST', 
        '/api/analytics/reports/report-1/generate',
        { parameters }
      );
      expect(result).toEqual(testReportResult);
    });
    
    test('getLatestReportResult should retrieve the latest report result', async () => {
      mockClient.executeRequest.mockResolvedValueOnce({
        data: testReportResult
      });
      
      const result = await getLatestReportResult('report-1');
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'GET', 
        '/api/analytics/reports/report-1/latest'
      );
      expect(result).toEqual(testReportResult);
    });
    
    test('getLatestReportResult should handle 404 when no report exists', async () => {
      mockClient.executeRequest.mockRejectedValueOnce(new Error('SDK error'));
      
      const error = { response: { status: 404 } };
      (axios.get as jest.Mock).mockRejectedValueOnce(error);
      
      const result = await getLatestReportResult('report-1');
      
      expect(axios.get).toHaveBeenCalledWith(
        `${API_BASE_URL}/analytics/reports/report-1/latest`
      );
      expect(result).toBeNull();
    });
  });
  
  describe('Data Metrics', () => {
    const testMetric: DataMetric = {
      id: 'metric-1',
      name: 'Active Users',
      description: 'Count of active users in the last 30 days',
      query: 'SELECT COUNT(*) FROM users WHERE last_active > NOW() - INTERVAL 30 DAY',
      currentValue: 1250,
      previousValue: 1100,
      changePercentage: 13.64,
      trend: 'up',
      lastUpdated: '2023-08-15T10:00:00Z',
      thresholds: {
        warning: 1000,
        critical: 800
      }
    };
    
    test('getDataMetrics should retrieve all metrics', async () => {
      const metricsArray = [testMetric];
      
      mockClient.executeRequest.mockResolvedValueOnce({
        data: metricsArray
      });
      
      const result = await getDataMetrics();
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'GET', 
        '/api/analytics/metrics'
      );
      expect(result).toEqual(metricsArray);
    });
    
    test('createDataMetric should create a new metric', async () => {
      const newMetric = {
        name: testMetric.name,
        description: testMetric.description,
        query: testMetric.query,
        thresholds: testMetric.thresholds
      };
      
      mockClient.executeRequest.mockResolvedValueOnce({
        data: testMetric
      });
      
      const result = await createDataMetric(newMetric);
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'POST', 
        '/api/analytics/metrics', 
        newMetric
      );
      expect(result).toEqual(testMetric);
    });
    
    test('updateDataMetric should update a metric', async () => {
      const updates = { name: 'Updated Metric Name' };
      const updatedMetric = { ...testMetric, ...updates };
      
      mockClient.executeRequest.mockResolvedValueOnce({
        data: updatedMetric
      });
      
      const result = await updateDataMetric('metric-1', updates);
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'PUT', 
        '/api/analytics/metrics/metric-1',
        updates
      );
      expect(result).toEqual(updatedMetric);
    });
    
    test('deleteDataMetric should delete a metric', async () => {
      mockClient.executeRequest.mockResolvedValueOnce({});
      
      const result = await deleteDataMetric('metric-1');
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'DELETE', 
        '/api/analytics/metrics/metric-1'
      );
      expect(result).toBe(true);
    });
  });
  
  describe('Dashboard Generation', () => {
    test('generateDataDashboard should generate an HTML dashboard', async () => {
      const dashboardOptions = {
        title: 'Test Dashboard',
        description: 'A test dashboard for unit testing',
        queries: [
          { id: 1, title: 'User Growth', visualization: 'line-chart' },
          { id: 2, title: 'Revenue', visualization: 'bar-chart' }
        ],
        theme: 'dark' as const,
        layout: 'grid' as const
      };
      
      const htmlContent = '<html><body>Dashboard content</body></html>';
      
      mockClient.executeRequest.mockResolvedValueOnce({
        data: htmlContent
      });
      
      const result = await generateDataDashboard(dashboardOptions);
      
      expect(mockClient.executeRequest).toHaveBeenCalledWith(
        'POST', 
        '/api/analytics/dashboard/generate', 
        dashboardOptions
      );
      expect(result).toEqual(htmlContent);
    });
    
    test('generateDataDashboard should fallback to direct API call', async () => {
      const dashboardOptions = {
        title: 'Test Dashboard',
        description: 'A test dashboard for unit testing',
        queries: [
          { id: 1, title: 'User Growth', visualization: 'line-chart' },
          { id: 2, title: 'Revenue', visualization: 'bar-chart' }
        ]
      };
      
      const htmlContent = '<html><body>Dashboard content</body></html>';
      
      mockClient.executeRequest.mockRejectedValueOnce(new Error('SDK error'));
      (axios.post as jest.Mock).mockResolvedValueOnce({
        data: htmlContent
      });
      
      const result = await generateDataDashboard(dashboardOptions);
      
      expect(axios.post).toHaveBeenCalledWith(
        `${API_BASE_URL}/analytics/dashboard/generate`, 
        dashboardOptions
      );
      expect(result).toEqual(htmlContent);
    });
  });
}); 