package query

import (
	"fmt"
	"strings"
)

// PlanNode represents a node in a query execution plan
type PlanNode interface {
	// Type returns the type of the plan node
	Type() string

	// String returns a string representation of the plan node
	String() string

	// Children returns the child nodes of this plan node
	Children() []PlanNode

	// Cost returns the estimated cost of executing this plan node
	Cost() float64
}

// ScanNode represents a table scan operation
type ScanNode struct {
	TableName     string
	Alias         string
	Columns       []string
	Filter        string
	EstimatedRows int64
	childNodes    []PlanNode
	EstimatedCost float64
}

// Type returns the type of the plan node
func (n *ScanNode) Type() string {
	return "Scan"
}

// String returns a string representation of the plan node
func (n *ScanNode) String() string {
	columnsStr := "*"
	if len(n.Columns) > 0 {
		columnsStr = strings.Join(n.Columns, ", ")
	}

	filterStr := ""
	if n.Filter != "" {
		filterStr = fmt.Sprintf(" WHERE %s", n.Filter)
	}

	return fmt.Sprintf("Scan(%s%s) [%s]%s", n.TableName,
		func() string {
			if n.Alias != "" {
				return " AS " + n.Alias
			} else {
				return ""
			}
		}(),
		columnsStr, filterStr)
}

// Children returns the child nodes of this plan node
func (n *ScanNode) Children() []PlanNode {
	return n.childNodes
}

// Cost returns the estimated cost of executing this plan node
func (n *ScanNode) Cost() float64 {
	return n.EstimatedCost
}

// ProjectionNode represents a projection operation
type ProjectionNode struct {
	Columns       []string
	Input         PlanNode
	childNodes    []PlanNode
	EstimatedCost float64
}

// Type returns the type of the plan node
func (n *ProjectionNode) Type() string {
	return "Projection"
}

// String returns a string representation of the plan node
func (n *ProjectionNode) String() string {
	return fmt.Sprintf("Projection(%s)", strings.Join(n.Columns, ", "))
}

// Children returns the child nodes of this plan node
func (n *ProjectionNode) Children() []PlanNode {
	return n.childNodes
}

// Cost returns the estimated cost of executing this plan node
func (n *ProjectionNode) Cost() float64 {
	inputCost := 0.0
	if n.Input != nil {
		inputCost = n.Input.Cost()
	}
	return inputCost + n.EstimatedCost
}

// FilterNode represents a filter operation
type FilterNode struct {
	Condition     string
	Input         PlanNode
	childNodes    []PlanNode
	EstimatedCost float64
}

// Type returns the type of the plan node
func (n *FilterNode) Type() string {
	return "Filter"
}

// String returns a string representation of the plan node
func (n *FilterNode) String() string {
	return fmt.Sprintf("Filter(%s)", n.Condition)
}

// Children returns the child nodes of this plan node
func (n *FilterNode) Children() []PlanNode {
	return n.childNodes
}

// Cost returns the estimated cost of executing this plan node
func (n *FilterNode) Cost() float64 {
	inputCost := 0.0
	if n.Input != nil {
		inputCost = n.Input.Cost()
	}
	return inputCost + n.EstimatedCost
}

// JoinNode represents a join operation
type JoinNode struct {
	JoinType      string
	LeftInput     PlanNode
	RightInput    PlanNode
	Condition     string
	childNodes    []PlanNode
	EstimatedCost float64
}

// Type returns the type of the plan node
func (n *JoinNode) Type() string {
	return n.JoinType + " Join"
}

// String returns a string representation of the plan node
func (n *JoinNode) String() string {
	return fmt.Sprintf("%s Join(%s)", n.JoinType, n.Condition)
}

// Children returns the child nodes of this plan node
func (n *JoinNode) Children() []PlanNode {
	return n.childNodes
}

// Cost returns the estimated cost of executing this plan node
func (n *JoinNode) Cost() float64 {
	leftCost := 0.0
	if n.LeftInput != nil {
		leftCost = n.LeftInput.Cost()
	}

	rightCost := 0.0
	if n.RightInput != nil {
		rightCost = n.RightInput.Cost()
	}

	return leftCost + rightCost + n.EstimatedCost
}

// AggregationNode represents an aggregation operation
type AggregationNode struct {
	Aggregates    []string
	GroupBy       []string
	Input         PlanNode
	childNodes    []PlanNode
	EstimatedCost float64
}

// Type returns the type of the plan node
func (n *AggregationNode) Type() string {
	return "Aggregation"
}

