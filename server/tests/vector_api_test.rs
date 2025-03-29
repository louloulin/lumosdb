use actix_web::{test, web, App};
use actix_web::http::StatusCode;
use std::sync::Arc;
use std::fs;
use std::path::Path;
use std::collections::HashMap;
use serde_json::json;

// Import the server crate
extern crate lumos_server as lumos_server_crate;
use lumos_server_crate::api;
use lumos_server_crate::db::vector_executor::VectorExecutor;
use lumos_server_crate::models::vector::{
    CreateCollectionRequest, AddEmbeddingsRequest, SearchRequest
};

#[actix_web::test]
async fn test_create_collection() {
    // Create test vector database
    let vector_db_path = "test_vector_create.lumos";
    if Path::new(vector_db_path).exists() {
        let _ = fs::remove_file(vector_db_path);
    }
    
    let vector_executor = Arc::new(VectorExecutor::new(vector_db_path).unwrap());
    
    // Create collection directly with executor
    let result = vector_executor.create_collection("test_collection", 3);
    assert!(result.is_ok());
    
    // Verify collection exists
    let collections = vector_executor.list_collections().unwrap();
    assert_eq!(collections.len(), 1);
    assert!(collections.iter().any(|(name, dim)| name == "test_collection" && *dim == 3));
    
    // Clean up
    let _ = fs::remove_file(vector_db_path);
}

#[actix_web::test]
async fn test_vector_operations() {
    // Create test vector database
    let vector_db_path = "test_vector_ops.lumos";
    if Path::new(vector_db_path).exists() {
        let _ = fs::remove_file(vector_db_path);
    }
    
    let vector_executor = Arc::new(VectorExecutor::new(vector_db_path).unwrap());
    
    // 1. Create collection
    let result = vector_executor.create_collection("test_vectors", 2);
    assert!(result.is_ok());
    
    // 2. Add embeddings
    let ids = vec!["vec1".to_string(), "vec2".to_string(), "vec3".to_string()];
    let embeddings = vec![
        vec![1.0, 0.0],
        vec![0.0, 1.0],
        vec![0.5, 0.5]
    ];
    let metadata = None;
    
    let result = vector_executor.add_embeddings("test_vectors", ids, embeddings, metadata);
    assert!(result.is_ok());
    assert_eq!(result.unwrap(), 3); // Should add 3 vectors
    
    // 3. Search for similar vectors
    let query_vector = vec![0.9, 0.1];
    let result = vector_executor.search_similar("test_vectors", query_vector, 2);
    assert!(result.is_ok());
    
    let similar_vectors = result.unwrap();
    assert_eq!(similar_vectors.len(), 2);
    assert_eq!(similar_vectors[0].id, "vec1"); // Most similar should be vec1
    
    // Clean up
    let _ = fs::remove_file(vector_db_path);
}

#[actix_web::test]
async fn test_index_creation() {
    // Create test vector database
    let vector_db_path = "test_vector_index.lumos";
    if Path::new(vector_db_path).exists() {
        let _ = fs::remove_file(vector_db_path);
    }
    
    let vector_executor = Arc::new(VectorExecutor::new(vector_db_path).unwrap());
    
    // 1. Create collection
    let _ = vector_executor.create_collection("test_index", 3);
    
    // 2. Add embeddings
    let mut ids = Vec::new();
    let mut embeddings = Vec::new();
    
    for i in 0..10 {
        ids.push(format!("vec{}", i));
        embeddings.push(vec![i as f32, (i+1) as f32, (i+2) as f32]);
    }
    
    let _ = vector_executor.add_embeddings("test_index", ids, embeddings, None);
    
    // 3. Create index
    let result = vector_executor.create_index("test_index", "hnsw");
    assert!(result.is_ok());
    
    // 4. Verify search still works after creating an index
    let query_vector = vec![1.0, 2.0, 3.0];
    let result = vector_executor.search_similar("test_index", query_vector, 3);
    assert!(result.is_ok());
    assert_eq!(result.unwrap().len(), 3);
    
    // Clean up
    let _ = fs::remove_file(vector_db_path);
} 