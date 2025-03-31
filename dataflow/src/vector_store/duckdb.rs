//! DuckDB向量存储实现
//!
//! 使用DuckDB的向量扩展实现高效的向量存储和相似性搜索

use std::path::Path;
use std::collections::HashMap;
use std::sync::Mutex;
use anyhow::{Result, anyhow, Context};
use serde_json::Value;
use log::{debug, info, warn, error};
use duckdb::{Connection, params, OptionalExt, TransactionBehavior};

use super::{VectorStore, VectorStoreConfig, VectorSearchResult, DistanceMetric, IndexType};

/// DuckDB向量存储实现
pub struct DuckDBVectorStore {
    /// DuckDB连接
    conn: Mutex<Option<Connection>>,
    /// 向量表名
    table_name: String,
    /// 向量维度
    dimensions: usize,
    /// 距离度量方法
    distance_metric: DistanceMetric,
    /// 索引类型
    index_type: IndexType,
    /// 索引是否已创建
    index_created: bool,
    /// 数据库路径
    db_path: Option<String>,
}

impl DuckDBVectorStore {
    /// 创建新的DuckDB向量存储
    pub fn new() -> Self {
        Self {
            conn: Mutex::new(None),
            table_name: String::new(),
            dimensions: 0,
            distance_metric: DistanceMetric::Cosine,
            index_type: IndexType::Flat,
            index_created: false,
            db_path: None,
        }
    }

    /// 确保连接已建立
    fn ensure_connection(&self) -> Result<()> {
        let mut conn_guard = self.conn.lock().unwrap();
        if conn_guard.is_none() {
            let db_path = self.db_path.as_deref().unwrap_or(":memory:");
            debug!("建立DuckDB连接：{}", db_path);
            
            let conn = Connection::open(db_path)
                .context(format!("无法连接到DuckDB数据库：{}", db_path))?;
            
            // 加载必要的扩展
            self.load_extensions(&conn)?;
            
            *conn_guard = Some(conn);
        }
        Ok(())
    }
    
    /// 加载DuckDB扩展
    fn load_extensions(&self, conn: &Connection) -> Result<()> {
        // 加载向量扩展
        conn.execute("INSTALL vector", params![])?;
        conn.execute("LOAD vector", params![])?;
        
        // 其他可能需要的扩展
        conn.execute("INSTALL spatial", params![])?;
        conn.execute("LOAD spatial", params![])?;
        
        Ok(())
    }
    
    /// 创建表结构
    fn create_tables(&self) -> Result<()> {
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        // 创建向量表
        let create_table_sql = format!(
            "CREATE TABLE IF NOT EXISTS {} (
                id VARCHAR PRIMARY KEY,
                vector FLOAT[]({dimensions}),
                metadata JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )",
            self.table_name,
            dimensions = self.dimensions
        );
        
        conn.execute(&create_table_sql, params![])?;
        