// String returns a string representation of the plan node
func (n *AggregationNode) String() string {
	groupByStr := ""
	if len(n.GroupBy) > 0 {
		groupByStr = fmt.Sprintf(" GROUP BY %s", strings.Join(n.GroupBy, ", "))
	}

	return fmt.Sprintf("Aggregation(%s)%s", strings.Join(n.Aggregates, ", "), groupByStr)
}

// Children returns the child nodes of this plan node
func (n *AggregationNode) Children() []PlanNode {
	return n.childNodes
}

// Cost returns the estimated cost of executing this plan node
func (n *AggregationNode) Cost() float64 {
	inputCost := 0.0
	if n.Input != nil {
		inputCost = n.Input.Cost()
	}
	return inputCost + n.EstimatedCost
}

// SortNode represents a sort operation
type SortNode struct {
	OrderBy       []string
	Input         PlanNode
	childNodes    []PlanNode
	EstimatedCost float64
}

// Type returns the type of the plan node
func (n *SortNode) Type() string {
	return "Sort"
}

// String returns a string representation of the plan node
func (n *SortNode) String() string {
	return fmt.Sprintf("Sort(%s)", strings.Join(n.OrderBy, ", "))
}

// Children returns the child nodes of this plan node
func (n *SortNode) Children() []PlanNode {
	return n.childNodes
}

// Cost returns the estimated cost of executing this plan node
func (n *SortNode) Cost() float64 {
	inputCost := 0.0
	if n.Input != nil {
		inputCost = n.Input.Cost()
	}
	return inputCost + n.EstimatedCost
}

// LimitNode represents a limit operation
type LimitNode struct {
	Limit         int64
	Offset        int64
	Input         PlanNode
	childNodes    []PlanNode
	EstimatedCost float64
}

// Type returns the type of the plan node
func (n *LimitNode) Type() string {
	return "Limit"
}

// String returns a string representation of the plan node
func (n *LimitNode) String() string {
	if n.Offset > 0 {
		return fmt.Sprintf("Limit(%d, %d)", n.Offset, n.Limit)
	}
	return fmt.Sprintf("Limit(%d)", n.Limit)
}

// Children returns the child nodes of this plan node
func (n *LimitNode) Children() []PlanNode {
	return n.childNodes
}

// Cost returns the estimated cost of executing this plan node
func (n *LimitNode) Cost() float64 {
	inputCost := 0.0
	if n.Input != nil {
		inputCost = n.Input.Cost()
	}
	return inputCost + n.EstimatedCost
}

// QueryPlanner generates query execution plans
type QueryPlanner struct {
	optimizer *QueryOptimizer
}

// NewQueryPlanner creates a new query planner
func NewQueryPlanner(optimizer *QueryOptimizer) *QueryPlanner {
	return &QueryPlanner{
		optimizer: optimizer,
	}
}

// Plan generates a query execution plan for the given SQL query
func (p *QueryPlanner) Plan(query string) (PlanNode, error) {
	// In a real implementation, we would parse the query and generate a proper plan
	// This is a simplified implementation that just creates a dummy plan

	// First, optimize the query
	optimizedQuery, err := p.optimizer.Optimize(query)
	if err != nil {
		return nil, fmt.Errorf("error optimizing query: %v", err)
	}

	// For this simplified implementation, create a dummy plan based on keywords in the query
	if strings.Contains(strings.ToUpper(optimizedQuery), "JOIN") {
		return p.createJoinPlan(optimizedQuery)
	}

	if strings.Contains(strings.ToUpper(optimizedQuery), "GROUP BY") {
		return p.createAggregationPlan(optimizedQuery)
	}

	if strings.Contains(strings.ToUpper(optimizedQuery), "ORDER BY") {
		return p.createSortPlan(optimizedQuery)
	}

	if strings.Contains(strings.ToUpper(optimizedQuery), "LIMIT") {
		return p.createLimitPlan(optimizedQuery)
	}

	// Default to a simple scan + projection plan
	return p.createSimplePlan(optimizedQuery)
}

// ExplainPlan returns a string representation of the execution plan
func (p *QueryPlanner) ExplainPlan(plan PlanNode, indent string) string {
	if plan == nil {
		return indent + "Empty plan"
	}

	var result strings.Builder
	result.WriteString(indent + plan.String() + "\n")

	for _, child := range plan.Children() {
		result.WriteString(p.ExplainPlan(child, indent+"  "))
	}

	return result.String()
}

