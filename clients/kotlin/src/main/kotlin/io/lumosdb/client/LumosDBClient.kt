package io.lumosdb.client

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.serialization.kotlinx.json.*
import io.lumosdb.client.api.DatabaseClient
import io.lumosdb.client.api.HealthClient
import io.lumosdb.client.api.VectorClient
import kotlinx.serialization.json.Json
import java.io.Closeable

/**
 * LumosDB主客户端类，用于与LumosDB服务器通信
 *
 * @property baseUrl 服务器基础URL (例如: "http://localhost:8080")
 * @property apiKey API密钥 (可选)
 * @property requestTimeout 请求超时时间 (毫秒)
 * @property logLevel 日志级别
 */
class LumosDBClient(
    val baseUrl: String,
    val apiKey: String? = null,
    val requestTimeout: Long = 30000,
    val logLevel: LogLevel = LogLevel.NONE
) : Closeable {

    // 内部HTTP客户端
    private val httpClient = HttpClient(CIO) {
        install(ContentNegotiation) {
            json(Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            })
        }

        if (logLevel != LogLevel.NONE) {
            install(Logging) {
                logger = Logger.DEFAULT
                level = logLevel
            }
        }

        install(HttpTimeout) {
            requestTimeoutMillis = requestTimeout
        }

        defaultRequest {
            if (apiKey != null) {
                headers.append("Authorization", "Bearer $apiKey")
            }
        }
    }

    // API客户端
    val health = HealthClient(httpClient, "$baseUrl/api")
    val db = DatabaseClient(httpClient, "$baseUrl/api")
    val vector = VectorClient(httpClient, "$baseUrl/api")

    /**
     * 关闭客户端并释放资源
     */
    override fun close() {
        httpClient.close()
    }
} 