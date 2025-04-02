import axios from 'axios';
import { ApiClient } from './api-client';
import { ApiResponse } from '../types/core';

// 模拟axios
jest.mock('axios', () => {
  return {
    create: jest.fn(() => ({
      interceptors: {
        response: {
          use: jest.fn()
        }
      },
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn()
    }))
  };
});

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    apiClient = new ApiClient('http://localhost:8080');
    mockAxiosInstance = (axios.create as jest.Mock).mock.results[0].value;
  });

  test('should create axios instance with correct baseURL', () => {
    expect(axios.create).toHaveBeenCalledWith({
      baseURL: 'http://localhost:8080',
      headers: { 'Content-Type': 'application/json' }
    });
  });

  test('should set up response interceptors', () => {
    expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
  });

  test('get method should call axios get with correct parameters', async () => {
    const mockResponse: ApiResponse<string> = {
      success: true,
      data: 'test data'
    };
    
    mockAxiosInstance.get.mockResolvedValue(mockResponse);
    
    const result = await apiClient.get<string>('/test');
    
    expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
    expect(result).toBe(mockResponse);
  });

  test('post method should call axios post with correct parameters', async () => {
    const mockData = { key: 'value' };
    const mockResponse: ApiResponse<object> = {
      success: true,
      data: { result: 'success' }
    };
    
    mockAxiosInstance.post.mockResolvedValue(mockResponse);
    
    const result = await apiClient.post<object>('/test', mockData);
    
    expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', mockData, undefined);
    expect(result).toBe(mockResponse);
  });

  test('put method should call axios put with correct parameters', async () => {
    const mockData = { key: 'value' };
    const mockResponse: ApiResponse<object> = {
      success: true,
      data: { result: 'success' }
    };
    
    mockAxiosInstance.put.mockResolvedValue(mockResponse);
    
    const result = await apiClient.put<object>('/test', mockData);
    
    expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', mockData, undefined);
    expect(result).toBe(mockResponse);
  });

  test('delete method should call axios delete with correct parameters', async () => {
    const mockResponse: ApiResponse<null> = {
      success: true
    };
    
    mockAxiosInstance.delete.mockResolvedValue(mockResponse);
    
    const result = await apiClient.delete<null>('/test');
    
    expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', undefined);
    expect(result).toBe(mockResponse);
  });
}); 