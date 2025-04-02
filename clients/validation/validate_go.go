package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/linchonglin/lumos-db/clients/go/lumos"
)

func main() {
	fmt.Println("=== LumosDB Go Client Validation ===")

	// 创建上下文
	ctx := context.Background()

	// 1. 创建客户端并连接
	fmt.Println("\n[1] 创建客户端...")
	client := lumos.NewClient("http://localhost:8080", lumos.WithTimeout(10*time.Second))

	// 2. 健康检查
	fmt.Println("\n[2] 执行健康检查...")
	health, err := client.Health.Check(ctx)
	if err != nil {
		fmt.Printf("❌ 健康检查失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("服务状态: %s, 版本: %s\n", health.Status, health.Version)

	// 3. 列出现有集合
	fmt.Println("\n[3] 列出现有集合...")
	collections, err := client.Vector.ListCollections(ctx)
	if err != nil {
		fmt.Printf("❌ 列出集合失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("现有集合: %v\n", collections)

	// 4. 创建测试集合 - 使用带时间戳的唯一名称
	timestamp := time.Now().Unix()
	testCollectionName := fmt.Sprintf("go_test_collection_%d", timestamp)
	fmt.Printf("\n[4] 创建测试集合 '%s'...\n", testCollectionName)

	// 创建新集合
	err = client.Vector.CreateCollection(ctx, testCollectionName, 4)
	if err != nil {
		fmt.Printf("❌ 创建集合失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("集合 '%s' 创建成功\n", testCollectionName)

	// 5. 添加向量
	fmt.Println("\n[5] 添加测试向量...")
	testVectorID := "go_test_vector"
	testVector := []float32{0.1, 0.2, 0.3, 0.4}

	testMetadata := map[string]interface{}{
		"test":      true,
		"source":    "go_validation",
		"timestamp": timestamp,
	}

	// 使用批量添加向量API
	err = client.Vector.AddEmbeddings(
		ctx,
		testCollectionName,
		[]string{testVectorID},
		[][]float32{testVector},
		[]map[string]interface{}{testMetadata},
	)
	if err != nil {
		fmt.Printf("❌ 添加向量失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("向量 '%s' 添加成功\n", testVectorID)

	// 6. 搜索向量
	fmt.Println("\n[6] 搜索向量...")
	searchOptions := &lumos.VectorSearchOptions{
		TopK:           5,
		ScoreThreshold: 0.1,
	}

	results, err := client.Vector.Search(ctx, testCollectionName, testVector, searchOptions)
	if err != nil {
		fmt.Printf("❌ 搜索向量失败: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("找到 %d 个匹配结果:\n", len(results))
	for i, match := range results {
		fmt.Printf("  %d. ID: %s, 得分: %.6f\n", i+1, match.ID, match.Score)
	}

	// 7. 获取向量
	fmt.Println("\n[7] 获取向量...")
	vectorData, metadata, err := client.Vector.GetVector(ctx, testCollectionName, testVectorID)
	if err != nil {
		fmt.Printf("警告: 获取向量时出错: %v\n", err)
	} else {
		fmt.Printf("向量内容: %v\n", vectorData)
		fmt.Printf("元数据: %v\n", metadata)
	}

	// 8. 更新向量 (通过删除并重新添加实现)
	fmt.Println("\n[8] 更新向量...")
	updatedVector := []float32{0.2, 0.3, 0.4, 0.5}

	updatedMetadata := map[string]interface{}{
		"test":      true,
		"source":    "go_validation",
		"updated":   true,
		"timestamp": time.Now().Unix(),
	}

	// 先尝试删除旧向量
	err = client.Vector.DeleteVector(ctx, testCollectionName, testVectorID)
	if err != nil {
		fmt.Printf("警告: 删除原向量时出错，将尝试直接添加新向量: %v\n", err)
	} else {
		fmt.Printf("原向量 '%s' 删除成功\n", testVectorID)
	}

	// 添加新向量来实现更新
	err = client.Vector.AddEmbeddings(
		ctx,
		testCollectionName,
		[]string{testVectorID},
		[][]float32{updatedVector},
		[]map[string]interface{}{updatedMetadata},
	)
	if err != nil {
		fmt.Printf("❌ 更新向量失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("向量 '%s' 更新成功\n", testVectorID)

	// 9. 删除测试集合
	fmt.Printf("\n[9] 删除测试集合 '%s'...\n", testCollectionName)
	err = client.Vector.DeleteCollection(ctx, testCollectionName)
	if err != nil {
		fmt.Printf("❌ 删除集合失败: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("集合 '%s' 删除成功\n", testCollectionName)

	fmt.Println("\n=== Go客户端验证完成，所有操作成功 ===")
}
