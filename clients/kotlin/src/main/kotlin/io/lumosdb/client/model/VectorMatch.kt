package io.lumosdb.client.model

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * 向量匹配结果
 *
 * @property id 向量ID
 * @property score 相似度分数
 * @property metadata 元数据（可选）
 */
@Serializable
data class VectorMatch(
    val id: String,
    val score: Float,
    val metadata: Map<String, JsonElement>? = null
)

/**
 * 向量搜索结果
 *
 * @property matches 匹配结果列表
 */
@Serializable
data class VectorSearchResult(
    val matches: List<VectorMatch>
) 