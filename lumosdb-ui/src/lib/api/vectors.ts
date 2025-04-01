// Types for vector data
interface VectorMetadata {
  [key: string]: string | number | boolean;
}

interface VectorItem {
  id: number;
  text: string;
  metadata: VectorMetadata;
  vector: number[];
  score?: string | number;
}

interface VectorCollection {
  id: string;
  name: string;
  description: string;
  dimensions: number;
  model: string;
  count: number;
  created_at: string;
  metadata: {
    indexed: boolean;
    similarity: "cosine" | "dot" | "euclidean";
  };
}

// Mock data for vector collections
export const mockVectorCollections: VectorCollection[] = [
  {
    id: "product_embeddings",
    name: "Product Embeddings",
    description: "Vector embeddings for product descriptions",
    dimensions: 1536,
    model: "text-embedding-3-large",
    count: 2500,
    created_at: "2023-11-15",
    metadata: {
      indexed: true,
      similarity: "cosine"
    }
  },
  {
    id: "customer_profiles",
    name: "Customer Profiles",
    description: "Vector embeddings for customer behavior and preferences",
    dimensions: 768,
    model: "text-embedding-ada-002",
    count: 1200,
    created_at: "2023-12-02",
    metadata: {
      indexed: true,
      similarity: "cosine"
    }
  },
  {
    id: "image_features",
    name: "Image Features",
    description: "Feature vectors extracted from product images",
    dimensions: 1024,
    model: "clip-ViT-B-32",
    count: 5600,
    created_at: "2024-01-28",
    metadata: {
      indexed: true,
      similarity: "dot"
    }
  },
  {
    id: "sentiment_vectors",
    name: "Sentiment Analysis",
    description: "Text embeddings for sentiment analysis",
    dimensions: 384,
    model: "all-MiniLM-L6-v2",
    count: 850,
    created_at: "2024-02-15",
    metadata: {
      indexed: true,
      similarity: "cosine"
    }
  },
];

// Mock data for vector items
const mockVectorData: Record<string, VectorItem[]> = {
  product_embeddings: [
    { id: 1, text: "Ergonomic Office Chair with Lumbar Support", metadata: { category: "Furniture", price: 199.99, rating: 4.5 }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 2, text: "Wireless Noise Cancelling Headphones", metadata: { category: "Electronics", price: 249.99, rating: 4.8 }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 3, text: "Ultra-Thin Laptop with 16GB RAM", metadata: { category: "Electronics", price: 1299.99, rating: 4.7 }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 4, text: "Smart Home Hub with Voice Assistant", metadata: { category: "Electronics", price: 129.99, rating: 4.2 }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 5, text: "Professional Kitchen Knife Set", metadata: { category: "Kitchen", price: 89.99, rating: 4.6 }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 6, text: "Yoga Mat with Alignment Lines", metadata: { category: "Fitness", price: 39.99, rating: 4.4 }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 7, text: "Adjustable Dumbbell Set", metadata: { category: "Fitness", price: 299.99, rating: 4.7 }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 8, text: "Smartphone with Triple Camera", metadata: { category: "Electronics", price: 799.99, rating: 4.6 }, vector: Array(5).fill(0).map(() => Math.random()) },
  ],
  customer_profiles: [
    { id: 1, text: "Tech enthusiast who frequently purchases latest gadgets", metadata: { segment: "Early Adopters", age_range: "25-34", spending: "High" }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 2, text: "Fitness-focused customer with interest in home workout equipment", metadata: { segment: "Health Conscious", age_range: "35-44", spending: "Medium" }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 3, text: "Budget-conscious shopper who prioritizes value", metadata: { segment: "Value Seekers", age_range: "45-54", spending: "Low" }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 4, text: "Luxury customer who focuses on premium products", metadata: { segment: "Premium", age_range: "35-44", spending: "Very High" }, vector: Array(5).fill(0).map(() => Math.random()) },
    { id: 5, text: "Parent shopping for family and children's products", metadata: { segment: "Family", age_range: "25-34", spending: "Medium" }, vector: Array(5).fill(0).map(() => Math.random()) },
  ]
};

// Get all collections
export async function getVectorCollections(): Promise<VectorCollection[]> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockVectorCollections);
    }, 500);
  });
}

