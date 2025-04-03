import { sdkClient } from './sdk-client';
import { handleError } from './error-handler';
import axios from 'axios';
import { API_BASE_URL } from '../api-config';
import { TableInfo, VectorCollection, CollectionStats } from '@sdk';

/**
 * 导入/导出格式
 */
export enum DataFormat {
  CSV = 'csv',
  JSON = 'json',
  SQL = 'sql',
  XLSX = 'xlsx',
  PARQUET = 'parquet',
  NPY = 'npy' // 向量数据专用
}

/**
 * 数据库类型
 */
export enum DatabaseType {
  SQLITE = 'sqlite',
  DUCKDB = 'duckdb',
  VECTORS = 'vectors'
}

/**
 * 导入选项
 */
export interface ImportOptions {
  // 数据库类型
  databaseType: DatabaseType;
  // 表名
  tableName: string;
  // 文件格式
  format: DataFormat;
  // 是否包含表头
  hasHeaders?: boolean;
  // 是否创建表（如果不存在）
  createTable?: boolean;
  // 如果表存在，是否替换
  replaceExisting?: boolean;
  // 进度回调
  onProgress?: (progress: number) => void;
}

/**
 * 导出选项
 */
export interface ExportOptions {
  // 数据库类型
  databaseType: DatabaseType;
  // 表名
  tableName: string;
  // 文件格式
  format: DataFormat;
  // 是否包含表头
  includeHeaders?: boolean;
  // 是否包含模式
  includeSchema?: boolean;
  // 限制行数
  limit?: number;
  // 进度回调
  onProgress?: (progress: number) => void;
}

/**
 * 导入结果
 */
export interface ImportResult {
  success: boolean;
  rowsImported: number;
  error?: string;
  tableCreated?: boolean;
}

/**
 * 导出结果
 */
export interface ExportResult {
  success: boolean;
  rowsExported: number;
  filePath?: string;
  error?: string;
  downloadUrl?: string;
}

/**
 * 历史记录项
 */
export interface DataTransferHistoryItem {
  id: string;
  operationType: 'import' | 'export';
  timestamp: string;
  databaseType: DatabaseType;
  tableName: string;
  format: DataFormat;
  success: boolean;
  rowsAffected: number;
  error?: string;
  filePath?: string;
}

/**
 * 获取HTTP客户端
 * 由于SDK客户端中没有直接暴露apiClient，我们需要自己创建一个
 */
const getHttpClient = () => {
  const token = localStorage?.getItem('lumos_auth_token') || '';
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  });
};

/**
 * 导入数据
 * @param file 要导入的文件
 * @param options 导入选项
 * @returns 导入结果
 */
export async function importData(file: File, options: ImportOptions): Promise<ImportResult> {
  try {
    const client = getHttpClient();
    const formData = new FormData();
    
    // 添加文件
    formData.append('file', file);
    
    // 添加选项
    formData.append('databaseType', options.databaseType);
    formData.append('tableName', options.tableName);
    formData.append('format', options.format);
    
    if (options.hasHeaders !== undefined) {
      formData.append('hasHeaders', options.hasHeaders.toString());
    }
    
    if (options.createTable !== undefined) {
      formData.append('createTable', options.createTable.toString());
    }
    
    if (options.replaceExisting !== undefined) {
      formData.append('replaceExisting', options.replaceExisting.toString());
    }
    
    // 创建请求
    const response = await client.post('/api/data-transfer/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: {loaded: number, total?: number}) => {
        if (options.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    });
    
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    console.error('导入数据失败:', apiError);
    
    return {
      success: false,
      rowsImported: 0,
      error: apiError.message,
    };
  }
}

/**
 * 导出数据
 * @param options 导出选项
 * @returns 导出结果
 */
export async function exportData(options: ExportOptions): Promise<ExportResult> {
  try {
    const client = getHttpClient();
    
    // 创建请求
    const response = await client.post('/api/data-transfer/export', options, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent: {loaded: number, total?: number}) => {
        if (options.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    });
    
    // 创建下载URL
    const blob = new Blob([response.data]);
    const downloadUrl = URL.createObjectURL(blob);
    
    // 获取文件名
    const contentDisposition = response.headers['content-disposition'];
    let filename = `${options.tableName}.${options.format}`;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]*)"?/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1];
      }
    }
    
    // 自动下载
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 清理URL对象
    setTimeout(() => {
      URL.revokeObjectURL(downloadUrl);
    }, 100);
    
    return {
      success: true,
      rowsExported: -1, // 在实际场景中，服务器应当返回导出的行数
      downloadUrl,
    };
  } catch (error) {
    const apiError = handleError(error);
    console.error('导出数据失败:', apiError);
    
    return {
      success: false,
      rowsExported: 0,
      error: apiError.message,
    };
  }
}

/**
 * 获取可用的表
 * @param databaseType 数据库类型
 * @returns 表名数组
 */
export async function getAvailableTables(databaseType: DatabaseType): Promise<string[]> {
  try {
    const client = sdkClient.getClient();
    
    switch (databaseType) {
      case DatabaseType.SQLITE:
        // 从SQL数据库获取表
        return await client.db.getTables();
      
      case DatabaseType.DUCKDB:
        // 从DuckDB获取表
        const httpClient = getHttpClient();
        const analyticsResult = await httpClient.get('/api/duckdb/tables');
        return analyticsResult.data.tables || [];
      
      case DatabaseType.VECTORS:
        // 从向量数据库获取集合
        const collections = await client.vector.listCollections();
        return collections.map((collection: VectorCollection) => collection.name);
      
      default:
        return [];
    }
  } catch (error) {
    const apiError = handleError(error);
    console.error('获取表失败:', apiError);
    return [];
  }
}

/**
 * 获取数据传输历史记录
 * @returns 历史记录数组
 */
export async function getDataTransferHistory(): Promise<DataTransferHistoryItem[]> {
  try {
    const client = getHttpClient();
    const response = await client.get('/api/data-transfer/history');
    return response.data.history || [];
  } catch (error) {
    const apiError = handleError(error);
    console.error('获取数据传输历史记录失败:', apiError);
    return [];
  }
}

/**
 * 获取支持的文件格式
 * @param databaseType 数据库类型
 * @returns 支持的格式数组
 */
export function getSupportedFormats(databaseType: DatabaseType): { value: DataFormat; label: string }[] {
  if (databaseType === DatabaseType.VECTORS) {
    return [
      { value: DataFormat.JSON, label: 'JSON' },
      { value: DataFormat.NPY, label: 'NumPy (.npy)' },
      { value: DataFormat.PARQUET, label: 'Parquet' }
    ];
  }
  
  return [
    { value: DataFormat.CSV, label: 'CSV' },
    { value: DataFormat.JSON, label: 'JSON' },
    { value: DataFormat.SQL, label: 'SQL' },
    { value: DataFormat.XLSX, label: 'Excel (.xlsx)' },
    { value: DataFormat.PARQUET, label: 'Parquet' }
  ];
} 