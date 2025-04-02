import { AxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types/core';
export declare class ApiClient {
    private client;
    constructor(baseURL: string, config?: AxiosRequestConfig);
    get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
    post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
    put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
    delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>>;
}
