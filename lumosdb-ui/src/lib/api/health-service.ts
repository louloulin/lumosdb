import { getHealthClient } from './sdk-client';

export interface HealthStatus {
  status: 'ok' | 'error';
  version: string;
  uptime: number;
  timestamp: string;
  dbStatus: 'connected' | 'disconnected';
  message?: string;
}

/**
 * 检查后端服务健康状态
 * @returns 健康状态信息
 */
export async function checkHealth(): Promise<HealthStatus> {
  try {
    const healthClient = getHealthClient();
    const response = await healthClient.check();
    
    return {
      status: response.status === 'ok' ? 'ok' : 'error',
      version: response.version || 'unknown',
      uptime: response.uptime || 0,
      timestamp: response.timestamp || new Date().toISOString(),
      dbStatus: response.dbConnected ? 'connected' : 'disconnected',
      message: response.message
    };
  } catch (error) {
    console.error('健康检查失败:', error);
    return {
      status: 'error',
      version: 'unknown',
      uptime: 0,
      timestamp: new Date().toISOString(),
      dbStatus: 'disconnected',
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 获取系统详细信息
 * @returns 系统详细信息
 */
export async function getSystemInfo(): Promise<Record<string, any>> {
  try {
    const healthClient = getHealthClient();
    const response = await healthClient.getSystemInfo();
    return response || {};
  } catch (error) {
    console.error('获取系统信息失败:', error);
    return {
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 