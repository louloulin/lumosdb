"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthClient = void 0;
const error_1 = require("../utils/error");
/**
 * 健康检查客户端
 */
class HealthClient {
    /**
     * 创建健康检查客户端实例
     * @param apiClient API客户端实例
     */
    constructor(apiClient) {
        this.apiClient = apiClient;
    }
    /**
     * 检查服务健康状态
     * @returns 健康状态信息
     */
    async check() {
        const response = await this.apiClient.get('/api/health');
        (0, error_1.throwIfError)(response);
        return response.data;
    }
}
exports.HealthClient = HealthClient;
