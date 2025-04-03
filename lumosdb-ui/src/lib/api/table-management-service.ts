import { handleError } from './error-handler';
import { sdkClient } from './sdk-client';
import type { DbClient } from '@sdk';

/**
 * 表管理服务接口
 */

/**
 * 表信息
 */
export interface TableInfo {
  name: string;
  rowCount: number;
  sizeBytes: number;
  schema: ColumnInfo[];
  created?: string;
  lastModified?: string;
}

/**
 * 列信息
 */
export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  primary: boolean;
  unique: boolean;
  default?: string;
}

/**
 * 删除表结果
 */
export interface DeleteTableResult {
  success: boolean;
  error?: string;
}

// SDK接口类型
interface SDKTableInfo {
  name: string;
  row_count?: number;
  size_bytes?: number;
  columns?: Array<{
    name: string;
    type: string;
    nullable?: boolean;
    primary_key?: boolean;
    unique?: boolean;
    default_value?: string;
  }>;
  created_at?: string;
  last_modified?: string;
}

interface SDKTablesResult {
  tables: SDKTableInfo[];
}

interface SDKTableInfoResult {
  table: SDKTableInfo;
}

interface GetTablesParams {
  database?: string;
}

interface GetTableInfoParams {
  table: string;
  database?: string;
}

interface ExecuteSqlParams {
  sql: string;
  database?: string;
  params: unknown[];
}

/**
 * 获取数据库中的表列表
 * @param database 数据库名称
 * @returns 表信息列表
 */
export async function getTables(database?: string): Promise<TableInfo[]> {
  try {
    const client = sdkClient.getClient();
    const db = client.db as DbClient & {
      getTables(params: GetTablesParams): Promise<SDKTablesResult>;
    };
    
    // 获取表列表
    const result = await db.getTables({
      database: database || 'main'
    });
    
    if (!result.tables) {
      return [];
    }
    
    // 转换为前端模型
    return result.tables.map(table => ({
      name: table.name,
      rowCount: table.row_count || 0,
      sizeBytes: table.size_bytes || 0,
      schema: table.columns ? table.columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable || false,
        primary: col.primary_key || false,
        unique: col.unique || false,
        default: col.default_value
      })) : [],
      created: table.created_at,
      lastModified: table.last_modified
    }));
    
  } catch (error) {
    const apiError = handleError(error);
    console.error('获取表列表失败:', apiError);
    return [];
  }
}

/**
 * 获取表信息
 * @param tableName 表名
 * @param database 数据库名称
 * @returns 表详细信息
 */
export async function getTableInfo(tableName: string, database?: string): Promise<TableInfo | null> {
  try {
    const client = sdkClient.getClient();
    const db = client.db as DbClient & {
      getTableInfo(params: GetTableInfoParams): Promise<SDKTableInfoResult>;
    };
    
    const result = await db.getTableInfo({
      table: tableName,
      database: database || 'main'
    });
    
    if (!result.table) {
      return null;
    }
    
    const table = result.table;
    
    return {
      name: table.name,
      rowCount: table.row_count || 0,
      sizeBytes: table.size_bytes || 0,
      schema: table.columns ? table.columns.map(col => ({
        name: col.name,
        type: col.type,
        nullable: col.nullable || false,
        primary: col.primary_key || false,
        unique: col.unique || false,
        default: col.default_value
      })) : [],
      created: table.created_at,
      lastModified: table.last_modified
    };
    
  } catch (error) {
    const apiError = handleError(error);
    console.error('获取表信息失败:', apiError);
    return null;
  }
}

/**
 * 删除表
 * @param tableName 表名
 * @param database 数据库名称
 * @returns 删除结果
 */
export async function deleteTable(tableName: string, database?: string): Promise<DeleteTableResult> {
  try {
    const client = sdkClient.getClient();
    const db = client.db as DbClient & {
      execute(params: ExecuteSqlParams): Promise<{ rowsAffected: number; error?: string }>;
    };
    
    // 使用SDK执行删除表的SQL
    const result = await db.execute({
      sql: `DROP TABLE IF EXISTS ${tableName}`,
      database: database || 'main',
      params: []
    });
    
    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }
    
    return {
      success: true
    };
    
  } catch (error) {
    const apiError = handleError(error);
    console.error('删除表失败:', apiError);
    
    return {
      success: false,
      error: apiError.message
    };
  }
}

/**
 * 清空表数据
 * @param tableName 表名
 * @param database 数据库名称
 * @returns 操作结果
 */
export async function truncateTable(tableName: string, database?: string): Promise<DeleteTableResult> {
  try {
    const client = sdkClient.getClient();
    const db = client.db as DbClient & {
      execute(params: ExecuteSqlParams): Promise<{ rowsAffected: number; error?: string }>;
    };
    
    // 使用SDK执行清空表的SQL
    const result = await db.execute({
      sql: `DELETE FROM ${tableName}`,
      database: database || 'main',
      params: []
    });
    
    if (result.error) {
      return {
        success: false,
        error: result.error
      };
    }
    
    return {
      success: true
    };
    
  } catch (error) {
    const apiError = handleError(error);
    console.error('清空表失败:', apiError);
    
    return {
      success: false,
      error: apiError.message
    };
  }
} 