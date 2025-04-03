/**
 * 从SDK导出类型
 * 这个文件用于集中导出SDK的类型定义
 */

// 从SDK导入类型
import type { TableInfo as SDKTableInfo } from '@sdk';

// 重新导出SDK类型
export type {
  QueryResult,
  ExecuteResult,
  VectorCollection,
  VectorItem,
  VectorSearchResult,
  HealthCheckResult
} from '@sdk';

// 导出表信息类型
export type { TableInfo } from '@sdk';

// 在必要时可以扩展或重命名类型
export interface ExtendedTableInfo extends SDKTableInfo {
  rowCount?: number;
}

// 如果需要添加辅助类型，可以在这里定义
export type SQLQueryParams = Record<string, string | number | boolean | null>;

// 为服务层定义通用的响应类型
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  timestamp?: string; 
}

// 为分页定义通用类型
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
} 