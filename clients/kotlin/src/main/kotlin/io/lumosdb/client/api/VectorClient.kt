package io.lumosdb.client.api

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.call.*
import io.ktor.http.*
import io.lumosdb.client.model.VectorMatch
import io.lumosdb.client.model.VectorSearchResult
import kotlinx.serialization.json.JsonElement

/**
 * 向量搜索选项
 */
data class VectorSearchOptions(
    val topK: Int = 10,
    val scoreThreshold: Float? = null,
    val filter: Map<String, JsonElement>? = null,
    val namespace: String? = null
)

/**
 * 向量客户端，处理向量操作
 */
class VectorClient(private val httpClient: HttpClient, private val baseUrl: String) {

    /**
     * 添加向量
     *
     * @param collection 集合名称
     * @param id 向量ID
     * @param vector 向量数据
     * @param metadata 元数据(可选)
     * @param namespace 命名空间(可选)
     */
    suspend fun add(
        collection: String,
        id: String,
        vector: List<Float>,
        metadata: Map<String, JsonElement>? = null,
        namespace: String? = null
    ) {
        val requestBody = mapOf(
            "ids" to listOf(id),
            "embeddings" to listOf(vector),
            "metadata" to metadata?.let { listOf(it) },
            "namespace" to namespace
        ).filterValues { it != null }
        
        httpClient.post("$baseUrl/vector/collections/$collection/vectors") {
            contentType(ContentType.Application.Json)
            setBody(requestBody)
        }
    }

    /**
     * 搜索向量
     *
     * @param collection 集合名称
     * @param vector 查询向量
     * @param options 搜索选项
     * @return 搜索结果
     */
    suspend fun search(
        collection: String,
        vector: List<Float>,
        options: VectorSearchOptions = VectorSearchOptions()
    ): VectorSearchResult {
        val requestBody = mapOf(
            "vector" to vector,
            "top_k" to options.topK,
            "score_threshold" to options.scoreThreshold,
            "filter" to options.filter,
            "namespace" to options.namespace
        ).filterValues { it != null }
        
        val response = httpClient.post("$baseUrl/vector/collections/$collection/search") {
            contentType(ContentType.Application.Json)
            setBody(requestBody)
        }
        
        val apiResponse = response.body<Map<String, Any>>()
        
        @Suppress("UNCHECKED_CAST")
        val data = apiResponse["data"] as? Map<String, Any> ?: 
            throw IllegalStateException("Invalid search response format")
            
        @Suppress("UNCHECKED_CAST")
        val results = data["results"] as? List<Map<String, Any>> ?: 
            return VectorSearchResult(emptyList())
            
        val matches = results.mapNotNull { result ->
            val id = result["id"] as? String ?: return@mapNotNull null
            val score = (result["score"] as? Number)?.toFloat() ?: return@mapNotNull null
            
            @Suppress("UNCHECKED_CAST")
            val metadata = result["metadata"] as? Map<String, JsonElement>
            
            VectorMatch(id, score, metadata)
        }
        
        return VectorSearchResult(matches)
    }

    /**
     * 更新向量
     *
     * @param collection 集合名称
     * @param id 向量ID
     * @param vector 新向量数据
     * @param metadata 新元数据
     * @param namespace 命名空间(可选)
     */
    suspend fun update(
        collection: String,
        id: String,
        vector: List<Float>? = null,
        metadata: Map<String, JsonElement>? = null,
        namespace: String? = null
    ) {
        val requestBody = mapOf(
            "id" to id,
            "vector" to vector,
            "metadata" to metadata,
            "namespace" to namespace
        ).filterValues { it != null }
        
        httpClient.put("$baseUrl/vector/collections/$collection/vectors/$id") {
            contentType(ContentType.Application.Json)
            setBody(requestBody)
        }
    }

    /**
     * 删除向量
     *
     * @param collection 集合名称
     * @param id 向量ID
     * @param namespace 命名空间(可选)
     */
    suspend fun delete(collection: String, id: String, namespace: String? = null) {
        val url = "$baseUrl/vector/collections/$collection/vectors/$id"
        
        val params = if (namespace != null) {
            "?namespace=$namespace"
        } else {
            ""
        }
        
        httpClient.delete(url + params)
    }
} 