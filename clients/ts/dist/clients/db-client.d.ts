import { ApiClient } from '../core/api-client';
import { QueryResult, ExecuteResult, TableInfo } from '../types/db';
export declare class DbClient {
    private apiClient;
    private basePath;
    constructor(apiClient: ApiClient);
    /**
     * 执行SQL查询
     * @param sql SQL查询语句
     * @param params 参数（如果有）
     * @returns 查询结果
     */
    query(sql: string, params?: any[]): Promise<QueryResult>;
    /**
     * 执行SQL语句（增删改操作）
     * @param sql SQL执行语句
     * @param params 参数（如果有）
     * @returns 执行结果
     */
    execute(sql: string, params?: any[]): Promise<ExecuteResult>;
    /**
     * 获取所有表
     * @returns 表名列表
     */
    getTables(): Promise<string[]>;
    /**
     * 获取表信息
     * @param tableName 表名
     * @returns 表详细信息
     */
    getTableInfo(tableName: string): Promise<TableInfo>;
    /**
     * 创建表
     * @param createTableSql 创建表的SQL语句
     * @returns 创建结果
     */
    createTable(createTableSql: string): Promise<void>;
    /**
     * 删除表
     * @param tableName 表名
     * @returns 删除结果
     */
    dropTable(tableName: string): Promise<void>;
}
