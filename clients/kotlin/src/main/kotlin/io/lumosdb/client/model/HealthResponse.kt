package io.lumosdb.client.model

import kotlinx.serialization.Serializable

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