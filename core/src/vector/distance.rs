// Vector distance metrics for similarity search
//
// This module provides various distance/similarity metrics for comparing vectors.
// These are essential for nearest neighbor search in the vector store.

/// Calculates the dot product between two vectors
///
/// # Arguments
/// * `v1` - First vector
/// * `v2` - Second vector
///
/// # Returns
/// The dot product (scalar) result
pub fn dot_product(v1: &[f32], v2: &[f32]) -> f32 {
    if v1.len() != v2.len() {
        panic!("Vectors must have the same dimension");
    }
    
    v1.iter().zip(v2.iter()).map(|(a, b)| a * b).sum()
}

/// Calculates the L2 (Euclidean) distance between two vectors
///
/// # Arguments
/// * `v1` - First vector
/// * `v2` - Second vector
///
/// # Returns
/// The Euclidean distance between the vectors
pub fn euclidean_distance(v1: &[f32], v2: &[f32]) -> f32 {
    if v1.len() != v2.len() {
        panic!("Vectors must have the same dimension");
    }
    
    v1.iter()
      .zip(v2.iter())
      .map(|(a, b)| (a - b).powi(2))
      .sum::<f32>()
      .sqrt()
}

/// Calculates the squared Euclidean distance between two vectors
/// This is faster than euclidean_distance when only comparing distances
///
/// # Arguments
/// * `v1` - First vector
/// * `v2` - Second vector
///
/// # Returns
/// The squared Euclidean distance between the vectors
pub fn squared_euclidean_distance(v1: &[f32], v2: &[f32]) -> f32 {
    if v1.len() != v2.len() {
        panic!("Vectors must have the same dimension");
    }
    
    v1.iter()
      .zip(v2.iter())
      .map(|(a, b)| (a - b).powi(2))
      .sum()
}

