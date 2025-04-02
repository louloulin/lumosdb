package main

import (
	"fmt"
	"log"
	"time"

	"github.com/linchonglin/lumos-db/clients/go/lumos"
)

func main() {
	// 创建客户端
	client := lumos.NewClient(
		"http://localhost:8000",
		lumos.WithTimeout(10*time.Second),
	)

	// 检查健康状态
	fmt.Println("检查服务健康状态...")
	health, err := client.Health.Check()
	if err != nil {
		log.Fatalf("健康检查失败: %v", err)
	}
	fmt.Printf("服务状态: %s, 版本: %s\n", health.Status, health.Version)

	// 列出集合
	fmt.Println("获取集合列表...")
	collections, err := client.DB.ListCollections()
	if err != nil {
		log.Fatalf("获取集合列表失败: %v", err)
	}
	fmt.Printf("集合列表: %v\n", collections)

	// 创建测试集合
	collectionName := "go_example_collection"
	dimension := 4

	fmt.Printf("创建测试集合 '%s'...\n", collectionName)
	err = client.DB.CreateCollection(collectionName, dimension)
	if err != nil {
		log.Fatalf("创建集合失败: %v", err)
	}

	// 添加向量
	fmt.Println("添加向量...")
	vectorID := "test_vector1"
	vector := []float64{0.1, 0.2, 0.3, 0.4}
	metadata := map[string]interface{}{
		"type":   "test",
		"source": "go_example",
	}

	err = client.Vector.Add(collectionName, vectorID, vector, metadata, "")
	if err != nil {
		log.Fatalf("添加向量失败: %v", err)
	}
	fmt.Printf("向量已添加: %s\n", vectorID)

	// 搜索向量
	fmt.Println("搜索向量...")
	topK := 5
	searchOptions := &lumos.VectorSearchOptions{
		TopK: &topK,
	}

	searchResults, err := client.Vector.Search(collectionName, vector, searchOptions)
	if err != nil {
		log.Fatalf("搜索向量失败: %v", err)
	}

	fmt.Println("搜索结果:")
	for i, match := range searchResults.Matches {
		fmt.Printf("  %d. ID: %s, 得分: %.6f\n", i+1, match.ID, match.Score)
	}

	// 更新向量
	fmt.Println("更新向量...")
	updatedVector := []float64{0.2, 0.3, 0.4, 0.5}
	updatedMetadata := map[string]interface{}{
		"type":      "test",
		"source":    "go_example",
		"updated":   true,
		"timestamp": time.Now().Unix(),
	}

	err = client.Vector.Update(collectionName, vectorID, updatedVector, updatedMetadata, "")
	if err != nil {
		log.Fatalf("更新向量失败: %v", err)
	}
	fmt.Printf("向量已更新: %s\n", vectorID)

	// 删除向量
	fmt.Println("删除向量...")
	err = client.Vector.Delete(collectionName, vectorID, "")
	if err != nil {
		log.Fatalf("删除向量失败: %v", err)
	}
	fmt.Printf("向量已删除: %s\n", vectorID)

	// 删除集合
	fmt.Println("删除集合...")
	err = client.DB.DeleteCollection(collectionName)
	if err != nil {
		log.Fatalf("删除集合失败: %v", err)
	}
	fmt.Printf("集合已删除: %s\n", collectionName)

	fmt.Println("示例完成")
}
