use anyhow::Result;
use serde_json::json;
use simple_logger::SimpleLogger;
use std::collections::HashMap;
use vector_test::{Document, DistanceMetric, VectorStore};

fn main() -> Result<()> {
    // 初始化日志
    SimpleLogger::new()
        .with_level(log::LevelFilter::Info)
        .init()?;
    
    log::info!("开始向量存储测试...");

    // 使用内存数据库创建向量存储
    let mut store = VectorStore::new_in_memory()?;
    
    // 创建示例文档
    let docs = vec![
        Document {
            id: "doc-1".to_string(),
            vector: vec![0.1, 0.2, 0.3, 0.4, 0.5],
            metadata: metadata_map(&[
                ("title", "机器学习入门"),
                ("category", "AI"),
                ("tags", "ml,beginner"),
            ]),
        },
        Document {
            id: "doc-2".to_string(),
            vector: vec![0.2, 0.3, 0.4, 0.5, 0.6],
            metadata: metadata_map(&[
                ("title", "深度学习概述"),
                ("category", "AI"),
                ("tags", "dl,neural-networks"),
            ]),
        },
        Document {
            id: "doc-3".to_string(),
            vector: vec![0.5, 0.5, 0.5, 0.5, 0.5],
            metadata: metadata_map(&[
                ("title", "大模型架构"),
                ("category", "AI"),
                ("tags", "llm,transformer"),
            ]),
        },
        Document {
            id: "doc-4".to_string(),
            vector: vec![0.9, 0.8, 0.7, 0.6, 0.5],
            metadata: metadata_map(&[
                ("title", "数据库设计"),
                ("category", "DB"),
                ("tags", "database,design"),
            ]),
        },
    ];
    
    // 批量添加文档
    store.add_batch(&docs)?;
    
    // 显示文档数量
    log::info!("文档数量: {}", store.count()?);
    
    // ID查询
    let doc = store.get("doc-3")?;
    if let Some(doc) = doc {
        log::info!("找到文档: id={}, title={}", 
            doc.id, 
            doc.metadata.get("title").and_then(|v| v.as_str()).unwrap_or("未知")
        );
    }
    
    // 余弦相似度搜索
    log::info!("\n--- 余弦相似度搜索 ---");
    let query = vec![0.2, 0.3, 0.4, 0.5, 0.6]; // 与doc-2完全匹配
    let results = store.search(&query, 3, DistanceMetric::Cosine)?;
    
    for (doc, distance) in results {
        log::info!("找到文档: id={}, title={}, 距离={:.6}", 
            doc.id, 
            doc.metadata.get("title").and_then(|v| v.as_str()).unwrap_or("未知"),
            distance
        );
    }
    
    // 欧几里得距离搜索
    log::info!("\n--- 欧几里得距离搜索 ---");
    let query = vec![0.5, 0.5, 0.5, 0.5, 0.5]; // 与doc-3完全匹配
    let results = store.search(&query, 3, DistanceMetric::Euclidean)?;
    
    for (doc, distance) in results {
        log::info!("找到文档: id={}, title={}, 距离={:.6}", 
            doc.id, 
            doc.metadata.get("title").and_then(|v| v.as_str()).unwrap_or("未知"),
            distance
        );
    }
    
    // 条件过滤 + 向量搜索
    log::info!("\n--- 过滤 + 向量搜索 ---");
    let query = vec![0.2, 0.3, 0.4, 0.5, 0.6];
    let filter_sql = "json_extract(metadata, '$.category') = ?";
    let category = "AI";
    let filter_params: Vec<&dyn rusqlite::ToSql> = vec![&category];
    
    let results = store.search_with_filter(
        &query, 
        filter_sql, 
        &filter_params, 
        5, 
        DistanceMetric::Cosine
    )?;
    
    log::info!("过滤条件: category = {}", category);
    for (doc, distance) in results {
        log::info!("找到文档: id={}, title={}, 距离={:.6}", 
            doc.id, 
            doc.metadata.get("title").and_then(|v| v.as_str()).unwrap_or("未知"),
            distance
        );
    }
    
    log::info!("测试完成！");
    
    Ok(())
}

fn metadata_map(pairs: &[(&str, &str)]) -> HashMap<String, serde_json::Value> {
    let mut map = HashMap::new();
    for (key, value) in pairs {
        map.insert(key.to_string(), json!(value));
    }
    map
}