/// Calculates the cosine similarity between two vectors
///
/// # Arguments
/// * `v1` - First vector
/// * `v2` - Second vector
///
/// # Returns
/// The cosine similarity (between -1 and 1)
pub fn cosine_similarity(v1: &[f32], v2: &[f32]) -> f32 {
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

/// Calculates the Manhattan (L1) distance between two vectors
///
/// # Arguments
/// * `v1` - First vector
/// * `v2` - Second vector
///
/// # Returns
/// The Manhattan distance between the vectors
pub fn manhattan_distance(v1: &[f32], v2: &[f32]) -> f32 {
    if v1.len() != v2.len() {
        panic!("Vectors must have the same dimension");
    }
    
    v1.iter()
      .zip(v2.iter())
      .map(|(a, b)| (a - b).abs())
      .sum()
}

/// Normalize a vector to unit length (L2 norm)
///
/// # Arguments
/// * `v` - Vector to normalize
///
/// # Returns
/// A new normalized vector
pub fn normalize(v: &[f32]) -> Vec<f32> {
    let norm = v.iter().map(|x| x.powi(2)).sum::<f32>().sqrt();
    
    if norm == 0.0 {
        // Return zero vector of same length if norm is zero
        vec![0.0; v.len()]
    } else {
        v.iter().map(|x| x / norm).collect()
    }
}

/// Distance metric types supported by the vector store
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum DistanceMetric {
    /// Cosine similarity (higher is more similar)
    Cosine,
    /// Euclidean distance (lower is more similar)
    Euclidean,
    /// Dot product (higher is more similar for normalized vectors)
    DotProduct,
    /// Manhattan distance (lower is more similar)
    Manhattan,
}

impl DistanceMetric {
    /// Calculate the similarity between two vectors using this metric
    ///
    /// # Arguments
    /// * `v1` - First vector
    /// * `v2` - Second vector
    ///
    /// # Returns
    /// A similarity score where higher means more similar
    pub fn similarity(&self, v1: &[f32], v2: &[f32]) -> f32 {
        match self {
            DistanceMetric::Cosine => cosine_similarity(v1, v2),
            DistanceMetric::DotProduct => dot_product(v1, v2),
            DistanceMetric::Euclidean => {
                // Convert distance to similarity (inverse relationship)
                let dist = euclidean_distance(v1, v2);
                1.0 / (1.0 + dist)
            },
            DistanceMetric::Manhattan => {
                // Convert distance to similarity (inverse relationship)
                let dist = manhattan_distance(v1, v2);
                1.0 / (1.0 + dist)
            },
        }
    }
    
    /// Calculate the distance between two vectors using this metric
    ///
    /// # Arguments
    /// * `v1` - First vector
    /// * `v2` - Second vector
    ///
    /// # Returns
    /// A distance score where lower means more similar
    pub fn distance(&self, v1: &[f32], v2: &[f32]) -> f32 {
        match self {
            DistanceMetric::Cosine => {
                // Convert similarity to distance
                1.0 - cosine_similarity(v1, v2)
            },
            DistanceMetric::DotProduct => {
                // Convert dot product to distance
                // For normalized vectors, this is equivalent to 1.0 - dot_product
                1.0 - dot_product(v1, v2)
            },
            DistanceMetric::Euclidean => euclidean_distance(v1, v2),
            DistanceMetric::Manhattan => manhattan_distance(v1, v2),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_dot_product() {
        let v1 = [1.0, 2.0, 3.0];
        let v2 = [4.0, 5.0, 6.0];
        
        // 1*4 + 2*5 + 3*6 = 4 + 10 + 18 = 32
        assert_eq!(dot_product(&v1, &v2), 32.0);
    }
    
    #[test]
    fn test_euclidean_distance() {
        let v1 = [1.0, 2.0, 3.0];
        let v2 = [4.0, 5.0, 6.0];
        
        // sqrt((1-4)^2 + (2-5)^2 + (3-6)^2) = sqrt(9 + 9 + 9) = sqrt(27) = 5.196
        let expected = 5.196;
        let actual = euclidean_distance(&v1, &v2);
        
        assert!((actual - expected).abs() < 0.001);
    }
    
    #[test]
    fn test_cosine_similarity() {
        let v1 = [1.0, 2.0, 3.0];
        let v2 = [4.0, 5.0, 6.0];
        
        // dot(v1, v2) / (|v1| * |v2|) = 32 / (sqrt(14) * sqrt(77))
        let expected = 0.974;
        let actual = cosine_similarity(&v1, &v2);
        
        assert!((actual - expected).abs() < 0.001);
    }
    
    #[test]
    fn test_manhattan_distance() {
        let v1 = [1.0, 2.0, 3.0];
        let v2 = [4.0, 5.0, 6.0];
        
        // |1-4| + |2-5| + |3-6| = 3 + 3 + 3 = 9
        assert_eq!(manhattan_distance(&v1, &v2), 9.0);
    }
    
    #[test]
    fn test_normalize() {
        let v = [3.0, 4.0];
        let normalized = normalize(&v);
        
        // |v| = sqrt(3^2 + 4^2) = 5
        // normalized = [3/5, 4/5] = [0.6, 0.8]
        assert!((normalized[0] - 0.6).abs() < 0.001);
        assert!((normalized[1] - 0.8).abs() < 0.001);
        
        // Verify it's a unit vector
        let norm = normalized.iter().map(|x| x.powi(2)).sum::<f32>().sqrt();
        assert!((norm - 1.0).abs() < 0.001);
    }
    
    #[test]
    fn test_distance_metrics() {
        let v1 = [1.0, 0.0];
        let v2 = [0.0, 1.0];
        
        // For orthogonal unit vectors:
        // - Cosine similarity should be 0
        // - Euclidean distance should be sqrt(2)
        // - Manhattan distance should be 2
        assert!((DistanceMetric::Cosine.similarity(&v1, &v2) - 0.0).abs() < 0.001);
        assert!((DistanceMetric::Euclidean.distance(&v1, &v2) - (2.0_f32).sqrt()).abs() < 0.001);
        assert_eq!(DistanceMetric::Manhattan.distance(&v1, &v2), 2.0);
    }
}
