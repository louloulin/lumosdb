/**
 * API错误类型
 */
export enum ErrorType {
  NETWORK = 'network',     // 网络错误
  AUTH = 'auth',           // 认证错误
  PERMISSION = 'permission', // 权限错误
  VALIDATION = 'validation', // 验证错误
  NOT_FOUND = 'not_found', // 资源未找到
  SERVER = 'server',       // 服务器错误
  CLIENT = 'client',       // 客户端错误
  UNKNOWN = 'unknown'      // 未知错误
}

/**
 * API错误接口
 */
export interface ApiError {
  type: ErrorType;
  code?: string;
  message: string;
  details?: Record<string, unknown>;
  originalError?: unknown;
}

/**
 * 创建API错误
 * @param type 错误类型
 * @param message 错误消息
 * @param details 错误详情
 * @param originalError 原始错误
 * @returns API错误对象
 */
export function createApiError(
  type: ErrorType,
  message: string,
  details?: Record<string, unknown>,
  originalError?: unknown
): ApiError {
  return {
    type,
    message,
    details,
    originalError
  };
}

/**
 * 处理异常并转换为标准API错误
 * @param error 原始错误
 * @returns 标准化的API错误
 */
export function handleError(error: unknown): ApiError {
  // 如果已经是API错误，直接返回
  if (typeof error === 'object' && error !== null && 'type' in error && 'message' in error) {
    return error as ApiError;
  }

  // 处理网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createApiError(
      ErrorType.NETWORK,
      '网络连接错误，请检查您的网络连接',
      {},
      error
    );
  }

  // 处理HTTP错误
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'statusText' in error
  ) {
    const httpError = error as { status: number; statusText: string; data?: any };
    
    if (httpError.status === 401) {
      return createApiError(
        ErrorType.AUTH,
        '认证失败，请重新登录',
        httpError.data,
        error
      );
    }
    
    if (httpError.status === 403) {
      return createApiError(
        ErrorType.PERMISSION,
        '您没有权限执行此操作',
        httpError.data,
        error
      );
    }
    
    if (httpError.status === 404) {
      return createApiError(
        ErrorType.NOT_FOUND,
        '请求的资源不存在',
        httpError.data,
        error
      );
    }
    
    if (httpError.status === 400) {
      return createApiError(
        ErrorType.VALIDATION,
        '请求参数验证失败',
        httpError.data,
        error
      );
    }
    
    if (httpError.status >= 500) {
      return createApiError(
        ErrorType.SERVER,
        '服务器错误，请稍后重试',
        httpError.data,
        error
      );
    }
    
    return createApiError(
      ErrorType.CLIENT,
      `请求错误: ${httpError.status} ${httpError.statusText}`,
      httpError.data,
      error
    );
  }

  // 处理一般错误
  let message = '发生未知错误';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return createApiError(
    ErrorType.UNKNOWN,
    message,
    {},
    error
  );
}

/**
 * 错误消息组件属性
 */
export interface ErrorMessageProps {
  error: ApiError;
}

/**
 * 根据错误类型获取用户友好的错误消息
 * @param error API错误
 * @returns 用户友好的错误消息
 */
export function getUserFriendlyErrorMessage(error: ApiError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return '网络连接错误，请检查您的网络连接并重试。';
    case ErrorType.AUTH:
      return '认证失败，请重新登录后再试。';
    case ErrorType.PERMISSION:
      return '您没有权限执行此操作。';
    case ErrorType.VALIDATION:
      return '输入数据验证失败，请检查您的输入并重试。';
    case ErrorType.NOT_FOUND:
      return '请求的资源不存在。';
    case ErrorType.SERVER:
      return '服务器发生错误，请稍后重试。';
    case ErrorType.CLIENT:
      return '客户端请求错误，请重试。';
    case ErrorType.UNKNOWN:
    default:
      return `发生错误: ${error.message}`;
  }
} 