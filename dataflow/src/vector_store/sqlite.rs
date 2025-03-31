//! SQLite向量存储实现
//!
//! 基于SQLite的向量存储实现，支持基本的向量操作和简单的相似度搜索
//! 适用于轻量级应用和嵌入式场景，可以与外部索引结合使用

use std::collections::HashMap;
use std::path::Path;
use std::sync::Mutex;
use anyhow::{Result, anyhow, Context};
use serde_json::Value;
use log::{debug, info, warn, error};
use rusqlite::{Connection, OpenFlags, params, Transaction, OptionalExtension};

use super::{VectorStore, VectorStoreConfig, VectorSearchResult, DistanceMetric, IndexType};

/// SQLite向量存储实现
pub struct SQLiteVectorStore {
    /// SQLite连接
    conn: Mutex<Option<Connection>>,
    /// 向量表名
    table_name: String,
    /// 向量维度
    dimensions: usize,
    /// 距离度量方法
    distance_metric: DistanceMetric,
    /// 索引类型
    index_type: IndexType,
    /// 数据库路径
    db_path: Option<String>,
}

impl SQLiteVectorStore {
    /// 创建新的SQLite向量存储
    pub fn new() -> Self {
        Self {
            conn: Mutex::new(None),
            table_name: String::new(),
            dimensions: 0,
            distance_metric: DistanceMetric::Cosine,
            index_type: IndexType::Flat,
            db_path: None,
        }
    }

    /// 确保连接已建立
    fn ensure_connection(&self) -> Result<()> {
        let mut conn_guard = self.conn.lock().unwrap();
        if conn_guard.is_none() {
            let db_path = self.db_path.as_deref().unwrap_or(":memory:");
            debug!("建立SQLite连接：{}", db_path);
            
            let conn = if db_path == ":memory:" {
                Connection::open_in_memory()
            } else {
                Connection::open_with_flags(
                    db_path,
                    OpenFlags::SQLITE_OPEN_READ_WRITE | OpenFlags::SQLITE_OPEN_CREATE,
                )
            }
            .context(format!("无法连接到SQLite数据库：{}", db_path))?;
            
            // 启用外键约束
            conn.execute("PRAGMA foreign_keys = ON", [])?;
            
            // 加载扩展和创建必要的函数
            self.setup_vector_functions(&conn)?;
            
            *conn_guard = Some(conn);
        }
        Ok(())
    }
    
