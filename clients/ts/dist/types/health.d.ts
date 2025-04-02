/**
 * 健康状态响应结构
 */
export interface HealthStatus {
    /**
     * 服务状态
     */
    status: string;
    /**
     * 应用版本
     */
    version: string;
    /**
     * 运行时间(秒)
     */
    uptime: number;
    /**
     * CPU 使用率(百分比)
     */
    cpu_usage: number;
    /**
     * 内存使用(字节)
     */
    memory_usage: number;
    /**
     * 当前连接数
     */
    connections: number;
}
