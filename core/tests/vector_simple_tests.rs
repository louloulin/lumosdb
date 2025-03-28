// Simple standalone vector tests to avoid Arrow dependency conflicts
use lumos_core::{
    vector::{
        Embedding,
        distance::{DistanceMetric, cosine_similarity, euclidean_distance},
        index::{VectorIndex, IndexType},
    },
    Result,
};
use std::collections::HashMap;
use serde_json::json;

#[test]
fn test_distance_functions() {
    // Test vectors
    let v1 = [1.0, 0.0, 0.0];
    let v2 = [0.0, 1.0, 0.0];
    let v3 = [1.0, 1.0, 0.0];
    
    // Test cosine similarity
    assert!((cosine_similarity(&v1, &v2) - 0.0).abs() < 0.001); // Orthogonal vectors
    assert!((cosine_similarity(&v1, &v1) - 1.0).abs() < 0.001); // Same vector
    assert!((cosine_similarity(&v1, &v3) - 0.7071).abs() < 0.01); // 45-degree angle
    
    // Test euclidean distance
    assert!((euclidean_distance(&v1, &v2) - 1.414).abs() < 0.01); // sqrt(2)
    assert!((euclidean_distance(&v1, &v1)).abs() < 0.001); // Zero distance
    assert!((euclidean_distance(&v1, &v3) - 1.0).abs() < 0.001); // Distance 1
}

#[test]
fn test_embedding_struct() {
    // Create embedding
    let embedding = Embedding::new("test-id", vec![1.0, 2.0, 3.0])
        .with_metadata(json!({"key": "value", "score": 0.95}));
    
    // Check properties
    assert_eq!(embedding.id, "test-id");
    assert_eq!(embedding.vector, vec![1.0, 2.0, 3.0]);
    assert_eq!(embedding.dimension, 3);
    
    // Check metadata
    let metadata = embedding.metadata.unwrap();
    assert_eq!(metadata["key"], "value");
    assert_eq!(metadata["score"], 0.95);
}

#[test]
fn test_vector_index_basic() {
    // Create index
    let mut index = VectorIndex::new("test-index", 3, DistanceMetric::Cosine);
    
    // Add vectors
    index.add("v1", vec![1.0, 0.0, 0.0], None).unwrap();
    index.add("v2", vec![0.0, 1.0, 0.0], None).unwrap();
    index.add("v3", vec![0.0, 0.0, 1.0], None).unwrap();
    index.add("v4", vec![0.7, 0.7, 0.0], None).unwrap();
    
    // Check size
    assert_eq!(index.size(), 4);
    
    // Search for similar vectors
    let results = index.search(&[1.0, 0.0, 0.0], 2).unwrap();
    
    // Check results
    assert_eq!(results.len(), 2);
    assert_eq!(results[0].0, "v1"); // Most similar should be exact match
    assert_eq!(results[1].0, "v4"); // Second most similar 
    
    // Test removing vectors
    index.remove("v1");
    assert_eq!(index.size(), 3);
    
    // Search again
    let results = index.search(&[1.0, 0.0, 0.0], 2).unwrap();
    assert_eq!(results[0].0, "v4"); // Now v4 should be most similar
}

#[test]
fn test_index_type_conversion() {
    // Test conversion from IndexType to DistanceMetric
    assert!(matches!(IndexType::Cosine.to_distance_metric(), DistanceMetric::Cosine));
    assert!(matches!(IndexType::Euclidean.to_distance_metric(), DistanceMetric::Euclidean));
    assert!(matches!(IndexType::DotProduct.to_distance_metric(), DistanceMetric::DotProduct));
    assert!(matches!(IndexType::Manhattan.to_distance_metric(), DistanceMetric::Manhattan));
    
    // Default case
    assert!(matches!(IndexType::Flat.to_distance_metric(), DistanceMetric::Cosine));
}

#[test]
fn test_dimension_validation() {
    // Create index with specific dimension
    let mut index = VectorIndex::new("dimension-test", 3, DistanceMetric::Cosine);
    
    // Adding vector with correct dimension should work
    assert!(index.add("v1", vec![1.0, 2.0, 3.0], None).is_ok());
    
    // Adding vector with wrong dimension should fail
    assert!(index.add("v2", vec![1.0, 2.0], None).is_err());
    assert!(index.add("v3", vec![1.0, 2.0, 3.0, 4.0], None).is_err());
    
    // Searching with wrong dimension should fail
    assert!(index.search(&[1.0, 2.0], 1).is_err());
    assert!(index.search(&[1.0, 2.0, 3.0, 4.0], 1).is_err());
    
    // Searching with correct dimension should work
    assert!(index.search(&[1.0, 2.0, 3.0], 1).is_ok());
}
