package io.lumosdb

import io.ktor.client.*
import io.ktor.client.engine.cio.*
import io.ktor.client.plugins.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.plugins.logging.*
import io.ktor.serialization.kotlinx.json.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.serialization.json.Json
import mu.KotlinLogging
import kotlin.time.Duration
import kotlin.time.Duration.Companion.seconds

private val logger = KotlinLogging.logger {}

/**
 * 主LumosDB客户端类
 *
 * @property baseUrl API服务器的基础URL
 * @property apiKey 可选的API密钥
 * @property httpClient Ktor HTTP客户端
 * @property scope 协程作用域
 */
class LumosDBClient(
    val baseUrl: String,
    var apiKey: String? = null,
    val httpClient: HttpClient = createDefaultHttpClient(),
    val scope: CoroutineScope = CoroutineScope(Dispatchers.IO)
) {
    /**
     * 数据库服务
     */
    val db = DBClient(this)

    /**
     * 向量服务
     */
    val vector = VectorClient(this)
    
    /**
     * 健康检查服务
     */
    val health = HealthClient(this)

    /**
     * 设置API密钥
     *
     * @param apiKey 新的API密钥
     */
    fun setApiKey(apiKey: String) {
        this.apiKey = apiKey
    }

    /**
     * 关闭客户端资源
     */
    fun close() {
        httpClient.close()
    }

    companion object {
        /**
         * 创建默认HTTP客户端
         */
        fun createDefaultHttpClient(
            timeout: Duration = 30.seconds,
            logLevel: LogLevel = LogLevel.INFO
        ): HttpClient {
            return HttpClient(CIO) {
                install(HttpTimeout) {
                    requestTimeoutMillis = timeout.inWholeMilliseconds
                    connectTimeoutMillis = (timeout.inWholeMilliseconds / 2)
                }
                
                install(ContentNegotiation) {
                    json(Json {
                        ignoreUnknownKeys = true
                        prettyPrint = false
                        isLenient = true
                    })
                }
                
                install(Logging) {
                    level = logLevel
                    logger = object : io.ktor.client.plugins.logging.Logger {
                        override fun log(message: String) {
                            io.lumosdb.logger.debug { message }
                        }
                    }
                }
                
                engine {
                    requestTimeout = timeout.inWholeMilliseconds
                }
            }
        }
    }
} 