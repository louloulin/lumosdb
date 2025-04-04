/**
 * DuckDB Service
 * Provides specific operations for DuckDB analytics engine in LumosDB
 */

import { handleError, getUserFriendlyErrorMessage } from './error-handler';
import { AnalyticsResult } from './analytics-service';
import axios from 'axios';
import { API_BASE_URL } from '../api-config';

// Helper function to make API requests since LumosDBClient doesn't have executeRequest
async function apiRequest(method: string, endpoint: string, data?: unknown) {
  // Get API key if available
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    if (typeof window !== 'undefined') {
      const storedApiKey = localStorage.getItem('lumos_api_key');
      if (storedApiKey) {
        headers['Authorization'] = `Bearer ${storedApiKey}`;
      }
    }
  } catch (error) {
    console.warn('Could not retrieve API key from localStorage:', error);
  }
  
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${endpoint}`,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' && data ? data : undefined,
      headers
    });
    
    return response.data;
  } catch (error) {
    throw error;
  }
}

// DuckDB数据集定义
export interface DuckDBDataset {
  id: string;
  name: string;
  description?: string;
  source: string;
  status: 'ready' | 'loading' | 'error';
  rowCount: number;
  columnCount: number;
  sizeBytes: number;
  createdAt: number;
  updatedAt: number;
}

// DuckDB批量操作结果
export interface DuckDBBatchResult {
  success: boolean;
  processed: number;
  failed: number;
  message?: string;
}

// 数据集创建选项
export interface CreateDatasetOptions {
  name: string;
  description?: string;
  source: 'csv' | 'json' | 'parquet' | 'query';
  sourceOptions: {
    path?: string;    // 文件路径（CSV/JSON/Parquet）
    query?: string;   // SQL查询（当source为query时）
    delimiter?: string; // CSV分隔符
    hasHeader?: boolean; // CSV是否有标题行
    compression?: 'none' | 'gzip' | 'snappy'; // 压缩类型
  };
}

/**
 * Get all DuckDB datasets
 * @returns Promise resolving to a list of DuckDB datasets
 */
export async function getDuckDBDatasets(): Promise<DuckDBDataset[]> {
  try {
    const response = await apiRequest('GET', '/api/duckdb/datasets');
    return response.data || [];
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Get a specific DuckDB dataset by ID
 * @param id The ID of the dataset to retrieve
 * @returns Promise resolving to the dataset
 */
export async function getDuckDBDataset(id: string): Promise<DuckDBDataset> {
  try {
    const response = await apiRequest('GET', `/api/duckdb/datasets/${id}`);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Create a new DuckDB dataset
 * @param options Dataset creation options
 * @returns Promise resolving to the created dataset
 */
export async function createDuckDBDataset(options: CreateDatasetOptions): Promise<DuckDBDataset> {
  try {
    const response = await apiRequest('POST', '/api/duckdb/datasets', options);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Delete a DuckDB dataset
 * @param id The ID of the dataset to delete
 * @returns Promise resolving to true if successful
 */
export async function deleteDuckDBDataset(id: string): Promise<boolean> {
  try {
    await apiRequest('DELETE', `/api/duckdb/datasets/${id}`);
    return true;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Execute a DuckDB query on a specific dataset or across all datasets
 * @param query SQL query to execute
 * @param datasetId Optional dataset ID to restrict the query scope
 * @returns Promise resolving to the query results
 */
export async function executeDuckDBQuery(
  query: string,
  datasetId?: string
): Promise<{ data: Record<string, unknown>[] | null; error: string | null; duration: number }> {
  try {
    const endpoint = datasetId 
      ? `/api/duckdb/datasets/${datasetId}/query` 
      : '/api/duckdb/query';
    
    const response = await apiRequest('POST', endpoint, { query });
    
    // 将结果转换成通用格式
    const result: AnalyticsResult = response.data;
    
    // 将列和行格式转换成前端需要的格式
    const formattedData = result.rows.map(row => {
      const obj: Record<string, unknown> = {};
      for (let i = 0; i < result.columns.length; i++) {
        obj[result.columns[i]] = row[i];
      }
      return obj;
    });
    
    return {
      data: formattedData || null,
      error: null,
      duration: result.execution_time_ms / 1000 || 0
    };
  } catch (error) {
    const apiError = handleError(error);
    return {
      data: null,
      error: getUserFriendlyErrorMessage(apiError),
      duration: 0
    };
  }
}

/**
 * Get the schema of a DuckDB dataset
 * @param id The ID of the dataset
 * @returns Promise resolving to the schema information
 */
export async function getDuckDBDatasetSchema(id: string): Promise<{
  columns: Array<{
    name: string;
    type: string;
    nullable: boolean;
  }>;
}> {
  try {
    const response = await apiRequest('GET', `/api/duckdb/datasets/${id}/schema`);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Get a sample of data from a DuckDB dataset
 * @param id The ID of the dataset
 * @param limit Maximum number of rows to return (default: 100)
 * @returns Promise resolving to the data sample
 */
export async function getDuckDBDatasetSample(id: string, limit = 100): Promise<AnalyticsResult> {
  try {
    const response = await apiRequest('GET', `/api/duckdb/datasets/${id}/sample`, { limit });
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Export a DuckDB dataset to a file
 * @param id The ID of the dataset
 * @param format The export format: 'csv', 'json', or 'parquet'
 * @returns Promise resolving to the export URL
 */
export async function exportDuckDBDataset(
  id: string, 
  format: 'csv' | 'json' | 'parquet'
): Promise<{ url: string }> {
  try {
    const response = await apiRequest('POST', `/api/duckdb/datasets/${id}/export`, { format });
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Merge two DuckDB datasets into a new dataset
 * @param options Merge options
 * @returns Promise resolving to the created dataset
 */
export async function mergeDuckDBDatasets(options: {
  name: string;
  description?: string;
  sourceDatasetIds: string[];
  joinType: 'inner' | 'left' | 'right' | 'full';
  joinColumns: Record<string, string>;
}): Promise<DuckDBDataset> {
  try {
    const response = await apiRequest('POST', '/api/duckdb/datasets/merge', options);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Get statistics for a DuckDB dataset
 * @param id The ID of the dataset
 * @returns Promise resolving to dataset statistics
 */
export async function getDuckDBDatasetStats(id: string): Promise<{
  rowCount: number;
  columnCount: number;
  sizeBytes: number;
  nullCounts: Record<string, number>;
  distinctCounts: Record<string, number>;
  minValues: Record<string, unknown>;
  maxValues: Record<string, unknown>;
}> {
  try {
    const response = await apiRequest('GET', `/api/duckdb/datasets/${id}/stats`);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Perform batch operations on DuckDB datasets
 * @param operations List of operations to perform
 * @returns Promise resolving to the batch operation result
 */
export async function batchDuckDBOperations(operations: Array<{
  operation: 'create' | 'delete' | 'export';
  datasetId?: string;
  options?: Record<string, unknown>;
}>): Promise<DuckDBBatchResult> {
  try {
    const response = await apiRequest('POST', '/api/duckdb/batch', { operations });
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
} 