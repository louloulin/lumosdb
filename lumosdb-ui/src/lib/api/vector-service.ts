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