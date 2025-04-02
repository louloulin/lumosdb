import { ApiClient } from '../core/api-client';
import { Collection, SearchResult, Vector, VectorCollection } from '../types/vector';
/**
 * 向量数据库客户端
 */
export declare class VectorClient {
    private apiClient;
    private basePath;
    /**
     * 创建向量客户端实例
     * @param apiClient API客户端实例
     */
    constructor(apiClient: ApiClient);
    /**
     * 获取所有向量集合
     * @returns 向量集合列表
     */
    getCollections(): Promise<VectorCollection[]>;
    /**
     * 创建新的向量集合
     * @param name 集合名称
     * @param dimension 向量维度
     * @returns 创建结果
     */
    createCollection(name: string, dimension: number): Promise<void>;
    /**
     * 获取集合详情
     * @param name 集合名称
     * @returns 集合详情
     */
    getCollection(name: string): Promise<Collection>;
    /**
     * 删除集合
     * @param name 集合名称
     * @returns 删除结果
     */
    deleteCollection(name: string): Promise<void>;
    /**
     * 添加单个向量
     * @param collection 集合名称
     * @param vector 向量数据
     */
    addVector(collection: string, vector: Vector): Promise<void>;
    /**
     * 批量添加向量
     * @param collection 集合名称
     * @param vectors 向量数据数组
     */
    addVectors(collection: string, vectors: Vector[]): Promise<void>;
    /**
     * 删除向量
     * @param collection 集合名称
     * @param id 向量ID
     */
    deleteVector(collection: string, id: string): Promise<void>;
    /**
     * 相似度搜索
     * @param collection 集合名称
     * @param queryVector 查询向量
     * @param topK 返回结果数量
     * @param filter 元数据过滤条件
     * @returns 搜索结果
     */
    search(collection: string, queryVector: number[], topK: number, filter?: Record<string, any>): Promise<SearchResult[]>;
    /**
     * 创建向量索引
     * @param collectionName 集合名称
     * @param indexType 索引类型
     * @param parameters 索引参数
     * @returns 创建结果
     */
    createIndex(collectionName: string, indexType: string, parameters?: Record<string, any>): Promise<void>;
    /**
     * 删除向量索引
     * @param collectionName 集合名称
     * @returns 删除结果
     */
    deleteIndex(collectionName: string): Promise<void>;
}