    /// 设置向量函数
    fn setup_vector_functions(&self, conn: &Connection) -> Result<()> {
        // 添加向量距离计算函数
        
        // 欧几里得距离
        conn.create_scalar_function(
            "l2_distance",
            2,
            rusqlite::functions::FunctionFlags::SQLITE_UTF8 | rusqlite::functions::FunctionFlags::SQLITE_DETERMINISTIC,
            move |ctx| {
                let vec1: String = ctx.get(0)?;
                let vec2: String = ctx.get(1)?;
                
                let v1 = Self::parse_vector(&vec1)?;
                let v2 = Self::parse_vector(&vec2)?;
                
                if v1.len() != v2.len() {
                    return Err(rusqlite::Error::UserFunctionError(Box::new(
                        anyhow!("向量维度不匹配: {} vs {}", v1.len(), v2.len())
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
                
                let v1 = Self::parse_vector(&vec1)?;
                let v2 = Self::parse_vector(&vec2)?;
                
                if v1.len() != v2.len() {
                    return Err(rusqlite::Error::UserFunctionError(Box::new(
                        anyhow!("向量维度不匹配: {} vs {}", v1.len(), v2.len())
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
                
                let v1 = Self::parse_vector(&vec1)?;
                let v2 = Self::parse_vector(&vec2)?;
                
                if v1.len() != v2.len() {
                    return Err(rusqlite::Error::UserFunctionError(Box::new(
                        anyhow!("向量维度不匹配: {} vs {}", v1.len(), v2.len())
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
    
    /// 创建表结构
    fn create_tables(&self) -> Result<()> {
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        // 创建向量表
        conn.execute(
            &format!(
                "CREATE TABLE IF NOT EXISTS {} (
                    id TEXT PRIMARY KEY,
                    vector TEXT NOT NULL,
                    metadata TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now'))
                )",
                self.table_name
            ),
            [],
        )?;
        
        // 创建元数据索引表
        let metadata_table = format!("{}_metadata_index", self.table_name);
        conn.execute(
            &format!(
                "CREATE TABLE IF NOT EXISTS {} (
                    id TEXT NOT NULL,
                    key TEXT NOT NULL,
                    value TEXT,
                    value_numeric REAL,
                    PRIMARY KEY (id, key),
                    FOREIGN KEY (id) REFERENCES {}(id) ON DELETE CASCADE
                )",
                metadata_table, self.table_name
            ),
            [],
        )?;
        
        Ok(())
    }
    
    /// 解析向量字符串
    fn parse_vector(vector_str: &str) -> Result<Vec<f32>, rusqlite::Error> {
        let vector_str = vector_str.trim_start_matches('[').trim_end_matches(']');
        
        vector_str.split(',')
            .map(|s| s.trim().parse::<f32>().map_err(|e| {
                rusqlite::Error::UserFunctionError(Box::new(anyhow!("解析向量数据失败: {}", e)))
            }))
            .collect()
    }
    
    /// 将向量转换为字符串
    fn vector_to_string(vector: &[f32]) -> String {
        format!("[{}]", vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","))
    }
    
    /// 添加元数据索引
    fn add_metadata_index(&self, tx: &Transaction, id: &str, metadata: &HashMap<String, Value>) -> Result<()> {
        let metadata_table = format!("{}_metadata_index", self.table_name);
        
        for (key, value) in metadata {
            let value_str = value.to_string();
            let value_numeric: Option<f64> = if value.is_number() {
                value.as_f64()
            } else {
                None
            };
            
            tx.execute(
                &format!(
                    "INSERT OR REPLACE INTO {} (id, key, value, value_numeric) 
                     VALUES (?1, ?2, ?3, ?4)",
                    metadata_table
                ),
                params![id, key, value_str, value_numeric],
            )?;
        }
        
        Ok(())
    }
    
    /// 将JSON过滤条件转换为SQL
    fn json_filter_to_sql(table_name: &str, filter: &HashMap<String, Value>) -> (String, Vec<rusqlite::types::Value>) {
        let mut conditions = Vec::new();
        let mut params = Vec::new();
        let metadata_table = format!("{}_metadata_index", table_name);
        
        for (key, value) in filter {
            if value.is_null() {
                conditions.push(format!("NOT EXISTS (SELECT 1 FROM {} WHERE id = vectors.id AND key = ?)", metadata_table));
                params.push(key.clone().into());
            } else if value.is_number() {
                conditions.push(format!("EXISTS (SELECT 1 FROM {} WHERE id = vectors.id AND key = ? AND value_numeric = ?)", metadata_table));
                params.push(key.clone().into());
                params.push(value.as_f64().unwrap().into());
            } else {
                conditions.push(format!("EXISTS (SELECT 1 FROM {} WHERE id = vectors.id AND key = ? AND value = ?)", metadata_table));
                params.push(key.clone().into());
                params.push(value.to_string().into());
            }
        }
        
        if conditions.is_empty() {
            return ("1=1".to_string(), params);
        }
        
        (conditions.join(" AND "), params)
    }
}

impl VectorStore for SQLiteVectorStore {
    fn initialize(&mut self, config: &VectorStoreConfig) -> Result<()> {
        self.dimensions = config.dimensions;
        self.distance_metric = config.distance_metric;
        self.index_type = config.index_type;
        self.table_name = config.table_name.clone();
        self.db_path = config.path.clone();
        
        self.ensure_connection()?;
        self.create_tables()?;
        
        info!("SQLite向量存储初始化完成：表名={}, 维度={}", self.table_name, self.dimensions);
        Ok(())
    }
    
    fn add_vector(&mut self, id: &str, vector: Vec<f32>, metadata: HashMap<String, Value>) -> Result<()> {
        if vector.len() != self.dimensions {
            return Err(anyhow!("向量维度不匹配，期望{}，实际{}", self.dimensions, vector.len()));
        }
        
        self.ensure_connection()?;
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        // 将向量转换为字符串
        let vector_str = Self::vector_to_string(&vector);
        
        // 将元数据转换为JSON
        let metadata_json = serde_json::to_string(&metadata)?;
        
        // 开始事务
        let tx = conn.transaction()?;
        
        // 插入向量数据
        tx.execute(
            &format!(
                "INSERT OR REPLACE INTO {} (id, vector, metadata) VALUES (?1, ?2, ?3)",
                self.table_name
            ),
            params![id, vector_str, metadata_json],
        )?;
        
        // 添加元数据索引
        self.add_metadata_index(&tx, id, &metadata)?;
        
        // 提交事务
        tx.commit()?;
        
        debug!("添加向量：id={}, 元数据字段数={}", id, metadata.len());
        Ok(())
    }
    
    fn add_vectors(&mut self, batch: Vec<(String, Vec<f32>, HashMap<String, Value>)>) -> Result<()> {
        self.ensure_connection()?;
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        // 开始事务
        let tx = conn.transaction()?;
        
        for (id, vector, metadata) in batch {
            if vector.len() != self.dimensions {
                return Err(anyhow!("向量维度不匹配，期望{}，实际{}", self.dimensions, vector.len()));
            }
            
            // 将向量转换为字符串
            let vector_str = Self::vector_to_string(&vector);
            
            // 将元数据转换为JSON
            let metadata_json = serde_json::to_string(&metadata)?;
            
            // 插入向量数据
            tx.execute(
                &format!(
                    "INSERT OR REPLACE INTO {} (id, vector, metadata) VALUES (?1, ?2, ?3)",
                    self.table_name
                ),
                params![id, vector_str, metadata_json],
            )?;
            
            // 添加元数据索引
            self.add_metadata_index(&tx, &id, &metadata)?;
        }
        
        // 提交事务
        tx.commit()?;
        
        info!("批量添加向量：数量={}", batch.len());
        Ok(())
    }
    
    fn search(&self, query_vector: &[f32], top_k: usize) -> Result<Vec<VectorSearchResult>> {
        if query_vector.len() != self.dimensions {
            return Err(anyhow!("查询向量维度不匹配，期望{}，实际{}", self.dimensions, query_vector.len()));
        }
        
        self.ensure_connection()?;
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        // 将查询向量转换为字符串
        let vector_str = Self::vector_to_string(query_vector);
        
        // 构建查询SQL
        let distance_func = match self.distance_metric {
            DistanceMetric::Euclidean => "l2_distance",
            DistanceMetric::Cosine => "cosine_distance",
            DistanceMetric::DotProduct => "dot_product",
            _ => return Err(anyhow!("SQLite向量存储不支持{}距离度量方法", self.distance_metric)),
        };
        
        let query_sql = format!(
            "SELECT id, {}(vector, ?1) as distance, metadata
             FROM {}
             ORDER BY distance ASC
             LIMIT ?2",
            distance_func, self.table_name
        );
        
        // 执行查询
        let mut stmt = conn.prepare(&query_sql)?;
        let rows = stmt.query_map(params![vector_str, top_k as i64], |row| {
            let id: String = row.get(0)?;
            let distance: f32 = row.get(1)?;
            let metadata_json: String = row.get(2)?;
            
            // 解析元数据JSON
            let metadata = serde_json::from_str::<HashMap<String, Value>>(&metadata_json)
                .map_err(|e| rusqlite::Error::InvalidColumnType(2, "Invalid JSON".to_string(), e.to_string()))?;
            
            Ok(VectorSearchResult {
                id,
                score: 1.0 - distance, // 将距离转换为分数
                metadata,
                vector: None, // 默认不返回向量数据
            })
        })?;
        
        let mut results = Vec::new();
        for result in rows {
            results.push(result?);
        }
        
        Ok(results)
    }
    
    fn get_by_id(&self, id: &str) -> Result<Option<VectorSearchResult>> {
        self.ensure_connection()?;
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        let query_sql = format!(
            "SELECT id, vector, metadata
             FROM {}
             WHERE id = ?1",
            self.table_name
        );
        
        // 执行查询
        let mut stmt = conn.prepare(&query_sql)?;
        let row = stmt.query_row(params![id], |row| {
            let id: String = row.get(0)?;
            let vector_str: String = row.get(1)?;
            let metadata_json: String = row.get(2)?;
            
            // 解析向量
            let vector = Self::parse_vector(&vector_str)
                .map_err(|e| rusqlite::Error::InvalidColumnType(1, "Invalid Vector".to_string(), e.to_string()))?;
            
            // 解析元数据JSON
            let metadata = serde_json::from_str::<HashMap<String, Value>>(&metadata_json)
                .map_err(|e| rusqlite::Error::InvalidColumnType(2, "Invalid JSON".to_string(), e.to_string()))?;
            
            Ok(VectorSearchResult {
                id,
                score: 1.0, // 直接获取没有相似度分数
                metadata,
                vector: Some(vector),
            })
        }).optional()?;
        
        Ok(row)
    }
    
    fn delete_by_id(&mut self, id: &str) -> Result<bool> {
        self.ensure_connection()?;
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        // 开始事务
        let tx = conn.transaction()?;
        
        // 删除元数据索引
        let metadata_table = format!("{}_metadata_index", self.table_name);
        tx.execute(
            &format!("DELETE FROM {} WHERE id = ?1", metadata_table),
            params![id],
        )?;
        
        // 删除向量
        let rows = tx.execute(
            &format!("DELETE FROM {} WHERE id = ?1", self.table_name),
            params![id],
        )?;
        
        // 提交事务
        tx.commit()?;
        
        Ok(rows > 0)
    }
    
    fn search_with_filter(
        &self, 
        query_vector: &[f32], 
        filter: HashMap<String, Value>, 
        top_k: usize
    ) -> Result<Vec<VectorSearchResult>> {
        if query_vector.len() != self.dimensions {
            return Err(anyhow!("查询向量维度不匹配，期望{}，实际{}", self.dimensions, query_vector.len()));
        }
        
        self.ensure_connection()?;
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        // 将查询向量转换为字符串
        let vector_str = Self::vector_to_string(query_vector);
        
        // 构建查询SQL
        let distance_func = match self.distance_metric {
            DistanceMetric::Euclidean => "l2_distance",
            DistanceMetric::Cosine => "cosine_distance",
            DistanceMetric::DotProduct => "dot_product",
            _ => return Err(anyhow!("SQLite向量存储不支持{}距离度量方法", self.distance_metric)),
        };
        
        // 构建筛选条件
        let (filter_sql, filter_params) = Self::json_filter_to_sql(&self.table_name, &filter);
        
        let query_sql = format!(
            "SELECT id, {}(vector, ?1) as distance, metadata
             FROM {} as vectors
             WHERE {}
             ORDER BY distance ASC
             LIMIT ?2",
            distance_func, self.table_name, filter_sql
        );
        
        // 构建参数
        let mut params: Vec<rusqlite::types::Value> = vec![vector_str.into()];
        params.extend(filter_params);
        params.push((top_k as i64).into());
        
        // 执行查询
        let mut stmt = conn.prepare(&query_sql)?;
        let rows = stmt.query_map(params, |row| {
            let id: String = row.get(0)?;
            let distance: f32 = row.get(1)?;
            let metadata_json: String = row.get(2)?;
            
            // 解析元数据JSON
            let metadata = serde_json::from_str::<HashMap<String, Value>>(&metadata_json)
                .map_err(|e| rusqlite::Error::InvalidColumnType(2, "Invalid JSON".to_string(), e.to_string()))?;
            
            Ok(VectorSearchResult {
                id,
                score: 1.0 - distance, // 将距离转换为分数
                metadata,
                vector: None, // 默认不返回向量数据
            })
        })?;
        
        let mut results = Vec::new();
        for result in rows {
            results.push(result?);
        }
        
        Ok(results)
    }
    
    fn count(&self) -> Result<usize> {
        self.ensure_connection()?;
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        let count: i64 = conn.query_row(
            &format!("SELECT COUNT(*) FROM {}", self.table_name),
            [],
            |row| row.get(0),
        )?;
        
        Ok(count as usize)
    }
    
    fn close(&mut self) -> Result<()> {
        let mut conn_guard = self.conn.lock().unwrap();
        *conn_guard = None;
        
        info!("SQLite向量存储已关闭");
        Ok(())
    }
} 