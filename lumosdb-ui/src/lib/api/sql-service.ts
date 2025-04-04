import { getDbClient } from './sdk-client';
// 导入SDK中的类型，用于实现服务

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
 * UI中使用的查询结果格式
 */
export interface QueryResult {
  data: Record<string, unknown>[] | null;
  error: string | null;
  duration: number;
  columns?: string[];
  rowCount?: number;
  rowsAffected?: number;
}

/**
 * 列信息类型
 */
export interface ColumnInfo {
  name: string;
  type: string;
  primary: boolean;
  nullable: boolean;
}

/**
 * 执行SQL查询
 * @param query SQL查询语句
 * @returns 查询结果
 */
export async function executeSQLQuery(query: string): Promise<QueryResult> {
  try {
    const startTime = performance.now();
    const dbClient = getDbClient();
    
    // 确保查询中的表名安全，检测并添加引号
    const safeQuery = ensureSafeTableNames(query);
    
    // 使用SDK执行查询
    const result = await dbClient.query(safeQuery);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return {
      data: result.rows || [],
      columns: result.columns || [],
      rowCount: result.rows?.length || 0,
      error: null,
      duration: Number((duration / 1000).toFixed(3)) // 转换为秒，保留3位小数
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
      duration: 0
    };
  }
}

/**
 * 确保查询中的表名安全，检测并添加引号
 * @param query SQL查询语句
 * @returns 安全的SQL查询语句
 */
function ensureSafeTableNames(query: string): string {
  // 如果是简单的SELECT FROM语句，确保表名有引号
  // 将FROM table或JOIN table模式转换为FROM "table"或JOIN "table"
  return query.replace(/\b(FROM|JOIN)\s+([^\s"',()[\]]+)/gi, (match, keyword, tableName) => {
    // 如果表名已经有引号，不做修改
    if (tableName.startsWith('"') && tableName.endsWith('"')) {
      return match;
    }
    // 否则添加双引号
    return `${keyword} "${tableName}"`;
  });
}

/**
 * 执行数据修改操作
 * @param query SQL执行语句
 * @returns 执行结果
 */
export async function executeSQL(query: string): Promise<QueryResult> {
  try {
    const startTime = performance.now();
    const dbClient = getDbClient();
    
    // 使用SDK执行修改操作
    const result = await dbClient.execute(query);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    return {
      data: null,
      rowsAffected: result.rowsAffected,
      error: null,
      duration: Number((duration / 1000).toFixed(3))
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : String(error),
      duration: 0
    };
  }
}

/**
 * 获取所有表
 * @returns 表名列表
 */
export async function getTables(): Promise<string[]> {
  try {
    const dbClient = getDbClient();
    return await dbClient.getTables();
  } catch (error) {
    console.error('获取表列表失败:', error);
    return [];
  }
}

/**
 * 获取表结构
 * @param tableName 表名
 * @returns 表结构信息
 */
export async function getTableSchema(tableName: any): Promise<{ columns: ColumnInfo[] | null; error: string | null }> {
  try {
    // 确保tableName是字符串
    if (typeof tableName !== 'string') {
      console.error('错误: getTableSchema 收到非字符串表名:', tableName);
      if (tableName && typeof tableName === 'object') {
        if ('name' in tableName) {
          console.log('尝试从对象中提取name属性作为表名');
          tableName = String(tableName.name);
        } else if ('table' in tableName) {
          console.log('尝试从对象中提取table属性作为表名');
          tableName = String(tableName.table);
        } else {
          return {
            columns: null,
            error: '传入的表名参数类型错误，无法处理'
          };
        }
      } else {
        return {
          columns: null,
          error: '传入的表名参数类型错误，无法处理'
        };
      }
    }
    
    const dbClient = getDbClient();
    
    // 使用不带引号的原始表名作为SDK参数
    const sdkTableName = getSdkSafeTableName(tableName);
    console.log(`获取表结构使用表名: ${sdkTableName}`);
    
    const tableInfo = await dbClient.getTableInfo(sdkTableName);
    
    // 将SDK返回的表信息转换为UI需要的格式
    const columns = tableInfo.columns.map(col => ({
      name: col.name,
      type: col.type,
      primary: col.primaryKey,
      nullable: col.nullable
    }));
    
    return {
      columns,
      error: null
    };
  } catch (error) {
    return {
      columns: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 获取表数据
 * @param tableName 表名
 * @param options 分页选项
 * @returns 表数据和总记录数
 */
export async function getTableData(
  tableName: string,
  options: { limit?: number; offset?: number }
): Promise<{ data: Record<string, unknown>[] | null; count: number; error: string | null }> {
  try {
    const { limit = 10, offset = 0 } = options;
    const dbClient = getDbClient();
    
    // 确保表名使用双引号包裹，防止SQL注入和特殊字符问题
    const safeTableName = getSqlSafeTableName(tableName);
    
    // 构建分页查询SQL
    const countQuery = `SELECT COUNT(*) as total FROM ${safeTableName}`;
    const dataQuery = `SELECT * FROM ${safeTableName} LIMIT ${limit} OFFSET ${offset}`;
    
    // 并行执行两个查询以提高效率
    const [countResult, dataResult] = await Promise.all([
      dbClient.query(countQuery),
      dbClient.query(dataQuery)
    ]);
    
    const count = parseInt(countResult.rows?.[0]?.total as string || '0', 10);
    
    return {
      data: dataResult.rows || [],
      count,
      error: null
    };
  } catch (error) {
    console.error(`获取表 ${tableName} 数据失败:`, error);
    return {
      data: null,
      count: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 创建表
 * @param createTableSql 创建表的SQL语句
 * @returns 错误信息（如果有）
 */
export async function createTable(createTableSql: string): Promise<{ error: string | null }> {
  try {
    const dbClient = getDbClient();
    await dbClient.createTable(createTableSql);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 删除表
 * @param tableName 表名
 * @returns 错误信息（如果有）
 */
export async function dropTable(tableName: any): Promise<{ error: string | null }> {
  try {
    // 确保tableName是字符串
    if (typeof tableName !== 'string') {
      console.error('错误: dropTable 收到非字符串表名:', tableName);
      if (tableName && typeof tableName === 'object') {
        if ('name' in tableName) {
          console.log('尝试从对象中提取name属性作为表名');
          tableName = String(tableName.name);
        } else if ('table' in tableName) {
          console.log('尝试从对象中提取table属性作为表名');
          tableName = String(tableName.table);
        } else {
          return {
            error: '传入的表名参数类型错误，无法处理'
          };
        }
      } else {
        return {
          error: '传入的表名参数类型错误，无法处理'
        };
      }
    }
    
    const dbClient = getDbClient();
    
    // 使用不带引号的原始表名作为SDK参数
    const sdkTableName = getSdkSafeTableName(tableName);
    console.log(`删除表使用表名: ${sdkTableName}`);
    
    await dbClient.dropTable(sdkTableName);
    return { error: null };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 