package io.lumosdb.client.api

import io.ktor.client.*
import io.ktor.client.request.*
import io.ktor.client.call.*
import io.lumosdb.client.model.HealthResponse

/**
 * 健康检查客户端，用于检查服务器状态
 */
class HealthClient(private val httpClient: HttpClient, private val baseUrl: String) {

    /**
     * 检查服务器健康状态
     * 
     * @return 健康状态信息
     */
    suspend fun check(): HealthResponse {
        val response = httpClient.get("$baseUrl/health")
        val apiResponse = response.body<Map<String, Any>>()
        
        // 从响应中提取健康状态数据
        @Suppress("UNCHECKED_CAST")
        val data = apiResponse["data"] as? Map<String, String> ?: 
            throw IllegalStateException("Invalid health response format")
        
        return HealthResponse(
            status = data["status"] ?: "unknown",
            version = data["version"] ?: "unknown"
        )
    }
} 