/**
 * 查询请求参数
 */
export interface QueryRequest {
  /**
   * SQL查询语句
   */
  sql: string;
  
  /**
   * 查询参数数组，可以是任意类型
   */
  params?: any[];
}

/**
 * 查询结果接口
 */
export interface QueryResult {
  /**
   * 列名数组
   */
  columns: string[];
  
  /**
   * 结果行数据
   */
  rows: Row[];
  
  /**
   * 结果行数
   */
  count: number;
}

/**
 * 数据行类型
 * 可以是任意类型的数组
 */
export type Row = any[];

/**
 * 执行请求参数
 */
export interface ExecuteRequest {
  /**
   * SQL执行语句
   */
  sql: string;
  
  /**
   * 执行参数数组，可以是任意类型
   */
  params?: any[];
}

/**
 * 执行结果接口
 */
export interface ExecuteResult {
  /**
   * 受影响的行数
   */
  affected_rows: number;
}

/**
 * 表信息接口
 */
export interface TableInfo {
  /**
   * 表名
   */
  name: string;
  
  /**
   * 列信息数组
   */
  columns: ColumnInfo[];
}

/**
 * 列信息接口
 */
export interface ColumnInfo {
  /**
   * 列名
   */
  name: string;
  
  /**
   * 数据类型
   */
  type: string;
  
  /**
   * 是否非空
   */
  notnull: boolean;
  
  /**
   * 是否主键
   */
  pk: boolean;
} 