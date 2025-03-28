package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Collection represents a vector collection
type Collection struct {
	Name      string `json:"name"`
	Dimension int    `json:"dimension"`
}

// Embedding represents a vector embedding
type Embedding struct {
	ID       string                 `json:"id" binding:"required"`
	Vector   []float32              `json:"vector" binding:"required"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// CreateCollectionRequest represents a request to create a vector collection
type CreateCollectionRequest struct {
	Name      string `json:"name" binding:"required"`
	Dimension int    `json:"dimension" binding:"required"`
}

// AddEmbeddingsRequest represents a request to add embeddings to a collection
type AddEmbeddingsRequest struct {
	Embeddings []Embedding `json:"embeddings" binding:"required"`
}

// SearchRequest represents a vector similarity search request
type SearchRequest struct {
	Vector       []float32              `json:"vector" binding:"required"`
	TopK         int                    `json:"top_k" binding:"required"`
	Filter       map[string]interface{} `json:"filter,omitempty"`
	IncludeValue bool                   `json:"include_value"`
}

// SearchResult represents a single similarity search result
type SearchResult struct {
	ID       string                 `json:"id"`
	Score    float32                `json:"score"`
	Vector   []float32              `json:"vector,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// VectorHandler handles vector operations
type VectorHandler struct {
	// Add dependencies here (e.g., connection to Rust core)
}

// NewVectorHandler creates a new vector handler
func NewVectorHandler() *VectorHandler {
	return &VectorHandler{}
}

// CreateCollection creates a new vector collection
func (h *VectorHandler) CreateCollection(c *gin.Context) {
	var req CreateCollectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Interface with core Rust library to create collection
	// For now, return mock data
	c.JSON(http.StatusCreated, gin.H{
		"name":      req.Name,
		"dimension": req.Dimension,
		"created":   true,
	})
}

// ListCollections lists all vector collections
func (h *VectorHandler) ListCollections(c *gin.Context) {
	// TODO: Interface with core Rust library to list collections
	// For now, return mock data
	collections := []Collection{
		{Name: "products", Dimension: 384},
		{Name: "users", Dimension: 768},
	}

	c.JSON(http.StatusOK, gin.H{
		"collections": collections,
	})
}

// AddEmbeddings adds embeddings to a collection
func (h *VectorHandler) AddEmbeddings(c *gin.Context) {
	collectionName := c.Param("name")
	if collectionName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Collection name is required"})
		return
	}

	var req AddEmbeddingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Interface with core Rust library to add embeddings
	// For now, return mock data
	c.JSON(http.StatusOK, gin.H{
		"collection": collectionName,
		"added":      len(req.Embeddings),
		"success":    true,
	})
}

// SearchSimilar performs a similarity search in a collection
func (h *VectorHandler) SearchSimilar(c *gin.Context) {
	collectionName := c.Param("name")
	if collectionName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Collection name is required"})
		return
	}

	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Interface with core Rust library to search similar vectors
	// For now, return mock data
	results := []SearchResult{
		{
			ID:    "doc1",
			Score: 0.92,
			Metadata: map[string]interface{}{
				"title": "Sample Document 1",
				"tags":  []string{"important", "featured"},
			},
		},
		{
			ID:    "doc2",
			Score: 0.85,
			Metadata: map[string]interface{}{
				"title": "Sample Document 2",
				"tags":  []string{"archived"},
			},
		},
	}

	// Include vectors if requested
	if req.IncludeValue {
		results[0].Vector = []float32{0.1, 0.2, 0.3, 0.4}
		results[1].Vector = []float32{0.2, 0.3, 0.4, 0.5}
	}

	c.JSON(http.StatusOK, gin.H{
		"collection": collectionName,
		"results":    results,
		"count":      len(results),
	})
}
