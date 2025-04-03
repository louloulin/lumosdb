import axios, { AxiosProgressEvent } from 'axios';
import { 
  importData, 
  exportData, 
  getAvailableTables, 
  getDataTransferHistory, 
  getSupportedFormats,
  DatabaseType,
  DataFormat
} from '../data-transfer-service';
import { sdkClient } from '../sdk-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: (key: string) => mockLocalStorage[key] || null,
    setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
    removeItem: (key: string) => { delete mockLocalStorage[key]; },
    clear: () => { Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]); }
  },
  writable: true
});

// Mock SDK client
jest.mock('../sdk-client', () => ({
  sdkClient: {
    getClient: jest.fn().mockReturnValue({
      db: {
        getTables: jest.fn(),
      },
      vector: {
        listCollections: jest.fn()
      }
    })
  }
}));

// Mock document create element and URL
const mockCreateElement = jest.fn().mockReturnValue({
  href: '',
  download: '',
  click: jest.fn(),
});
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();

Object.defineProperty(global, 'document', {
  value: {
    createElement: mockCreateElement,
    body: {
      appendChild: mockAppendChild,
      removeChild: mockRemoveChild
    }
  },
  writable: true
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: jest.fn().mockReturnValue('mock-url'),
    revokeObjectURL: jest.fn()
  },
  writable: true
});

