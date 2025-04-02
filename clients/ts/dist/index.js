"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LumosDBClient = void 0;
const api_client_1 = require("./core/api-client");
const db_client_1 = require("./clients/db-client");
const vector_client_1 = require("./clients/vector-client");
const health_client_1 = require("./clients/health-client");
/**
 * LumosDB客户端主类
 * 提供数据库、向量和健康检查等操作
 */
class LumosDBClient {
    /**
     * 创建LumosDB客户端实例
     * @param baseURL API基础URL
     * @param apiKey API密钥(可选)
     */
    constructor(baseURL, apiKey) {
        // 创建API客户端
        this.apiClient = new api_client_1.ApiClient(baseURL, {
            headers: apiKey ? {
                'Authorization': `Bearer ${apiKey}`
            } : undefined
        });
        // 初始化各个子客户端
        this.db = new db_client_1.DbClient(this.apiClient);
        this.vector = new vector_client_1.VectorClient(this.apiClient);
        this.health = new health_client_1.HealthClient(this.apiClient);
    }
    /**
     * 设置API密钥
     * @param apiKey API密钥
     */
    setApiKey(apiKey) {
        this.apiClient = new api_client_1.ApiClient(this.apiClient['client'].defaults.baseURL, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });
        // 更新各个子客户端的API客户端
        this.db = new db_client_1.DbClient(this.apiClient);
        this.vector = new vector_client_1.VectorClient(this.apiClient);
        this.health = new health_client_1.HealthClient(this.apiClient);
    }
}
exports.LumosDBClient = LumosDBClient;
// 导出所有类型
__exportStar(require("./types/core"), exports);
__exportStar(require("./types/db"), exports);
__exportStar(require("./types/vector"), exports);
__exportStar(require("./types/health"), exports);
