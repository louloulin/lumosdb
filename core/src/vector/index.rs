// Vector index implementation for efficient similarity search
//
// This module provides indexing structures for vector data to enable
// fast approximate nearest neighbor (ANN) search operations.

use std::collections::HashMap;
use crate::Result;
use crate::LumosError;
use super::Embedding;
use super::distance::{DistanceMetric, normalize};

/// A simple vector index for approximate nearest neighbor (ANN) search
#[derive(Debug)]
pub struct VectorIndex {
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
    pub fn new(name: impl Into<String>, dimension: usize, metric: DistanceMetric) -> Self {
        VectorIndex {
            name: name.into(),
            dimension,
            metric,
            vectors: HashMap::new(),
            metadata: HashMap::new(),
        }
    }
    
    /// Add a vector to the index
    pub fn add(&mut self, id: impl Into<String>, vector: Vec<f32>, metadata: Option<serde_json::Value>) -> Result<()> {
        let id = id.into();
        
        if vector.len() != self.dimension {
            return Err(LumosError::InvalidArgument(format!(
                "Vector dimension mismatch. Expected {}, got {}",
                self.dimension, vector.len()
            )));
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
    pub fn remove(&mut self, id: &str) -> bool {
        let vector_removed = self.vectors.remove(id).is_some();
        self.metadata.remove(id);
        vector_removed
    }
    
    /// Get a vector by ID
    pub fn get(&self, id: &str) -> Option<(&Vec<f32>, Option<&serde_json::Value>)> {
        let vector = self.vectors.get(id)?;
        let metadata = self.metadata.get(id);
        Some((vector, metadata))
    }
    
    /// Find the k nearest neighbors to the query vector
    pub fn search(&self, query: &[f32], k: usize) -> Result<Vec<(String, f32)>> {
        if query.len() != self.dimension {
            return Err(LumosError::InvalidArgument(format!(
                "Query vector dimension mismatch. Expected {}, got {}",
                self.dimension, query.len()
            )));
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
    
    /// Get the size of the index (number of vectors)
    pub fn size(&self) -> usize {
        self.vectors.len()
    }
    
    /// Get the dimension of the vectors in the index
    pub fn dimension(&self) -> usize {
        self.dimension
    }
    
    /// Get the distance metric used by the index
    pub fn metric(&self) -> DistanceMetric {
        self.metric
    }
    
    /// Get the name of the index
    pub fn name(&self) -> &str {
        &self.name
    }
}

/// A partition-based vector index that divides the vector space
/// for more efficient search on large collections
pub struct PartitionedVectorIndex {
    /// Name of the index
    name: String,
    /// Dimension of the vectors
    dimension: usize,
    /// Distance metric
    metric: DistanceMetric,
    /// Number of partitions
    num_partitions: usize,
    /// Partition centroids
    centroids: Vec<Vec<f32>>,
    /// Vectors organized by partition
    partitions: Vec<HashMap<String, Vec<f32>>>,
    /// Metadata associated with vectors
    metadata: HashMap<String, serde_json::Value>,
}

impl PartitionedVectorIndex {
    /// Create a new partitioned vector index
    pub fn new(
        name: impl Into<String>, 
        dimension: usize, 
        metric: DistanceMetric,
        num_partitions: usize,
    ) -> Self {
        let partitions = (0..num_partitions)
            .map(|_| HashMap::new())
            .collect();
            
        // Initialize with empty centroids - they'll be computed when first vectors are added
        let centroids = Vec::new();
        
        PartitionedVectorIndex {
            name: name.into(),
            dimension,
            metric,
            num_partitions,
            centroids,
            partitions,
            metadata: HashMap::new(),
        }
    }
    
    /// Initialize centroids using a sample of vectors
    fn initialize_centroids(&mut self, sample_vectors: &[Vec<f32>]) {
        // Simple initialization using K-means++ like selection
        // Start with a random vector as the first centroid
        if sample_vectors.is_empty() {
            return;
        }
        
        let mut rng = rand::thread_rng();
        let mut centroids = Vec::new();
        
        // Choose first centroid uniformly at random
        let first_idx = rand::Rng::gen_range(&mut rng, 0..sample_vectors.len());
        centroids.push(sample_vectors[first_idx].clone());
        
        // Choose remaining centroids using weighted probabilities
        while centroids.len() < self.num_partitions && centroids.len() < sample_vectors.len() {
            // Calculate distances from each point to the nearest existing centroid
            let distances: Vec<f32> = sample_vectors
                .iter()
                .map(|vector| {
                    centroids
                        .iter()
                        .map(|centroid| self.metric.distance(vector, centroid))
                        .min_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
                        .unwrap_or(f32::MAX)
                })
                .collect();
                
            // Convert distances to probabilities (distance squared)
            let total_dist: f32 = distances.iter().map(|d| d.powi(2)).sum();
            
            if total_dist == 0.0 {
                // All points are centroids already or all distances are zero
                break;
            }
            
            let probs: Vec<f32> = distances.iter().map(|d| d.powi(2) / total_dist).collect();
            
            // Choose next centroid based on probabilities
            let mut cumsum = 0.0;
            let rand_val = rand::Rng::gen::<f32>(&mut rng);
            
            for (i, prob) in probs.iter().enumerate() {
                cumsum += prob;
                if cumsum >= rand_val {
                    // Check if this vector is already a centroid
                    if !centroids.contains(&sample_vectors[i]) {
                        centroids.push(sample_vectors[i].clone());
                    }
                    break;
                }
            }
        }
        
        // Set the centroids
        self.centroids = centroids;
        
        // If we couldn't get enough centroids, duplicate some
        while self.centroids.len() < self.num_partitions {
            if self.centroids.is_empty() {
                // If we have no centroids at all, create a zero vector
                self.centroids.push(vec![0.0; self.dimension]);
            } else {
                // Duplicate the first centroid with small random perturbations
                let mut new_centroid = self.centroids[0].clone();
                for val in &mut new_centroid {
                    *val += (rand::Rng::gen::<f32>(&mut rng) - 0.5) * 0.01;
                }
                self.centroids.push(new_centroid);
            }
        }
    }
    
    /// Assign a vector to its nearest partition
    fn assign_partition(&self, vector: &[f32]) -> usize {
        if self.centroids.is_empty() {
            return 0;
        }
        
        // Find the nearest centroid
        let mut min_dist = f32::MAX;
        let mut nearest_partition = 0;
        
        for (i, centroid) in self.centroids.iter().enumerate() {
            let dist = self.metric.distance(vector, centroid);
            if dist < min_dist {
                min_dist = dist;
                nearest_partition = i;
            }
        }
        
        nearest_partition
    }
    
    /// Add a vector to the index
    pub fn add(&mut self, id: impl Into<String>, vector: Vec<f32>, metadata: Option<serde_json::Value>) -> Result<()> {
        let id = id.into();
        
        if vector.len() != self.dimension {
            return Err(LumosError::InvalidArgument(format!(
                "Vector dimension mismatch. Expected {}, got {}",
                self.dimension, vector.len()
            )));
        }
        
        // Initialize centroids if this is the first vector
        if self.centroids.is_empty() {
            self.initialize_centroids(&[vector.clone()]);
        }
        
        // Normalize the vector for more efficient similarity search
        let normalized_vector = normalize(&vector);
        
        // Find the appropriate partition
        let partition_idx = self.assign_partition(&normalized_vector);
        
        // Add to the partition
        if partition_idx < self.partitions.len() {
            self.partitions[partition_idx].insert(id.clone(), normalized_vector);
        } else {
            // This should not happen, but just in case
            return Err(LumosError::Internal("Invalid partition index".to_string()));
        }
        
        // Store metadata if provided
        if let Some(meta) = metadata {
            self.metadata.insert(id, meta);
        }
        
        Ok(())
    }
    
    /// Remove a vector from the index
    pub fn remove(&mut self, id: &str) -> bool {
        let mut found = false;
        
        // Search in all partitions
        for partition in &mut self.partitions {
            if partition.remove(id).is_some() {
                found = true;
                break;
            }
        }
        
        if found {
            self.metadata.remove(id);
        }
        
        found
    }
    
    /// Find the k nearest neighbors to the query vector
    pub fn search(&self, query: &[f32], k: usize) -> Result<Vec<(String, f32)>> {
        if query.len() != self.dimension {
            return Err(LumosError::InvalidArgument(format!(
                "Query vector dimension mismatch. Expected {}, got {}",
                self.dimension, query.len()
            )));
        }
        
        // Total vectors in the index
        let total_vectors: usize = self.partitions.iter().map(|p| p.len()).sum();
        
        if total_vectors == 0 {
            return Ok(vec![]);
        }
        
        // Normalize the query vector
        let normalized_query = normalize(query);
        
        // Find the nearest partition(s)
        let partition_scores: Vec<(usize, f32)> = self.centroids
            .iter()
            .enumerate()
            .map(|(i, centroid)| (i, self.metric.similarity(&normalized_query, centroid)))
            .collect();
        
        // Sort partitions by similarity to query (descending)
        let mut sorted_partitions: Vec<usize> = partition_scores
            .iter()
            .map(|(i, _)| *i)
            .collect();
            
        sorted_partitions.sort_by(|&a, &b| {
            let score_a = partition_scores[a].1;
            let score_b = partition_scores[b].1;
            score_b.partial_cmp(&score_a).unwrap_or(std::cmp::Ordering::Equal)
        });
        
        // Collect candidates from partitions
        let mut candidates = Vec::new();
        let mut total_candidates = 0;
        
        // We'll use partitions until we have enough candidates or we've used all partitions
        for &partition_idx in &sorted_partitions {
            let partition = &self.partitions[partition_idx];
            
            // Add vectors from this partition to candidates
            for (id, vector) in partition {
                let similarity = self.metric.similarity(&normalized_query, vector);
                candidates.push((id.clone(), similarity));
            }
            
            total_candidates += partition.len();
            
            // If we have collected enough candidates, stop
            if total_candidates >= k * 2 && candidates.len() > k {
                break;
            }
        }
        
        // Sort candidates by similarity (higher is better)
        candidates.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        // Return top k results
        let results = candidates.into_iter().take(k).collect();
        
        Ok(results)
    }
    
    /// Recompute centroids based on current vectors
    fn recompute_centroids(&mut self) {
        // Skip if there are no vectors
        let total_vectors: usize = self.partitions.iter().map(|p| p.len()).sum();
        if total_vectors == 0 {
            return;
        }
        
        // Initialize new centroids
        let mut new_centroids = vec![vec![0.0f32; self.dimension]; self.centroids.len()];
        let mut counts = vec![0usize; self.centroids.len()];
        
        // Sum vectors in each partition
        for (i, partition) in self.partitions.iter().enumerate() {
            for vector in partition.values() {
                for (j, val) in vector.iter().enumerate() {
                    new_centroids[i][j] += val;
                }
                counts[i] += 1;
            }
        }
        
        // Compute averages
        for (i, centroid) in new_centroids.iter_mut().enumerate() {
            if counts[i] > 0 {
                for val in centroid.iter_mut() {
                    *val /= counts[i] as f32;
                }
            }
        }
        
        // Update centroids
        self.centroids = new_centroids;
    }
    
    /// Get the size of the index (number of vectors)
    pub fn size(&self) -> usize {
        self.partitions.iter().map(|p| p.len()).sum()
    }
}

/// Type of vector index to use
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum IndexType {
    /// Flat index with exact search
    Flat,
    /// Partitioned index for approximate search
    Partitioned(usize), // Number of partitions
    /// Index using cosine similarity
    Cosine,
    /// Index using Euclidean distance
    Euclidean,
    /// Index using dot product
    DotProduct,
    /// Index using Manhattan distance
    Manhattan,
}

impl IndexType {
    /// Convert index type to distance metric
    pub fn to_distance_metric(&self) -> DistanceMetric {
        match self {
            IndexType::Cosine => DistanceMetric::Cosine,
            IndexType::Euclidean => DistanceMetric::Euclidean,
            IndexType::DotProduct => DistanceMetric::DotProduct,
            IndexType::Manhattan => DistanceMetric::Manhattan,
            // Default to cosine for other index types
            _ => DistanceMetric::Cosine,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_vector_index_basic() {
        // Create a vector index
        let mut index = VectorIndex::new("test_index", 3, DistanceMetric::Cosine);
        
        // Add vectors
        index.add("v1", vec![1.0, 0.0, 0.0], None).unwrap();
        index.add("v2", vec![0.0, 1.0, 0.0], None).unwrap();
        index.add("v3", vec![0.0, 0.0, 1.0], None).unwrap();
        index.add("v4", vec![0.7, 0.7, 0.0], None).unwrap();
        
        // Check size
        assert_eq!(index.size(), 4);
        
        // Get vector
        let (vector, _) = index.get("v1").unwrap();
        assert_eq!(vector.len(), 3);
        
        // Search for similar vectors to [1.0, 0.0, 0.0]
        let results = index.search(&[1.0, 0.0, 0.0], 2).unwrap();
        
        // Should return v1 and v4 as most similar
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].0, "v1");
        assert_eq!(results[1].0, "v4");
        
        // Remove v1
        index.remove("v1");
        assert_eq!(index.size(), 3);
        
        // Search again
        let results = index.search(&[1.0, 0.0, 0.0], 2).unwrap();
        
        // Now v4 should be first
        assert_eq!(results[0].0, "v4");
    }
    
    #[test]
    fn test_vector_index_search_accuracy() {
        let mut index = VectorIndex::new("test_index", 3, DistanceMetric::Cosine);
        
        // Add some normalized vectors
        index.add("v1", normalize(&[1.0, 0.0, 0.0]), None).unwrap();
        index.add("v2", normalize(&[0.0, 1.0, 0.0]), None).unwrap();
        index.add("v3", normalize(&[0.0, 0.0, 1.0]), None).unwrap();
        index.add("v4", normalize(&[0.7, 0.7, 0.0]), None).unwrap();
        
        // Test different query vectors
        // Query [1,0,0] should be closest to v1
        let results = index.search(&[1.0, 0.0, 0.0], 4).unwrap();
        assert_eq!(results[0].0, "v1");
        
        // Query [0,1,0] should be closest to v2
        let results = index.search(&[0.0, 1.0, 0.0], 4).unwrap();
        assert_eq!(results[0].0, "v2");
        
        // Query [0.7,0.7,0] should be closest to v4, then v1 and v2 (equal distance)
        let results = index.search(&[0.7, 0.7, 0.0], 4).unwrap();
        assert_eq!(results[0].0, "v4");
    }
}