describe('数据传输服务', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage['lumos_auth_token'] = 'test-token';
    mockedAxios.create.mockReturnValue(mockedAxios);
  });

  describe('importData', () => {
    it('应该成功导入文件', async () => {
      // 设置mock响应
      mockedAxios.post.mockResolvedValueOnce({
        data: {
          success: true,
          rowsImported: 100,
          tableCreated: true
        }
      });

      // 创建测试文件
      const file = new File(['test data'], 'test.csv', { type: 'text/csv' });
      
      // 执行导入
      const options = {
        databaseType: DatabaseType.SQLITE,
        tableName: 'test_table',
        format: DataFormat.CSV,
        hasHeaders: true,
        createTable: true
      };
      
      const result = await importData(file, options);
      
      // 验证结果
      expect(result).toEqual({
        success: true,
        rowsImported: 100,
        tableCreated: true
      });
      
      // 验证请求
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/data-transfer/import',
        expect.any(FormData),
        expect.objectContaining({
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: expect.any(Function)
        })
      );
    });

    it('应该处理进度回调', async () => {
      // 设置mock响应
      mockedAxios.post.mockImplementationOnce(async (url, data, config) => {
        // 手动触发进度回调
        if (config?.onUploadProgress) {
          const progressEvent: AxiosProgressEvent = { 
            loaded: 50, 
            total: 100,
            bytes: 50,
            upload: true,
            download: false,
            progress: 0.5,
            estimated: 100,
            rate: 10,
            lengthComputable: true
          };
          config.onUploadProgress(progressEvent);
        }
        return {
          data: {
            success: true,
            rowsImported: 100
          }
        };
      });

      // 创建进度回调mock
      const mockProgressCallback = jest.fn();
      
      // 创建测试文件
      const file = new File(['test data'], 'test.csv', { type: 'text/csv' });
      
      // 执行导入
      await importData(file, {
        databaseType: DatabaseType.SQLITE,
        tableName: 'test_table',
        format: DataFormat.CSV,
        onProgress: mockProgressCallback
      });
      
      // 验证进度回调
      expect(mockProgressCallback).toHaveBeenCalledWith(50);
    });

    it('应该处理导入错误', async () => {
      // 设置mock错误
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 400,
          data: { message: '导入错误' }
        }
      });

      // 创建测试文件
      const file = new File(['test data'], 'test.csv', { type: 'text/csv' });
      
      // 执行导入
      const result = await importData(file, {
        databaseType: DatabaseType.SQLITE,
        tableName: 'test_table',
        format: DataFormat.CSV
      });
      
      // 验证结果
      expect(result).toEqual({
        success: false,
        rowsImported: 0,
        error: expect.any(String)
      });
    });
  });

  describe('exportData', () => {
    it('应该成功导出数据', async () => {
      // 设置mock响应
      mockedAxios.post.mockResolvedValueOnce({
        data: new Blob(['test data']),
        headers: {
          'content-disposition': 'attachment; filename="exported_data.csv"'
        }
      });

      // 执行导出
      const result = await exportData({
        databaseType: DatabaseType.SQLITE,
        tableName: 'test_table',
        format: DataFormat.CSV,
        includeHeaders: true
      });
      
      // 验证结果
      expect(result).toEqual({
        success: true,
        rowsExported: -1,
        downloadUrl: 'mock-url'
      });
      
      // 验证请求
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/data-transfer/export',
        {
          databaseType: DatabaseType.SQLITE,
          tableName: 'test_table',
          format: DataFormat.CSV,
          includeHeaders: true
        },
        expect.objectContaining({
          responseType: 'blob',
          onDownloadProgress: expect.any(Function)
        })
      );
      
      // 验证下载链接创建
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
    });

    it('应该处理导出错误', async () => {
      // 设置mock错误
      mockedAxios.post.mockRejectedValueOnce({
        response: {
          status: 500,
          data: { message: '导出错误' }
        }
      });
      
      // 执行导出
      const result = await exportData({
        databaseType: DatabaseType.SQLITE,
        tableName: 'test_table',
        format: DataFormat.CSV
      });
      
      // 验证结果
      expect(result).toEqual({
        success: false,
        rowsExported: 0,
        error: expect.any(String)
      });
    });
  });

  describe('getAvailableTables', () => {
    it('应该获取SQLite表', async () => {
      // Mock SDK客户端响应
      const mockedClient = sdkClient.getClient();
      (mockedClient.db.getTables as jest.Mock).mockResolvedValueOnce(['table1', 'table2']);
      
      // 执行获取
      const tables = await getAvailableTables(DatabaseType.SQLITE);
      
      // 验证结果
      expect(tables).toEqual(['table1', 'table2']);
      expect(mockedClient.db.getTables).toHaveBeenCalled();
    });

    it('应该获取向量集合', async () => {
      // Mock SDK客户端响应
      const mockedClient = sdkClient.getClient();
      (mockedClient.vector.listCollections as jest.Mock).mockResolvedValueOnce([
        { name: 'collection1' },
        { name: 'collection2' }
      ]);
      
      // 执行获取
      const tables = await getAvailableTables(DatabaseType.VECTORS);
      
      // 验证结果
      expect(tables).toEqual(['collection1', 'collection2']);
      expect(mockedClient.vector.listCollections).toHaveBeenCalled();
    });
  });

  describe('getDataTransferHistory', () => {
    it('应该获取传输历史', async () => {
      // 设置mock响应
      mockedAxios.get.mockResolvedValueOnce({
        data: [
          {
            id: '1',
            operationType: 'import',
            timestamp: '2023-01-01T00:00:00Z',
            databaseType: DatabaseType.SQLITE,
            tableName: 'test_table',
            format: DataFormat.CSV,
            success: true,
            rowsAffected: 100
          }
        ]
      });
      
      // 执行获取
      const history = await getDataTransferHistory();
      
      // 验证结果
      expect(history).toHaveLength(1);
      expect(history[0]).toMatchObject({
        id: '1',
        operationType: 'import',
        tableName: 'test_table'
      });
    });
  });

  describe('getSupportedFormats', () => {
    it('应该获取SQLite支持的格式', () => {
      const formats = getSupportedFormats(DatabaseType.SQLITE);
      expect(formats).toContainEqual({ value: DataFormat.CSV, label: expect.any(String) });
      expect(formats).toContainEqual({ value: DataFormat.JSON, label: expect.any(String) });
      expect(formats).toContainEqual({ value: DataFormat.SQL, label: expect.any(String) });
    });

    it('应该获取向量数据库支持的格式', () => {
      const formats = getSupportedFormats(DatabaseType.VECTORS);
      expect(formats).toContainEqual({ value: DataFormat.JSON, label: expect.any(String) });
      expect(formats).toContainEqual({ value: DataFormat.NPY, label: expect.any(String) });
    });
  });
}); 