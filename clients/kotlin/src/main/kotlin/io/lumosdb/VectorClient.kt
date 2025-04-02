package io.lumosdb

import kotlinx.serialization.json.JsonElement
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * 向量客户端，处理向量操作
 */
class VectorClient(private val client: LumosDBClient) {
    private val api = ApiClient(client)

    /**
     * 搜索向量
     *
     * @param collectionName 集合名称
     * @param vector 查询向量
     * @param options 搜索选项
     * @return 搜索结果
     */
    suspend fun search(
        collectionName: String,
        vector: List<Float>,
        options: VectorSearchOptions? = null
    ): VectorSearchResponse {
        logger.debug { "Searching vectors in collection $collectionName" }
        
        val request = VectorSearchRequest(
            vector = vector,
            topK = options?.topK,
            scoreThreshold = options?.scoreThreshold,
            filter = options?.filter,
            namespace = options?.namespace
        )
        
        return api.post<VectorSearchRequest, VectorSearchResponse>(
            "/collections/$collectionName/vectors/search",
            request
        )
    }

    /**
     * 添加向量
     *
     * @param collectionName 集合名称
     * @param id 向量ID
     * @param vector 向量数据
     * @param metadata 元数据
     * @param namespace 命名空间
     */
    suspend fun add(
        collectionName: String,
        id: String,
        vector: List<Float>,
        metadata: Map<String, JsonElement>? = null,
        namespace: String? = null
    ) {
        logger.debug { "Adding vector to collection $collectionName with ID $id" }
        
        val request = VectorAddRequest(
            id = id,
            vector = vector,
            metadata = metadata,
            namespace = namespace
        )
        
        api.post<VectorAddRequest, Unit>(
            "/collections/$collectionName/vectors",
            request
        )
    }

    /**
     * 更新向量
     *
     * @param collectionName 集合名称
     * @param id 向量ID
     * @param vector 向量数据
     * @param metadata 元数据
     * @param namespace 命名空间
     */
    suspend fun update(
        collectionName: String,
        id: String,
        vector: List<Float>? = null,
        metadata: Map<String, JsonElement>? = null,
        namespace: String? = null
    ) {
        logger.debug { "Updating vector in collection $collectionName with ID $id" }
        
        val request = VectorUpdateRequest(
            id = id,
            vector = vector,
            metadata = metadata,
            namespace = namespace
        )
        
        api.post<VectorUpdateRequest, Unit>(
            "/collections/$collectionName/vectors/update",
            request
        )
    }

    /**
     * 删除向量
     *
     * @param collectionName 集合名称
     * @param id 向量ID
     * @param namespace 命名空间
     */
    suspend fun delete(
        collectionName: String,
        id: String,
        namespace: String? = null
    ) {
        logger.debug { "Deleting vector from collection $collectionName with ID $id" }
        
        val request = VectorDeleteRequest(
            id = id,
            namespace = namespace
        )
        
        api.post<VectorDeleteRequest, Unit>(
            "/collections/$collectionName/vectors/delete",
            request
        )
    }
}