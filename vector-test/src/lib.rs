use anyhow::Result;
use rusqlite::{Connection, params};
use serde::{Serialize, Deserialize};
use serde_json::Value;
use std::collections::HashMap;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Document {
    pub id: String,
    pub vector: Vec<f32>,
    pub metadata: HashMap<String, Value>,
}

pub enum DistanceMetric {
    Cosine,
    Euclidean,
    DotProduct,
}

impl DistanceMetric {
    fn as_function_name(&self) -> &'static str {
        match self {
            DistanceMetric::Cosine => "cosine_distance",
            DistanceMetric::Euclidean => "l2_distance",
            DistanceMetric::DotProduct => "dot_product",
        }
    }
}

pub struct VectorStore {
    conn: Connection,
}

impl VectorStore {
    /// 创建新的向量存储
    pub fn new(db_path: impl AsRef<Path>) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        
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
        
        let mut store = Self { conn };
        store.setup_vector_functions()?;
        
        Ok(store)
    }
    
    /// 使用内存数据库创建向量存储（用于测试）
    pub fn new_in_memory() -> Result<Self> {
        let conn = Connection::open(":memory:")?;
        
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
        
        let mut store = Self { conn };
        store.setup_vector_functions()?;
        
        Ok(store)
    }
    
    /// 添加单个文档
    pub fn add(&mut self, doc: &Document) -> Result<()> {
        let vector_str = format!("[{}]", doc.vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));
        
        let metadata_json = serde_json::to_string(&doc.metadata)?;
        
        self.conn.execute(
            "INSERT OR REPLACE INTO vectors (id, vector, metadata) VALUES (?1, ?2, ?3)",
            params![doc.id, vector_str, metadata_json],
        )?;
        
        Ok(())
    }
    
    /// 批量添加文档
    pub fn add_batch(&mut self, docs: &[Document]) -> Result<()> {
        let tx = self.conn.transaction()?;
        
        for doc in docs {
            let vector_str = format!("[{}]", doc.vector.iter()
                .map(|v| v.to_string())
                .collect::<Vec<_>>()
                .join(","));
            
            let metadata_json = serde_json::to_string(&doc.metadata)?;
            
            tx.execute(
                "INSERT OR REPLACE INTO vectors (id, vector, metadata) VALUES (?1, ?2, ?3)",
                params![doc.id, vector_str, metadata_json],
            )?;
        }
        
        tx.commit()?;
        Ok(())
    }
    
    /// 通过ID获取文档
    pub fn get(&mut self, id: &str) -> Result<Option<Document>> {
        let mut stmt = self.conn.prepare("SELECT id, vector, metadata FROM vectors WHERE id = ?1")?;
        let mut rows = stmt.query(params![id])?;
        
        if let Some(row) = rows.next()? {
            let id: String = row.get(0)?;
            let vector_str: String = row.get(1)?;
            let metadata_json: String = row.get(2)?;
            
            let vector = parse_vector(&vector_str)?;
            let metadata = serde_json::from_str(&metadata_json)?;
            
            Ok(Some(Document { id, vector, metadata }))
        } else {
            Ok(None)
        }
    }
    
    /// 删除文档
    pub fn delete(&mut self, id: &str) -> Result<bool> {
        let count = self.conn.execute("DELETE FROM vectors WHERE id = ?1", params![id])?;
        Ok(count > 0)
    }
    
    /// 搜索相似向量
    pub fn search(
        &mut self,
        query_vector: &[f32], 
        limit: usize, 
        metric: DistanceMetric
    ) -> Result<Vec<(Document, f32)>> {
        let vector_str = format!("[{}]", query_vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));
        
        let sql = format!(
            "SELECT id, vector, metadata, {}(vector, ?1) as distance
             FROM vectors
             ORDER BY distance ASC
             LIMIT ?2",
            metric.as_function_name()
        );
        
        let mut stmt = self.conn.prepare(&sql)?;
        let rows = stmt.query_map(params![vector_str, limit as i64], |row| {
            let id: String = row.get(0)?;
            let vector_str: String = row.get(1)?;
            let metadata_json: String = row.get(2)?;
            let distance: f32 = row.get(3)?;
            
            let vector = parse_vector(&vector_str).unwrap();
            let metadata = serde_json::from_str(&metadata_json).unwrap();
            
            Ok((Document { id, vector, metadata }, distance))
        })?;
        
        let mut results = Vec::new();
        for result in rows {
            results.push(result?);
        }
        
        Ok(results)
    }
    
    /// 条件过滤 + 向量相似度搜索
    pub fn search_with_filter(
        &mut self,
        query_vector: &[f32],
        filter_sql: &str,
        filter_params: &[&dyn rusqlite::ToSql],
        limit: usize,
        metric: DistanceMetric
    ) -> Result<Vec<(Document, f32)>> {
        let vector_str = format!("[{}]", query_vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));
        
        // 构建动态SQL
        let sql = format!(
            "SELECT id, vector, metadata, {}(vector, ?) as distance
             FROM vectors
             WHERE {}
             ORDER BY distance ASC
             LIMIT ?",
            metric.as_function_name(),
            filter_sql
        );
        
        let mut stmt = self.conn.prepare(&sql)?;
        
        // 构建参数
        let mut params: Vec<&dyn rusqlite::ToSql> = vec![&vector_str];
        params.extend_from_slice(filter_params);
        let limit_i64 = limit as i64;
        params.push(&limit_i64);
        
        // 执行查询
        let rows = stmt.query_map(rusqlite::params_from_iter(params), |row| {
            let id: String = row.get(0)?;
            let vector_str: String = row.get(1)?;
            let metadata_json: String = row.get(2)?;
            let distance: f32 = row.get(3)?;
            
            let vector = parse_vector(&vector_str).unwrap();
            let metadata = serde_json::from_str(&metadata_json).unwrap();
            
            Ok((Document { id, vector, metadata }, distance))
        })?;
        
        let mut results = Vec::new();
        for result in rows {
            results.push(result?);
        }
        
        Ok(results)
    }
    
    /// 获取存储的向量总数
    pub fn count(&mut self) -> Result<i64> {
        let count: i64 = self.conn.query_row("SELECT COUNT(*) FROM vectors", params![], |row| row.get(0))?;
        Ok(count)
    }
    
    // 注册向量距离计算函数
    fn setup_vector_functions(&mut self) -> Result<()> {
        // 欧几里得距离
        self.conn.create_scalar_function(
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
        self.conn.create_scalar_function(
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
        self.conn.create_scalar_function(
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