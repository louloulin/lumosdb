package quality

import (
	"context"
	"fmt"
	"math"
	"reflect"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
)

// DefaultEnhancer implements the QualityEnhancer interface
type DefaultEnhancer struct {
	rules     map[string]*EnhancementRule
	rulesLock sync.RWMutex
}

// NewDefaultEnhancer creates a new DefaultEnhancer instance
func NewDefaultEnhancer() *DefaultEnhancer {
	return &DefaultEnhancer{
		rules: make(map[string]*EnhancementRule),
	}
}

// AddEnhancementRule adds a new enhancement rule
func (e *DefaultEnhancer) AddEnhancementRule(ctx context.Context, rule *EnhancementRule) error {
	if rule.ID == "" {
		rule.ID = uuid.New().String()
	}
	rule.CreatedAt = time.Now()
	rule.UpdatedAt = rule.CreatedAt

	e.rulesLock.Lock()
	defer e.rulesLock.Unlock()

	if _, exists := e.rules[rule.ID]; exists {
		return fmt.Errorf("enhancement rule with ID %s already exists", rule.ID)
	}

	e.rules[rule.ID] = rule
	return nil
}

// UpdateEnhancementRule updates an existing enhancement rule
func (e *DefaultEnhancer) UpdateEnhancementRule(ctx context.Context, rule *EnhancementRule) error {
	e.rulesLock.Lock()
	defer e.rulesLock.Unlock()

	if _, exists := e.rules[rule.ID]; !exists {
		return fmt.Errorf("enhancement rule with ID %s not found", rule.ID)
	}

	rule.UpdatedAt = time.Now()
	e.rules[rule.ID] = rule
	return nil
}

// DeleteEnhancementRule deletes an enhancement rule
func (e *DefaultEnhancer) DeleteEnhancementRule(ctx context.Context, ruleID string) error {
	e.rulesLock.Lock()
	defer e.rulesLock.Unlock()

	if _, exists := e.rules[ruleID]; !exists {
		return fmt.Errorf("enhancement rule with ID %s not found", ruleID)
	}

	delete(e.rules, ruleID)
	return nil
}

// GetEnhancementRule retrieves an enhancement rule by ID
func (e *DefaultEnhancer) GetEnhancementRule(ctx context.Context, ruleID string) (*EnhancementRule, error) {
	e.rulesLock.RLock()
	defer e.rulesLock.RUnlock()

	rule, exists := e.rules[ruleID]
	if !exists {
		return nil, fmt.Errorf("enhancement rule with ID %s not found", ruleID)
	}

	return rule, nil
}

// ListEnhancementRules lists all enhancement rules
func (e *DefaultEnhancer) ListEnhancementRules(ctx context.Context) ([]*EnhancementRule, error) {
	e.rulesLock.RLock()
	defer e.rulesLock.RUnlock()

	rules := make([]*EnhancementRule, 0, len(e.rules))
	for _, rule := range e.rules {
		rules = append(rules, rule)
	}

	return rules, nil
}

// EnhanceData applies enhancement rules to data
func (e *DefaultEnhancer) EnhanceData(ctx context.Context, tableName string, data interface{}) (interface{}, error) {
	e.rulesLock.RLock()
	defer e.rulesLock.RUnlock()

	value := reflect.ValueOf(data)

	switch value.Kind() {
	case reflect.Map:
		return e.enhanceMap(tableName, value)
	case reflect.Slice, reflect.Array:
		return e.enhanceSlice(tableName, value)
	default:
		return nil, fmt.Errorf("unsupported data type: %v", value.Kind())
	}
}

// enhanceSlice enhances each item in a slice
func (e *DefaultEnhancer) enhanceSlice(tableName string, data reflect.Value) (interface{}, error) {
	result := reflect.MakeSlice(data.Type(), 0, data.Len())

	for i := 0; i < data.Len(); i++ {
		item := data.Index(i)
		if item.Kind() != reflect.Map {
			continue
		}

		enhanced, err := e.enhanceMap(tableName, item)
		if err != nil {
			return nil, err
		}

		result = reflect.Append(result, reflect.ValueOf(enhanced))
	}

	return result.Interface(), nil
}

// enhanceMap enhances a single map according to rules
func (e *DefaultEnhancer) enhanceMap(tableName string, data reflect.Value) (interface{}, error) {
	// Create a new map to store enhanced data
	result := reflect.MakeMap(data.Type())

	// Copy all existing key-value pairs
	for _, key := range data.MapKeys() {
		result.SetMapIndex(key, data.MapIndex(key))
	}

	// Apply enhancement rules
	for _, rule := range e.rules {
		if !rule.Enabled || rule.TableName != tableName {
			continue
		}

		fieldValue := result.MapIndex(reflect.ValueOf(rule.Field))
		if !fieldValue.IsValid() {
			continue
		}

		// Apply enhancement based on action type
		enhancedValue, err := e.applyEnhancement(rule, fieldValue)
		if err != nil {
			return nil, err
		}

		if enhancedValue != nil {
			result.SetMapIndex(reflect.ValueOf(rule.Field), reflect.ValueOf(enhancedValue))
		}
	}

	return result.Interface(), nil
}

// applyEnhancement applies a specific enhancement rule to a value
func (e *DefaultEnhancer) applyEnhancement(rule *EnhancementRule, value reflect.Value) (interface{}, error) {
	switch rule.Action {
	case "trim":
		// Trim whitespace from string values
		if value.Kind() == reflect.String {
			return strings.TrimSpace(value.String()), nil
		}

	case "uppercase":
		// Convert string to uppercase
		if value.Kind() == reflect.String {
			return strings.ToUpper(value.String()), nil
		}

	case "lowercase":
		// Convert string to lowercase
		if value.Kind() == reflect.String {
			return strings.ToLower(value.String()), nil
		}

	case "round":
		// Round numeric values
		if value.Kind() == reflect.Float64 {
			precision, ok := rule.Parameters["precision"].(float64)
			if !ok {
				precision = 2
			}
			return math.Round(value.Float()*math.Pow(10, precision)) / math.Pow(10, precision), nil
		}

	case "default":
		// Set default value if current value is zero
		if value.IsZero() {
			if defaultValue, ok := rule.Parameters["value"]; ok {
				return defaultValue, nil
			}
		}

	case "format":
		// Format value according to specified pattern
		if pattern, ok := rule.Parameters["pattern"].(string); ok {
			switch value.Kind() {
			case reflect.String:
				// Apply string formatting
				return fmt.Sprintf(pattern, value.String()), nil
			case reflect.Int, reflect.Int64:
				return fmt.Sprintf(pattern, value.Int()), nil
			case reflect.Float64:
				return fmt.Sprintf(pattern, value.Float()), nil
			}
		}

	case "replace":
		// Replace values based on mapping
		if mapping, ok := rule.Parameters["mapping"].(map[string]interface{}); ok {
			if newValue, exists := mapping[fmt.Sprint(value.Interface())]; exists {
				return newValue, nil
			}
		}
	}

	return value.Interface(), nil
}
