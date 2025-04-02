package lumos

import (
	"bytes"
	"io"
	"net/http"
	"time"
)

// Client is the main client for LumosDB
type Client struct {
	baseURL    string
	apiKey     string
	httpClient *http.Client

	// Services
	DB     *DBService
	Vector *VectorService
	Health *HealthService
}

// ClientOption is a function that configures a Client
type ClientOption func(*Client)

// WithAPIKey sets the API key for the client
func WithAPIKey(apiKey string) ClientOption {
	return func(c *Client) {
		c.apiKey = apiKey
	}
}

// WithHTTPClient sets the HTTP client for the client
func WithHTTPClient(httpClient *http.Client) ClientOption {
	return func(c *Client) {
		c.httpClient = httpClient
	}
}

// WithTimeout sets the timeout for the HTTP client
func WithTimeout(timeout time.Duration) ClientOption {
	return func(c *Client) {
		c.httpClient.Timeout = timeout
	}
}

// NewClient creates a new LumosDB client
func NewClient(baseURL string, options ...ClientOption) *Client {
	client := &Client{
		baseURL: baseURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}

	// Apply options
	for _, option := range options {
		option(client)
	}

	// Initialize services
	client.DB = newDBService(client)
	client.Vector = newVectorService(client)
	client.Health = newHealthService(client)

	return client
}

// SetAPIKey sets the API key for the client
func (c *Client) SetAPIKey(apiKey string) {
	c.apiKey = apiKey
}

// BaseURL returns the base URL of the client
func (c *Client) BaseURL() string {
	return c.baseURL
}

// byteReader 将byte数组转换为io.Reader
func byteReader(b []byte) io.Reader {
	return bytes.NewReader(b)
}
