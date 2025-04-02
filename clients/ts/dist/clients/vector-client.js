"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VectorClient = void 0;
const error_1 = require("../utils/error");
/**
 * 向量数据库客户端
 */
class VectorClient {
    /**
     * 创建向量客户端实例
     * @param apiClient API客户端实例
     */
    constructor(apiClient) {
        this.basePath = '/api/vector';
        this.apiClient = apiClient;
    }
    /**
     * 获取所有向量集合
     * @returns 向量集合列表
     */
    async getCollections() {
        var _a, _b;
        const response = await this.apiClient.get('/api/vector/collections');
        (0, error_1.throwIfError)(response);
        return (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.collections) !== null && _b !== void 0 ? _b : [];
    }
    /**
     * 创建新的向量集合
     * @param name 集合名称
     * @param dimension 向量维度
     * @returns 创建结果
     */
    async createCollection(name, dimension) {
        const response = await this.apiClient.post('/api/vector/collections', {
            name,
            dimension
        });
        (0, error_1.throwIfError)(response);
    }
    /**
     * 获取集合详情
     * @param name 集合名称
     * @returns 集合详情
     */
    async getCollection(name) {
        const response = await this.apiClient.get(`/api/vector/collections/${name}`);
        (0, error_1.throwIfError)(response);
        return response.data;
    }
    /**
     * 删除集合
     * @param name 集合名称
     * @returns 删除结果
     */
    async deleteCollection(name) {
        const response = await this.apiClient.delete(`/api/vector/collections/${name}`);
        (0, error_1.throwIfError)(response);
    }
    /**
     * 添加单个向量
     * @param collection 集合名称
     * @param vector 向量数据
     */
    async addVector(collection, vector) {
        const response = await this.apiClient.post(`/api/vector/collections/${collection}/vectors`, vector);
        (0, error_1.throwIfError)(response);
    }
    /**
     * 批量添加向量
     * @param collection 集合名称
     * @param vectors 向量数据数组
     */
    async addVectors(collection, vectors) {
        const response = await this.apiClient.post(`/api/vector/collections/${collection}/vectors/batch`, {
            vectors
        });
        (0, error_1.throwIfError)(response);
    }
    /**
     * 删除向量
     * @param collection 集合名称
     * @param id 向量ID
     */
    async deleteVector(collection, id) {
        const response = await this.apiClient.delete(`/api/vector/collections/${collection}/vectors/${id}`);
        (0, error_1.throwIfError)(response);
    }
    /**
     * 相似度搜索
     * @param collection 集合名称
     * @param queryVector 查询向量
     * @param topK 返回结果数量
     * @param filter 元数据过滤条件
     * @returns 搜索结果
     */
    async search(collection, queryVector, topK, filter) {
        var _a, _b;
        const response = await this.apiClient.post(`/api/vector/collections/${collection}/search`, {
            query_vector: queryVector,
            top_k: topK,
            filter
        });
        (0, error_1.throwIfError)(response);
        return (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.results) !== null && _b !== void 0 ? _b : [];
    }
    /**
     * 创建向量索引
     * @param collectionName 集合名称
     * @param indexType 索引类型
     * @param parameters 索引参数
     * @returns 创建结果
     */
    async createIndex(collectionName, indexType, parameters) {
        var _a;
        const response = await this.apiClient.post(`${this.basePath}/collections/${collectionName}/index/${indexType}`, { parameters });
        if (!response.success) {
            throw new Error(((_a = response.error) === null || _a === void 0 ? void 0 : _a.message) || 'Failed to create index');
        }
    }
    /**
     * 删除向量索引
     * @param collectionName 集合名称
     * @returns 删除结果
     */
    async deleteIndex(collectionName) {
        var _a;
        const response = await this.apiClient.delete(`${this.basePath}/collections/${collectionName}/index`);
        if (!response.success) {
            throw new Error(((_a = response.error) === null || _a === void 0 ? void 0 : _a.message) || 'Failed to delete index');
        }
    }
}
exports.VectorClient = VectorClient;
