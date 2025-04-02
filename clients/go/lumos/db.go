package lumos

import "fmt"

// DBService handles collection operations
type DBService struct {
	client *Client
}

// newDBService creates a new DB service
func newDBService(client *Client) *DBService {
	return &DBService{
		client: client,
	}
}

// CollectionCreateRequest represents a request to create a collection
type CollectionCreateRequest struct {
	Name      string `json:"name"`
	Dimension int    `json:"dimension"`
}

// ListCollections lists all collections
func (s *DBService) ListCollections() ([]string, error) {
	var collections []string
	if err := s.client.Get("/collections", &collections); err != nil {
		return nil, err
	}
	return collections, nil
}

// CreateCollection creates a new collection
func (s *DBService) CreateCollection(name string, dimension int) error {
	req := CollectionCreateRequest{
		Name:      name,
		Dimension: dimension,
	}
	return s.client.Post("/collections", req, nil)
}

// DeleteCollection deletes a collection
func (s *DBService) DeleteCollection(name string) error {
	return s.client.Delete(fmt.Sprintf("/collections/%s", name), nil)
}

// GetCollection gets information about a collection
func (s *DBService) GetCollection(name string, result interface{}) error {
	return s.client.Get(fmt.Sprintf("/collections/%s", name), result)
}
