use lumosdb_client::{LumosDbClient, VectorSearchOptions, Result};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<()> {
    println!("=== LumosDB Rust Client Validation ===");
    
    // 1. 创建客户端并连接
    println!("\n[1] 创建客户端...");
    let client = LumosDbClient::new("http://localhost:8080");
    
    // 2. 健康检查
    println!("\n[2] 执行健康检查...");
    let health = client.health().check().await?;
    println!("服务状态: {}, 版本: {}", health.status, health.version);
    
    // 3. 列出现有集合
    println!("\n[3] 列出现有集合...");
    let collections = client.db().list_collections().await?;
    println!("现有集合: {:?}", collections);
    
    // 4. 创建测试集合
    let test_collection_name = "rust_client_validation_test_collection";
    println!("\n[4] 创建测试集合 '{}'...", test_collection_name);
    
    // 先检查是否存在同名集合，如果存在就删除
    if collections.contains(&test_collection_name.to_string()) {
        println!("集合 '{}' 已存在，正在删除...", test_collection_name);
        client.db().delete_collection(test_collection_name).await?;
    }
    
    // 创建新集合
    client.db().create_collection(test_collection_name, 4).await?;
    println!("集合 '{}' 创建成功", test_collection_name);
    
    // 5. 添加向量
    println!("\n[5] 添加测试向量...");
    let test_vector_id = "rust_test_vector";
    let test_vector = vec![0.1, 0.2, 0.3, 0.4];
    
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let mut test_metadata = HashMap::new();
    test_metadata.insert("test".to_string(), json!(true));
    test_metadata.insert("source".to_string(), json!("rust_validation"));
    test_metadata.insert("timestamp".to_string(), json!(timestamp));
    
    let vector_client = client.vector(test_collection_name);
    vector_client.insert(
        test_vector_id.to_string(),
        test_vector.clone(),
        Some(test_metadata),
        None,
    ).await?;
    
    println!("向量 '{}' 添加成功", test_vector_id);
    
    // 6. 搜索向量
    println!("\n[6] 搜索向量...");
    let search_options = VectorSearchOptions {
        top_k: Some(5),
        score_threshold: Some(0.1),
        filter: None,
        namespace: None,
    };
    
    let results = vector_client.search(test_vector.clone(), Some(search_options)).await?;
    
    println!("找到 {} 个匹配结果:", results.matches.len());
    for (i, match_result) in results.matches.iter().enumerate() {
        println!("  {}. ID: {}, 得分: {:.6}", i+1, match_result.id, match_result.score);
    }
    
    // 7. 更新向量
    println!("\n[7] 更新向量...");
    let updated_vector = vec![0.2, 0.3, 0.4, 0.5];
    
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    
    let mut updated_metadata = HashMap::new();
    updated_metadata.insert("test".to_string(), json!(true));
    updated_metadata.insert("source".to_string(), json!("rust_validation"));
    updated_metadata.insert("updated".to_string(), json!(true));
    updated_metadata.insert("timestamp".to_string(), json!(timestamp));
    
    vector_client.update(
        test_vector_id.to_string(),
        Some(updated_vector),
        Some(updated_metadata),
        None,
    ).await?;
    
    println!("向量 '{}' 更新成功", test_vector_id);
    
    // 8. 删除向量
    println!("\n[8] 删除向量...");
    vector_client.delete(test_vector_id.to_string(), None).await?;
    println!("向量 '{}' 删除成功", test_vector_id);
    
    // 9. 删除测试集合
    println!("\n[9] 删除测试集合 '{}'...", test_collection_name);
    client.db().delete_collection(test_collection_name).await?;
    println!("集合 '{}' 删除成功", test_collection_name);
    
    println!("\n=== Rust客户端验证完成，所有操作成功 ===");
    
    Ok(())
}