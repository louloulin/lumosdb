package lumos

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// HealthResponse 表示健康检查响应
type HealthResponse struct {
	Status      string  `json:"status"`
	Version     string  `json:"version"`
	Uptime      int64   `json:"uptime,omitempty"`
	CpuUsage    float64 `json:"cpu_usage,omitempty"`
	MemoryUsage int64   `json:"memory_usage,omitempty"`
	Connections int     `json:"connections,omitempty"`
}

// HealthService 提供健康检查功能
type HealthService struct {
	client *Client
}

// newHealthService 创建新的健康检查服务
func newHealthService(client *Client) *HealthService {
	return &HealthService{
		client: client,
	}
}

// Check 执行健康检查请求
func (h *HealthService) Check(ctx context.Context) (*HealthResponse, error) {
	if ctx == nil {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
	}

	// 构建API URL
	url := fmt.Sprintf("%s/api/health", h.client.BaseURL())

	// 创建请求
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// 添加请求头
	req.Header.Set("Content-Type", "application/json")
	if h.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", h.client.apiKey))
	}

	// 发送请求
	resp, err := h.client.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("health check failed: %w", err)
	}
	defer resp.Body.Close()

	// 检查响应状态
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("health check failed with status: %s", resp.Status)
	}

	// 解析响应
	var response struct {
		Success bool           `json:"success"`
		Data    HealthResponse `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse health response: %w", err)
	}

	return &response.Data, nil
}
