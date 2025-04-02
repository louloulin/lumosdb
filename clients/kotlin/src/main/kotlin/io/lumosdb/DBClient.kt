package io.lumosdb

import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * 数据库客户端，处理集合管理
 */
class DBClient(private val client: LumosDBClient) {
    private val api = ApiClient(client)

    /**
     * 列出所有集合
     *
     * @return 集合名称列表
     */
    suspend fun listCollections(): List<String> {
        logger.debug { "Listing collections" }
        return api.get("/collections")
    }

    /**
     * 创建新集合
     *
     * @param name 集合名称
     * @param dimension 向量维度
     */
    suspend fun createCollection(name: String, dimension: Int) {
        logger.debug { "Creating collection $name with dimension $dimension" }
        val request = CollectionCreateRequest(name, dimension)
        api.post<CollectionCreateRequest, Unit>("/collections", request)
    }

    /**
     * 删除集合
     *
     * @param name 集合名称
     */
    suspend fun deleteCollection(name: String) {
        logger.debug { "Deleting collection $name" }
        api.delete<Unit>("/collections/$name")
    }

    /**
     * 获取集合信息
     *
     * @param name 集合名称
     * @return 集合信息
     */
    suspend inline fun <reified T> getCollection(name: String): T {
        logger.debug { "Getting collection $name" }
        return api.get("/collections/$name")
    }
} 