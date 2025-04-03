package io.lumosdb.example

import io.lumosdb.LumosDBClient
import io.lumosdb.client.api.VectorSearchOptions
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonPrimitive
import kotlin.time.Duration.Companion.seconds
import mu.KotlinLogging

private val logger = KotlinLogging.logger {}

/**
 * 基本使用示例
 */
fun main() = runBlocking {
    println("LumosDB Kotlin Client Basic Example")
    
    // 创建客户端
    val client = LumosDBClient("http://localhost:8080")
    
    try {
        // 健康检查
        val health = client.health.check()
        println("健康检查: 状态=${health.status}, 版本=${health.version}")
        
        // 获取集合列表
        val collections = client.db.listCollections()
        println("现有集合: $collections")
        
        // 创建测试集合
        val collectionName = "kotlin_example_collection"
        if (collections.contains(collectionName)) {
            println("删除已存在的测试集合")
            client.db.deleteCollection(collectionName)
        }
        
        println("创建测试集合: $collectionName")
        client.db.createCollection(collectionName, dimension = 4)
        
        // 添加向量
        println("添加测试向量")
        val vector1 = listOf(0.1f, 0.2f, 0.3f, 0.4f)
        val metadata1 = mapOf(
            "title" to JsonPrimitive("示例文档1"),
            "category" to JsonPrimitive("测试"),
            "score" to JsonPrimitive(0.95)
        )
        
        client.vector.add(collectionName, "example1", vector1, metadata1)
        
        val vector2 = listOf(0.2f, 0.3f, 0.4f, 0.5f)
        val metadata2 = mapOf(
            "title" to JsonPrimitive("示例文档2"),
            "category" to JsonPrimitive("测试"),
            "score" to JsonPrimitive(0.87)
        )
        
        client.vector.add(collectionName, "example2", vector2, metadata2)
        
        // 执行向量搜索
        println("执行向量搜索")
        val searchOptions = VectorSearchOptions(
            topK = 5, 
            scoreThreshold = 0.5f
        )
        
        val searchVector = listOf(0.15f, 0.25f, 0.35f, 0.45f)
        val results = client.vector.search(collectionName, searchVector, searchOptions)
        
        println("搜索结果:")
        results.matches.forEachIndexed { index, match ->
            println("  ${index+1}. ID: ${match.id}, 分数: ${match.score}")
            match.metadata?.forEach { (key, value) ->
                println("     $key: $value")
            }
        }
        
        // 删除测试集合
        println("删除测试集合")
        client.db.deleteCollection(collectionName)
        
        println("示例完成!")
    } catch (e: Exception) {
        println("错误: ${e.message}")
        e.printStackTrace()
    } finally {
        // 关闭客户端
        client.close()
    }
} 