// createSimplePlan creates a simple scan + projection plan
func (p *QueryPlanner) createSimplePlan(query string) (PlanNode, error) {
	// Extract table name from the query (very simplified approach)
	matches := strings.Split(strings.ToUpper(query), "FROM ")
	if len(matches) < 2 {
		return nil, fmt.Errorf("could not extract table name from query")
	}

	tableParts := strings.Split(matches[1], " ")
	if len(tableParts) == 0 {
		return nil, fmt.Errorf("could not extract table name from query")
	}

	tableName := tableParts[0]

	// Create a scan node
	scanNode := &ScanNode{
		TableName:     tableName,
		EstimatedRows: 1000, // Dummy value
		EstimatedCost: 100,  // Dummy value
	}

	// Extract column names from the query (very simplified approach)
	selectMatches := strings.Split(strings.ToUpper(query), "SELECT ")
	if len(selectMatches) < 2 {
		return nil, fmt.Errorf("could not extract columns from query")
	}

	fromParts := strings.Split(selectMatches[1], " FROM")
	if len(fromParts) == 0 {
		return nil, fmt.Errorf("could not extract columns from query")
	}

	columns := strings.Split(fromParts[0], ",")
	for i := range columns {
		columns[i] = strings.TrimSpace(columns[i])
	}

	// Create a projection node if specific columns are selected
	if len(columns) > 0 && columns[0] != "*" {
		projNode := &ProjectionNode{
			Columns:       columns,
			Input:         scanNode,
			childNodes:    []PlanNode{scanNode},
			EstimatedCost: 10, // Dummy value
		}
		return projNode, nil
	}

	return scanNode, nil
}

// createJoinPlan creates a plan with a join operation
func (p *QueryPlanner) createJoinPlan(query string) (PlanNode, error) {
	// This is a dummy implementation - in a real system, we would actually parse the query
	// and generate a proper join plan

	// Create left input (a scan node)
	leftScan := &ScanNode{
		TableName:     "Table1",
		EstimatedRows: 1000,
		EstimatedCost: 100,
	}

	// Create right input (another scan node)
	rightScan := &ScanNode{
		TableName:     "Table2",
		EstimatedRows: 500,
		EstimatedCost: 50,
	}

	// Create join node
	joinNode := &JoinNode{
		JoinType:      "Inner",
		LeftInput:     leftScan,
		RightInput:    rightScan,
		Condition:     "Table1.id = Table2.table1_id",
		childNodes:    []PlanNode{leftScan, rightScan},
		EstimatedCost: 5000, // Joins are expensive, dummy value
	}

	return joinNode, nil
}

// createAggregationPlan creates a plan with an aggregation operation
func (p *QueryPlanner) createAggregationPlan(query string) (PlanNode, error) {
	// This is a dummy implementation - in a real system, we would actually parse the query
	// and generate a proper aggregation plan

	// Create input (a scan node)
	scanNode := &ScanNode{
		TableName:     "Table1",
		EstimatedRows: 1000,
		EstimatedCost: 100,
	}

	// Create aggregation node
	aggNode := &AggregationNode{
		Aggregates:    []string{"COUNT(*)", "SUM(value)"},
		GroupBy:       []string{"category"},
		Input:         scanNode,
		childNodes:    []PlanNode{scanNode},
		EstimatedCost: 200,
	}

	return aggNode, nil
}

// createSortPlan creates a plan with a sort operation
func (p *QueryPlanner) createSortPlan(query string) (PlanNode, error) {
	// This is a dummy implementation - in a real system, we would actually parse the query
	// and generate a proper sort plan

	// Create input (a scan node)
	scanNode := &ScanNode{
		TableName:     "Table1",
		EstimatedRows: 1000,
		EstimatedCost: 100,
	}

	// Create sort node
	sortNode := &SortNode{
		OrderBy:       []string{"column1 ASC", "column2 DESC"},
		Input:         scanNode,
		childNodes:    []PlanNode{scanNode},
		EstimatedCost: 150,
	}

	return sortNode, nil
}

// createLimitPlan creates a plan with a limit operation
func (p *QueryPlanner) createLimitPlan(query string) (PlanNode, error) {
	// This is a dummy implementation - in a real system, we would actually parse the query
	// and generate a proper limit plan

	// Create input (a scan node)
	scanNode := &ScanNode{
		TableName:     "Table1",
		EstimatedRows: 1000,
		EstimatedCost: 100,
	}

	// Create limit node
	limitNode := &LimitNode{
		Limit:         10,
		Offset:        0,
		Input:         scanNode,
		childNodes:    []PlanNode{scanNode},
		EstimatedCost: 10,
	}

	return limitNode, nil
}
