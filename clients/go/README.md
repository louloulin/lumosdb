# LumosDB Go SDK

[LumosDB](https://github.com/linchonglin/lumos-db) 的Go客户端库，用于向量搜索和向量数据管理。

## 功能特点

- 简洁的API设计
- 完整的类型支持
- 向量搜索、插入、更新和删除
- 集合管理
- 健康检查

## 安装

```bash
go get github.com/linchonglin/lumos-db/clients/go
```

## 快速开始

```go
package main

import (
	"fmt"
	"log"

	"github.com/linchonglin/lumos-db/clients/go/lumos"
)

func main() {
	// 创建客户端
	client := lumos.NewClient("http://localhost:8000")

	// 可选：设置API密钥
	// client.SetAPIKey("your-api-key")

	// 检查健康状态
	health, err := client.Health.Check()
	if err != nil {
		log.Fatalf("健康检查失败: %v", err)
	}
	fmt.Printf("服务状态: %s, 版本: %s\n", health.Status, health.Version)

	// 列出集合
	collections, err := client.DB.ListCollections()
	if err != nil {
		log.Fatalf("获取集合列表失败: %v", err)
	}
	fmt.Printf("集合列表: %v\n", collections)

	// 创建集合
	err = client.DB.CreateCollection("test_collection", 4)
	if err != nil {
		log.Fatalf("创建集合失败: %v", err)
	}

	// 添加向量
	vectorID := "test_vector1"
	vector := []float64{0.1, 0.2, 0.3, 0.4}
	metadata := map[string]interface{}{
		"type": "test",
	}

	err = client.Vector.Add("test_collection", vectorID, vector, metadata, "")
	if err != nil {
		log.Fatalf("添加向量失败: %v", err)
	}

	// 搜索向量
	topK := 5
	searchOptions := &lumos.VectorSearchOptions{
		TopK: &topK,
	}

	results, err := client.Vector.Search("test_collection", vector, searchOptions)
	if err != nil {
		log.Fatalf("搜索向量失败: %v", err)
	}

	for _, match := range results.Matches {
		fmt.Printf("匹配项: ID=%s, 得分=%.6f\n", match.ID, match.Score)
	}
}
```

更多示例请查看 [examples](./examples) 目录。

## API概览

### 客户端设置

```go
// 创建客户端
client := lumos.NewClient("http://localhost:8000")

// 设置API密钥
client.SetAPIKey("your-api-key")

// 使用选项创建客户端
client := lumos.NewClient(
    "http://localhost:8000",
    lumos.WithAPIKey("your-api-key"),
    lumos.WithTimeout(10*time.Second),
)
```

### 集合操作

```go
// 列出所有集合
collections, err := client.DB.ListCollections()

// 创建集合
err = client.DB.CreateCollection("collection_name", 4)

// 删除集合
err = client.DB.DeleteCollection("collection_name")

// 获取集合信息
var collectionInfo map[string]interface{}
err = client.DB.GetCollection("collection_name", &collectionInfo)
```

### 向量操作

```go
// 添加向量
err = client.Vector.Add(
    "collection_name",
    "vector_id",
    []float64{0.1, 0.2, 0.3, 0.4},
    map[string]interface{}{"key": "value"},
    "namespace",
)

// 更新向量
err = client.Vector.Update(
    "collection_name",
    "vector_id",
    []float64{0.2, 0.3, 0.4, 0.5},
    map[string]interface{}{"key": "new_value"},
    "namespace",
)

// 删除向量
err = client.Vector.Delete("collection_name", "vector_id", "namespace")

// 搜索向量
topK := 10
threshold := 0.7
searchOptions := &lumos.VectorSearchOptions{
    TopK:           &topK,
    ScoreThreshold: &threshold,
    Filter:         map[string]interface{}{"key": "value"},
    Namespace:      nil, // 或者指定命名空间
}

results, err := client.Vector.Search(
    "collection_name",
    []float64{0.1, 0.2, 0.3, 0.4},
    searchOptions,
)
```

### 健康检查

```go
// 检查健康状态
health, err := client.Health.Check()
fmt.Printf("状态: %s, 版本: %s\n", health.Status, health.Version)
```

## 错误处理

SDK中的所有方法都返回错误作为最后一个返回值，允许您检查操作是否成功。

```go
results, err := client.Vector.Search("collection_name", vector, searchOptions)
if err != nil {
    // 处理错误
    if strings.Contains(err.Error(), "API error") {
        // 处理API错误
    } else {
        // 处理其他错误
    }
    return
}

// 使用结果
for _, match := range results.Matches {
    // ...
}
```

## 许可证

MIT

## 贡献

欢迎提交问题和Pull Request! 