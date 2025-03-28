use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use serde_json;
use rand::Rng;

/// A vector embedding with associated metadata for testing
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

/// Calculate the dot product between two vectors
fn dot_product(v1: &[f32], v2: &[f32]) -> f32 {
    if v1.len() != v2.len() {
        panic!("Vectors must have the same dimension");
    }
    
    v1.iter().zip(v2.iter()).map(|(a, b)| a * b).sum()
}

/// Calculate the Euclidean distance between two vectors
fn euclidean_distance(v1: &[f32], v2: &[f32]) -> f32 {
    if v1.len() != v2.len() {
        panic!("Vectors must have the same dimension");
    }
    
    v1.iter()
      .zip(v2.iter())
      .map(|(a, b)| (a - b).powi(2))
      .sum::<f32>()
      .sqrt()
}

/// Calculate the cosine similarity between two vectors
fn cosine_similarity(v1: &[f32], v2: &[f32]) -> f32 {
    if v1.len() != v2.len() {
        panic!("Vectors must have the same dimension");
    }
    
    let dot = dot_product(v1, v2);
    let norm1 = v1.iter().map(|x| x.powi(2)).sum::<f32>().sqrt();
    let norm2 = v2.iter().map(|x| x.powi(2)).sum::<f32>().sqrt();
    
    if norm1 == 0.0 || norm2 == 0.0 {
        0.0 // Avoid division by zero
    } else {
        dot / (norm1 * norm2)
    }
}

/// Normalize a vector to unit length
fn normalize(v: &[f32]) -> Vec<f32> {
    let norm = v.iter().map(|x| x.powi(2)).sum::<f32>().sqrt();
    
    if norm == 0.0 {
        // Return zero vector of same length if norm is zero
        vec![0.0; v.len()]
    } else {
        v.iter().map(|x| x / norm).collect()
    }
}

/// Distance metric types
#[derive(Debug, Clone, Copy, PartialEq)]
enum DistanceMetric {
    Cosine,
    Euclidean,
    DotProduct,
}

impl DistanceMetric {
    /// Calculate the similarity between two vectors
    fn similarity(&self, v1: &[f32], v2: &[f32]) -> f32 {
        match self {
            DistanceMetric::Cosine => cosine_similarity(v1, v2),
            DistanceMetric::DotProduct => dot_product(v1, v2),
            DistanceMetric::Euclidean => {
                // Convert distance to similarity (inverse relationship)
                let dist = euclidean_distance(v1, v2);
                1.0 / (1.0 + dist)
            },
        }
    }
}

/// Simple vector index for testing
struct VectorIndex {
    /// The name of the index
    name: String,
    /// The dimension of the vectors
    dimension: usize,
    /// The metric used for distance/similarity calculation
    metric: DistanceMetric,
    /// The vectors stored in the index
    vectors: HashMap<String, Vec<f32>>,
    /// Optional metadata associated with each vector
    metadata: HashMap<String, serde_json::Value>,
}

impl VectorIndex {
    /// Create a new vector index
    fn new(name: impl Into<String>, dimension: usize, metric: DistanceMetric) -> Self {
        VectorIndex {
            name: name.into(),
            dimension,
            metric,
            vectors: HashMap::new(),
            metadata: HashMap::new(),
        }
    }
    
    /// Add a vector to the index
    fn add(&mut self, id: impl Into<String>, vector: Vec<f32>, metadata: Option<serde_json::Value>) -> Result<(), String> {
        let id = id.into();
        
        if vector.len() != self.dimension {
            return Err(format!(
                "Vector dimension mismatch. Expected {}, got {}",
                self.dimension, vector.len()
            ));
        }
        
        // Normalize the vector for more efficient similarity search
        let normalized_vector = normalize(&vector);
        
        self.vectors.insert(id.clone(), normalized_vector);
        
        if let Some(meta) = metadata {
            self.metadata.insert(id, meta);
        }
        
        Ok(())
    }
    
    /// Remove a vector from the index
    fn remove(&mut self, id: &str) -> bool {
        let vector_removed = self.vectors.remove(id).is_some();
        self.metadata.remove(id);
        vector_removed
    }
    
    /// Get the size of the index (number of vectors)
    fn size(&self) -> usize {
        self.vectors.len()
    }
    
    /// Find the k nearest neighbors to the query vector
    fn search(&self, query: &[f32], k: usize) -> Result<Vec<(String, f32)>, String> {
        if query.len() != self.dimension {
            return Err(format!(
                "Query vector dimension mismatch. Expected {}, got {}",
                self.dimension, query.len()
            ));
        }
        
        if self.vectors.is_empty() {
            return Ok(vec![]);
        }
        
        // Normalize the query vector
        let normalized_query = normalize(query);
        
        // Calculate similarities between the query and all vectors
        let mut scores: Vec<(String, f32)> = self.vectors
            .iter()
            .map(|(id, vector)| {
                let score = self.metric.similarity(&normalized_query, vector);
                (id.clone(), score)
            })
            .collect();
        
        // Sort by similarity (higher is better)
        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        // Return top k results
        let results = scores.into_iter().take(k).collect();
        
        Ok(results)
    }
}

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

#[test]
fn test_vector_index() {
    // Create a vector index
    let mut index = VectorIndex::new("test_index", 3, DistanceMetric::Cosine);
    
    // Add vectors
    index.add("v1", vec![1.0, 0.0, 0.0], None).unwrap();
    index.add("v2", vec![0.0, 1.0, 0.0], None).unwrap();
    index.add("v3", vec![0.0, 0.0, 1.0], None).unwrap();
    index.add("v4", vec![0.7, 0.7, 0.0], None).unwrap();
    
    // Check size
    assert_eq!(index.size(), 4);
    
    // Search for similar vectors to [1.0, 0.0, 0.0]
    let results = index.search(&[1.0, 0.0, 0.0], 2).unwrap();
    
    // Should return v1 and v4 as most similar
    assert_eq!(results.len(), 2);
    assert_eq!(results[0].0, "v1");
    assert_eq!(results[1].0, "v4");
    
    // Remove v1
    index.remove("v1");
    
    // Search again
    let results = index.search(&[1.0, 0.0, 0.0], 2).unwrap();
    
    // Now v4 should be first
    assert_eq!(results[0].0, "v4");
}

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

#[test]
fn test_large_vector_index() {
    // Create a vector index with higher dimension
    let mut index = VectorIndex::new("large_index", 10, DistanceMetric::Cosine);
    let mut rng = rand::thread_rng();
    
    // Add 100 random vectors
    for i in 0..100 {
        let vector: Vec<f32> = (0..10).map(|_| rng.gen()).collect();
        let id = format!("v{}", i);
        index.add(&id, vector, None).unwrap();
    }
    
    // Check size
    assert_eq!(index.size(), 100);
    
    // Create a random query vector
    let query: Vec<f32> = (0..10).map(|_| rng.gen()).collect();
    
    // Search for similar vectors
    let results = index.search(&query, 10).unwrap();
    
    // Should return 10 results
    assert_eq!(results.len(), 10);
    
    // Similarities should be between 0 and 1
    for (_, similarity) in &results {
        assert!(*similarity >= 0.0 && *similarity <= 1.0);
    }
    
    // Results should be sorted by similarity (descending)
    for i in 0..results.len()-1 {
        assert!(results[i].1 >= results[i+1].1);
    }
}
