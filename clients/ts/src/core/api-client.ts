import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, ApiError } from '../types/core';

export class ApiClient {
  private client: AxiosInstance;
  
  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      ...config,
    });
    
    // 响应拦截器处理统一的响应格式
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response.data,
      (error: unknown) => {
        // 处理HTTP错误
        if (axios.isAxiosError(error) && error.response) {
          const apiError: ApiError = {
            code: `HTTP_${error.response.status}`,
            message: error.response.data?.message || error.message,
          };
          
          return Promise.reject({
            success: false,
            error: apiError,
          });
        }
        
        // 处理网络错误
        const apiError: ApiError = {
          code: 'NETWORK_ERROR',
          message: error instanceof Error ? error.message : 'Network error occurred',
        };
        
        return Promise.reject({
          success: false,
          error: apiError,
        });
      }
    );
  }
  
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.client.get<any, ApiResponse<T>>(url, config);
  }
  
  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.client.post<any, ApiResponse<T>>(url, data, config);
  }
  
  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.client.put<any, ApiResponse<T>>(url, data, config);
  }
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    return this.client.delete<any, ApiResponse<T>>(url, config);
  }
} 