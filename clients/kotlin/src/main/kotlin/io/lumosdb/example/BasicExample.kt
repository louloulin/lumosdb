package io.lumosdb.example

import io.lumosdb.LumosDBClient
import io.lumosdb.VectorSearchOptions
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonPrimitive
import kotlin.time.Duration.Companion.seconds
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

fun main() = runBlocking {
    // 创建客户端
    val client = LumosDBClient("http://localhost:8000")
    
    try {
        // 检查健康状态
        println("检查服务健康状态...")
        val health = client.health.check()
        println("服务状态: ${health.status}, 版本: ${health.version}")
        
        // 列出集合
        println("获取集合列表...")
        val collections = client.db.listCollections()
        println("集合列表: $collections")
        
        // 创建测试集合
        val collectionName = "kotlin_example_collection"
        val dimension = 4
        
        println("创建测试集合 '$collectionName'...")
        client.db.createCollection(collectionName, dimension)
        
        // 添加向量
        println("添加向量...")
        val vectorId = "test_vector1"
        val vector = listOf(0.1f, 0.2f, 0.3f, 0.4f)
        val metadata = mapOf(
            "type" to JsonPrimitive("test"),
            "source" to JsonPrimitive("kotlin_example")
        )
        
        client.vector.add(collectionName, vectorId, vector, metadata)
        println("向量已添加: $vectorId")
        
        // 搜索向量
        println("搜索向量...")
        val searchOptions = VectorSearchOptions(
            topK = 5,
            scoreThreshold = 0.5f
        )
        
        val searchResults = client.vector.search(collectionName, vector, searchOptions)
        
        println("搜索结果:")
        searchResults.matches.forEachIndexed { index, match ->
            println("  ${index+1}. ID: ${match.id}, 得分: ${match.score}")
        }
        
        // 更新向量
        println("更新向量...")
        val updatedVector = listOf(0.2f, 0.3f, 0.4f, 0.5f)
        val updatedMetadata = mapOf(
            "type" to JsonPrimitive("test"),
            "source" to JsonPrimitive("kotlin_example"),
            "updated" to JsonPrimitive(true),
            "timestamp" to JsonPrimitive(System.currentTimeMillis())
        )
        
        client.vector.update(collectionName, vectorId, updatedVector, updatedMetadata)
        println("向量已更新: $vectorId")
        
        // 删除向量
        println("删除向量...")
        client.vector.delete(collectionName, vectorId)
        println("向量已删除: $vectorId")
        
        // 删除集合
        println("删除集合...")
        client.db.deleteCollection(collectionName)
        println("集合已删除: $collectionName")
        
    } catch (e: Exception) {
        logger.error(e) { "发生错误" }
    } finally {
        // 关闭客户端
        client.close()
        println("示例完成")
    }
} 