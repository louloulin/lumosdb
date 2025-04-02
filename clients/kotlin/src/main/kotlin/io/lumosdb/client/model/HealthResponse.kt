package io.lumosdb.client.model

import kotlinx.serialization.Serializable

/**
 * 健康检查响应对象
 *
 * @property status 服务状态 (例如: "ok", "error")
 * @property version 服务器版本
 * @property uptime 服务器运行时间 (可选)
 * @property cpu_usage CPU使用率 (可选)
 * @property memory_usage 内存使用量 (可选)
 * @property connections 连接数 (可选)
 */
@Serializable
data class HealthResponse(
    val status: String,
    val version: String,
    val uptime: Long? = null,
    val cpu_usage: Float? = null,
    val memory_usage: Long? = null,
    val connections: Int? = null
) 