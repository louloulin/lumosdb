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
            
            // Calculate sum of squared distances for probability weighting
            let sum_sq_distances: f32 = distances.iter().map(|d| d * d).sum();
            
            if sum_sq_distances <= 0.0 {
                // All remaining points are duplicates of existing centroids
                break;
            }
            
            // Select next centroid with probability proportional to distance squared
            let cutoff = rand::Rng::gen_range(&mut rng, 0.0..sum_sq_distances);
            let mut cumulative = 0.0;
            
            for (idx, &dist) in distances.iter().enumerate() {
                cumulative += dist * dist;
                if cumulative >= cutoff {
                    centroids.push(sample_vectors[idx].clone());
                    break;
                }
            }
        }
        
        // If we couldn't get enough centroids (e.g., few unique vectors),
        // duplicate the ones we have
        while centroids.len() < self.num_partitions {
            let idx = rand::Rng::gen_range(&mut rng, 0..centroids.len());
            centroids.push(centroids[idx].clone());
        }
        
        self.centroids = centroids;
    }
    
    /// Assign a vector to its nearest partition
    fn assign_partition(&self, vector: &[f32]) -> usize {
        if self.centroids.is_empty() {
            return 0;
        }
        
        let mut min_dist = f32::MAX;
        let mut closest_partition = 0;
        
        for (i, centroid) in self.centroids.iter().enumerate() {
            let dist = self.metric.distance(vector, centroid);
            if dist < min_dist {
                min_dist = dist;
                closest_partition = i;
            }
        }
        
        closest_partition
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
            // With just one vector, all centroids will be the same
            self.centroids = vec![normalize(&vector); self.num_partitions];
        }
        
        // Normalize the vector
        let normalized_vector = normalize(&vector);
        
        // Assign to nearest partition
        let partition_idx = self.assign_partition(&normalized_vector);
        
        // Store the vector in the assigned partition
        self.partitions[partition_idx].insert(id.clone(), normalized_vector);
        
        // Store metadata if provided
        if let Some(meta) = metadata {
            self.metadata.insert(id, meta);
        }
        
        // Recompute centroids periodically (this is a simplified approach)
        // In practice, you'd rebalance less frequently and use more sophisticated methods
        let total_vectors: usize = self.partitions.iter().map(|p| p.len()).sum();
        if total_vectors % 1000 == 0 {
            self.recompute_centroids();
        }
        
        Ok(())
    }
    
    /// Remove a vector from the index
    pub fn remove(&mut self, id: &str) -> bool {
        // Search through all partitions (this could be optimized with another lookup table)
        let mut found = false;
        
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
        
        // Normalize the query vector
        let normalized_query = normalize(query);
        
        // Identify closest partition(s)
        let mut partition_distances: Vec<(usize, f32)> = self.centroids
            .iter()
            .enumerate()
            .map(|(i, centroid)| {
                let dist = self.metric.distance(&normalized_query, centroid);
                (i, dist)
            })
            .collect();
        
        // Sort partitions by distance to query
        partition_distances.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));
        
        // Search in closest partitions first
        let mut results = Vec::new();
        let mut seen_ids = std::collections::HashSet::new();
        
        // Number of partitions to search - this is a tradeoff between accuracy and speed
        // For small k, searching 1-2 partitions often gives good results
        let partitions_to_search = std::cmp::min(2, self.num_partitions);
        
        for (partition_idx, _) in partition_distances.iter().take(partitions_to_search) {
            let partition = &self.partitions[*partition_idx];
            
            // Calculate similarities for all vectors in this partition
            for (id, vector) in partition {
                if seen_ids.contains(id) {
                    continue;
                }
                
                let similarity = self.metric.similarity(&normalized_query, vector);
                results.push((id.clone(), similarity));
                seen_ids.insert(id);
            }
        }
        
        // Sort by similarity (higher is better)
        results.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap_or(std::cmp::Ordering::Equal));
        
        // Return top k results
        Ok(results.into_iter().take(k).collect())
    }
    
    /// Recompute centroids based on current vectors
    fn recompute_centroids(&mut self) {
        // Skip if we have no vectors
        let total_vectors: usize = self.partitions.iter().map(|p| p.len()).sum();
        if total_vectors == 0 {
            return;
        }
        
        // Collect all vectors for k-means
        let mut all_vectors: Vec<Vec<f32>> = Vec::with_capacity(total_vectors);
        for partition in &self.partitions {
            all_vectors.extend(partition.values().cloned());
        }
        
        // Need to reset partitions to recompute membership
        let old_partitions = std::mem::replace(&mut self.partitions, 
            (0..self.num_partitions).map(|_| HashMap::new()).collect());
        
        // Initialize new centroids
        self.initialize_centroids(&all_vectors);
        
        // Reassign all vectors to new partitions
        for (partition, _) in old_partitions.into_iter().enumerate() {
            for (id, vector) in self.partitions[partition].clone() {
                let new_partition = self.assign_partition(&vector);
                self.partitions[new_partition].insert(id, vector);
            }
        }
    }
    
    /// Get the size of the index (number of vectors)
    pub fn size(&self) -> usize {
        self.partitions.iter().map(|p| p.len()).sum()
    }
}

/// Type of vector index to use
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum IndexType {
    /// A flat index that stores all vectors in a single structure
    Flat,
    /// A partitioned index that divides vectors into partitions for faster search
    Partitioned,
    /// A hierarchical navigable small world (HNSW) graph index
    HNSW,
}

#[cfg(test)]
mod tests {
    use super::*;
    use rand::Rng;
    
    #[test]
    fn test_vector_index_basic() {
        let mut index = VectorIndex::new("test_index", 3, DistanceMetric::Cosine);
        
        // Add some vectors
        index.add("v1", vec![1.0, 0.0, 0.0], None).unwrap();
        index.add("v2", vec![0.0, 1.0, 0.0], None).unwrap();
        index.add("v3", vec![0.0, 0.0, 1.0], None).unwrap();
        
        // Check size
        assert_eq!(index.size(), 3);
        
        // Retrieve a vector
        let (vector, _) = index.get("v1").unwrap();
        assert!((vector[0] - 1.0).abs() < 0.001);
        assert!((vector[1] - 0.0).abs() < 0.001);
        assert!((vector[2] - 0.0).abs() < 0.001);
        
        // Search for nearest neighbors to [1, 0, 0]
        let results = index.search(&[1.0, 0.0, 0.0], 2).unwrap();
        assert_eq!(results.len(), 2);
        assert_eq!(results[0].0, "v1"); // Closest should be v1
        
        // Remove a vector
        assert!(index.remove("v2"));
        assert_eq!(index.size(), 2);
        
        // Verify it's gone
        assert!(index.get("v2").is_none());
    }
    
    #[test]
    fn test_vector_index_search_accuracy() {
        let mut index = VectorIndex::new("accuracy_test", 10, DistanceMetric::Cosine);
        
        // Create a "ground truth" vector that we'll search for
        let target = vec![0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
        
        // Add the target and many random vectors
        index.add("target", target.clone(), None).unwrap();
        
        let mut rng = rand::thread_rng();
        for i in 0..100 {
            let random_vec: Vec<f32> = (0..10).map(|_| rng.gen()).collect();
            index.add(format!("random_{}", i), random_vec, None).unwrap();
        }
        
        // Search for the target vector - it should be the closest match to itself
        let results = index.search(&target, 1).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].0, "target");
        assert!((results[0].1 - 1.0).abs() < 0.001); // Should have similarity ~1.0
    }
}