// Get collection by ID
export async function getVectorCollection(id: string): Promise<VectorCollection> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const collection = mockVectorCollections.find((c) => c.id === id);
      if (collection) {
        resolve(collection);
      } else {
        reject(new Error(`Collection with ID ${id} not found`));
      }
    }, 300);
  });
}

// Get vectors from a collection (paginated)
export async function getVectorsFromCollection(
  collectionId: string,
  options: { limit?: number; offset?: number }
): Promise<{ data: VectorItem[]; total: number; }> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const vectors = mockVectorData[collectionId];
      if (!vectors) {
        reject(new Error(`No vectors found for collection ${collectionId}`));
        return;
      }
      
      const { limit = 10, offset = 0 } = options;
      const paginatedData = vectors.slice(offset, offset + limit);
      
      resolve({ 
        data: paginatedData, 
        total: vectors.length 
      });
    }, 400);
  });
}

// Create a new collection
export async function createVectorCollection(data: {
  name: string;
  description: string;
  dimensions: number;
  model: string;
  metadata?: Partial<VectorCollection['metadata']>;
}): Promise<VectorCollection> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const newCollection: VectorCollection = {
        id: data.name.toLowerCase().replace(/\s+/g, '_'),
        name: data.name,
        description: data.description,
        dimensions: data.dimensions,
        model: data.model,
        count: 0,
        created_at: new Date().toISOString().split('T')[0],
        metadata: {
          indexed: data.metadata?.indexed ?? true,
          similarity: data.metadata?.similarity ?? "cosine"
        }
      };
      
      // In a real application, this would be persisted
      // mockVectorCollections.push(newCollection);
      
      resolve(newCollection);
    }, 600);
  });
}

// Perform vector search
export async function searchVectors(
  collectionId: string,
  query: string,
  options: { 
    limit?: number; 
    filter?: Record<string, any>;
  }
): Promise<(VectorItem & { score: string })[]> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const vectors = mockVectorData[collectionId];
      if (!vectors) {
        reject(new Error(`Collection ${collectionId} not found`));
        return;
      }
      
      // In a real implementation, this would do actual vector similarity search
      // Here we just do a simple text-based search on the 'text' field to simulate
      const lowercaseQuery = query.toLowerCase();
      let results = vectors.filter(item => 
        item.text.toLowerCase().includes(lowercaseQuery)
      );
      
      // Apply filters if any
      if (options.filter) {
        Object.entries(options.filter).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            results = results.filter(item => {
              if (key.startsWith('metadata.')) {
                const metadataKey = key.split('.')[1];
                return item.metadata[metadataKey] === value;
              }
              return (item as any)[key] === value;
            });
          }
        });
      }
      
      // Add a mock similarity score
      const resultsWithScore = results.map(item => ({
        ...item,
        score: (0.5 + Math.random() * 0.5).toFixed(4), // Random score between 0.5 and 1.0
      }));
      
      // Sort by score (descending)
      resultsWithScore.sort((a, b) => Number(b.score) - Number(a.score));
      
      // Apply limit
      const { limit = 10 } = options;
      const limitedResults = resultsWithScore.slice(0, limit);
      
      resolve(limitedResults);
    }, 800);
  });
}

// Upload vectors (mock implementation)
export async function uploadVectors(
  collectionId: string,
  vectors: Omit<VectorItem, 'id'>[]
): Promise<{ success: boolean; count: number; error?: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real implementation, this would add the vectors to the collection
      resolve({ success: true, count: vectors.length });
    }, 1000);
  });
}

// Delete a collection
export async function deleteVectorCollection(
  collectionId: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // In a real implementation, this would delete the collection
      resolve({ success: true });
    }, 500);
  });
}

// Get vector stats for a collection
export async function getVectorStats(
  collectionId: string
): Promise<{
  count: number;
  dimensions: number;
  model: string;
  metadata_fields: string[];
  index_type: string;
  created_at: string;
}> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const collection = mockVectorCollections.find((c) => c.id === collectionId);
      if (!collection) {
        reject(new Error(`Collection with ID ${collectionId} not found`));
        return;
      }
      
      const vectors = mockVectorData[collectionId];
      
      resolve({
        count: collection.count,
        dimensions: collection.dimensions,
        model: collection.model,
        metadata_fields: vectors && vectors.length > 0 ? Object.keys(vectors[0].metadata) : [],
        index_type: collection.metadata?.indexed ? "HNSW" : "None",
        created_at: collection.created_at,
      });
    }, 400);
  });
} 