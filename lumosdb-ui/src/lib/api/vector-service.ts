// 向量服务实现
import { getVectorClient } from './sdk-client';
import type { 
  VectorCollection as SDKVectorCollection,
  VectorItem, 
  VectorSearchResult
} from '@sdk';

/**
 * 向量集合信息
 */
export interface VectorCollection {
  name: string;
  dimension: number;
  vectorCount: number;
  distance: string;
  createdAt: string;
}

/**
 * 相似度搜索结果
 */
export interface SimilaritySearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/**
 * 文本查询参数
 */
export interface TextQueryParams {
  text: string;
  limit?: number;
  filter?: Record<string, unknown>;
}

/**
 * 获取所有向量集合
 * @returns 所有向量集合
 */
export async function getVectorCollections(): Promise<{ collections: VectorCollection[]; error: string | null }> {
  try {
    const vectorClient = getVectorClient();
    const collections = await vectorClient.listCollections();
    
    return {
      collections: collections.map((collection: SDKVectorCollection) => ({
        name: collection.name,
        dimension: collection.dimension,
        vectorCount: collection.vectorCount,
        distance: collection.distanceFunction,
        createdAt: new Date(collection.createdAt).toISOString()
      })),
      error: null
    };
  } catch (error) {
    console.error('获取向量集合失败:', error);
    return {
      collections: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 创建向量集合
 * @param name 集合名称
 * @param dimension 向量维度
 * @param distance 距离函数
 * @returns 操作结果
 */
export async function createVectorCollection(
  name: string, 
  dimension: number, 
  distance: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const vectorClient = getVectorClient();
    await vectorClient.createCollection({
      name,
      dimension,
      distanceFunction: distance
    });
    
    return {
      success: true,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 删除向量集合
 * @param name 集合名称
 * @returns 操作结果
 */
export async function deleteVectorCollection(
  name: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const vectorClient = getVectorClient();
    await vectorClient.deleteCollection(name);
    
    return {
      success: true,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 向集合中添加向量
 * @param collectionName 集合名称
 * @param vectors 向量数据
 * @returns 操作结果
 */
export async function addVectors(
  collectionName: string,
  vectors: VectorItem[]
): Promise<{ success: boolean; ids: string[]; error: string | null }> {
  try {
    const vectorClient = getVectorClient();
    const result = await vectorClient.addVectors(collectionName, vectors);
    
    return {
      success: true,
      ids: result.ids || [],
      error: null
    };
  } catch (error) {
    return {
      success: false,
      ids: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 从集合中获取向量
 * @param collectionName 集合名称
 * @param ids 向量ID数组
 * @returns 向量数据
 */
export async function getVectors(
  collectionName: string,
  ids: string[]
): Promise<{ vectors: VectorItem[]; error: string | null }> {
  try {
    const vectorClient = getVectorClient();
    const vectors = await vectorClient.getVectors(collectionName, ids);
    
    return {
      vectors,
      error: null
    };
  } catch (error) {
    return {
      vectors: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 执行相似度搜索
 * @param collectionName 集合名称
 * @param queryVector 查询向量
 * @param limit 结果数量
 * @returns 相似向量结果
 */
export async function searchSimilar(
  collectionName: string,
  queryVector: number[],
  limit: number = 10
): Promise<{ results: SimilaritySearchResult[]; error: string | null }> {
  try {
    const vectorClient = getVectorClient();
    const searchResults = await vectorClient.search(collectionName, {
      vector: queryVector,
      limit
    });
    
    return {
      results: searchResults.map(result => ({
        id: result.id,
        score: result.score,
        metadata: result.metadata
      })),
      error: null
    };
  } catch (error) {
    return {
      results: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 根据文本执行相似度搜索
 * 这个方法首先将文本转换为向量，然后使用向量进行搜索
 * 
 * @param collectionName 集合名称
 * @param params 查询参数，包含文本、限制数量和过滤条件
 * @returns 相似度搜索结果
 */
export async function searchByText(
  collectionName: string,
  params: TextQueryParams
): Promise<{ results: SimilaritySearchResult[]; error: string | null }> {
  try {
    const vectorClient = getVectorClient();
    
    // 使用SDK的文本搜索功能
    const searchResults = await vectorClient.searchByText(collectionName, {
      text: params.text,
      limit: params.limit || 10,
      filter: params.filter
    });
    
    return {
      results: searchResults.map(result => ({
        id: result.id,
        score: result.score,
        metadata: result.metadata
      })),
      error: null
    };
  } catch (error) {
    console.error('文本相似度搜索失败:', error);
    return {
      results: [],
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * 获取向量集合统计信息
 * @param collectionName 集合名称
 * @returns 集合统计信息
 */
export async function getCollectionStats(
  collectionName: string
): Promise<{ 
  stats: { 
    vectorCount: number; 
    dimension: number; 
    indexType: string; 
    createdAt: string;
    metadataFields: string[];
  } | null; 
  error: string | null 
}> {
  try {
    const vectorClient = getVectorClient();
    const stats = await vectorClient.getCollectionStats(collectionName);
    
    return {
      stats: {
        vectorCount: stats.vectorCount,
        dimension: stats.dimension,
        indexType: stats.indexType || 'default',
        createdAt: stats.createdAt,
        metadataFields: stats.metadataFields || []
      },
      error: null
    };
  } catch (error) {
    console.error('获取集合统计信息失败:', error);
    return {
      stats: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
} 