        // 创建元数据索引表
        let metadata_table = format!("{}_metadata_index", self.table_name);
        let create_metadata_index_sql = format!(
            "CREATE TABLE IF NOT EXISTS {} (
                id VARCHAR,
                key VARCHAR,
                value VARCHAR,
                value_numeric DOUBLE,
                PRIMARY KEY (id, key),
                FOREIGN KEY (id) REFERENCES {}(id) ON DELETE CASCADE
            )",
            metadata_table, self.table_name
        );
        
        conn.execute(&create_metadata_index_sql, params![])?;
        
        Ok(())
    }
    
    /// 创建向量索引
    fn create_index(&self) -> Result<()> {
        if self.index_created {
            return Ok(());
        }
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        let index_name = format!("{}_vector_idx", self.table_name);
        
        // 根据索引类型创建不同的索引
        let index_sql = match self.index_type {
            IndexType::HNSW => format!(
                "CREATE INDEX {} ON {} USING HNSW(vector {}) WITH (M=16, ef_construction=200)",
                index_name, self.table_name, self.distance_metric
            ),
            IndexType::IVF => format!(
                "CREATE INDEX {} ON {} USING IVF(vector {}) WITH (n_lists=100, n_probes=10)",
                index_name, self.table_name, self.distance_metric
            ),
            // 其他索引类型可以在这里添加
            _ => {
                info!("使用默认的暴力搜索 (Flat)，不创建特殊索引");
                return Ok(());
            }
        };
        
        conn.execute(&index_sql, params![])?;
        info!("成功创建向量索引：{}", index_name);
        
        Ok(())
    }
    
    /// 添加元数据索引
    fn add_metadata_index(&self, id: &str, metadata: &HashMap<String, Value>) -> Result<()> {
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        let metadata_table = format!("{}_metadata_index", self.table_name);
        
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        
        for (key, value) in metadata {
            let value_str = value.to_string();
            let value_numeric: Option<f64> = if value.is_number() {
                value.as_f64()
            } else {
                None
            };
            
            tx.execute(
                &format!(
                    "INSERT INTO {} (id, key, value, value_numeric) 
                     VALUES (?1, ?2, ?3, ?4)
                     ON CONFLICT (id, key) DO UPDATE SET 
                     value = ?3, value_numeric = ?4",
                    metadata_table
                ),
                params![id, key, value_str, value_numeric]
            )?;
        }
        
        tx.commit()?;
        
        Ok(())
    }
    
    /// 将JSON转换为SQL条件
    fn json_filter_to_sql(filter: &HashMap<String, Value>) -> (String, Vec<Value>) {
        let mut conditions = Vec::new();
        let mut params = Vec::new();
        
        for (key, value) in filter {
            if value.is_null() {
                conditions.push(format!("NOT EXISTS (SELECT 1 FROM {}_metadata_index WHERE id = vectors.id AND key = '{}')", "vectors", key));
            } else if value.is_number() {
                conditions.push(format!("EXISTS (SELECT 1 FROM {}_metadata_index WHERE id = vectors.id AND key = '{}' AND value_numeric = ?)", "vectors", key));
                params.push(value.clone());
            } else {
                conditions.push(format!("EXISTS (SELECT 1 FROM {}_metadata_index WHERE id = vectors.id AND key = '{}' AND value = ?)", "vectors", key));
                params.push(value.clone());
            }
        }
        
        if conditions.is_empty() {
            return ("1=1".to_string(), params);
        }
        
        (conditions.join(" AND "), params)
    }
}

impl VectorStore for DuckDBVectorStore {
    fn initialize(&mut self, config: &VectorStoreConfig) -> Result<()> {
        self.dimensions = config.dimensions;
        self.distance_metric = config.distance_metric;
        self.index_type = config.index_type;
        self.table_name = config.table_name.clone();
        self.db_path = config.path.clone();
        
        self.ensure_connection()?;
        self.create_tables()?;
        
        // 只有在数据库存在的情况下才创建索引
        if self.db_path.is_some() && !self.db_path.as_deref().unwrap_or("").is_empty() {
            self.create_index()?;
            self.index_created = true;
        }
        
        info!("DuckDB向量存储初始化完成：表名={}, 维度={}", self.table_name, self.dimensions);
        Ok(())
    }
    
    fn add_vector(&mut self, id: &str, vector: Vec<f32>, metadata: HashMap<String, Value>) -> Result<()> {
        if vector.len() != self.dimensions {
            return Err(anyhow!("向量维度不匹配，期望{}，实际{}", self.dimensions, vector.len()));
        }
        
        self.ensure_connection()?;
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        // 将向量转换为DuckDB数组格式
        let vector_str = format!("[{}]", vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));
        
        // 将元数据转换为JSON
        let metadata_json = serde_json::to_string(&metadata)?;
        
        // 开始事务
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        
        // 插入向量数据
        tx.execute(
            &format!(
                "INSERT OR REPLACE INTO {} (id, vector, metadata) 
                 VALUES (?1, ?2, ?3::JSON)",
                self.table_name
            ),
            params![id, vector_str, metadata_json]
        )?;
        
        // 添加元数据索引
        self.add_metadata_index(id, &metadata)?;
        
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
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        
        for (id, vector, metadata) in batch {
            if vector.len() != self.dimensions {
                return Err(anyhow!("向量维度不匹配，期望{}，实际{}", self.dimensions, vector.len()));
            }
            
            // 将向量转换为DuckDB数组格式
            let vector_str = format!("[{}]", vector.iter()
                .map(|v| v.to_string())
                .collect::<Vec<_>>()
                .join(","));
            
            // 将元数据转换为JSON
            let metadata_json = serde_json::to_string(&metadata)?;
            
            // 插入向量数据
            tx.execute(
                &format!(
                    "INSERT OR REPLACE INTO {} (id, vector, metadata) 
                     VALUES (?1, ?2, ?3::JSON)",
                    self.table_name
                ),
                params![id, vector_str, metadata_json]
            )?;
            
            // 添加元数据索引
            self.add_metadata_index(&id, &metadata)?;
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
        
        // 将查询向量转换为DuckDB数组格式
        let vector_str = format!("[{}]", query_vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));
        
