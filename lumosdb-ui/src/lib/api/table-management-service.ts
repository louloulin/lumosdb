import { handleError, getUserFriendlyErrorMessage } from './error-handler';
import { sdkClient } from './sdk-client';
import type { DbClient } from '@sdk';
import { dropTable } from './sql-service';

/**
 * 表名处理工具函数
 */
// 为SQL查询添加引号的表名
function getSqlSafeTableName(tableName: string): string {
  return tableName.includes('"') ? tableName : `"${tableName}"`;
}

// 用于SDK参数的原始表名
function getSdkSafeTableName(tableName: string): string {
  // 如果表名已经包含引号，则移除引号
  if (tableName.startsWith('"') && tableName.endsWith('"')) {
    return tableName.substring(1, tableName.length - 1);
  }
  return tableName;
}

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
  accessible?: boolean; // 表是否可以访问
  accessError?: string; // 访问错误信息
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
          if (tableInfo) {
            return tableInfo;
          } else {
            // 如果获取失败，标记为不可访问但仍保留基本信息
            return {
              ...table,
              accessible: false,
              accessError: `无法访问表 ${table.name}，可能需要检查权限或表名`
            };
          }
        } catch (error) {
          console.error(`获取表 ${table.name} 详细信息失败:`, error);
          // 出错时标记为不可访问，并记录错误信息
          return {
            ...table,
            accessible: false,
            accessError: error instanceof Error ? error.message : '未知错误'
          };
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
 * @returns 表详细信息或错误信息
 */
export async function getTableInfo(tableName: any, database?: string): Promise<TableInfo | null> {
  try {
    // 确保tableName是字符串
    if (typeof tableName !== 'string') {
      console.error('错误: getTableInfo 收到非字符串表名:', tableName);
      if (tableName && typeof tableName === 'object') {
        if ('name' in tableName) {
          console.log('尝试从对象中提取name属性作为表名');
          tableName = String(tableName.name);
        } else if ('table' in tableName) {
          console.log('尝试从对象中提取table属性作为表名');
          tableName = String(tableName.table);
        } else {
          console.error('无法从对象中提取表名');
          return null;
        }
      } else {
        console.error('无法处理的表名类型');
        return null;
      }
    }
    
    console.log(`开始获取表信息 - 原始表名: "${tableName}"`);
    const client = sdkClient.getClient();
    const db = client.db as DbClient & {
      getTableInfo(params: GetTableInfoParams): Promise<SDKTableInfoResult>;
    };
    
    // 使用没有引号的原始表名作为SDK参数
    const sdkTableName = getSdkSafeTableName(tableName);
    const sqlTableName = getSqlSafeTableName(tableName);
    
    console.log(`表名处理: 
      原始表名: "${tableName}" 
      SDK用表名: "${sdkTableName}" 
      SQL用表名: ${sqlTableName}`);
    
    try {
      console.log(`调用SDK getTableInfo - 使用表名: "${sdkTableName}"`);
      const result = await db.getTableInfo({
        table: sdkTableName,
        database: database || 'main'
      });
      
      console.log(`SDK返回结果:`, result);
      
      // 检查返回结果是否有效 - 修复结构不匹配的问题
      // SDK可能直接返回表信息对象，而不是包含table属性的对象
      if (!result) {
        console.error(`表 ${tableName} 不存在或无法访问 - 返回结果为空`);
        return null;
      }
      
      // 判断返回值类型：可能是{table: {name, columns}}或直接是{name, columns}
      let table: any = null;
      
      // 情况1: 返回格式为 {table: {name, columns}}
      if (result.table && result.table.name) {
        table = result.table;
        console.log(`使用result.table结构，表名: ${table.name}`);
      } 
      // 情况2: 返回格式为 {name, columns}
      else if (result.name) {
        table = result;
        console.log(`使用直接返回结构，表名: ${table.name}`);
      }
      // 无法识别的格式
      else {
        console.error(`表 ${tableName} 返回了无法识别的结构:`, result);
        return null;
      }
      
      console.log(`成功获取表信息: ${table.name}, 列数: ${table.columns?.length || 0}`);
      
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
        lastModified: table.last_modified,
        accessible: true
      };
    } catch (innerError) {
      // 处理特定的表访问错误
      console.error(`获取表 ${tableName} 信息时发生错误:`, innerError);
      
      // 根据错误类型提供更详细的错误信息
      const apiError = handleError(innerError);
      console.error(`错误详情: 类型=${apiError.type}, 消息=${apiError.message}`);
      
      if (apiError.message.includes("no such table")) {
        // 表不存在错误
        console.error(`表 ${tableName} 不存在`);
      } else if (apiError.message.includes("permission")) {
        // 权限错误
        console.error(`没有访问表 ${tableName} 的权限`);
      }
      
      // 重新抛出错误，添加上下文信息
      throw new Error(`无法访问表 ${tableName}: ${apiError.message}`);
    }
    
  } catch (error) {
    const apiError = handleError(error);
    console.error('获取表信息失败:', apiError);
    
    // 返回null，调用方需要检查结果
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
    
    // 为SQL语句使用带引号的表名
    const sqlTableName = getSqlSafeTableName(tableName);
    
    // 使用SDK执行清空表的SQL
    const result = await db.execute({
      sql: `DELETE FROM ${sqlTableName}`,
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