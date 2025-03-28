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
use bincode;
use serde_json::Value as JsonValue;

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
        // Use a simpler schema to avoid arrow-related issues
        let create_table_sql = format!(
            "CREATE TABLE IF NOT EXISTS {} (
                id VARCHAR PRIMARY KEY,
                vector_data BLOB,
                metadata VARCHAR
            )",
            self.collection
        );
        
        conn.execute(&create_table_sql, [])?;
        
        // Create a simple index on the ID column
        let create_index_sql = format!(
            "CREATE INDEX IF NOT EXISTS {0}_id_idx ON {0} (id)",
            self.collection
        );
        
        conn.execute(&create_index_sql, [])?;
        
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
        
        // Serialize the vector to a binary blob to avoid arrow dependency issues
        let vector_blob = bincode::serialize(&embedding.vector)
            .map_err(|e| LumosError::Other(format!("Failed to serialize vector: {}", e)))?;
        
        // Serialize metadata to JSON string
        let metadata_json = match &embedding.metadata {
            Some(metadata) => serde_json::to_string(metadata)
                .map_err(|e| LumosError::Other(format!("Failed to serialize metadata: {}", e)))?,
            None => "null".to_string(),
        };
        
        let sql = format!(
            "INSERT INTO {} (id, vector_data, metadata) VALUES (?, ?, ?)
             ON CONFLICT (id) DO UPDATE SET vector_data = ?, metadata = ?",
            self.collection
        );
        
        // We need to duplicate the blob parameter since it's used twice in the SQL
        conn.execute(&sql, [
            &embedding.id as &dyn duckdb::ToSql,
            &vector_blob as &dyn duckdb::ToSql,
            &metadata_json as &dyn duckdb::ToSql,
            &vector_blob as &dyn duckdb::ToSql,
            &metadata_json as &dyn duckdb::ToSql,
        ])?;
        
        Ok(())
    }

    /// Insert multiple embeddings in a batch
    pub fn insert_batch(&self, embeddings: &[Embedding]) -> Result<()> {
        if embeddings.is_empty() {
            return Ok(());
        }
        
        let conn = self.duckdb.connection()?;
        
        // Process each embedding individually since we can't use transaction with immutable conn
        for embedding in embeddings {
            if embedding.dimension != self.dimension {
                return Err(LumosError::InvalidArgument(format!(
                    "Vector dimension mismatch. Expected {}, got {}",
                    self.dimension, embedding.dimension
                )));
            }
            
            // Serialize the vector to a binary blob to avoid arrow dependency issues
            let vector_blob = match bincode::serialize(&embedding.vector) {
                Ok(blob) => blob,
                Err(e) => return Err(LumosError::Other(format!("Failed to serialize vector: {}", e))),
            };
            
            // Serialize metadata to JSON string
            let metadata_json = match &embedding.metadata {
                Some(metadata) => match serde_json::to_string(metadata) {
                    Ok(json) => json,
                    Err(e) => return Err(LumosError::Other(format!("Failed to serialize metadata: {}", e))),
                },
                None => "null".to_string(),
            };
            
            let sql = format!(
                "INSERT INTO {} (id, vector_data, metadata) VALUES (?, ?, ?)
                 ON CONFLICT (id) DO UPDATE SET vector_data = ?, metadata = ?",
                self.collection
            );
            
            conn.execute(&sql, [
                &embedding.id as &dyn duckdb::ToSql,
                &vector_blob as &dyn duckdb::ToSql,
                &metadata_json as &dyn duckdb::ToSql,
                &vector_blob as &dyn duckdb::ToSql,
                &metadata_json as &dyn duckdb::ToSql,
            ])?;
        }
        
        Ok(())
    }

    /// Get an embedding by ID
    pub fn get(&self, id: &str) -> Result<Option<Embedding>> {
        let conn = self.duckdb.connection()?;
        
        let sql = format!(
            "SELECT id, vector_data, metadata FROM {} WHERE id = ?",
            self.collection
        );
        
        let mut stmt = conn.prepare(&sql)?;
        let mut rows = stmt.query([&id])?;
        
        if let Some(row) = rows.next()? {
            let id: String = row.get(0)?;
            let vector_data: Vec<u8> = row.get(1)?;
            let metadata_str: String = row.get(2)?;
            
            // Deserialize the vector
            let vector: Vec<f32> = match bincode::deserialize(&vector_data) {
                Ok(v) => v,
                Err(_) => {
                    return Ok(None);
                }
            };
            
            // Calculate dimension before using vector
            let dimension = vector.len();
            
            // Deserialize metadata
            let metadata = if metadata_str == "null" {
                None
            } else {
                match serde_json::from_str(&metadata_str) {
                    Ok(m) => Some(m),
                    Err(_) => None,
                }
            };
            
            let embedding = Embedding {
                id,
                vector,
                dimension,
                metadata,
            };
            
            Ok(Some(embedding))
        } else {
            Ok(None)
        }
    }

    /// Delete an embedding by ID
    pub fn delete(&self, id: &str) -> Result<bool> {
        let conn = self.duckdb.connection()?;
        
        let sql = format!("DELETE FROM {} WHERE id = ?", self.collection);
        
        let changes = conn.execute(&sql, [&id])?;
        
        Ok(changes > 0)
    }

    /// Find similar vectors using a custom similarity calculation instead of relying on DuckDB features
    pub fn find_similar(&self, query_vector: &[f32], limit: usize) -> Result<Vec<(Embedding, f32)>> {
        if query_vector.len() != self.dimension {
            return Err(LumosError::InvalidArgument(format!(
                "Query vector dimension mismatch. Expected {}, got {}",
                self.dimension, query_vector.len()
            )));
        }
        
        // Get all embeddings from the store
        let conn = self.duckdb.connection()?;
        
        let sql = format!(
            "SELECT id, vector_data, metadata FROM {}",
            self.collection
        );
        
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query([])?;
        
        // Calculate similarities for all embeddings
        let mut results = Vec::new();
        
        for row_result in rows.mapped(|row| {
            let id: String = row.get(0)?;
            let vector_data: Vec<u8> = row.get(1)?;
            let metadata_str: String = row.get(2)?;
            
            // Deserialize the vector
            let vector: Vec<f32> = match bincode::deserialize(&vector_data) {
                Ok(v) => v,
                Err(e) => return Ok((Embedding::new("", vec![]), -1.0)), // Return dummy with negative similarity on error
            };
            
            // Calculate things we need before moving the vector
            let vector_len = vector.len();
            let similarity = distance::cosine_similarity(query_vector, &vector);
            
            // Deserialize metadata
            let metadata = if metadata_str == "null" {
                None
            } else {
                match serde_json::from_str(&metadata_str) {
                    Ok(m) => Some(m),
                    Err(_) => None,
                }
            };
            
            let embedding = Embedding {
                id,
                vector,
                dimension: vector_len,
                metadata,
            };
            
            Ok((embedding, similarity))
        }) {
            match row_result {
                Ok(item) => results.push(item),
                Err(_) => continue,
            }
        }
        
        // Sort by similarity (higher is better)
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        // Return top k results
        Ok(results.into_iter().take(limit).collect())
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

    /// Create an optimized index for the vector collection
    pub fn create_index(&self, index_type: index::IndexType) -> Result<index::VectorIndex> {
        // Retrieve all vectors from the store
        let conn = self.duckdb.connection()?;
        
        let sql = format!(
            "SELECT id, vector_data, metadata FROM {}",
            self.collection
        );
        
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query([])?;
        
        // Create a new vector index
        let mut vector_index = index::VectorIndex::new(
            format!("{}_index", self.collection),
            self.dimension,
            index::IndexType::to_distance_metric(&index_type),
        );
        
        // Add all vectors to the index
        for row_result in rows.mapped(|row| {
            let id: String = row.get(0)?;
            let vector_data: Vec<u8> = row.get(1)?;
            let metadata_str: String = row.get(2)?;
            
            // Deserialize the vector
            let vector: Vec<f32> = match bincode::deserialize(&vector_data) {
                Ok(v) => v,
                Err(e) => {
                    // Handle the error inside the map function instead of propagating
                    return Ok((String::new(), vec![], None));
                }
            };
            
            // Calculate dimension before using vector
            let dimension = vector.len();
            
            // Deserialize metadata
            let metadata = if metadata_str == "null" {
                None
            } else {
                match serde_json::from_str(&metadata_str) {
                    Ok(m) => Some(m),
                    Err(_) => None,
                }
            };
            
            Ok((id, vector, metadata))
        }) {
            match row_result {
                Ok((id, vector, metadata)) => {
                    if !id.is_empty() {
                        vector_index.add(id, vector, metadata)?;
                    }
                },
                Err(_) => continue,
            }
        }
        
        Ok(vector_index)
    }
    
    /// Find similar vectors using an index for faster retrieval
    pub fn find_similar_with_index(
        &self, 
        query_vector: &[f32], 
        limit: usize,
        index: &index::VectorIndex
    ) -> Result<Vec<(Embedding, f32)>> {
        if query_vector.len() != self.dimension {
            return Err(LumosError::InvalidArgument(format!(
                "Query vector dimension mismatch. Expected {}, got {}",
                self.dimension, query_vector.len()
            )));
        }
        
        // Use the index to find similar vectors
        let similar_ids = index.search(query_vector, limit)?;
        
        // Retrieve the full embeddings for the similar vectors
        let mut results = Vec::new();
        
        for (id, similarity) in similar_ids {
            if let Some(embedding) = self.get(&id)? {
                results.push((embedding, similarity));
            }
        }
        
        // Results are already sorted by similarity
        Ok(results)
    }
    
    /// Export all embeddings to create a new index
    pub fn export_embeddings(&self) -> Result<Vec<Embedding>> {
        let conn = self.duckdb.connection()?;
        
        let sql = format!(
            "SELECT id, vector_data, metadata FROM {}",
            self.collection
        );
        
        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query([])?;
        
        let mut embeddings = Vec::new();
        
        for row_result in rows.mapped(|row| {
            let id: String = row.get(0)?;
            let vector_data: Vec<u8> = row.get(1)?;
            let metadata_str: String = row.get(2)?;
            
            // Deserialize the vector
            let vector: Vec<f32> = match bincode::deserialize(&vector_data) {
                Ok(v) => v,
                Err(e) => {
                    return Ok(Embedding::new("", vec![]));
                }
            };
            
            // Calculate dimension before using vector
            let dimension = vector.len();
            
            // Deserialize metadata
            let metadata = if metadata_str == "null" {
                None
            } else {
                match serde_json::from_str(&metadata_str) {
                    Ok(m) => Some(m),
                    Err(_) => None,
                }
            };
            
            let embedding = Embedding {
                id,
                vector,
                dimension,
                metadata,
            };
            
            Ok(embedding)
        }) {
            match row_result {
                Ok(embedding) => {
                    if !embedding.id.is_empty() {
                        embeddings.push(embedding);
                    }
                },
                Err(_) => continue,
            }
        }
        
        Ok(embeddings)
    }
}

/// List all collections in the database
pub fn list_collections(duckdb: &Arc<DuckDbEngine>) -> Result<Vec<String>> {
    let conn = duckdb.connection()?;
    
    let sql = "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
    
    let mut stmt = conn.prepare(sql)?;
    let rows = stmt.query([])?;
    
    let mut collections = Vec::new();
    
    for row_result in rows.mapped(|row| {
        let name: String = row.get(0)?;
        Ok(name)
    }) {
        let collection = row_result?;
        collections.push(collection);
    }
    
    Ok(collections)
}
