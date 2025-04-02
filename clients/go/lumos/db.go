package lumos

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// DBService provides database operations
type DBService struct {
	client *Client
}

// newDBService creates a new DB service
func newDBService(client *Client) *DBService {
	return &DBService{
		client: client,
	}
}

// ListCollections lists all collections
func (s *DBService) ListCollections(ctx context.Context) ([]string, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	url := fmt.Sprintf("%s/api/vector/collections", s.client.BaseURL())
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if s.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.client.apiKey))
	}

	resp, err := s.client.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get collections: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to get collections: HTTP %s", resp.Status)
	}

	var response struct {
		Success bool `json:"success"`
		Data    struct {
			Collections []VectorCollection `json:"collections"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	var collections []string
	for _, c := range response.Data.Collections {
		collections = append(collections, c.Name)
	}

	return collections, nil
}

// CreateCollection creates a new collection
func (s *DBService) CreateCollection(ctx context.Context, name string, dimension int) error {
	if ctx == nil {
		ctx = context.Background()
	}

	url := fmt.Sprintf("%s/api/vector/collections", s.client.BaseURL())
	body := map[string]interface{}{
		"name":      name,
		"dimension": dimension,
	}

	reqBody, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, byteReader(reqBody))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if s.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.client.apiKey))
	}

	resp, err := s.client.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to create collection: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to create collection: HTTP %s", resp.Status)
	}

	return nil
}

// DeleteCollection deletes a collection
func (s *DBService) DeleteCollection(ctx context.Context, name string) error {
	if ctx == nil {
		ctx = context.Background()
	}

	url := fmt.Sprintf("%s/api/vector/collections/%s", s.client.BaseURL(), name)
	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if s.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.client.apiKey))
	}

	resp, err := s.client.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete collection: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to delete collection: HTTP %s", resp.Status)
	}

	return nil
}

// GetCollection gets information about a collection
func (s *DBService) GetCollection(name string, result interface{}) error {
	return s.client.Get(fmt.Sprintf("/collections/%s", name), result)
}
