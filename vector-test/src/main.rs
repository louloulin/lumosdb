use anyhow::Result;
use rusqlite::{Connection, params};
use serde_json::Value;
use std::collections::HashMap;
use simple_logger::SimpleLogger;

fn main() -> Result<()> {
    // 初始化日志
    SimpleLogger::new()
        .with_level(log::LevelFilter::Debug)
        .init()?;
    
    log::info!("=== 开始测试SQLite向量存储 ===");

    // 创建内存数据库
    let conn = Connection::open("test_vectors.db")?;
    
    // 创建表结构
    conn.execute(
        "CREATE TABLE IF NOT EXISTS vectors (
            id TEXT PRIMARY KEY,
            vector TEXT NOT NULL,
            metadata TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )",
        params![],
    )?;
    
    // 添加向量距离计算函数
    setup_vector_functions(&conn)?;
    
    // 添加测试向量
    log::info!("添加测试向量...");
    
    let test_vectors = vec![
        (
            "doc-1", 
            vec![0.1, 0.2, 0.3, 0.4, 0.5], 
            json_map(&[
                ("title", "机器学习入门"),
                ("category", "AI"),
                ("tags", "machine learning,beginner"),
            ])
        ),
        (
            "doc-2", 
            vec![0.2, 0.3, 0.4, 0.5, 0.6], 
            json_map(&[
                ("title", "深度学习概述"),
                ("category", "AI"),
                ("tags", "deep learning,neural networks"),
            ])
        ),
        (
            "doc-3", 
            vec![0.5, 0.5, 0.5, 0.5, 0.5], 
            json_map(&[
                ("title", "大模型架构"),
                ("category", "AI"),
                ("tags", "LLM,transformer"),
            ])
        ),
        (
            "doc-4", 
            vec![0.9, 0.8, 0.7, 0.6, 0.5], 
            json_map(&[
                ("title", "数据库设计"),
                ("category", "DB"),
                ("tags", "database,design"),
            ])
        ),
        (
            "doc-5", 
            vec![0.8, 0.7, 0.6, 0.5, 0.4], 
            json_map(&[
                ("title", "向量数据库简介"),
                ("category", "DB"),
                ("tags", "vector database,similarity search"),
            ])
        ),
    ];
    
    // 清空表
    conn.execute("DELETE FROM vectors", params![])?;
    
    // 添加测试数据
    for (id, vector, metadata) in &test_vectors {
        let vector_str = format!("[{}]", vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));
        
        let metadata_json = serde_json::to_string(&metadata)?;
        
        conn.execute(
            "INSERT INTO vectors (id, vector, metadata) VALUES (?1, ?2, ?3)",
            params![id, vector_str, metadata_json],
        )?;
    }
    
    // 查询数据总量
    let count: i64 = conn.query_row("SELECT COUNT(*) FROM vectors", params![], |row| row.get(0))?;
    log::info!("向量总数: {}", count);
    
    // 测试1: 精确查询
    log::info!("\n--- 测试1: 精确查询 ---");
    let id = "doc-3";
    let mut stmt = conn.prepare("SELECT id, vector, metadata FROM vectors WHERE id = ?1")?;
    let mut rows = stmt.query(params![id])?;
    
    if let Some(row) = rows.next()? {
        let id: String = row.get(0)?;
        let vector_str: String = row.get(1)?;
        let metadata_json: String = row.get(2)?;
        
        log::info!("找到向量: id={}", id);
        log::info!("向量数据: {}", vector_str);
        log::info!("元数据: {}", metadata_json);
    } else {
        log::error!("未找到向量");
    }
    
    // 测试2: 相似度搜索
    log::info!("\n--- 测试2: 相似度搜索 ---");
    let query_vector = "[0.2,0.3,0.4,0.5,0.6]"; // 与doc-2完全匹配
    let mut stmt = conn.prepare("
        SELECT id, metadata, cosine_distance(vector, ?1) as distance
        FROM vectors
        ORDER BY distance ASC
        LIMIT 5
    ")?;
    
    let rows = stmt.query_map(params![query_vector], |row| {
        let id: String = row.get(0)?;
        let metadata_json: String = row.get(1)?;
        let distance: f32 = row.get(2)?;
        Ok((id, metadata_json, distance))
    })?;
    
    log::info!("相似度搜索结果:");
    for result in rows {
        let (id, metadata, distance) = result?;
        let metadata_value: HashMap<String, Value> = serde_json::from_str(&metadata)?;
        let title = metadata_value
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("未知标题");
        
        log::info!("  id: {}, 标题: \"{}\", 距离: {:.6}", id, title, distance);
    }
    
    // 测试3: 元数据过滤 + 相似度搜索
    log::info!("\n--- 测试3: 元数据过滤 + 相似度搜索 ---");
    let category = "DB";
    let query_vector = "[0.8,0.7,0.6,0.5,0.4]"; // 与doc-5完全匹配
    
    // 解析元数据JSON来筛选
    let mut stmt = conn.prepare("
        SELECT id, metadata, cosine_distance(vector, ?1) as distance
        FROM vectors
        WHERE json_extract(metadata, '$.category') = ?2
        ORDER BY distance ASC
        LIMIT 5
    ")?;
    
    let rows = stmt.query_map(params![query_vector, category], |row| {
        let id: String = row.get(0)?;
        let metadata_json: String = row.get(1)?;
        let distance: f32 = row.get(2)?;
        Ok((id, metadata_json, distance))
    })?;
    
    log::info!("带类别过滤的相似度搜索结果 (category={})", category);
    for result in rows {
        let (id, metadata, distance) = result?;
        let metadata_value: HashMap<String, Value> = serde_json::from_str(&metadata)?;
        let title = metadata_value
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("未知标题");
        
        log::info!("  id: {}, 标题: \"{}\", 距离: {:.6}", id, title, distance);
    }
    
    // 测试4: 欧几里得距离
    log::info!("\n--- 测试4: 欧几里得距离 ---");
    let query_vector = "[0.5,0.5,0.5,0.5,0.5]"; // 与doc-3完全匹配
    let mut stmt = conn.prepare("
        SELECT id, metadata, l2_distance(vector, ?1) as distance
        FROM vectors
        ORDER BY distance ASC
        LIMIT 5
    ")?;
    
    let rows = stmt.query_map(params![query_vector], |row| {
        let id: String = row.get(0)?;
        let metadata_json: String = row.get(1)?;
        let distance: f32 = row.get(2)?;
        Ok((id, metadata_json, distance))
    })?;
    
    log::info!("欧几里得距离搜索结果:");
    for result in rows {
        let (id, metadata, distance) = result?;
        let metadata_value: HashMap<String, Value> = serde_json::from_str(&metadata)?;
        let title = metadata_value
            .get("title")
            .and_then(|v| v.as_str())
            .unwrap_or("未知标题");
        
        log::info!("  id: {}, 标题: \"{}\", 距离: {:.6}", id, title, distance);
    }
    
    log::info!("\n=== 测试完成! ===");
    Ok(())
}

// 快速创建JSON元数据
fn json_map(pairs: &[(&str, &str)]) -> HashMap<String, Value> {
    let mut map = HashMap::new();
    for (key, value) in pairs {
        map.insert(key.to_string(), Value::String(value.to_string()));
    }
    map
}

// 设置向量距离计算函数
fn setup_vector_functions(conn: &Connection) -> Result<()> {
    // 欧几里得距离
    conn.create_scalar_function(
        "l2_distance",
        2,
        rusqlite::functions::FunctionFlags::SQLITE_UTF8 | rusqlite::functions::FunctionFlags::SQLITE_DETERMINISTIC,
        move |ctx| {
            let vec1: String = ctx.get(0)?;
            let vec2: String = ctx.get(1)?;
            
            let v1 = parse_vector(&vec1)?;
            let v2 = parse_vector(&vec2)?;
            
            if v1.len() != v2.len() {
                return Err(rusqlite::Error::UserFunctionError(Box::new(
                    std::io::Error::new(std::io::ErrorKind::InvalidData, 
                        format!("向量维度不匹配: {} vs {}", v1.len(), v2.len()))
                )));
            }
            
            let sum: f32 = v1.iter()
                .zip(v2.iter())
                .map(|(a, b)| (a - b).powi(2))
                .sum();
            
            Ok(sum.sqrt())
        },
    )?;
    
    // 余弦距离
    conn.create_scalar_function(
        "cosine_distance",
        2,
        rusqlite::functions::FunctionFlags::SQLITE_UTF8 | rusqlite::functions::FunctionFlags::SQLITE_DETERMINISTIC,
        move |ctx| {
            let vec1: String = ctx.get(0)?;
            let vec2: String = ctx.get(1)?;
            
            let v1 = parse_vector(&vec1)?;
            let v2 = parse_vector(&vec2)?;
            
            if v1.len() != v2.len() {
                return Err(rusqlite::Error::UserFunctionError(Box::new(
                    std::io::Error::new(std::io::ErrorKind::InvalidData, 
                        format!("向量维度不匹配: {} vs {}", v1.len(), v2.len()))
                )));
            }
            
            let dot_product: f32 = v1.iter()
                .zip(v2.iter())
                .map(|(a, b)| a * b)
                .sum();
            
            let norm1: f32 = v1.iter().map(|x| x.powi(2)).sum::<f32>().sqrt();
            let norm2: f32 = v2.iter().map(|x| x.powi(2)).sum::<f32>().sqrt();
            
            if norm1 == 0.0 || norm2 == 0.0 {
                return Ok(1.0);
            }
            
            Ok(1.0 - (dot_product / (norm1 * norm2)))
        },
    )?;
    
    // 点积 (负点积作为距离)
    conn.create_scalar_function(
        "dot_product",
        2,
        rusqlite::functions::FunctionFlags::SQLITE_UTF8 | rusqlite::functions::FunctionFlags::SQLITE_DETERMINISTIC,
        move |ctx| {
            let vec1: String = ctx.get(0)?;
            let vec2: String = ctx.get(1)?;
            
            let v1 = parse_vector(&vec1)?;
            let v2 = parse_vector(&vec2)?;
            
            if v1.len() != v2.len() {
                return Err(rusqlite::Error::UserFunctionError(Box::new(
                    std::io::Error::new(std::io::ErrorKind::InvalidData, 
                        format!("向量维度不匹配: {} vs {}", v1.len(), v2.len()))
                )));
            }
            
            let dot_product: f32 = v1.iter()
                .zip(v2.iter())
                .map(|(a, b)| a * b)
                .sum();
            
            // 返回负点积，使其作为距离，越小越相似
            Ok(-dot_product)
        },
    )?;
    
    Ok(())
}

// 解析向量字符串
fn parse_vector(vector_str: &str) -> Result<Vec<f32>, rusqlite::Error> {
    let vector_str = vector_str.trim();
    
    if !vector_str.starts_with('[') || !vector_str.ends_with(']') {
        return Err(rusqlite::Error::UserFunctionError(Box::new(
            std::io::Error::new(std::io::ErrorKind::InvalidData, 
                "向量格式错误，应为 [x,y,z,...]")
        )));
    }
    
    // 去掉方括号并分割
    let inner = &vector_str[1..vector_str.len()-1];
    let elements = inner.split(',');
    
    let mut result = Vec::new();
    for elem in elements {
        let value = elem.trim().parse::<f32>().map_err(|e| {
            rusqlite::Error::UserFunctionError(Box::new(
                std::io::Error::new(std::io::ErrorKind::InvalidData, 
                    format!("解析向量数据失败: {}", e))
            ))
        })?;
        
        result.push(value);
    }
    
    Ok(result)
}
