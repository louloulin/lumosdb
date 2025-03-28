use lumos_core::{
    LumosError, Result,
    vector::{
        distance::{cosine_similarity, euclidean_distance, DistanceMetric},
        index::{VectorIndex, IndexType}
    },
};

/// Test vector distance calculation
#[test]
fn test_vector_distance_metrics() {
    // Test cosine similarity
    let v1 = [1.0, 0.0, 0.0];
    let v2 = [0.0, 1.0, 0.0];
    let v3 = [1.0, 1.0, 0.0];
    
    // Orthogonal vectors should have 0 similarity
    assert!((cosine_similarity(&v1, &v2) - 0.0).abs() < 0.001);
    
    // Same vector should have similarity 1.0
    assert!((cosine_similarity(&v1, &v1) - 1.0).abs() < 0.001);
    
    // 45-degree angle should have similarity 0.7071 (sqrt(2)/2)
    assert!((cosine_similarity(&v1, &v3) - 0.7071).abs() < 0.001);
    
    // Test Euclidean distance
    assert!((euclidean_distance(&v1, &v2) - 1.414).abs() < 0.001); // sqrt(2)
    assert!((euclidean_distance(&v1, &v1) - 0.0).abs() < 0.001);
    assert!((euclidean_distance(&v1, &v3) - 1.0).abs() < 0.001);
    
    // Test distance metrics enum
    let cosine = DistanceMetric::Cosine;
    let euclidean = DistanceMetric::Euclidean;
    
    assert!((cosine.similarity(&v1, &v1) - 1.0).abs() < 0.001);
    assert!((euclidean.similarity(&v1, &v2) - 0.414).abs() < 0.001); // 1/(1+sqrt(2))
}

/// Test basic vector index functionality
#[test]
fn test_vector_index() -> Result<()> {
    // Create a vector index
    let mut index = VectorIndex::new("test_index", 3, DistanceMetric::Cosine);
    
    // Add vectors
    index.add("v1", vec![1.0, 0.0, 0.0], None)?;
    index.add("v2", vec![0.0, 1.0, 0.0], None)?;
    index.add("v3", vec![0.0, 0.0, 1.0], None)?;
    index.add("v4", vec![0.7, 0.7, 0.0], None)?;
    
    // Check size
    assert_eq!(index.size(), 4);
    
    // Search for similar vectors to [1.0, 0.0, 0.0]
    let results = index.search(&[1.0, 0.0, 0.0], 2)?;
    
    // Should return v1 and v4 as most similar
    assert_eq!(results.len(), 2);
    assert_eq!(results[0].0, "v1");
    assert_eq!(results[1].0, "v4");
    
    // Remove v1
    index.remove("v1");
    
    // Search again
    let results = index.search(&[1.0, 0.0, 0.0], 2)?;
    
    // Now v4 should be first
    assert_eq!(results[0].0, "v4");
    
    Ok(())
}

/// Test handling invalid dimensions
#[test]
fn test_vector_dimension_validation() {
    // Create a vector index with dimension 3
    let mut index = VectorIndex::new("test_index", 3, DistanceMetric::Cosine);
    
    // Adding vector with wrong dimension should error
    let result = index.add("v1", vec![1.0, 0.0], None);
    assert!(result.is_err());
    
    // Searching with wrong dimension should error
    let result = index.search(&[1.0, 0.0], 2);
    assert!(result.is_err());
    
    // Create a vector index for empty vectors (dimension 0)
    let mut empty_index = VectorIndex::new("empty_index", 0, DistanceMetric::Cosine);
    
    // Adding empty vector should work
    let result = empty_index.add("v1", vec![], None);
    assert!(result.is_ok());
    
    // Searching with empty vector should work
    let result = empty_index.search(&[], 2);
    assert!(result.is_ok());
}
