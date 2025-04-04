import { sdkClient } from '../sdk-client';
import {
  getDuckDBDatasets,
  getDuckDBDataset,
  createDuckDBDataset,
  deleteDuckDBDataset,
  executeDuckDBQuery,
  getDuckDBDatasetSchema,
  getDuckDBDatasetSample,
  exportDuckDBDataset,
  mergeDuckDBDatasets,
  DuckDBDataset
} from '../duckdb-service';
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

describe('DuckDB Service', () => {
  // 模拟客户端实例
  const mockExecuteRequest = jest.fn();
  const mockClient = {
    executeRequest: mockExecuteRequest
  };

  // 模拟数据集数据
  const mockDataset: DuckDBDataset = {
    id: 'ds-1',
    name: '测试数据集',
    description: '这是一个测试数据集',
    source: 'csv',
    status: 'ready',
    rowCount: 1000,
    columnCount: 5,
    sizeBytes: 50000,
    createdAt: Date.now(),
    updatedAt: Date.now()
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

  describe('getDuckDBDatasets', () => {
    it('should return datasets list when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: [mockDataset]
      });

      const result = await getDuckDBDatasets();
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/duckdb/datasets');
      expect(result).toEqual([mockDataset]);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to get datasets');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(getDuckDBDatasets()).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to get datasets',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('getDuckDBDataset', () => {
    it('should return a dataset by id when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockDataset
      });

      const result = await getDuckDBDataset('ds-1');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/duckdb/datasets/ds-1');
      expect(result).toEqual(mockDataset);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Dataset not found');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(getDuckDBDataset('ds-1')).rejects.toEqual({
        code: 'test_error',
        message: 'Dataset not found',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('createDuckDBDataset', () => {
    it('should create a dataset when successful', async () => {
      // 模拟请求参数
      const createOptions = {
        name: '新数据集',
        description: '新建的数据集',
        source: 'csv' as const,
        sourceOptions: {
          path: '/path/to/file.csv',
          delimiter: ',',
          hasHeader: true
        }
      };
      
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: { ...mockDataset, name: '新数据集', description: '新建的数据集' }
      });

      const result = await createDuckDBDataset(createOptions);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/duckdb/datasets', createOptions);
      expect(result.name).toEqual('新数据集');
      expect(result.description).toEqual('新建的数据集');
    });

    it('should throw error when request fails', async () => {
      // 模拟请求参数
      const createOptions = {
        name: '新数据集',
        description: '新建的数据集',
        source: 'csv' as const,
        sourceOptions: {
          path: '/invalid/path.csv',
          delimiter: ',',
          hasHeader: true
        }
      };
      
      // 模拟请求失败
      const error = new Error('Failed to create dataset');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(createDuckDBDataset(createOptions)).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to create dataset',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteDuckDBDataset', () => {
    it('should delete a dataset when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({});

      const result = await deleteDuckDBDataset('ds-1');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('DELETE', '/api/duckdb/datasets/ds-1');
      expect(result).toBe(true);
    });

    it('should throw error when delete request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to delete dataset');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(deleteDuckDBDataset('ds-1')).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to delete dataset',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });

    // Real API test - disabled by default with skip
    it.skip('should delete a real dataset using actual API', async () => {
      // Reset mocks
      jest.clearAllMocks();
      
      // Don't use mocked client for this test
      const realClient = {
        executeRequest: jest.fn().mockImplementation(async (method, url, data) => {
          // Make actual API call here
          const apiUrl = `http://localhost:8080${url}`;
          
          console.log(`Making ${method} request to ${apiUrl}`);
          
          const response = await fetch(apiUrl, {
            method,
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.API_KEY || ''}`
            },
            ...(data && (method === 'POST' || method === 'PUT') ? { body: JSON.stringify(data) } : {})
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          
          // For empty responses
          if (response.status === 204 || response.headers.get('content-length') === '0') {
            return {};
          }
          
          const responseData = await response.json();
          return { data: responseData };
        })
      };
      
      // Use the real client for this test
      (sdkClient.getClient as jest.Mock).mockReturnValue(realClient);
      
      // First create a test dataset
      const createOptions = {
        name: `Test Dataset ${Date.now()}`,
        description: 'Created for API test, will be deleted',
        source: 'query' as const,
        sourceOptions: {
          query: 'SELECT 1 as id, \'test\' as name'
        }
      };
      
      let datasetId: string;
      
      try {
        // Create a dataset first
        const createdDataset = await createDuckDBDataset(createOptions);
        console.log(`Created test dataset with ID: ${createdDataset.id}`);
        datasetId = createdDataset.id;
        
        // Delete the dataset
        const deleteResult = await deleteDuckDBDataset(datasetId);
        expect(deleteResult).toBe(true);
        console.log(`Successfully deleted test dataset with ID: ${datasetId}`);
        
        // Verify it was deleted by trying to fetch it (should fail)
        try {
          await getDuckDBDataset(datasetId);
          fail('Dataset should have been deleted but was still retrievable');
        } catch (error) {
          // Expected behavior - the dataset should not exist
          expect(error).toBeTruthy();
        }
      } catch (error) {
        console.error(`Test failed: ${error}`);
        fail(`Real API test failed: ${error}`);
      }
    });
  });

  describe('executeDuckDBQuery', () => {
    it('should format and return query results when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: {
          columns: ['id', 'name'],
          rows: [
            [1, 'Item 1'],
            [2, 'Item 2']
          ],
          execution_time_ms: 50,
          rows_processed: 2
        }
      });

      const result = await executeDuckDBQuery('SELECT * FROM test_table');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/duckdb/query', {
        query: 'SELECT * FROM test_table'
      });
      
      expect(result).toEqual({
        data: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' }
        ],
        error: null,
        duration: 0.05
      });
    });

    it('should use dataset-specific endpoint when datasetId is provided', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: {
          columns: ['id', 'name'],
          rows: [
            [1, 'Item 1']
          ],
          execution_time_ms: 30,
          rows_processed: 1
        }
      });

      await executeDuckDBQuery('SELECT * FROM dataset_table', 'ds-1');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/duckdb/datasets/ds-1/query', {
        query: 'SELECT * FROM dataset_table'
      });
    });
  });

  describe('getDuckDBDatasetSchema', () => {
    it('should return schema information for a dataset', async () => {
      // 模拟成功返回
      const mockSchema = {
        columns: [
          {
            name: 'id',
            type: 'INTEGER',
            nullable: false
          },
          {
            name: 'name',
            type: 'VARCHAR',
            nullable: true
          }
        ]
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockSchema
      });

      const result = await getDuckDBDatasetSchema('ds-1');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/duckdb/datasets/ds-1/schema');
      expect(result).toEqual(mockSchema);
    });
  });

  describe('getDuckDBDatasetSample', () => {
    it('should return sample data for a dataset', async () => {
      // 模拟成功返回
      const mockSampleData = {
        columns: ['id', 'name'],
        rows: [
          [1, 'Item 1'],
          [2, 'Item 2'],
          [3, 'Item 3']
        ],
        total_rows: 1000,
        sample_size: 3
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockSampleData
      });

      const result = await getDuckDBDatasetSample('ds-1', 3);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/duckdb/datasets/ds-1/sample', {
        params: { limit: 3 }
      });
      expect(result).toEqual(mockSampleData);
    });
  });

  describe('exportDuckDBDataset', () => {
    it('should initiate an export operation for a dataset', async () => {
      // 模拟成功返回
      const mockExportJob = {
        id: 'export-job-1',
        status: 'processing',
        format: 'csv',
        dataset_id: 'ds-1',
        created_at: Date.now()
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockExportJob
      });

      const result = await exportDuckDBDataset('ds-1', 'csv');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/duckdb/datasets/ds-1/export', {
        format: 'csv'
      });
      expect(result).toEqual(mockExportJob);
    });
  });

  describe('mergeDuckDBDatasets', () => {
    it('should merge two datasets into a new one', async () => {
      // 模拟请求参数
      const mergeOptions = {
        sourceDatasetIds: ['ds-1', 'ds-2'],
        name: '合并数据集',
        description: '由两个数据集合并而成',
        joinType: 'inner' as const,
        joinColumns: {
          'source_1.id': 'source_2.id'
        }
      };
      
      // 模拟成功返回
      const mockMergedDataset = {
        ...mockDataset,
        id: 'ds-merged',
        name: '合并数据集',
        description: '由两个数据集合并而成'
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockMergedDataset
      });

      const result = await mergeDuckDBDatasets(mergeOptions);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/duckdb/datasets/merge', mergeOptions);
      expect(result).toEqual(mockMergedDataset);
    });
  });
}); 