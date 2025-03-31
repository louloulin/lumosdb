use anyhow::{Result, anyhow};
use lumos_dataflow::vector_store::{
    VectorStore, VectorStoreConfig, VectorSearchResult,
    DistanceMetric, IndexType,
    factory::create_vector_store,
};
use serde_json::Value;
use simple_logger::SimpleLogger;
use std::collections::HashMap;
use std::sync::Arc;
use clap::{Arg, App};

/// 向量存储测试示例
/// 测试向量存储的基本功能，包括存储、检索和相似性搜索
#[tokio::main]
async fn main() -> Result<()> {
    // 初始化日志
    SimpleLogger::new()
        .with_level(log::LevelFilter::Debug)
        .init()?;

    // 解析命令行参数
    let matches = App::new("Vector Store Test")
        .version("0.1.0")
        .author("Lumos DB Team")
        .about("测试向量存储功能")
        .arg(Arg::new("store-type")
            .short('t')
            .long("type")
            .value_name("TYPE")
            .help("向量存储类型 (sqlite, duckdb, memory)")
            .default_value("sqlite"))
        .arg(Arg::new("dimensions")
            .short('d')
            .long("dimensions")
            .value_name("DIMENSIONS")
            .help("向量维度")
            .default_value("5"))
        .arg(Arg::new("db-path")
            .short('p')
            .long("path")
            .value_name("PATH")
            .help("数据库路径")
            .default_value("./vectors.db"))
        .get_matches();

    let store_type = matches.value_of("store-type").unwrap();
    let dimensions = matches.value_of("dimensions").unwrap().parse::<usize>()?;
    let db_path = matches.value_of("db-path").unwrap();

    // 创建向量存储配置
    let config = VectorStoreConfig {
        dimensions,
        distance_metric: DistanceMetric::Cosine,
        index_type: IndexType::Flat,
        index_params: HashMap::new(),
        path: Some(db_path.to_string()),
        table_name: "test_vectors".to_string(),
        extra: HashMap::new(),
    };

    // 创建向量存储
    let store = create_vector_store(store_type, config)?;

    // 测试向量存储功能
    log::info!("开始测试向量存储功能: {}", store_type);
    test_vector_store(store).await?;
    
    log::info!("向量存储测试完成!");
    Ok(())
}

/// 测试向量存储的基本功能
async fn test_vector_store(store: Arc<dyn VectorStore>) -> Result<()> {
    // 清理测试数据
    let count_before = store.count()?;
    log::info!("开始前向量数量: {}", count_before);

    // 创建测试向量
    let vectors = generate_test_vectors(100, store.count()?)?;
    log::info!("生成测试向量: {} 条", vectors.len());

    // 添加向量
    for (id, vector, metadata) in &vectors {
        store.add_vector(id, vector.clone(), metadata.clone())?;
    }

    // 验证向量数量
    let count_after = store.count()?;
    log::info!("添加后向量数量: {}", count_after);
    assert_eq!(count_after, count_before + vectors.len());

    // 测试获取向量
    let (id, _, _) = &vectors[0];
    let result = store.get_by_id(id)?;
    if let Some(vector) = result {
        log::info!("成功获取向量: id={}, 分数={}", vector.id, vector.score);
    } else {
        return Err(anyhow!("无法获取向量: {}", id));
    }

    // 测试相似度搜索
    let query = vec![0.1, 0.2, 0.3, 0.4, 0.5]; // 示例查询向量
    let results = store.search(&query, 5)?;
    log::info!("相似度搜索结果: {} 条", results.len());
    
    for (i, result) in results.iter().enumerate() {
        log::info!("结果 #{}: id={}, 分数={:.4}", i+1, result.id, result.score);
    }

    // 测试元数据过滤
    let mut filter = HashMap::new();
    filter.insert("category".to_string(), Value::String("test".to_string()));
    
    let filtered_results = store.search_with_filter(&query, filter, 5)?;
    log::info!("过滤后的结果: {} 条", filtered_results.len());

    // 测试删除向量
    let (id_to_delete, _, _) = &vectors[0];
    let deleted = store.delete_by_id(id_to_delete)?;
    log::info!("删除向量结果: {}", deleted);
    
    // 验证删除后数量
    let count_after_delete = store.count()?;
    log::info!("删除后向量数量: {}", count_after_delete);
    assert_eq!(count_after_delete, count_after - 1);

    Ok(())
}

/// 生成测试向量数据
fn generate_test_vectors(
    count: usize,
    start_id: usize,
) -> Result<Vec<(String, Vec<f32>, HashMap<String, Value>)>> {
    let mut vectors = Vec::with_capacity(count);
    
    for i in 0..count {
        let id = format!("test-{}", start_id + i);
        
        // 生成随机向量
        let vector = vec![
            rand_float(),
            rand_float(),
            rand_float(),
            rand_float(),
            rand_float(),
        ];
        
        // 生成元数据
        let mut metadata = HashMap::new();
        metadata.insert("title".to_string(), Value::String(format!("测试文档 {}", i)));
        metadata.insert("category".to_string(), Value::String("test".to_string()));
        metadata.insert("score".to_string(), Value::Number((i as f64).into()));
        metadata.insert("tags".to_string(), Value::Array(vec![
            Value::String("tag1".to_string()),
            Value::String("tag2".to_string()),
        ]));
        
        vectors.push((id, vector, metadata));
    }
    
    Ok(vectors)
}

/// 生成0-1之间的随机浮点数
fn rand_float() -> f32 {
    use std::time::{SystemTime, UNIX_EPOCH};
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("Time went backwards")
        .subsec_nanos();
    
    (now % 1000) as f32 / 1000.0
} 