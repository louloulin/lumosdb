/**
 * Analytics Service
 * Provides analytics and data processing services using the DuckDB engine in LumosDB
 */

import { sdkClient } from './sdk-client';
import { handleError, getUserFriendlyErrorMessage } from './error-handler';

// 定义分析查询类型
export interface AnalyticsQuery {
  id: number;
  name: string;
  description: string;
  query: string;
  visualization: string;
  resultTable?: string;
  createdAt: string;
}

// 定义分析结果类型
export interface AnalyticsResult {
  columns: string[];
  rows: unknown[][];
  execution_time_ms: number;
  rows_processed: number;
}

/**
 * Get all available analytics tables
 * @returns Promise resolving to a list of table names
 */
export async function getAnalyticsTables(): Promise<string[]> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to get tables from the analytics engine
    const response = await client.executeRequest('GET', '/api/analytics/tables');
    return response.data || [];
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Execute an analytics query
 * @param query SQL query string to execute on the analytics engine
 * @returns Promise resolving to query result with data, error if any, and execution duration
 */
export async function executeAnalyticsQuery(
  query: string
): Promise<{ data: Record<string, unknown>[] | null; error: string | null; duration: number }> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('POST', '/api/analytics/query', {
      query
    });
    
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
 * Get a specific saved analytics query by ID
 * @param id The ID of the saved query to retrieve
 * @returns Promise resolving to the query definition
 */
export async function getAnalyticsQuery(id: number): Promise<AnalyticsQuery> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('GET', `/api/analytics/queries/${id}`);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Save a new analytics query
 * @param query The query definition to save
 * @returns Promise resolving to the saved query with assigned ID
 */
export async function saveAnalyticsQuery(query: Omit<AnalyticsQuery, 'id'>): Promise<AnalyticsQuery> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('POST', '/api/analytics/queries', query);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Update an existing analytics query
 * @param id The ID of the query to update
 * @param query The updated query definition
 * @returns Promise resolving to the updated query
 */
export async function updateAnalyticsQuery(id: number, query: Partial<AnalyticsQuery>): Promise<AnalyticsQuery> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('PUT', `/api/analytics/queries/${id}`, query);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Delete an analytics query
 * @param id The ID of the query to delete
 * @returns Promise resolving to true if successful
 */
export async function deleteAnalyticsQuery(id: number): Promise<boolean> {
  const client = sdkClient.getClient();
  
  try {
    await client.executeRequest('DELETE', `/api/analytics/queries/${id}`);
    return true;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Get a list of all saved analytics queries
 * @returns Promise resolving to a list of query definitions
 */
export async function getAnalyticsQueries(): Promise<AnalyticsQuery[]> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('GET', '/api/analytics/queries');
    return response.data || [];
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Get the results for a specific named analysis
 * @param tableName The name of the analytics result table
 * @returns Promise resolving to the analysis results
 */
export async function getAnalyticsResults(tableName: string): Promise<Record<string, unknown>[] | null> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('GET', `/api/analytics/results/${tableName}`);
    return response.data || null;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Generate a summary of a table with statistics
 * @param tableName The name of the table to summarize
 * @returns Promise resolving to statistical summary
 */
export async function generateTableSummary(tableName: string): Promise<Record<string, unknown>> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('GET', `/api/analytics/summary/${tableName}`);
    return response.data || {};
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Perform time series analysis on a dataset
 * @param options Configuration options for time series analysis
 * @returns Promise resolving to time series analysis results
 */
export async function performTimeSeriesAnalysis(options: {
  source: string;
  timestampColumn: string;
  valueColumn: string;
  interval: string;
  aggregation: string;
}): Promise<AnalyticsResult> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('POST', '/api/analytics/timeseries', options);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Detect anomalies in a time series dataset
 * @param options Configuration options for anomaly detection
 * @returns Promise resolving to detected anomalies
 */
export async function detectAnomalies(options: {
  source: string;
  timestampColumn: string;
  valueColumn: string;
  threshold: number;
}): Promise<AnalyticsResult> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('POST', '/api/analytics/anomalies', options);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
} 