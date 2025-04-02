"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbClient = void 0;
const error_1 = require("../utils/error");
class DbClient {
    constructor(apiClient) {
        this.basePath = '/api/db';
        this.apiClient = apiClient;
    }
    /**
     * 执行SQL查询
     * @param sql SQL查询语句
     * @param params 参数（如果有）
     * @returns 查询结果
     */
    async query(sql, params = []) {
        const request = { sql, params };
        const response = await this.apiClient.post(`${this.basePath}/query`, request);
        (0, error_1.throwIfError)(response);
        return response.data;
    }
    /**
     * 执行SQL语句（增删改操作）
     * @param sql SQL执行语句
     * @param params 参数（如果有）
     * @returns 执行结果
     */
    async execute(sql, params = []) {
        const request = { sql, params };
        const response = await this.apiClient.post(`${this.basePath}/execute`, request);
        (0, error_1.throwIfError)(response);
        return response.data;
    }
    /**
     * 获取所有表
     * @returns 表名列表
     */
    async getTables() {
        var _a;
        const response = await this.apiClient.get(`${this.basePath}/tables`);
        (0, error_1.throwIfError)(response);
        return ((_a = response.data) === null || _a === void 0 ? void 0 : _a.tables) || [];
    }
    /**
     * 获取表信息
     * @param tableName 表名
     * @returns 表详细信息
     */
    async getTableInfo(tableName) {
        const response = await this.apiClient.get(`${this.basePath}/tables/${tableName}`);
        (0, error_1.throwIfError)(response);
        return response.data;
    }
    /**
     * 创建表
     * @param createTableSql 创建表的SQL语句
     * @returns 创建结果
     */
    async createTable(createTableSql) {
        const response = await this.apiClient.post(`${this.basePath}/tables`, { sql: createTableSql });
        (0, error_1.throwIfError)(response);
    }
    /**
     * 删除表
     * @param tableName 表名
     * @returns 删除结果
     */
    async dropTable(tableName) {
        const response = await this.apiClient.delete(`${this.basePath}/tables/${tableName}`);
        (0, error_1.throwIfError)(response);
    }
}
exports.DbClient = DbClient;
