// Vector storage module for Lumos-DB
//
// This module provides functionality for storing and querying embedding vectors,
// which are critical for AI applications. It integrates with DuckDB to provide
// SQL access to vector operations and implements efficient similarity search.

use std::sync::Arc;
use crate::duckdb::DuckDbEngine;
use crate::LumosError;
use crate::Result;
use serde::{Serialize, Deserialize};

pub mod index;
pub mod distance;

/// A vector embedding with associated metadata
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Embedding {
    /// Unique identifier for the embedding
    pub id: String,
    /// The vector data as a float array
    pub vector: Vec<f32>,
    /// Dimension of the vector
    pub dimension: usize,
    /// Optional metadata associated with the embedding
    pub metadata: Option<serde_json::Value>,
}

impl Embedding {
    /// Create a new embedding with the given ID and vector
    pub fn new(id: impl Into<String>, vector: Vec<f32>) -> Self {
        let dimension = vector.len();
        Embedding {
            id: id.into(),
            vector,
            dimension,
            metadata: None,
        }
    }

    /// Add metadata to the embedding
    pub fn with_metadata(mut self, metadata: serde_json::Value) -> Self {
        self.metadata = Some(metadata);
        self
    }
}

/// Vector store for managing embedding vectors
pub struct VectorStore {
    /// DuckDB engine for storing vectors
    duckdb: Arc<DuckDbEngine>,
    /// Name of the collection
    collection: String,
    /// Dimension of vectors in this store
    dimension: usize,
}

impl VectorStore {
    /// Create a new vector store
    pub fn new(duckdb: Arc<DuckDbEngine>, collection: impl Into<String>, dimension: usize) -> Self {
        VectorStore {
            duckdb,
            collection: collection.into(),
            dimension,
        }
    }

    /// Initialize the vector store, creating necessary tables and indexes
    pub fn init(&self) -> Result<()> {
        let conn = self.duckdb.connection()?;
        
        // Create the embeddings table if it doesn't exist
        let create_table_sql = format!(
            "CREATE TABLE IF NOT EXISTS {} (
                id VARCHAR PRIMARY KEY,
                vector FLOAT[],
                metadata JSON
            )",
            self.collection
        );
        
        conn.execute(&create_table_sql, [])?;
        
        // Create a function-based index for fast vector similarity search
        // This will be expanded with actual vector indexing in the index.rs module
        let create_index_sql = format!(
            "CREATE INDEX IF NOT EXISTS {0}_vector_idx ON {0} USING vector_index(vector)",
            self.collection
        );
        
        // We'll silently ignore index creation errors since 
        // the vector_index may not be available until we implement it
        let _ = conn.execute(&create_index_sql, []);
        
