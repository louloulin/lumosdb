package lumos

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

// VectorSearchOptions 定义向量搜索参数
type VectorSearchOptions struct {
	// 返回结果数量
	TopK int `json:"top_k"`
	// 分数阈值
	ScoreThreshold float64 `json:"score_threshold,omitempty"`
	// 过滤条件
	Filter map[string]interface{} `json:"filter,omitempty"`
}

// VectorMatch 表示向量搜索匹配结果
type VectorMatch struct {
	// 向量ID
	ID string `json:"id"`
	// 相似度分数
	Score float64 `json:"score"`
	// 向量值
	Vector []float32 `json:"vector,omitempty"`
	// 元数据
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

// VectorCollection 表示向量集合信息
type VectorCollection struct {
	// 集合名称
	Name string `json:"name"`
	// 向量维度
	Dimension int `json:"dimension"`
	// 向量数量
	Count int `json:"count,omitempty"`
}

// VectorService 提供向量操作功能
type VectorService struct {
	client *Client
}

// newVectorService 创建新的向量服务
func newVectorService(client *Client) *VectorService {
	return &VectorService{
		client: client,
	}
}

// ListCollections 获取所有向量集合
func (v *VectorService) ListCollections(ctx context.Context) ([]string, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	url := fmt.Sprintf("%s/api/vector/collections", v.client.BaseURL())
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if v.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", v.client.apiKey))
	}

	resp, err := v.client.httpClient.Do(req)
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

// CreateCollection 创建新的向量集合
func (v *VectorService) CreateCollection(ctx context.Context, name string, dimension int) error {
	if ctx == nil {
		ctx = context.Background()
	}

	url := fmt.Sprintf("%s/api/vector/collections", v.client.BaseURL())
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
	if v.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", v.client.apiKey))
	}

	resp, err := v.client.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to create collection: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to create collection: HTTP %s", resp.Status)
	}

	return nil
}

// DeleteCollection 删除向量集合
func (v *VectorService) DeleteCollection(ctx context.Context, name string) error {
	if ctx == nil {
		ctx = context.Background()
	}

	url := fmt.Sprintf("%s/api/vector/collections/%s", v.client.BaseURL(), name)
	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if v.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", v.client.apiKey))
	}

	resp, err := v.client.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete collection: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to delete collection: HTTP %s", resp.Status)
	}

	return nil
}

// AddEmbeddings 批量添加向量
func (v *VectorService) AddEmbeddings(ctx context.Context, collection string, ids []string, vectors [][]float32, metadata []map[string]interface{}) error {
	if ctx == nil {
		ctx = context.Background()
	}

	url := fmt.Sprintf("%s/api/vector/collections/%s/vectors", v.client.BaseURL(), collection)
	body := map[string]interface{}{
		"ids":        ids,
		"embeddings": vectors,
	}

	if metadata != nil {
		body["metadata"] = metadata
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
	if v.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", v.client.apiKey))
	}

	resp, err := v.client.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to add vectors: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to add vectors: HTTP %s", resp.Status)
	}

	return nil
}

// DeleteVector 删除向量
func (v *VectorService) DeleteVector(ctx context.Context, collection string, id string) error {
	if ctx == nil {
		ctx = context.Background()
	}

	url := fmt.Sprintf("%s/api/vector/collections/%s/vector/%s", v.client.BaseURL(), collection, id)
	req, err := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if v.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", v.client.apiKey))
	}

	resp, err := v.client.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to delete vector: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to delete vector: HTTP %s", resp.Status)
	}

	return nil
}

// Search 执行向量相似度搜索
func (v *VectorService) Search(ctx context.Context, collection string, vector []float32, options *VectorSearchOptions) ([]VectorMatch, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	url := fmt.Sprintf("%s/api/vector/collections/%s/search", v.client.BaseURL(), collection)

	// 构建搜索请求
	searchRequest := map[string]interface{}{
		"vector": vector,
	}

	if options != nil {
		searchRequest["top_k"] = options.TopK
		if options.ScoreThreshold > 0 {
			searchRequest["score_threshold"] = options.ScoreThreshold
		}
		if options.Filter != nil && len(options.Filter) > 0 {
			searchRequest["filter"] = options.Filter
		}
	}

	reqBody, err := json.Marshal(searchRequest)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", url, byteReader(reqBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	if v.client.apiKey != "" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", v.client.apiKey))
	}

	resp, err := v.client.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to search vectors: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to search vectors: HTTP %s", resp.Status)
	}

	var response struct {
		Success bool `json:"success"`
		Data    struct {
			Results []VectorMatch `json:"results"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&response); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return response.Data.Results, nil
}
