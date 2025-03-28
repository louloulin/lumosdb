package quality

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestQualityMonitor(t *testing.T) {
	monitor := NewDefaultMonitor()
	ctx := context.Background()

	t.Run("Rule Management", func(t *testing.T) {
		// Add rule
		rule := &QualityRule{
			Name:        "Test Rule",
			Description: "Test rule for completeness",
			Metric:      Completeness,
			TableName:   "users",
			Field:       "email",
			Condition:   "not_null",
			Severity:    Warning,
			Enabled:     true,
		}

		err := monitor.AddRule(ctx, rule)
		assert.NoError(t, err)
		assert.NotEmpty(t, rule.ID)

		// Get rule
		retrieved, err := monitor.GetRule(ctx, rule.ID)
		assert.NoError(t, err)
		assert.Equal(t, rule.Name, retrieved.Name)

		// Update rule
		rule.Description = "Updated description"
		err = monitor.UpdateRule(ctx, rule)
		assert.NoError(t, err)

		// List rules
		rules, err := monitor.ListRules(ctx)
		assert.NoError(t, err)
		assert.Len(t, rules, 1)

		// Delete rule
		err = monitor.DeleteRule(ctx, rule.ID)
		assert.NoError(t, err)

		rules, err = monitor.ListRules(ctx)
		assert.NoError(t, err)
		assert.Len(t, rules, 0)
	})

	t.Run("Quality Checks", func(t *testing.T) {
		// Add test rule
		rule := &QualityRule{
			Name:        "Email Check",
			Description: "Check email completeness",
			Metric:      Completeness,
			TableName:   "users",
			Field:       "email",
			Condition:   "not_null",
			Severity:    Warning,
			Enabled:     true,
		}
		err := monitor.AddRule(ctx, rule)
		assert.NoError(t, err)

		// Test data with missing email
		data := map[string]interface{}{
			"id":   1,
			"name": "Test User",
		}

		issues, err := monitor.CheckQuality(ctx, "users", data)
		assert.NoError(t, err)
		assert.Len(t, issues, 1)
		assert.Equal(t, Completeness, issues[0].Metric)
		assert.Equal(t, "email", issues[0].Field)
	})
}

func TestQualityEnhancer(t *testing.T) {
	enhancer := NewDefaultEnhancer()
	ctx := context.Background()

	t.Run("Enhancement Rule Management", func(t *testing.T) {
		// Add rule
		rule := &EnhancementRule{
			Name:        "Trim Names",
			Description: "Trim whitespace from names",
			TableName:   "users",
			Field:       "name",
			Action:      "trim",
			Enabled:     true,
		}

		err := enhancer.AddEnhancementRule(ctx, rule)
		assert.NoError(t, err)
		assert.NotEmpty(t, rule.ID)

		// Get rule
		retrieved, err := enhancer.GetEnhancementRule(ctx, rule.ID)
		assert.NoError(t, err)
		assert.Equal(t, rule.Name, retrieved.Name)

		// Update rule
		rule.Description = "Updated description"
		err = enhancer.UpdateEnhancementRule(ctx, rule)
		assert.NoError(t, err)

		// List rules
		rules, err := enhancer.ListEnhancementRules(ctx)
		assert.NoError(t, err)
		assert.Len(t, rules, 1)

		// Delete rule
		err = enhancer.DeleteEnhancementRule(ctx, rule.ID)
		assert.NoError(t, err)

		rules, err = enhancer.ListEnhancementRules(ctx)
		assert.NoError(t, err)
		assert.Len(t, rules, 0)
	})

	t.Run("Data Enhancement", func(t *testing.T) {
		// Add enhancement rules
		rules := []*EnhancementRule{
			{
				Name:        "Trim Names",
				Description: "Trim whitespace from names",
				TableName:   "users",
				Field:       "name",
				Action:      "trim",
				Enabled:     true,
			},
			{
				Name:        "Default Age",
				Description: "Set default age if missing",
				TableName:   "users",
				Field:       "age",
				Action:      "default",
				Parameters:  map[string]interface{}{"value": 18},
				Enabled:     true,
			},
		}

		for _, rule := range rules {
			err := enhancer.AddEnhancementRule(ctx, rule)
			assert.NoError(t, err)
		}

		// Test data enhancement
		data := map[string]interface{}{
			"id":   1,
			"name": "  Test User  ",
		}

		enhanced, err := enhancer.EnhanceData(ctx, "users", data)
		assert.NoError(t, err)

		enhancedMap := enhanced.(map[string]interface{})
		assert.Equal(t, "Test User", enhancedMap["name"])
		assert.Equal(t, 18, enhancedMap["age"])
	})
}

