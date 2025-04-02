import { ApiClient } from '../core/api-client';
import { HealthStatus } from '../types/health';
import { throwIfError } from '../utils/error';

/**
 * 健康检查客户端
 */
export class HealthClient {
  private apiClient: ApiClient;

  /**
   * 创建健康检查客户端实例
   * @param apiClient API客户端实例
   */
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * 检查服务健康状态
   * @returns 健康状态信息
   */
  async check(): Promise<HealthStatus> {
    const response = await this.apiClient.get<HealthStatus>('/api/health');
    throwIfError(response);
    return response.data as HealthStatus;
  }
} 