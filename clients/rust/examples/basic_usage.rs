use lumos_db::LumosDbClient;
use std::collections::HashMap;
use std::error::Error;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    // 创建LumosDB客户端
    let client = LumosDbClient::new("http://localhost:8000");
    
    // 可选：设置API密钥（如果服务器需要认证）
    // let client = client.with_api_key("your-api-key");
    
    // 检查服务健康状态
    println!("正在检查服务健康状态...");
    let health = client.health().check().await?;
    println!("服务状态: {}, 版本: {}", health.status, health.version);
    
    let collection_name = "example_collection";
    let dimension = 4;
    
    // 创建一个测试集合
    println!("正在创建集合: {}", collection_name);
    client.db().create_collection(collection_name, dimension).await?;
    
    // 列出所有集合
    println!("正在获取集合列表...");
    let collections = client.db().list_collections().await?;
    println!("可用集合: {:?}", collections);
    
    // 获取向量客户端
    let vector_client = client.vector(collection_name);
    
    // 插入向量
    println!("正在插入向量...");
    let vector_id = "test_vector_1";
    let vector_data = vec![0.1, 0.2, 0.3, 0.4];
    let mut metadata = HashMap::new();
    metadata.insert("type".to_string(), serde_json::Value::String("test".to_string()));
    metadata.insert("source".to_string(), serde_json::Value::String("example".to_string()));
    
    vector_client.insert(
        vector_id.to_string(),
        vector_data.clone(),
        Some(metadata),
        None, // 无命名空间
    ).await?;
    println!("向量已插入: {}", vector_id);
    
    // 搜索向量
    println!("正在搜索相似向量...");
    let search_vector = vec![0.1, 0.2, 0.3, 0.4];
    let search_options = lumos_db::types::VectorSearchOptions {
        top_k: Some(5),
        score_threshold: Some(0.5),
        filter: None,
        namespace: None,
    };
    
    let search_results = vector_client.search(search_vector, Some(search_options)).await?;
    println!("搜索结果: {:?}", search_results.matches);
    
    // 更新向量
    println!("正在更新向量...");
    let updated_vector = vec![0.2, 0.3, 0.4, 0.5];
    let mut updated_metadata = HashMap::new();
    updated_metadata.insert("type".to_string(), serde_json::Value::String("updated".to_string()));
    
    vector_client.update(
        vector_id.to_string(),
        Some(updated_vector),
        Some(updated_metadata),
        None, // 无命名空间
    ).await?;
    println!("向量已更新: {}", vector_id);
    
    // 删除向量
    println!("正在删除向量...");
    vector_client.delete(vector_id.to_string(), None).await?;
    println!("向量已删除: {}", vector_id);
    
    // 删除集合
    println!("正在删除集合...");
    client.db().delete_collection(collection_name).await?;
    println!("集合已删除: {}", collection_name);
    
    println!("示例运行完成");
    Ok(())
} 