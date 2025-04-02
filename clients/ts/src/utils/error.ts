import { ApiResponse } from '../types/core';

/**
 * 检查API响应是否出错，如果有错误则抛出异常
 * @param response API响应对象
 * @throws 如果响应失败，则抛出相应的错误
 */
export function throwIfError<T>(response: ApiResponse<T>): void {
  if (!response.success) {
    throw new Error(response.error?.message || 'API request failed');
  }
}
