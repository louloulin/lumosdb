package io.lumosdb

import io.ktor.client.call.*
import io.ktor.client.request.*
import io.ktor.client.statement.*
import io.ktor.http.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * API响应包装器
 */
@Serializable
data class ApiResponse<T>(
    val data: T? = null,
    val error: String? = null,
    val error_code: String? = null
)

/**
 * API调用异常
 */
class ApiException(
    val code: String,
    message: String
) : Exception(message)

/**
 * API客户端，处理底层HTTP请求
 */
class ApiClient(private val client: LumosDBClient) {

    /**
     * 发送GET请求
     *
     * @param endpoint API端点
     * @return 响应数据
     */
    suspend inline fun <reified T> get(endpoint: String): T {
        val url = buildUrl(endpoint)
        logger.debug { "GET $url" }
        
        val response = client.httpClient.get(url) {
            addDefaultHeaders()
        }
        
        return handleResponse(response)
    }

    /**
     * 发送POST请求
     *
     * @param endpoint API端点
     * @param body 请求正文
     * @return 响应数据
     */
    suspend inline fun <reified T, reified R> post(endpoint: String, body: T): R {
        val url = buildUrl(endpoint)
        logger.debug { "POST $url" }
        
        val response = client.httpClient.post(url) {
            addDefaultHeaders()
            contentType(ContentType.Application.Json)
            setBody(body)
        }
        
        return handleResponse(response)
    }

    /**
     * 发送DELETE请求
     *
     * @param endpoint API端点
     * @return 响应数据
     */
    suspend inline fun <reified T> delete(endpoint: String): T {
        val url = buildUrl(endpoint)
        logger.debug { "DELETE $url" }
        
        val response = client.httpClient.delete(url) {
            addDefaultHeaders()
        }
        
        return handleResponse(response)
    }

    /**
     * 构建完整URL
     */
    private fun buildUrl(endpoint: String): String {
        val baseUrl = client.baseUrl.removeSuffix("/")
        val path = endpoint.removePrefix("/")
        return "$baseUrl/$path"
    }

    /**
     * 添加默认请求头
     */
    private fun HttpRequestBuilder.addDefaultHeaders() {
        headers {
            append(HttpHeaders.Accept, "application/json")
            client.apiKey?.let {
                append(HttpHeaders.Authorization, "Bearer $it")
            }
        }
    }

    /**
     * 处理HTTP响应
     */
    private suspend inline fun <reified T> handleResponse(response: HttpResponse): T {
        val statusCode = response.status.value
        
        if (statusCode in 200..299) {
            try {
                val apiResponse = response.body<ApiResponse<T>>()
                
                if (apiResponse.error != null) {
                    throw ApiException(
                        apiResponse.error_code ?: "unknown",
                        apiResponse.error
                    )
                }
                
                return apiResponse.data ?: throw ApiException(
                    "empty_response",
                    "API returned empty data"
                )
            } catch (e: Exception) {
                if (e is ApiException) throw e
                
                logger.error(e) { "Failed to parse API response" }
                throw ApiException("parse_error", "Failed to parse API response: ${e.message}")
            }
        } else {
            val errorBody = response.bodyAsText()
            logger.error { "API error (status $statusCode): $errorBody" }
            
            try {
                val errorResponse = response.body<ApiResponse<JsonElement>>()
                throw ApiException(
                    errorResponse.error_code ?: "http_error_$statusCode",
                    errorResponse.error ?: "HTTP Error $statusCode"
                )
            } catch (e: Exception) {
                throw ApiException(
                    "http_error_$statusCode",
                    "HTTP Error $statusCode: $errorBody"
                )
            }
        }
    }
} 