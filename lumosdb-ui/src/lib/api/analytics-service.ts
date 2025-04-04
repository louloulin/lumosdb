/**
 * Analytics Service
 * Provides analytics and data processing services using the DuckDB engine in LumosDB
 */

import { sdkClient } from './sdk-client';
import { handleError, getUserFriendlyErrorMessage } from './error-handler';
import axios from 'axios';
import { API_BASE_URL } from '../api-config';

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

// 定义报告类型
export interface AnalyticsReport {
  id: string;
  name: string;
  description: string;
  queries: number[];
  createdAt: string;
  lastGeneratedAt?: string;
  status: 'draft' | 'scheduled' | 'completed' | 'failed';
  schedule?: ReportSchedule;
  format: 'html' | 'pdf' | 'csv' | 'json';
  recipients?: string[];
  parameters?: Record<string, unknown>;
}

// 定义报告计划类型
export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
  dayOfWeek?: number; // 0-6, 0 is Sunday
  dayOfMonth?: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  timezone: string;
  active: boolean;
}

// 定义报告结果类型
export interface ReportResult {
  reportId: string;
  generatedAt: string;
  downloadUrl: string;
  size: number;
  format: string;
}

// 定义数据指标类型
export interface DataMetric {
  id: string;
  name: string;
  description: string;
  query: string;
  currentValue: number;
  previousValue: number;
  changePercentage: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  targetValue?: number;
  thresholds?: {
    warning: number;
    critical: number;
  };
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
    return response.data as string[] || [];
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
    const result = response.data as AnalyticsResult;
    
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
    return response.data as AnalyticsQuery;
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
    return response.data as AnalyticsQuery;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.post(`${API_BASE_URL}/analytics/queries`, query);
      return response.data as AnalyticsQuery;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
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
    return response.data as AnalyticsQuery;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.put(`${API_BASE_URL}/analytics/queries/${id}`, query);
      return response.data as AnalyticsQuery;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
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
    // 尝试直接使用REST API
    try {
      await axios.delete(`${API_BASE_URL}/analytics/queries/${id}`);
      return true;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
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
    return response.data as AnalyticsQuery[] || [];
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/queries`);
      return response.data as AnalyticsQuery[] || [];
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
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
    return response.data as Record<string, unknown>[] || null;
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
    return response.data as Record<string, unknown> || {};
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/summary/${tableName}`);
      return response.data as Record<string, unknown> || {};
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
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
    return response.data as AnalyticsResult;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.post(`${API_BASE_URL}/analytics/timeseries`, options);
      return response.data as AnalyticsResult;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
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
    return response.data as AnalyticsResult;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.post(`${API_BASE_URL}/analytics/anomalies`, options);
      return response.data as AnalyticsResult;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Create a new analytics report
 * @param report The report definition to create
 * @returns Promise resolving to the created report
 */
export async function createAnalyticsReport(report: Omit<AnalyticsReport, 'id'>): Promise<AnalyticsReport> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('POST', '/api/analytics/reports', report);
    return response.data as AnalyticsReport;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.post(`${API_BASE_URL}/analytics/reports`, report);
      return response.data as AnalyticsReport;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Get a list of all analytics reports
 * @returns Promise resolving to a list of report definitions
 */
export async function getAnalyticsReports(): Promise<AnalyticsReport[]> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('GET', '/api/analytics/reports');
    return response.data as AnalyticsReport[] || [];
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/reports`);
      return response.data as AnalyticsReport[] || [];
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Get a specific analytics report by ID
 * @param id The ID of the report to retrieve
 * @returns Promise resolving to the report definition
 */
export async function getAnalyticsReport(id: string): Promise<AnalyticsReport> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('GET', `/api/analytics/reports/${id}`);
    return response.data as AnalyticsReport;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/reports/${id}`);
      return response.data as AnalyticsReport;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Update an existing analytics report
 * @param id The ID of the report to update
 * @param report The updated report definition
 * @returns Promise resolving to the updated report
 */
export async function updateAnalyticsReport(id: string, report: Partial<AnalyticsReport>): Promise<AnalyticsReport> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('PUT', `/api/analytics/reports/${id}`, report);
    return response.data as AnalyticsReport;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.put(`${API_BASE_URL}/analytics/reports/${id}`, report);
      return response.data as AnalyticsReport;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Delete an analytics report
 * @param id The ID of the report to delete
 * @returns Promise resolving to true if successful
 */
