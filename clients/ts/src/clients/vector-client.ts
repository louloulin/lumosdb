import { ApiClient } from '../core/api-client';
import {
  Collection,
  CreateCollectionRequest,
  AddEmbeddingsRequest,
  SearchRequest,
  SearchResult,
  Vector,
  VectorCollection
} from '../types/vector';
import { throwIfError } from '../utils/error';

/**
 * 向量数据库客户端
 */
export class VectorClient {
  private apiClient: ApiClient;
  private basePath = '/api/vector';
  
  /**
   * 创建向量客户端实例
   * @param apiClient API客户端实例
   */
  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }
  
  /**
   * 获取所有向量集合
   * @returns 向量集合列表
   */
  async getCollections(): Promise<VectorCollection[]> {
    const response = await this.apiClient.get<{ collections: VectorCollection[] }>('/api/vector/collections');
    throwIfError(response);
    return response.data?.collections ?? [];
  }
  
  /**
   * 创建新的向量集合
   * @param name 集合名称
   * @param dimension 向量维度
   * @returns 创建结果
   */
  async createCollection(name: string, dimension: number): Promise<void> {
    const response = await this.apiClient.post('/api/vector/collections', {
      name,
      dimension
    });
    throwIfError(response);
  }
  
  /**
   * 获取集合详情
   * @param name 集合名称
   * @returns 集合详情
   */
  async getCollection(name: string): Promise<Collection> {
    const response = await this.apiClient.get<Collection>(`/api/vector/collections/${name}`);
    throwIfError(response);
    return response.data as Collection;
  }
  
  /**
   * 删除集合
   * @param name 集合名称
   * @returns 删除结果
   */
  async deleteCollection(name: string): Promise<void> {
    const response = await this.apiClient.delete(`/api/vector/collections/${name}`);
    throwIfError(response);
  }
  
  /**
   * 添加单个向量
   * @param collection 集合名称
   * @param vector 向量数据
   */
  async addVector(collection: string, vector: Vector): Promise<void> {
    const response = await this.apiClient.post(`/api/vector/collections/${collection}/vectors`, vector);
    throwIfError(response);
  }
  
  /**
   * 批量添加向量
   * @param collection 集合名称
   * @param vectors 向量数据数组
   */
  async addVectors(collection: string, vectors: Vector[]): Promise<void> {
    const response = await this.apiClient.post(`/api/vector/collections/${collection}/vectors/batch`, {
      vectors
    });
    throwIfError(response);
  }
  
  /**
   * 添加嵌入向量（原始格式）
   * @param collection 集合名称
   * @param ids 向量ID数组
   * @param embeddings 向量值二维数组
   * @param metadata 元数据数组（可选）
   */
  async addEmbeddings(
    collection: string,
    ids: string[],
    embeddings: number[][],
    metadata?: Record<string, any>[]
  ): Promise<void> {
    const response = await this.apiClient.post(`/api/vector/collections/${collection}/vectors`, {
      ids,
      embeddings,
      metadata
    });
    throwIfError(response);
  }
  
  /**
   * 删除向量
   * @param collection 集合名称
   * @param id 向量ID
   */
  async deleteVector(collection: string, id: string): Promise<void> {
    const response = await this.apiClient.delete(`/api/vector/collections/${collection}/vectors/${id}`);
    throwIfError(response);
  }
  
  /**
   * 相似度搜索
   * @param collection 集合名称
   * @param queryVector 查询向量
   * @param topK 返回结果数量
   * @returns 搜索结果
   */
  async search(
    collection: string,
    queryVector: number[],
    topK: number
  ): Promise<SearchResult[]> {
    const response = await this.apiClient.post<{ results: SearchResult[] }>(
      `/api/vector/collections/${collection}/search`,
      {
        vector: queryVector,
        top_k: topK
      }
    );
    throwIfError(response);
    return response.data?.results ?? [];
  }
  
  /**
   * 创建向量索引
   * @param collectionName 集合名称
   * @param indexType 索引类型
   * @param parameters 索引参数
   * @returns 创建结果
   */
  async createIndex(
    collectionName: string,
    indexType: string,
    parameters?: Record<string, any>
  ): Promise<void> {
    const response = await this.apiClient.post(
      `${this.basePath}/collections/${collectionName}/index/${indexType}`,
      { parameters }
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to create index');
    }
  }
  
  /**
   * 删除向量索引
   * @param collectionName 集合名称
   * @returns 删除结果
   */
  async deleteIndex(collectionName: string): Promise<void> {
    const response = await this.apiClient.delete(
      `${this.basePath}/collections/${collectionName}/index`
    );
    
    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete index');
    }
  }
} 