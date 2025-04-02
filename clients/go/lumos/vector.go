package lumos

import (
	"fmt"
)

// VectorService handles vector operations
type VectorService struct {
	client *Client
}

// newVectorService creates a new Vector service
func newVectorService(client *Client) *VectorService {
	return &VectorService{
		client: client,
	}
}

// VectorMatch represents a vector search match
type VectorMatch struct {
	ID       string                 `json:"id"`
	Score    float64                `json:"score"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// VectorSearchOptions represents options for vector search
type VectorSearchOptions struct {
	TopK           *int                   `json:"top_k,omitempty"`
	ScoreThreshold *float64               `json:"score_threshold,omitempty"`
	Filter         map[string]interface{} `json:"filter,omitempty"`
	Namespace      *string                `json:"namespace,omitempty"`
}

// VectorSearchRequest represents a vector search request
type VectorSearchRequest struct {
	Vector []float64 `json:"vector"`
	VectorSearchOptions
}

// VectorSearchResponse represents a vector search response
type VectorSearchResponse struct {
	Matches []VectorMatch `json:"matches"`
}

// VectorInsertRequest represents a request to insert a vector
type VectorInsertRequest struct {
	ID        string                 `json:"id"`
	Vector    []float64              `json:"vector"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Namespace string                 `json:"namespace,omitempty"`
}

// VectorUpdateRequest represents a request to update a vector
type VectorUpdateRequest struct {
	ID        string                 `json:"id"`
	Vector    []float64              `json:"vector,omitempty"`
	Metadata  map[string]interface{} `json:"metadata,omitempty"`
	Namespace string                 `json:"namespace,omitempty"`
}

// VectorDeleteRequest represents a request to delete a vector
type VectorDeleteRequest struct {
	ID        string `json:"id"`
	Namespace string `json:"namespace,omitempty"`
}

// Search searches for similar vectors
func (s *VectorService) Search(collectionName string, vector []float64, options *VectorSearchOptions) (*VectorSearchResponse, error) {
	req := VectorSearchRequest{
		Vector: vector,
	}

	if options != nil {
		req.TopK = options.TopK
		req.ScoreThreshold = options.ScoreThreshold
		req.Filter = options.Filter
		req.Namespace = options.Namespace
	}

	var resp VectorSearchResponse
	err := s.client.Post(fmt.Sprintf("/collections/%s/vectors/search", collectionName), req, &resp)
	if err != nil {
		return nil, err
	}

	return &resp, nil
}

// Add adds a vector to a collection
func (s *VectorService) Add(collectionName, id string, vector []float64, metadata map[string]interface{}, namespace string) error {
	req := VectorInsertRequest{
		ID:        id,
		Vector:    vector,
		Metadata:  metadata,
		Namespace: namespace,
	}

	return s.client.Post(fmt.Sprintf("/collections/%s/vectors", collectionName), req, nil)
}

// Update updates a vector in a collection
func (s *VectorService) Update(collectionName, id string, vector []float64, metadata map[string]interface{}, namespace string) error {
	req := VectorUpdateRequest{
		ID:        id,
		Vector:    vector,
		Metadata:  metadata,
		Namespace: namespace,
	}

	return s.client.Post(fmt.Sprintf("/collections/%s/vectors/update", collectionName), req, nil)
}

// Delete deletes a vector from a collection
func (s *VectorService) Delete(collectionName, id string, namespace string) error {
	req := VectorDeleteRequest{
		ID:        id,
		Namespace: namespace,
	}

	return s.client.Post(fmt.Sprintf("/collections/%s/vectors/delete", collectionName), req, nil)
}
