"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
class ApiClient {
    constructor(baseURL, config) {
        this.client = axios_1.default.create({
            baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
            ...config,
        });
        // 响应拦截器处理统一的响应格式
        this.client.interceptors.response.use((response) => response.data, (error) => {
            var _a;
            // 处理HTTP错误
            if (axios_1.default.isAxiosError(error) && error.response) {
                const apiError = {
                    code: `HTTP_${error.response.status}`,
                    message: ((_a = error.response.data) === null || _a === void 0 ? void 0 : _a.message) || error.message,
                };
                return Promise.reject({
                    success: false,
                    error: apiError,
                });
            }
            // 处理网络错误
            const apiError = {
                code: 'NETWORK_ERROR',
                message: error instanceof Error ? error.message : 'Network error occurred',
            };
            return Promise.reject({
                success: false,
                error: apiError,
            });
        });
    }
    async get(url, config) {
        return this.client.get(url, config);
    }
    async post(url, data, config) {
        return this.client.post(url, data, config);
    }
    async put(url, data, config) {
        return this.client.put(url, data, config);
    }
    async delete(url, config) {
        return this.client.delete(url, config);
    }
}
exports.ApiClient = ApiClient;