export async function deleteAnalyticsReport(id: string): Promise<boolean> {
  const client = sdkClient.getClient();
  
  try {
    await client.executeRequest('DELETE', `/api/analytics/reports/${id}`);
    return true;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      await axios.delete(`${API_BASE_URL}/analytics/reports/${id}`);
      return true;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Generate an analytics report on demand
 * @param id The ID of the report to generate
 * @param parameters Optional parameters to be used when generating the report
 * @returns Promise resolving to the report result with download URL
 */
export async function generateAnalyticsReport(id: string, parameters?: Record<string, unknown>): Promise<ReportResult> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('POST', `/api/analytics/reports/${id}/generate`, { parameters });
    return response.data as ReportResult;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.post(`${API_BASE_URL}/analytics/reports/${id}/generate`, { parameters });
      return response.data as ReportResult;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Get the latest generated result for a specific report
 * @param id The ID of the report
 * @returns Promise resolving to the latest report result
 */
export async function getLatestReportResult(id: string): Promise<ReportResult | null> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('GET', `/api/analytics/reports/${id}/latest`);
    return response.data as ReportResult;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/reports/${id}/latest`);
      return response.data as ReportResult;
    } catch (directError) {
      // 如果API返回404，说明没有生成过报告
      if (directError.response && directError.response.status === 404) {
        return null;
      }
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Get all data metrics
 * @returns Promise resolving to a list of data metrics
 */
export async function getDataMetrics(): Promise<DataMetric[]> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('GET', '/api/analytics/metrics');
    return response.data as DataMetric[] || [];
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.get(`${API_BASE_URL}/analytics/metrics`);
      return response.data as DataMetric[] || [];
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Create a new data metric
 * @param metric The metric definition to create
 * @returns Promise resolving to the created metric
 */
export async function createDataMetric(metric: Omit<DataMetric, 'id' | 'currentValue' | 'previousValue' | 'changePercentage' | 'trend' | 'lastUpdated'>): Promise<DataMetric> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('POST', '/api/analytics/metrics', metric);
    return response.data as DataMetric;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.post(`${API_BASE_URL}/analytics/metrics`, metric);
      return response.data as DataMetric;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Update a data metric
 * @param id The ID of the metric to update
 * @param metric The updated metric definition
 * @returns Promise resolving to the updated metric
 */
export async function updateDataMetric(id: string, metric: Partial<DataMetric>): Promise<DataMetric> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('PUT', `/api/analytics/metrics/${id}`, metric);
    return response.data as DataMetric;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.put(`${API_BASE_URL}/analytics/metrics/${id}`, metric);
      return response.data as DataMetric;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Delete a data metric
 * @param id The ID of the metric to delete
 * @returns Promise resolving to true if successful
 */
export async function deleteDataMetric(id: string): Promise<boolean> {
  const client = sdkClient.getClient();
  
  try {
    await client.executeRequest('DELETE', `/api/analytics/metrics/${id}`);
    return true;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      await axios.delete(`${API_BASE_URL}/analytics/metrics/${id}`);
      return true;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
}

/**
 * Generate an interactive data dashboard from a set of queries
 * @param dashboardOptions Options for dashboard generation
 * @returns Promise resolving to the generated dashboard HTML
 */
export async function generateDataDashboard(dashboardOptions: {
  title: string;
  description: string;
  queries: { id: number; title: string; visualization: string }[];
  theme?: 'light' | 'dark' | 'auto';
  layout?: 'grid' | 'flow';
}): Promise<string> {
  const client = sdkClient.getClient();
  
  try {
    const response = await client.executeRequest('POST', '/api/analytics/dashboard/generate', dashboardOptions);
    return response.data as string;
  } catch (error) {
    // 尝试直接使用REST API
    try {
      const response = await axios.post(`${API_BASE_URL}/analytics/dashboard/generate`, dashboardOptions);
      return response.data as string;
    } catch (directError) {
      const apiError = handleError(error);
      throw apiError;
    }
  }
} 