        Ok(())
    }

    /// Insert a new embedding into the store
    pub fn insert(&self, embedding: &Embedding) -> Result<()> {
        if embedding.dimension != self.dimension {
            return Err(LumosError::InvalidArgument(format!(
                "Vector dimension mismatch. Expected {}, got {}",
                self.dimension, embedding.dimension
            )));
        }
        
        let conn = self.duckdb.connection()?;
        
        let metadata_json = match &embedding.metadata {
            Some(metadata) => serde_json::to_string(metadata)?,
            None => "null".to_string(),
        };
        
        // Convert vector to string representation for DuckDB
        let vector_str = format!("[{}]", embedding.vector
            .iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));
        
        let sql = format!(
            "INSERT INTO {} (id, vector, metadata) VALUES (?, {}, ?::JSON)
             ON CONFLICT (id) DO UPDATE SET vector = {}, metadata = ?::JSON",
            self.collection, vector_str, vector_str
        );
        
        conn.execute(&sql, [&embedding.id as &dyn duckdb::ToSql, &metadata_json as &dyn duckdb::ToSql])?;
        
        Ok(())
    }

    /// Insert multiple embeddings in a batch
    pub fn insert_batch(&self, embeddings: &[Embedding]) -> Result<()> {
        if embeddings.is_empty() {
            return Ok(());
        }
        
        let conn = self.duckdb.connection()?;
        let tx = conn.transaction()?;
        
        for embedding in embeddings {
            if embedding.dimension != self.dimension {
                return Err(LumosError::InvalidArgument(format!(
                    "Vector dimension mismatch. Expected {}, got {}",
                    self.dimension, embedding.dimension
                )));
            }
            
            let metadata_json = match &embedding.metadata {
                Some(metadata) => serde_json::to_string(metadata)?,
                None => "null".to_string(),
            };
            
            // Convert vector to string representation for DuckDB
            let vector_str = format!("[{}]", embedding.vector
                .iter()
                .map(|v| v.to_string())
                .collect::<Vec<_>>()
                .join(","));
            
            let sql = format!(
                "INSERT INTO {} (id, vector, metadata) VALUES (?, {}, ?::JSON)
                 ON CONFLICT (id) DO UPDATE SET vector = {}, metadata = ?::JSON",
                self.collection, vector_str, vector_str
            );
            
            tx.execute(&sql, [&embedding.id as &dyn duckdb::ToSql, &metadata_json as &dyn duckdb::ToSql])?;
        }
        
        tx.commit()?;
        Ok(())
    }

    /// Get an embedding by ID
    pub fn get(&self, id: &str) -> Result<Option<Embedding>> {
        let conn = self.duckdb.connection()?;
        
        let sql = format!(
            "SELECT id, vector, metadata FROM {} WHERE id = ?",
            self.collection
        );
        
        let mut stmt = conn.prepare(&sql)?;
        let mut rows = stmt.query([&id])?;
        
        if let Some(row) = rows.next()? {
            let id: String = row.get(0)?;
            let vector_data: Vec<u8> = row.get(1)?;
            let metadata_str: Option<String> = row.get(2)?;
            
            // Parse the vector data from binary format
            // This is simplified and will need to be adapted to actual DuckDB vector format
            let vector = vector_data
                .chunks(4)
                .map(|chunk| {
                    let arr = [chunk[0], chunk[1], chunk[2], chunk[3]];
                    f32::from_le_bytes(arr)
                })
                .collect();
            
            let metadata = if let Some(meta_str) = metadata_str {
                if meta_str == "null" {
                    None
                } else {
                    Some(serde_json::from_str(&meta_str)?)
                }
            } else {
                None
            };
            
            Ok(Some(Embedding {
                id,
                vector,
                dimension: self.dimension,
                metadata,
            }))
        } else {
            Ok(None)
        }
    }

    /// Delete an embedding by ID
    pub fn delete(&self, id: &str) -> Result<bool> {
        let conn = self.duckdb.connection()?;
        
        let sql = format!(
            "DELETE FROM {} WHERE id = ?",
            self.collection
        );
        
        let count = conn.execute(&sql, [&id])?;
        Ok(count > 0)
    }

    /// Find similar vectors using cosine similarity
    pub fn find_similar(&self, query_vector: &[f32], limit: usize) -> Result<Vec<(Embedding, f32)>> {
        if query_vector.len() != self.dimension {
            return Err(LumosError::InvalidArgument(format!(
                "Query vector dimension mismatch. Expected {}, got {}",
                self.dimension, query_vector.len()
            )));
        }
        
        let conn = self.duckdb.connection()?;
        
        // Convert query vector to string representation for DuckDB
        let vector_str = format!("[{}]", query_vector
            .iter()
            .map(|v| v.to_string())
            .collect::<Vec<_>>()
            .join(","));
        
        // Use cosine similarity for similarity search
        let sql = format!(
            "SELECT id, vector, metadata, cosine_similarity(vector, {}) AS similarity
             FROM {}
             ORDER BY similarity DESC
             LIMIT {}",
            vector_str, self.collection, limit
        );
        
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query([])?;
        
        let mut results = Vec::new();
        
        for row_result in rows {
            let row = row_result?;
            let id: String = row.get(0)?;
            let vector_data: Vec<u8> = row.get(1)?;
            let metadata_str: Option<String> = row.get(2)?;
            let similarity: f32 = row.get(3)?;
            
            // Parse the vector data from binary format
            // This is simplified and will need to be adapted to actual DuckDB vector format
            let vector = vector_data
                .chunks(4)
                .map(|chunk| {
                    let arr = [chunk[0], chunk[1], chunk[2], chunk[3]];
                    f32::from_le_bytes(arr)
                })
                .collect();
            
            let metadata = if let Some(meta_str) = metadata_str {
                if meta_str == "null" {
                    None
                } else {
                    Some(serde_json::from_str(&meta_str)?)
                }
            } else {
                None
            };
            
            let embedding = Embedding {
                id,
                vector,
                dimension: self.dimension,
                metadata,
            };
            
            results.push((embedding, similarity));
        }
        
        Ok(results)
    }

    /// Count the number of embeddings in the collection
    pub fn count(&self) -> Result<usize> {
        let conn = self.duckdb.connection()?;
        
        let sql = format!("SELECT COUNT(*) FROM {}", self.collection);
        
        let mut stmt = conn.prepare(&sql)?;
        let mut rows = stmt.query([])?;
        
        if let Some(row) = rows.next()? {
            let count: i64 = row.get(0)?;
            Ok(count as usize)
        } else {
            Ok(0)
        }
    }

    /// List all collections in the database
    pub fn list_collections(duckdb: &Arc<DuckDbEngine>) -> Result<Vec<String>> {
        let conn = duckdb.connection()?;
        
        let sql = "SELECT table_name FROM information_schema.tables 
                  WHERE table_schema = 'main' AND table_type = 'BASE TABLE'";
        
        let mut stmt = conn.prepare(sql)?;
        let rows = stmt.query([])?;
        
        let mut collections = Vec::new();
        
        for row_result in rows {
            let row = row_result?;
            let name: String = row.get(0)?;
            collections.push(name);
        }
        
        Ok(collections)
    }
}
