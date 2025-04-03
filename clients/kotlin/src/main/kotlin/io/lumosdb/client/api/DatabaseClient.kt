package io.lumosdb.client.api

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.call.*
import io.ktor.http.*
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * 数据库客户端，负责管理集合操作
 */
class DatabaseClient(private val httpClient: HttpClient, private val baseUrl: String) {

    /**
     * 列出所有向量集合
     *
     * @return 集合名称列表
     */
    suspend fun listCollections(): List<String> {
        val response = httpClient.get("$baseUrl/vector/collections")
        val apiResponse = response.body<Map<String, Any>>()
        
        @Suppress("UNCHECKED_CAST")
        val data = apiResponse["data"] as? Map<String, Any> ?: 
            throw IllegalStateException("Invalid collections response format")
            
        @Suppress("UNCHECKED_CAST")
        val collections = data["collections"] as? List<Map<String, Any>> ?: 
            return emptyList()
            
        return collections.mapNotNull { it["name"] as? String }
    }

    /**
     * 创建新的向量集合
     *
     * @param name 集合名称
     * @param dimension 向量维度
     * @param distance 距离计算方式 (euclidean, cosine, dot)
     */
    suspend fun createCollection(name: String, dimension: Int, distance: String = "euclidean") {
        val requestBody = mapOf(
            "name" to name,
            "dimension" to dimension,
            "distance" to distance
        )
        
        httpClient.post("$baseUrl/vector/collections") {
            contentType(ContentType.Application.Json)
            setBody(requestBody)
        }
    }

    /**
     * 删除向量集合
     *
     * @param name 集合名称
     */
    suspend fun deleteCollection(name: String) {
        httpClient.delete("$baseUrl/vector/collections/$name")
    }
} 