        // 构建查询SQL
        let distance_func = match self.distance_metric {
            DistanceMetric::Euclidean => "l2_distance",
            DistanceMetric::Cosine => "cosine_distance",
            DistanceMetric::DotProduct => "dot_product",
            DistanceMetric::Hamming => "hamming_distance",
            DistanceMetric::Manhattan => "manhattan_distance",
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
        let rows = stmt.query(params![vector_str, top_k as i64])?;
        
        let mut results = Vec::new();
        
        for row in rows {
            let row = row?;
            let id: String = row.get(0)?;
            let distance: f32 = row.get(1)?;
            let metadata_json: String = row.get(2)?;
            
            // 解析元数据JSON
            let metadata: HashMap<String, Value> = serde_json::from_str(&metadata_json)
                .context("无法解析元数据JSON")?;
            
            results.push(VectorSearchResult {
                id,
                score: 1.0 - distance, // 将距离转换为分数（越小越好）
                metadata,
                vector: None, // 默认不返回向量数据
            });
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
            let vector_str = vector_str.trim_start_matches('[').trim_end_matches(']');
            let vector: Vec<f32> = vector_str.split(',')
                .map(|s| s.trim().parse::<f32>())
                .collect::<Result<Vec<_>, _>>()
                .context("无法解析向量数据")?;
            
            // 解析元数据JSON
            let metadata: HashMap<String, Value> = serde_json::from_str(&metadata_json)
                .context("无法解析元数据JSON")?;
            
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
        let tx = conn.transaction_with_behavior(TransactionBehavior::Immediate)?;
        
        // 删除元数据索引
        let metadata_table = format!("{}_metadata_index", self.table_name);
        let delete_metadata_sql = format!(
            "DELETE FROM {} WHERE id = ?1",
            metadata_table
        );
        
        tx.execute(&delete_metadata_sql, params![id])?;
        
        // 删除向量
        let delete_sql = format!(
            "DELETE FROM {} WHERE id = ?1",
            self.table_name
        );
        
        let rows = tx.execute(&delete_sql, params![id])?;
        
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
        
        // 将查询向量转换为DuckDB数组格式
        let vector_str = format!("[{}]", query_vector.iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));
        
        // 构建查询SQL
        let distance_func = match self.distance_metric {
            DistanceMetric::Euclidean => "l2_distance",
            DistanceMetric::Cosine => "cosine_distance",
            DistanceMetric::DotProduct => "dot_product",
            DistanceMetric::Hamming => "hamming_distance",
            DistanceMetric::Manhattan => "manhattan_distance",
        };
        
        // 构建筛选条件
        let (filter_sql, filter_params) = Self::json_filter_to_sql(&filter);
        
        let query_sql = format!(
            "SELECT id, {}(vector, ?1) as distance, metadata
             FROM {} as vectors
             WHERE {}
             ORDER BY distance ASC
             LIMIT ?2",
            distance_func, self.table_name, filter_sql
        );
        
        // 执行查询
        let mut stmt = conn.prepare(&query_sql)?;
        
        // 构建参数列表
        let mut params = vec![Value::from(vector_str)];
        params.extend(filter_params);
        params.push(Value::from(top_k as i64));
        
        let rows = stmt.query(params![params])?;
        
        let mut results = Vec::new();
        
        for row in rows {
            let row = row?;
            let id: String = row.get(0)?;
            let distance: f32 = row.get(1)?;
            let metadata_json: String = row.get(2)?;
            
            // 解析元数据JSON
            let metadata: HashMap<String, Value> = serde_json::from_str(&metadata_json)
                .context("无法解析元数据JSON")?;
            
            results.push(VectorSearchResult {
                id,
                score: 1.0 - distance, // 将距离转换为分数（越小越好）
                metadata,
                vector: None, // 默认不返回向量数据
            });
        }
        
        Ok(results)
    }
    
    fn count(&self) -> Result<usize> {
        self.ensure_connection()?;
        
        let conn_guard = self.conn.lock().unwrap();
        let conn = conn_guard.as_ref().ok_or_else(|| anyhow!("数据库连接未初始化"))?;
        
        let query_sql = format!(
            "SELECT COUNT(*) FROM {}",
            self.table_name
        );
        
        let count: i64 = conn.query_row(&query_sql, params![], |row| row.get(0))?;
        
        Ok(count as usize)
    }
    
    fn close(&mut self) -> Result<()> {
        let mut conn_guard = self.conn.lock().unwrap();
        *conn_guard = None;
        
        info!("DuckDB向量存储已关闭");
        Ok(())
    }
} 