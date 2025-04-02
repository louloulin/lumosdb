package io.lumosdb

import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * 健康检查客户端，处理健康状态检查
 */
class HealthClient(private val client: LumosDBClient) {
    private val api = ApiClient(client)

    /**
     * 检查服务健康状态
     *
     * @return 健康状态信息
     */
    suspend fun check(): HealthResponse {
        logger.debug { "Checking health status" }
        return api.get("/health")
    }
}