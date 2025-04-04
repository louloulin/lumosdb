import { VectorClient } from './vector-client';
import { ApiClient } from '../core/api-client';
import { VectorCollection, SearchResult, Vector } from '../types/vector';
import { ApiResponse } from '../types/core';

// 模拟ApiClient
jest.mock('../core/api-client');

describe('VectorClient', () => {
  let vectorClient: VectorClient;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    // 创建模拟的ApiClient实例
    mockApiClient = new ApiClient('') as jest.Mocked<ApiClient>;
    // 创建VectorClient实例，传入模拟的ApiClient
    vectorClient = new VectorClient(mockApiClient);
  });

  test('getCollections should call apiClient.get and return collections list', async () => {
    const mockCollections: VectorCollection[] = [
      { name: 'collection1', dimension: 128 },
      { name: 'collection2', dimension: 256 }
    ];
    
    const mockResponse: ApiResponse<{ collections: VectorCollection[] }> = {
      success: true,
      data: { collections: mockCollections }
    };
    
    // 设置mock返回值
    mockApiClient.get.mockResolvedValue(mockResponse);
    
    // 调用方法
    const result = await vectorClient.getCollections();
    
    // 验证
    expect(mockApiClient.get).toHaveBeenCalledWith('/api/vector/collections');
    expect(result).toEqual(mockCollections);
  });

  test('createCollection should call apiClient.post with correct parameters', async () => {
    const mockCollectionName = 'testCollection';
    const mockDimension = 128;
    
    const mockResponse: ApiResponse<void> = {
      success: true
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 调用方法
    await vectorClient.createCollection(mockCollectionName, mockDimension);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith('/api/vector/collections', { 
      name: mockCollectionName,
      dimension: mockDimension
    });
  });

  test('deleteCollection should call apiClient.delete with correct collection name', async () => {
    const mockCollectionName = 'testCollection';
    
    const mockResponse: ApiResponse<void> = {
      success: true
    };
    
    // 设置mock返回值
    mockApiClient.delete.mockResolvedValue(mockResponse);
    
    // 调用方法
    await vectorClient.deleteCollection(mockCollectionName);
    
    // 验证
    expect(mockApiClient.delete).toHaveBeenCalledWith(`/api/vector/collections/${mockCollectionName}`);
  });

  test('addVector should call apiClient.post with correct parameters', async () => {
    const mockCollectionName = 'testCollection';
    const mockVector: Vector = {
      id: 'vector1',
      values: [0.1, 0.2, 0.3],
      metadata: { source: 'test' }
    };
    
    const mockResponse: ApiResponse<void> = {
      success: true
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 调用方法
    await vectorClient.addVector(mockCollectionName, mockVector);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith(`/api/vector/collections/${mockCollectionName}/vectors`, mockVector);
  });

  test('addVectors should call apiClient.post with correct parameters', async () => {
    const mockCollectionName = 'testCollection';
    const mockVectors: Vector[] = [
      {
        id: 'vector1',
        values: [0.1, 0.2, 0.3],
        metadata: { source: 'test1' }
      },
      {
        id: 'vector2',
        values: [0.4, 0.5, 0.6],
        metadata: { source: 'test2' }
      }
    ];
    
    const mockResponse: ApiResponse<void> = {
      success: true
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 调用方法
    await vectorClient.addVectors(mockCollectionName, mockVectors);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith(`/api/vector/collections/${mockCollectionName}/vectors/batch`, { vectors: mockVectors });
  });

  test('deleteVector should call apiClient.delete with correct parameters', async () => {
    const mockCollectionName = 'testCollection';
    const mockVectorId = 'vector1';
    
    const mockResponse: ApiResponse<void> = {
      success: true
    };
    
    // 设置mock返回值
    mockApiClient.delete.mockResolvedValue(mockResponse);
    
    // 调用方法
    await vectorClient.deleteVector(mockCollectionName, mockVectorId);
    
    // 验证
    expect(mockApiClient.delete).toHaveBeenCalledWith(`/api/vector/collections/${mockCollectionName}/vectors/${mockVectorId}`);
  });

  test('search should call apiClient.post with correct parameters and return results', async () => {
    const mockCollectionName = 'testCollection';
    const mockQueryVector = [0.1, 0.2, 0.3];
    const mockTopK = 5;
    
    const mockResults: SearchResult[] = [
      { id: 'vector1', score: 0.95, metadata: { source: 'test' } },
      { id: 'vector2', score: 0.85, metadata: { source: 'test' } }
    ];
    
    const mockResponse: ApiResponse<{ results: SearchResult[] }> = {
      success: true,
      data: { results: mockResults }
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 调用方法
    const result = await vectorClient.search(mockCollectionName, mockQueryVector, mockTopK);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith(`/api/vector/collections/${mockCollectionName}/search`, {
      vector: mockQueryVector,
      top_k: mockTopK
    });
    expect(result).toEqual(mockResults);
  });

  test('createIndex should call apiClient.post with correct parameters', async () => {
    const mockCollectionName = 'testCollection';
    const mockIndexType = 'hnsw';
    const mockParameters = { M: 16, ef_construction: 200 };
    
    const mockResponse: ApiResponse<void> = {
      success: true
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 调用方法
    await vectorClient.createIndex(mockCollectionName, mockIndexType, mockParameters);
    
    // 验证
    expect(mockApiClient.post).toHaveBeenCalledWith(
      `/api/vector/collections/${mockCollectionName}/index/${mockIndexType}`, 
      { parameters: mockParameters }
    );
  });

  test('deleteIndex should call apiClient.delete with correct parameters', async () => {
    const mockCollectionName = 'testCollection';
    
    const mockResponse: ApiResponse<void> = {
      success: true
    };
    
    // 设置mock返回值
    mockApiClient.delete.mockResolvedValue(mockResponse);
    
    // 调用方法
    await vectorClient.deleteIndex(mockCollectionName);
    
    // 验证
    expect(mockApiClient.delete).toHaveBeenCalledWith(
      `/api/vector/collections/${mockCollectionName}/index`
    );
  });

  test('createIndex should throw error when response is not successful', async () => {
    const mockCollectionName = 'testCollection';
    const mockIndexType = 'hnsw';
    
    const mockResponse: ApiResponse<void> = {
      success: false,
      error: { code: 'ERROR', message: 'Failed to create index' }
    };
    
    // 设置mock返回值
    mockApiClient.post.mockResolvedValue(mockResponse);
    
    // 验证抛出错误
    await expect(vectorClient.createIndex(mockCollectionName, mockIndexType)).rejects.toThrow('Failed to create index');
  });
}); 