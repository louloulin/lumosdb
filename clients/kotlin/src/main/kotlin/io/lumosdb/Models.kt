package io.lumosdb

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * 向量搜索选项
 *
 * @property topK 返回结果数量
 * @property scoreThreshold 相似度阈值
 * @property filter 元数据过滤条件
 * @property namespace 命名空间
 */
@Serializable
data class VectorSearchOptions(
    val topK: Int? = null,
    val scoreThreshold: Float? = null,
    val filter: Map<String, JsonElement>? = null,
    val namespace: String? = null
)

/**
 * 向量搜索请求
 *
 * @property vector 查询向量
 * @property topK 返回结果数量
 * @property scoreThreshold 相似度阈值
 * @property filter 元数据过滤条件
 * @property namespace 命名空间
 */
@Serializable
data class VectorSearchRequest(
    val vector: List<Float>,
    val topK: Int? = null,
    val scoreThreshold: Float? = null,
    val filter: Map<String, JsonElement>? = null,
    val namespace: String? = null
)

/**
 * 向量添加请求
 *
 * @property id 向量ID
 * @property vector 向量数据
 * @property metadata 元数据
 * @property namespace 命名空间
 */
@Serializable
data class VectorAddRequest(
    val id: String,
    val vector: List<Float>,
    val metadata: Map<String, JsonElement>? = null,
    val namespace: String? = null
)

/**
 * 向量更新请求
 *
 * @property id 向量ID
 * @property vector 向量数据
 * @property metadata 元数据
 * @property namespace 命名空间
 */
@Serializable
data class VectorUpdateRequest(
    val id: String,
    val vector: List<Float>? = null,
    val metadata: Map<String, JsonElement>? = null,
    val namespace: String? = null
)

/**
 * 向量删除请求
 *
 * @property id 向量ID
 * @property namespace 命名空间
 */
@Serializable
data class VectorDeleteRequest(
    val id: String,
    val namespace: String? = null
)

/**
 * 向量匹配结果
 *
 * @property id 向量ID
 * @property score 相似度分数
 * @property metadata 元数据
 */
@Serializable
data class VectorMatch(
    val id: String,
    val score: Float,
    val metadata: Map<String, JsonElement>? = null
)

/**
 * 向量搜索响应
 *
 * @property matches 匹配结果列表
 */
@Serializable
data class VectorSearchResponse(
    val matches: List<VectorMatch>
)

/**
 * 集合创建请求
 *
 * @property name 集合名称
 * @property dimension 向量维度
 */
@Serializable
data class CollectionCreateRequest(
    val name: String,
    val dimension: Int
)

/**
 * 健康检查响应
 *
 * @property status 服务状态
 * @property version 服务版本
 */
@Serializable
data class HealthResponse(
    val status: String,
    val version: String
) 