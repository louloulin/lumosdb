import { ApiClient } from '../core/api-client';
import { HealthStatus } from '../types/health';
/**
 * 健康检查客户端
 */
export declare class HealthClient {
    private apiClient;
    /**
     * 创建健康检查客户端实例
     * @param apiClient API客户端实例
     */
    constructor(apiClient: ApiClient);
    /**
     * 检查服务健康状态
     * @returns 健康状态信息
     */
    check(): Promise<HealthStatus>;
}
