import { DbClient } from './clients/db-client';
import { VectorClient } from './clients/vector-client';
import { HealthClient } from './clients/health-client';
/**
 * LumosDB客户端主类
 * 提供数据库、向量和健康检查等操作
 */
export declare class LumosDBClient {
    /** API客户端 */
    private apiClient;
    /** 数据库客户端 */
    db: DbClient;
    /** 向量客户端 */
    vector: VectorClient;
    /** 健康检查客户端 */
    health: HealthClient;
    /**
     * 创建LumosDB客户端实例
     * @param baseURL API基础URL
     * @param apiKey API密钥(可选)
     */
    constructor(baseURL: string, apiKey?: string);
    /**
     * 设置API密钥
     * @param apiKey API密钥
     */
    setApiKey(apiKey: string): void;
}
export * from './types/core';
export * from './types/db';
export * from './types/vector';
export * from './types/health';
