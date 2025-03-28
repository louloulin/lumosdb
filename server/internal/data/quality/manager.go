package quality

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// DefaultManager implements the QualityManager interface
type DefaultManager struct {
	monitor  *DefaultMonitor
	enhancer *DefaultEnhancer
	issues   map[string]*QualityIssue
	lock     sync.RWMutex
}

// NewDefaultManager creates a new DefaultManager instance
func NewDefaultManager() *DefaultManager {
	return &DefaultManager{
		monitor:  NewDefaultMonitor(),
		enhancer: NewDefaultEnhancer(),
		issues:   make(map[string]*QualityIssue),
	}
}

// Implement QualityMonitor interface methods
func (m *DefaultManager) AddRule(ctx context.Context, rule *QualityRule) error {
	return m.monitor.AddRule(ctx, rule)
}

func (m *DefaultManager) UpdateRule(ctx context.Context, rule *QualityRule) error {
	return m.monitor.UpdateRule(ctx, rule)
}

func (m *DefaultManager) DeleteRule(ctx context.Context, ruleID string) error {
	return m.monitor.DeleteRule(ctx, ruleID)
}

func (m *DefaultManager) GetRule(ctx context.Context, ruleID string) (*QualityRule, error) {
	return m.monitor.GetRule(ctx, ruleID)
}

func (m *DefaultManager) ListRules(ctx context.Context) ([]*QualityRule, error) {
	return m.monitor.ListRules(ctx)
}

func (m *DefaultManager) CheckQuality(ctx context.Context, tableName string, data interface{}) ([]*QualityIssue, error) {
	issues, err := m.monitor.CheckQuality(ctx, tableName, data)
	if err != nil {
		return nil, err
	}

	// Store issues for tracking
	m.lock.Lock()
	for _, issue := range issues {
		m.issues[issue.ID] = issue
	}
	m.lock.Unlock()

	return issues, nil
}

func (m *DefaultManager) GetQualityScore(ctx context.Context, tableName string, metric QualityMetric) (*QualityScore, error) {
	return m.monitor.GetQualityScore(ctx, tableName, metric)
}

// Implement QualityEnhancer interface methods
func (m *DefaultManager) AddEnhancementRule(ctx context.Context, rule *EnhancementRule) error {
	return m.enhancer.AddEnhancementRule(ctx, rule)
}

func (m *DefaultManager) UpdateEnhancementRule(ctx context.Context, rule *EnhancementRule) error {
	return m.enhancer.UpdateEnhancementRule(ctx, rule)
}

func (m *DefaultManager) DeleteEnhancementRule(ctx context.Context, ruleID string) error {
	return m.enhancer.DeleteEnhancementRule(ctx, ruleID)
}

func (m *DefaultManager) GetEnhancementRule(ctx context.Context, ruleID string) (*EnhancementRule, error) {
	return m.enhancer.GetEnhancementRule(ctx, ruleID)
}

func (m *DefaultManager) ListEnhancementRules(ctx context.Context) ([]*EnhancementRule, error) {
	return m.enhancer.ListEnhancementRules(ctx)
}

func (m *DefaultManager) EnhanceData(ctx context.Context, tableName string, data interface{}) (interface{}, error) {
	return m.enhancer.EnhanceData(ctx, tableName, data)
}

// Implement QualityManager specific methods
func (m *DefaultManager) ResolveIssue(ctx context.Context, issueID string, resolution string) error {
	m.lock.Lock()
	defer m.lock.Unlock()

	issue, exists := m.issues[issueID]
	if !exists {
		return fmt.Errorf("issue with ID %s not found", issueID)
	}

	now := time.Now()
	issue.ResolvedAt = &now
	issue.Resolution = resolution

	return nil
}

func (m *DefaultManager) GetIssue(ctx context.Context, issueID string) (*QualityIssue, error) {
	m.lock.RLock()
	defer m.lock.RUnlock()

	issue, exists := m.issues[issueID]
	if !exists {
		return nil, fmt.Errorf("issue with ID %s not found", issueID)
	}

	return issue, nil
}

func (m *DefaultManager) ListIssues(ctx context.Context, filters map[string]interface{}) ([]*QualityIssue, error) {
	m.lock.RLock()
	defer m.lock.RUnlock()

	var result []*QualityIssue
	for _, issue := range m.issues {
		if matchesFilters(issue, filters) {
			result = append(result, issue)
		}
	}

	return result, nil
}

func (m *DefaultManager) GetQualityReport(ctx context.Context, tableName string) (map[string]interface{}, error) {
	// Get quality scores for all metrics
	metrics := []QualityMetric{
		Completeness,
		Accuracy,
		Consistency,
		Timeliness,
		Uniqueness,
		Validity,
	}

	scores := make(map[QualityMetric]*QualityScore)
	for _, metric := range metrics {
		score, err := m.GetQualityScore(ctx, tableName, metric)
		if err != nil {
			return nil, err
		}
		scores[metric] = score
	}

	// Get recent issues
	issues, err := m.ListIssues(ctx, map[string]interface{}{
		"table_name": tableName,
	})
	if err != nil {
		return nil, err
	}

	// Calculate overall quality score
	var totalScore float64
	for _, score := range scores {
		totalScore += score.Score
	}
	overallScore := totalScore / float64(len(scores))

	// Build the report
	return map[string]interface{}{
		"table_name":      tableName,
		"overall_score":   overallScore,
		"metric_scores":   scores,
		"recent_issues":   issues,
		"generated_at":    time.Now(),
		"total_issues":    len(issues),
		"resolved_issues": countResolvedIssues(issues),
	}, nil
}

// Helper functions
func matchesFilters(issue *QualityIssue, filters map[string]interface{}) bool {
	for key, value := range filters {
		switch key {
		case "table_name":
			if issue.TableName != value.(string) {
				return false
			}
		case "metric":
			if issue.Metric != value.(QualityMetric) {
				return false
			}
		case "severity":
			if issue.Severity != value.(SeverityLevel) {
				return false
			}
		case "resolved":
			isResolved := issue.ResolvedAt != nil
			if isResolved != value.(bool) {
				return false
			}
		}
	}
	return true
}

func countResolvedIssues(issues []*QualityIssue) int {
	count := 0
	for _, issue := range issues {
		if issue.ResolvedAt != nil {
			count++
		}
	}
	return count
}
