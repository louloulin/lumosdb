package lumos

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"

	"github.com/pkg/errors"
)

// APIResponse represents the standard API response from LumosDB
type APIResponse struct {
	Data      json.RawMessage `json:"data,omitempty"`
	Error     string          `json:"error,omitempty"`
	ErrorCode string          `json:"error_code,omitempty"`
}

// DoRequest sends a request to the API and parses the response
func (c *Client) DoRequest(method, endpoint string, body interface{}, result interface{}) error {
	// Build URL
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return errors.Wrap(err, "failed to parse base URL")
	}

	if !strings.HasPrefix(endpoint, "/") {
		endpoint = "/" + endpoint
	}

	u.Path = path.Join(u.Path, endpoint)

	// Create request
	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		if err != nil {
			return errors.Wrap(err, "failed to marshal request body")
		}
		reqBody = bytes.NewBuffer(jsonBody)
	}

	req, err := http.NewRequest(method, u.String(), reqBody)
	if err != nil {
		return errors.Wrap(err, "failed to create request")
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	if c.apiKey != "" {
		req.Header.Set("X-API-Key", c.apiKey)
	}

	// Send request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return errors.Wrap(err, "failed to send request")
	}
	defer resp.Body.Close()

	// Read response body
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return errors.Wrap(err, "failed to read response body")
	}

	// Parse response
	var apiResp APIResponse
	if err := json.Unmarshal(respBody, &apiResp); err != nil {
		return errors.Wrap(err, "failed to parse API response")
	}

	// Check for API error
	if apiResp.Error != "" {
		return fmt.Errorf("API error (%s): %s", apiResp.ErrorCode, apiResp.Error)
	}

	// Parse result if needed
	if result != nil && apiResp.Data != nil {
		if err := json.Unmarshal(apiResp.Data, result); err != nil {
			return errors.Wrap(err, "failed to parse response data")
		}
	}

	return nil
}

// Get sends a GET request to the API
func (c *Client) Get(endpoint string, result interface{}) error {
	return c.DoRequest(http.MethodGet, endpoint, nil, result)
}

// Post sends a POST request to the API
func (c *Client) Post(endpoint string, body, result interface{}) error {
	return c.DoRequest(http.MethodPost, endpoint, body, result)
}

// Put sends a PUT request to the API
func (c *Client) Put(endpoint string, body, result interface{}) error {
	return c.DoRequest(http.MethodPut, endpoint, body, result)
}

// Delete sends a DELETE request to the API
func (c *Client) Delete(endpoint string, result interface{}) error {
	return c.DoRequest(http.MethodDelete, endpoint, nil, result)
}
