# LumosDB Kotlin SDK

[LumosDB](https://github.com/linchonglin/lumos-db) 的Kotlin客户端库，用于向量搜索和向量数据管理。

## 功能特点

- 协程支持
- Kotlin原生API设计
- 完整类型支持
- 向量搜索、插入、更新和删除
- 集合管理
- 健康检查

## 安装

### Gradle (Kotlin DSL)

```kotlin
dependencies {
    implementation("io.lumosdb:lumosdb-kotlin:0.1.0")
}
```

### Gradle (Groovy)

```groovy
dependencies {
    implementation 'io.lumosdb:lumosdb-kotlin:0.1.0'
}
```

### Maven

```xml
<dependency>
    <groupId>io.lumosdb</groupId>
    <artifactId>lumosdb-kotlin</artifactId>
    <version>0.1.0</version>
</dependency>
```

## 快速开始

```kotlin
import io.lumosdb.LumosDBClient
import io.lumosdb.VectorSearchOptions
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.JsonPrimitive

fun main() = runBlocking {
    // 创建客户端
    val client = LumosDBClient("http://localhost:8000")
    
    try {
        // 可选：设置API密钥
        // client.setApiKey("your-api-key")
        
        // 检查健康状态
        val health = client.health.check()
        println("服务状态: ${health.status}, 版本: ${health.version}")
        
        // 列出集合
        val collections = client.db.listCollections()
        println("集合列表: $collections")
        
        // 创建集合
        client.db.createCollection("test_collection", 4)
        
        // 添加向量
        val vectorId = "test_vector1"
        val vector = listOf(0.1f, 0.2f, 0.3f, 0.4f)
        val metadata = mapOf(
            "type" to JsonPrimitive("test")
        )
        
        client.vector.add("test_collection", vectorId, vector, metadata)
        
        // 搜索向量
        val searchOptions = VectorSearchOptions(
            topK = 5,
            scoreThreshold = 0.5f
        )
        
        val results = client.vector.search("test_collection", vector, searchOptions)
        
        results.matches.forEach { match ->
            println("匹配项: ID=${match.id}, 得分=${match.score}")
        }
    } finally {
        // 关闭客户端
        client.close()
    }
}
```

更多示例请参考 [examples](./src/main/kotlin/io/lumosdb/example) 目录。

## API概览

### 客户端设置

```kotlin
// 创建客户端
val client = LumosDBClient("http://localhost:8000")

// 设置API密钥
client.setApiKey("your-api-key")

// 自定义HTTP客户端选项
val client = LumosDBClient(
    baseUrl = "http://localhost:8000",
    httpClient = LumosDBClient.createDefaultHttpClient(
        timeout = 10.seconds,
        logLevel = LogLevel.BODY
    )
)
```

### 集合操作

```kotlin
// 列出所有集合
val collections = client.db.listCollections()

// 创建集合
client.db.createCollection("collection_name", 4)

// 删除集合
client.db.deleteCollection("collection_name")

// 获取集合信息
val collectionInfo = client.db.getCollection<Map<String, JsonElement>>("collection_name")
```

### 向量操作

```kotlin
// 添加向量
client.vector.add(
    collectionName = "collection_name",
    id = "vector_id",
    vector = listOf(0.1f, 0.2f, 0.3f, 0.4f),
    metadata = mapOf("key" to JsonPrimitive("value")),
    namespace = "default"
)

// 更新向量
client.vector.update(
    collectionName = "collection_name",
    id = "vector_id",
    vector = listOf(0.2f, 0.3f, 0.4f, 0.5f),
    metadata = mapOf("key" to JsonPrimitive("new_value"))
)

// 删除向量
client.vector.delete("collection_name", "vector_id")

// 搜索向量
val options = VectorSearchOptions(
    topK = 10,
    scoreThreshold = 0.7f,
    filter = mapOf("key" to JsonPrimitive("value"))
)

val results = client.vector.search(
    collectionName = "collection_name",
    vector = listOf(0.1f, 0.2f, 0.3f, 0.4f),
    options = options
)
```

### 健康检查

```kotlin
// 检查健康状态
val health = client.health.check()
println("状态: ${health.status}, 版本: ${health.version}")
```

## 错误处理

SDK使用了Kotlin协程和异常处理机制：

```kotlin
try {
    client.vector.search("collection_name", vector, options)
} catch (e: ApiException) {
    println("API错误: 代码=${e.code}, 消息=${e.message}")
} catch (e: Exception) {
    println("其他错误: ${e.message}")
}
```

## 日志

SDK使用 `kotlin-logging` 库进行日志记录。要配置日志输出，请在项目中添加适当的SLF4J实现（例如Logback）。

## 许可证

MIT

## 贡献

欢迎提交问题和Pull Request! 