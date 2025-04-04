import { handleError, getUserFriendlyErrorMessage } from './error-handler';
import { sdkClient } from './sdk-client';
import type { DbClient } from '@sdk';
import { dropTable } from './sql-service';

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
      getTables(params: GetTablesParams): Promise<SDKTablesResult | { success?: boolean; data?: { tables: string[] } } | string[] | unknown>;
    };
    
    // 获取表列表
    const result = await db.getTables({
      database: database || 'main'
    });
    
    // 用于存储基本表名列表的临时变量
    let basicTableList: TableInfo[] = [];
    
    // 处理不同的返回数据格式来获取基本表名列表
    
    // 格式0: 直接返回数组 [string, string, ...]
    if (Array.isArray(result)) {
      console.log('直接返回的表数组', result);
      basicTableList = result.map((tableName: string) => ({
        name: tableName,
        rowCount: 0,
        sizeBytes: 0,
        schema: []
      }));
    }
    // 格式1: { success: true, data: { tables: string[] } }
    else if (result && typeof result === 'object' && 'success' in result && 
        result.success && 'data' in result && 
        result.data && typeof result.data === 'object' && 
        'tables' in result.data && Array.isArray(result.data.tables)) {
      console.log('使用API新格式返回的表数据', result.data.tables);
      basicTableList = result.data.tables.map((tableName: string) => ({
        name: tableName,
        rowCount: 0,
        sizeBytes: 0,
        schema: []
      }));
    }
    // 格式2: { tables: SDKTableInfo[] } 或 { tables: string[] }
    else if (result && typeof result === 'object' && 'tables' in result) {
      if (!result.tables) {
        return [];
      }
      
      // 检查tables是否为字符串数组而不是对象数组
      if (Array.isArray(result.tables) && result.tables.length > 0 && typeof result.tables[0] === 'string') {
        console.log('表数据是字符串数组', result.tables);
        basicTableList = (result.tables as string[]).map((tableName: string) => ({
          name: tableName,
          rowCount: 0,
          sizeBytes: 0,
          schema: []
        }));
      }
      // 标准格式处理
      else if (Array.isArray(result.tables)) {
        basicTableList = result.tables.map((table: any) => ({
          name: table.name,
          rowCount: table.row_count || 0,
          sizeBytes: table.size_bytes || 0,
          schema: Array.isArray(table.columns) ? table.columns.map((col: any) => ({
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
      }
    }
    // 未识别的格式
    else {
      console.error('未知的API返回格式', result);
      // 尝试从对象中提取可能的表数组
      if (result && typeof result === 'object') {
        const possibleTables = Object.values(result as Record<string, unknown>).find(val => Array.isArray(val));
        if (possibleTables && Array.isArray(possibleTables)) {
          console.log('从未知格式中提取出可能的表数组', possibleTables);
          basicTableList = possibleTables.map((item: unknown) => ({
            name: typeof item === 'string' ? item : (
              typeof item === 'object' && item !== null && 'name' in item ? 
              String((item as {name: unknown}).name) : String(item)
            ),
            rowCount: 0,
            sizeBytes: 0,
            schema: []
          }));
        }
      }
    }
    
    if (basicTableList.length === 0) {
      return [];
    }
    
    console.log('获取到基本表列表:', basicTableList);
    
    // 为每个表获取详细信息
    const detailedTables = await Promise.all(
      basicTableList.map(async (table) => {
        try {
          console.log(`正在获取表 ${table.name} 的详细信息...`);
          const tableInfo = await getTableInfo(table.name, database);
          return tableInfo || table; // 如果获取失败，保留基本信息
        } catch (error) {
          console.error(`获取表 ${table.name} 详细信息失败:`, error);
          return table; // 出错时保留基本信息
        }
      })
    );
    
    console.log('获取到详细表信息:', detailedTables);
    return detailedTables.filter(Boolean) as TableInfo[];
    
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
 * @returns 删除结果
 */
export async function deleteTable(tableName: string): Promise<DeleteTableResult> {
  try {
    // 使用sql-service中的dropTable方法
    const result = await dropTable(tableName);
    
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
      error: getUserFriendlyErrorMessage(apiError)
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