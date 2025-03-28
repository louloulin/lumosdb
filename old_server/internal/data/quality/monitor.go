package quality

import (
	"context"
	"fmt"
	"reflect"
	"sync"
	"time"

	"github.com/google/uuid"
)

// DefaultMonitor implements the QualityMonitor interface
type DefaultMonitor struct {
	rules     map[string]*QualityRule
	rulesLock sync.RWMutex
}

// NewDefaultMonitor creates a new DefaultMonitor instance
func NewDefaultMonitor() *DefaultMonitor {
	return &DefaultMonitor{
		rules: make(map[string]*QualityRule),
	}
}

// AddRule adds a new quality rule
func (m *DefaultMonitor) AddRule(ctx context.Context, rule *QualityRule) error {
	if rule.ID == "" {
		rule.ID = uuid.New().String()
	}
	rule.CreatedAt = time.Now()
	rule.UpdatedAt = rule.CreatedAt

	m.rulesLock.Lock()
	defer m.rulesLock.Unlock()

	if _, exists := m.rules[rule.ID]; exists {
		return fmt.Errorf("rule with ID %s already exists", rule.ID)
	}

	m.rules[rule.ID] = rule
	return nil
}

// UpdateRule updates an existing quality rule
func (m *DefaultMonitor) UpdateRule(ctx context.Context, rule *QualityRule) error {
	m.rulesLock.Lock()
	defer m.rulesLock.Unlock()

	if _, exists := m.rules[rule.ID]; !exists {
		return fmt.Errorf("rule with ID %s not found", rule.ID)
	}

	rule.UpdatedAt = time.Now()
	m.rules[rule.ID] = rule
	return nil
}

// DeleteRule deletes a quality rule
func (m *DefaultMonitor) DeleteRule(ctx context.Context, ruleID string) error {
	m.rulesLock.Lock()
	defer m.rulesLock.Unlock()

	if _, exists := m.rules[ruleID]; !exists {
		return fmt.Errorf("rule with ID %s not found", ruleID)
	}

	delete(m.rules, ruleID)
	return nil
}

// GetRule retrieves a quality rule by ID
func (m *DefaultMonitor) GetRule(ctx context.Context, ruleID string) (*QualityRule, error) {
	m.rulesLock.RLock()
	defer m.rulesLock.RUnlock()

	rule, exists := m.rules[ruleID]
	if !exists {
		return nil, fmt.Errorf("rule with ID %s not found", ruleID)
	}

	return rule, nil
}

// ListRules lists all quality rules
func (m *DefaultMonitor) ListRules(ctx context.Context) ([]*QualityRule, error) {
	m.rulesLock.RLock()
	defer m.rulesLock.RUnlock()

	rules := make([]*QualityRule, 0, len(m.rules))
	for _, rule := range m.rules {
		rules = append(rules, rule)
	}

	return rules, nil
}

// CheckQuality performs quality checks on data
func (m *DefaultMonitor) CheckQuality(ctx context.Context, tableName string, data interface{}) ([]*QualityIssue, error) {
	m.rulesLock.RLock()
	defer m.rulesLock.RUnlock()

	var issues []*QualityIssue
	value := reflect.ValueOf(data)

	// Handle different types of data
	switch value.Kind() {
	case reflect.Map:
		issues = m.checkMap(tableName, value, m.rules)
	case reflect.Slice, reflect.Array:
		for i := 0; i < value.Len(); i++ {
			item := value.Index(i)
			if item.Kind() == reflect.Map {
				itemIssues := m.checkMap(tableName, item, m.rules)
				issues = append(issues, itemIssues...)
			}
		}
	default:
		return nil, fmt.Errorf("unsupported data type: %v", value.Kind())
	}

	return issues, nil
}

// checkMap checks a single map against all rules
func (m *DefaultMonitor) checkMap(tableName string, data reflect.Value, rules map[string]*QualityRule) []*QualityIssue {
	var issues []*QualityIssue
	now := time.Now()

	for _, rule := range rules {
		if !rule.Enabled || rule.TableName != tableName {
			continue
		}

		// Get field value
		fieldValue := data.MapIndex(reflect.ValueOf(rule.Field))
		if !fieldValue.IsValid() {
			// Field is missing
			if rule.Metric == Completeness {
				issues = append(issues, &QualityIssue{
					ID:          uuid.New().String(),
					Metric:      rule.Metric,
					Field:       rule.Field,
					Description: fmt.Sprintf("Field %s is missing", rule.Field),
					Severity:    rule.Severity,
					TableName:   tableName,
					DetectedAt:  now,
				})
			}
			continue
		}

		// Check field value based on metric type
		switch rule.Metric {
		case Accuracy:
			// Implement accuracy checks based on rule.Condition
			// This could involve range checks, pattern matching, etc.

		case Consistency:
			// Check if the value follows consistent patterns or formats

		case Timeliness:
			// Check if the value (assuming it's a timestamp) is within acceptable time range

		case Uniqueness:
			// Uniqueness would typically be checked across the dataset, not just one record

		case Validity:
			// Check if the value conforms to business rules specified in rule.Condition
		}
	}

	return issues
}

// GetQualityScore calculates quality scores
func (m *DefaultMonitor) GetQualityScore(ctx context.Context, tableName string, metric QualityMetric) (*QualityScore, error) {
	// This is a simplified scoring mechanism
	// In a real implementation, you would:
	// 1. Analyze historical quality issues
	// 2. Consider the severity of issues
	// 3. Weight different aspects of quality
	// 4. Calculate trends over time

	issues, err := m.CheckQuality(ctx, tableName, nil)
	if err != nil {
		return nil, err
	}

	var relevantIssues int
	for _, issue := range issues {
		if issue.Metric == metric {
			relevantIssues++
		}
	}

	// Simple scoring: 100% minus percentage of issues
	score := 100.0
	if len(issues) > 0 {
		score = 100.0 * (1.0 - float64(relevantIssues)/float64(len(issues)))
	}

	return &QualityScore{
		Metric:    metric,
		Score:     score,
		TableName: tableName,
		UpdatedAt: time.Now(),
	}, nil
}
