/** API响应包装器 */
export interface ApiResponse<T> {
    /** 操作是否成功 */
    success: boolean;
    /** 响应数据（成功时） */
    data?: T;
    /** 错误信息（失败时） */
    error?: ApiError;
}
/** API错误信息 */
export interface ApiError {
    /** 错误代码 */
    code: string;
    /** 错误消息 */
    message: string;
}
/** 健康检查响应 */
export interface HealthResponse {
    /** 服务状态 */
    status: string;
    /** 服务版本 */
    version: string;
    /** 时间戳（Unix秒） */
    timestamp: number;
}
