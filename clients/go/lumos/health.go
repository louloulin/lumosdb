package lumos

// HealthService handles health check operations
type HealthService struct {
	client *Client
}

// newHealthService creates a new Health service
func newHealthService(client *Client) *HealthService {
	return &HealthService{
		client: client,
	}
}

// HealthResponse represents a health check response
type HealthResponse struct {
	Status  string `json:"status"`
	Version string `json:"version"`
}

// Check checks the health of the LumosDB server
func (s *HealthService) Check() (*HealthResponse, error) {
	var resp HealthResponse
	if err := s.client.Get("/health", &resp); err != nil {
		return nil, err
	}
	return &resp, nil
}
