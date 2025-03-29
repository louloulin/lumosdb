use std::path::Path;
use std::fs;
use lumos_server::db::VectorExecutor;

#[tokio::test]
async fn test_vector_basic_operations() {
    // 设置测试向量数据库
    let db_path = "test_vector.sqlite";
    
    // 确保测试开始前删除可能存在的测试数据库
    if Path::new(db_path).exists() {
        fs::remove_file(db_path).expect("Failed to remove existing test vector database");
    }
    
    // 创建向量执行器
    let executor = VectorExecutor::new(db_path).expect("Failed to create vector executor");
    
    // 测试创建向量集合
    let collection_name = "test_collection";
    let vector_size = 3; // 使用小向量以简化测试
    let distance = "euclidean"; // 欧几里得距离
    
    executor.create_collection(collection_name.to_string(), vector_size, distance.to_string())
        .await
        .expect("Failed to create vector collection");
    
    // 测试添加向量
    let vectors = vec![
        (vec![1.0, 2.0, 3.0], serde_json::json!({"id": 1, "name": "vector1"})),
        (vec![4.0, 5.0, 6.0], serde_json::json!({"id": 2, "name": "vector2"})),
        (vec![7.0, 8.0, 9.0], serde_json::json!({"id": 3, "name": "vector3"})),
    ];
    
    executor.add_embeddings(collection_name.to_string(), vectors.clone())
        .await
        .expect("Failed to add vectors");
    
    // 测试列出集合
    let collections = executor.list_collections()
        .await
        .expect("Failed to list collections");
    
    assert!(collections.contains(&collection_name.to_string()), 
        "Collection not found in list of collections");
    
    // 测试获取集合信息
    let collection_info = executor.get_collection_info(collection_name.to_string())
        .await
        .expect("Failed to get collection info");
    
    assert_eq!(collection_info.size, vector_size);
    assert_eq!(collection_info.distance, distance);
    
    // 测试相似性搜索
    let query_vector = vec![1.0, 2.0, 3.0]; // 与第一个向量相同
    let search_results = executor.search_similar(
        collection_name.to_string(),
        query_vector,
        2, // 限制结果数量为前2个
    )
    .await
    .expect("Failed to search similar vectors");
    
    assert_eq!(search_results.len(), 2, "Expected 2 search results");
    
    // 第一个结果应该是完全匹配的向量
    let first_result = &search_results[0];
    assert!(first_result.distance < 0.001, "First result should have near-zero distance");
    
    let metadata = first_result.metadata.as_object().unwrap();
    assert_eq!(metadata.get("name").unwrap().as_str().unwrap(), "vector1");
    
    // 测试删除向量集合
    executor.delete_collection(collection_name.to_string())
        .await
        .expect("Failed to delete collection");
    
    // 验证集合已被删除
    let collections = executor.list_collections()
        .await
        .expect("Failed to list collections after deletion");
    
    assert!(!collections.contains(&collection_name.to_string()), 
        "Collection still exists after deletion");
    
    // 清理测试数据
    if Path::new(db_path).exists() {
        fs::remove_file(db_path).expect("Failed to remove test vector database");
    }
}

#[tokio::test]
async fn test_vector_index_operations() {
    // 设置测试向量数据库
    let db_path = "test_vector_index.sqlite";
    
    // 确保测试开始前删除可能存在的测试数据库
    if Path::new(db_path).exists() {
        fs::remove_file(db_path).expect("Failed to remove existing test vector database");
    }
    
    // 创建向量执行器
    let executor = VectorExecutor::new(db_path).expect("Failed to create vector executor");
    
    // 创建向量集合
    let collection_name = "index_test_collection";
    let vector_size = 4;
    let distance = "cosine"; // 余弦相似度
    
    executor.create_collection(collection_name.to_string(), vector_size, distance.to_string())
        .await
        .expect("Failed to create vector collection");
    
    // 添加向量
    let vectors = vec![
        (vec![0.1, 0.2, 0.3, 0.4], serde_json::json!({"id": 1, "name": "vector1"})),
        (vec![0.2, 0.3, 0.4, 0.5], serde_json::json!({"id": 2, "name": "vector2"})),
        (vec![0.3, 0.4, 0.5, 0.6], serde_json::json!({"id": 3, "name": "vector3"})),
        (vec![0.4, 0.5, 0.6, 0.7], serde_json::json!({"id": 4, "name": "vector4"})),
        (vec![0.5, 0.6, 0.7, 0.8], serde_json::json!({"id": 5, "name": "vector5"})),
    ];
    
    executor.add_embeddings(collection_name.to_string(), vectors.clone())
        .await
        .expect("Failed to add vectors");
    
    // 创建索引
    executor.create_index(collection_name.to_string())
        .await
        .expect("Failed to create index");
    
    // 验证索引创建后的搜索功能
    let query_vector = vec![0.1, 0.2, 0.3, 0.4]; // 与第一个向量相同
    let search_results = executor.search_similar(
        collection_name.to_string(),
        query_vector,
        3, // 限制结果数量为前3个
    )
    .await
    .expect("Failed to search similar vectors with index");
    
    assert_eq!(search_results.len(), 3, "Expected 3 search results");
    
    // 验证结果排序是否正确（相似度最高的应该是第一个）
    let distances: Vec<f32> = search_results.iter().map(|result| result.distance).collect();
    assert!(distances[0] <= distances[1] && distances[1] <= distances[2], 
        "Search results not properly sorted by distance");
    
    // 删除索引
    executor.delete_index(collection_name.to_string())
        .await
        .expect("Failed to delete index");
    
    // 清理测试数据
    executor.delete_collection(collection_name.to_string())
        .await
        .expect("Failed to delete collection");
    
    if Path::new(db_path).exists() {
        fs::remove_file(db_path).expect("Failed to remove test vector database");
    }
} 