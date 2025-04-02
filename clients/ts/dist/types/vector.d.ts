/**
 * 向量集合接口
 */
export interface Collection {
    /**
     * 集合名称
     */
    name: string;
    /**
     * 向量维度
     */
    dimension: number;
}
/**
 * 向量集合（兼容旧接口）
 */
export interface VectorCollection {
    /**
     * 集合名称
     */
    name: string;
    /**
     * 向量维度
     */
    dimension: number;
}
/**
 * 向量数据结构
 */
export interface Vector {
    /**
     * 向量ID
     */
    id: string;
    /**
     * 向量值
     */
    values: number[];
    /**
     * 向量元数据
     */
    metadata?: Record<string, any>;
}
/**
 * 搜索结果接口
 */
export interface SearchResult {
    /**
     * 向量ID
     */
    id: string;
    /**
     * 相似度分数
     */
    score: number;
    /**
     * 向量元数据
     */
    metadata?: Record<string, any>;
}
/**
 * 搜索参数接口
 */
export interface SearchParams {
    /**
     * 查询向量
     */
    query_vector: number[];
    /**
     * 返回结果数量
     */
    top_k: number;
    /**
     * 元数据过滤条件
     */
    filter?: Record<string, any>;
}
/** 向量嵌入 */
export interface Embedding {
    /** 向量ID */
    id: string;
    /** 向量数据 */
    vector: number[];
    /** 元数据（可选） */
    metadata?: Record<string, any>;
}
/** 创建集合请求 */
export interface CreateCollectionRequest {
    /** 集合名称 */
    name: string;
    /** 向量维度 */
    dimension: number;
}
/** 添加向量请求 */
export interface AddEmbeddingsRequest {
    /** 向量ID列表 */
    ids: string[];
    /** 向量数据列表 */
    embeddings: number[][];
    /** 元数据列表（可选） */
    metadata?: Record<string, any>[];
}
/** 搜索请求 */
export interface SearchRequest {
    /** 查询向量 */
    vector: number[];
    /** 返回结果数量 */
    top_k: number;
}