func TestQualityManager(t *testing.T) {
	manager := NewDefaultManager()
	ctx := context.Background()

	t.Run("Issue Management", func(t *testing.T) {
		// Add quality rule
		rule := &QualityRule{
			Name:        "Email Check",
			Description: "Check email completeness",
			Metric:      Completeness,
			TableName:   "users",
			Field:       "email",
			Condition:   "not_null",
			Severity:    Warning,
			Enabled:     true,
		}
		err := manager.AddRule(ctx, rule)
		assert.NoError(t, err)

		// Generate quality issues
		data := map[string]interface{}{
			"id":   1,
			"name": "Test User",
		}

		issues, err := manager.CheckQuality(ctx, "users", data)
		assert.NoError(t, err)
		assert.Len(t, issues, 1)

		// Get issue
		issue, err := manager.GetIssue(ctx, issues[0].ID)
		assert.NoError(t, err)
		assert.Equal(t, Completeness, issue.Metric)

		// Resolve issue
		err = manager.ResolveIssue(ctx, issue.ID, "Email field added")
		assert.NoError(t, err)

		// Check resolution
		resolved, err := manager.GetIssue(ctx, issue.ID)
		assert.NoError(t, err)
		assert.NotNil(t, resolved.ResolvedAt)
		assert.Equal(t, "Email field added", resolved.Resolution)
	})

	t.Run("Quality Report", func(t *testing.T) {
		// Generate quality report
		report, err := manager.GetQualityReport(ctx, "users")
		assert.NoError(t, err)

		// Verify report contents
		assert.Equal(t, "users", report["table_name"])
		assert.NotNil(t, report["overall_score"])
		assert.NotNil(t, report["metric_scores"])
		assert.NotNil(t, report["recent_issues"])
		assert.NotNil(t, report["generated_at"])
		assert.NotNil(t, report["total_issues"])
		assert.NotNil(t, report["resolved_issues"])
	})

	t.Run("End-to-End Quality Management", func(t *testing.T) {
		// Add enhancement rule
		enhancementRule := &EnhancementRule{
			Name:        "Format Names",
			Description: "Capitalize names",
			TableName:   "users",
			Field:       "name",
			Action:      "format",
			Parameters:  map[string]interface{}{"pattern": "%s"},
			Enabled:     true,
		}
		err := manager.AddEnhancementRule(ctx, enhancementRule)
		assert.NoError(t, err)

		// Test data
		data := map[string]interface{}{
			"id":   1,
			"name": "test user",
		}

		// Check quality and enhance data
		issues, err := manager.CheckQuality(ctx, "users", data)
		assert.NoError(t, err)
		assert.NotNil(t, issues)

		enhanced, err := manager.EnhanceData(ctx, "users", data)
		assert.NoError(t, err)

		// Verify results
		enhancedMap := enhanced.(map[string]interface{})
		assert.Equal(t, "test user", enhancedMap["name"])

		// Get quality report
		report, err := manager.GetQualityReport(ctx, "users")
		assert.NoError(t, err)
		assert.NotNil(t, report["overall_score"])
	})
}
