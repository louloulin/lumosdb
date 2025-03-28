package quality

import (
	"context"
	"time"
)

// QualityMetric represents a specific data quality metric
type QualityMetric string

const (
	// Completeness measures the presence of required data
	Completeness QualityMetric = "completeness"
	// Accuracy measures how well data reflects reality
	Accuracy QualityMetric = "accuracy"
	// Consistency measures data uniformity across the dataset
	Consistency QualityMetric = "consistency"
	// Timeliness measures how current or recent the data is
	Timeliness QualityMetric = "timeliness"
	// Uniqueness measures duplicate presence
	Uniqueness QualityMetric = "uniqueness"
	// Validity measures conformance to business rules
	Validity QualityMetric = "validity"
)

// SeverityLevel indicates the severity of a quality issue
type SeverityLevel int

const (
	Info SeverityLevel = iota
	Warning
	Error
	Critical
)

// QualityIssue represents a detected data quality problem
type QualityIssue struct {
	ID          string        `json:"id"`
	Metric      QualityMetric `json:"metric"`
	Field       string        `json:"field"`
	Description string        `json:"description"`
	Severity    SeverityLevel `json:"severity"`
	RecordID    string        `json:"record_id"`
	TableName   string        `json:"table_name"`
	DetectedAt  time.Time     `json:"detected_at"`
	ResolvedAt  *time.Time    `json:"resolved_at,omitempty"`
	Resolution  string        `json:"resolution,omitempty"`
}

// QualityRule defines a rule for checking data quality
type QualityRule struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Metric      QualityMetric `json:"metric"`
	TableName   string        `json:"table_name"`
	Field       string        `json:"field"`
	Condition   string        `json:"condition"`
	Severity    SeverityLevel `json:"severity"`
	Enabled     bool          `json:"enabled"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// EnhancementRule defines how to enhance data quality
type EnhancementRule struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	TableName   string                 `json:"table_name"`
	Field       string                 `json:"field"`
	Action      string                 `json:"action"`
	Parameters  map[string]interface{} `json:"parameters"`
	Enabled     bool                   `json:"enabled"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// QualityScore represents the quality score for a specific metric
type QualityScore struct {
	Metric    QualityMetric `json:"metric"`
	Score     float64       `json:"score"`
	TableName string        `json:"table_name"`
	Field     string        `json:"field"`
	UpdatedAt time.Time     `json:"updated_at"`
}

// QualityMonitor defines the interface for monitoring data quality
type QualityMonitor interface {
	// AddRule adds a new quality rule
	AddRule(ctx context.Context, rule *QualityRule) error

	// UpdateRule updates an existing quality rule
	UpdateRule(ctx context.Context, rule *QualityRule) error

	// DeleteRule deletes a quality rule
	DeleteRule(ctx context.Context, ruleID string) error

	// GetRule retrieves a quality rule by ID
	GetRule(ctx context.Context, ruleID string) (*QualityRule, error)

	// ListRules lists all quality rules
	ListRules(ctx context.Context) ([]*QualityRule, error)

	// CheckQuality performs quality checks on data
	CheckQuality(ctx context.Context, tableName string, data interface{}) ([]*QualityIssue, error)

	// GetQualityScore calculates quality scores
	GetQualityScore(ctx context.Context, tableName string, metric QualityMetric) (*QualityScore, error)
}

// QualityEnhancer defines the interface for enhancing data quality
type QualityEnhancer interface {
	// AddEnhancementRule adds a new enhancement rule
	AddEnhancementRule(ctx context.Context, rule *EnhancementRule) error

	// UpdateEnhancementRule updates an existing enhancement rule
	UpdateEnhancementRule(ctx context.Context, rule *EnhancementRule) error

	// DeleteEnhancementRule deletes an enhancement rule
	DeleteEnhancementRule(ctx context.Context, ruleID string) error

	// GetEnhancementRule retrieves an enhancement rule by ID
	GetEnhancementRule(ctx context.Context, ruleID string) (*EnhancementRule, error)

	// ListEnhancementRules lists all enhancement rules
	ListEnhancementRules(ctx context.Context) ([]*EnhancementRule, error)

	// EnhanceData applies enhancement rules to data
	EnhanceData(ctx context.Context, tableName string, data interface{}) (interface{}, error)
}

// QualityManager combines monitoring and enhancement capabilities
type QualityManager interface {
	QualityMonitor
	QualityEnhancer

	// ResolveIssue marks a quality issue as resolved
	ResolveIssue(ctx context.Context, issueID string, resolution string) error

	// GetIssue retrieves a quality issue by ID
	GetIssue(ctx context.Context, issueID string) (*QualityIssue, error)

	// ListIssues lists quality issues with optional filters
	ListIssues(ctx context.Context, filters map[string]interface{}) ([]*QualityIssue, error)

	// GetQualityReport generates a comprehensive quality report
	GetQualityReport(ctx context.Context, tableName string) (map[string]interface{}, error)
}
