package etl

import (
	"context"
	"database/sql"
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"strconv"
	"strings"
	"time"
)

// CSVSource 表示CSV文件数据源
type CSVSource struct {
	FilePath    string
	Delimiter   rune
	HasHeader   bool
	ColumnNames []string
	file        *os.File
	reader      *csv.Reader
	header      []string
}

// NewCSVSource 创建CSV数据源
func NewCSVSource(filePath string, delimiter rune, hasHeader bool, columnNames []string) *CSVSource {
	if delimiter == 0 {
		delimiter = ','
	}

	return &CSVSource{
		FilePath:    filePath,
		Delimiter:   delimiter,
		HasHeader:   hasHeader,
		ColumnNames: columnNames,
	}
}

// Open 打开CSV文件
func (c *CSVSource) Open(ctx context.Context) error {
	var err error
	c.file, err = os.Open(c.FilePath)
	if err != nil {
		return fmt.Errorf("failed to open CSV file: %w", err)
	}

	c.reader = csv.NewReader(c.file)
	c.reader.Comma = c.Delimiter

	// 如果有表头，读取它
	if c.HasHeader {
		c.header, err = c.reader.Read()
		if err != nil {
			c.file.Close()
			return fmt.Errorf("failed to read CSV header: %w", err)
		}
	} else if len(c.ColumnNames) > 0 {
		// 使用提供的列名
		c.header = c.ColumnNames
	}

	return nil
}

// Close 关闭CSV文件
func (c *CSVSource) Close() error {
	if c.file != nil {
		return c.file.Close()
	}
	return nil
}

// Extract 从CSV中提取数据
func (c *CSVSource) Extract(ctx context.Context, options map[string]interface{}) (chan interface{}, error) {
	if c.reader == nil {
		return nil, fmt.Errorf("CSV source not opened")
	}

	// 创建数据通道
	dataChan := make(chan interface{})

	go func() {
		defer close(dataChan)

		lineNum := uint64(0)
		if c.HasHeader {
			lineNum = 1 // 跳过表头行
		}

		for {
			select {
			case <-ctx.Done():
				return
			default:
				record, err := c.reader.Read()
				if err == io.EOF {
					return
				}
				if err != nil {
					// 可以选择发送错误或继续
					continue
				}

				lineNum++

				// 将CSV行转换为映射
				data := make(map[string]interface{})

				// 添加源信息
				data["_source"] = "csv"
				data["_file"] = c.FilePath
				data["_line"] = lineNum

				// 将值映射到列名
				for i, value := range record {
					var columnName string
					if i < len(c.header) {
						columnName = c.header[i]
					} else {
						columnName = fmt.Sprintf("column_%d", i+1)
					}

					// 尝试转换值到合适的类型
					data[columnName] = convertValueType(value)
				}

				// 发送数据
				select {
				case <-ctx.Done():
					return
				case dataChan <- data:
					// 数据已发送
				}
			}
		}
	}()

	return dataChan, nil
}

// Name 返回数据源名称
func (c *CSVSource) Name() string {
	return "csv:" + c.FilePath
}

// Metadata 返回数据源元数据
func (c *CSVSource) Metadata() map[string]interface{} {
	return map[string]interface{}{
		"type":       "csv",
		"file_path":  c.FilePath,
		"delimiter":  string(c.Delimiter),
		"has_header": c.HasHeader,
		"columns":    c.header,
	}
}

// convertValueType 尝试将字符串转换为合适的数据类型
func convertValueType(value string) interface{} {
	value = strings.TrimSpace(value)

	// 空字符串保持为字符串
	if value == "" {
		return value
	}

	// 尝试解析为整数
	if i, err := strconv.ParseInt(value, 10, 64); err == nil {
		return i
	}

	// 尝试解析为浮点数
	if f, err := strconv.ParseFloat(value, 64); err == nil {
		return f
	}

	// 尝试解析为布尔值
	if strings.EqualFold(value, "true") {
		return true
	} else if strings.EqualFold(value, "false") {
		return false
	}

	// 尝试解析为日期时间
	for _, layout := range []string{
		time.RFC3339,
		"2006-01-02",
		"2006-01-02 15:04:05",
		"01/02/2006",
		"01/02/2006 15:04:05",
	} {
		if t, err := time.Parse(layout, value); err == nil {
			return t
		}
	}

	// 默认返回字符串
	return value
}

// DBSource 表示数据库表数据源
type DBSource struct {
	DB           *sql.DB
	Query        string
	Params       []interface{}
	FetchSize    int
	SourceName   string
	DatabaseName string
}

// NewDBSource 创建数据库源
func NewDBSource(db *sql.DB, query string, params []interface{}, fetchSize int, sourceName, dbName string) *DBSource {
	if fetchSize <= 0 {
		fetchSize = 1000
	}

	if sourceName == "" {
		sourceName = "db-source"
	}

	return &DBSource{
		DB:           db,
		Query:        query,
		Params:       params,
		FetchSize:    fetchSize,
		SourceName:   sourceName,
		DatabaseName: dbName,
	}
}

// Open 初始化数据库连接
func (d *DBSource) Open(ctx context.Context) error {
	if d.DB == nil {
		return fmt.Errorf("database connection is nil")
	}

	// 验证数据库连接
	return d.DB.PingContext(ctx)
}

// Close 关闭数据库连接
func (d *DBSource) Close() error {
	// 不关闭数据库连接，因为它可能在外部使用
	return nil
}

// Extract 从数据库提取数据
func (d *DBSource) Extract(ctx context.Context, options map[string]interface{}) (chan interface{}, error) {
	if d.DB == nil {
		return nil, fmt.Errorf("database connection is nil")
	}

	// 创建数据通道
	dataChan := make(chan interface{})

	go func() {
		defer close(dataChan)

		// 准备查询
		rows, err := d.DB.QueryContext(ctx, d.Query, d.Params...)
		if err != nil {
			// 无法发送错误到通道，通道将被关闭
			return
		}
		defer rows.Close()

		// 获取列名
		columns, err := rows.Columns()
		if err != nil {
			return
		}

		// 准备值容器
		values := make([]interface{}, len(columns))
		valuePtrs := make([]interface{}, len(columns))
		for i := range values {
			valuePtrs[i] = &values[i]
		}

		for rows.Next() {
			select {
			case <-ctx.Done():
				return
			default:
				// 扫描行
				if err := rows.Scan(valuePtrs...); err != nil {
					continue
				}

				// 将行转换为映射
				rowData := make(map[string]interface{})
				rowData["_source"] = "db"
				rowData["_database"] = d.DatabaseName

				for i, col := range columns {
					rowData[col] = values[i]
				}

				// 发送数据
				select {
				case <-ctx.Done():
					return
				case dataChan <- rowData:
					// 数据已发送
				}
			}
		}
	}()

	return dataChan, nil
}

// Name 返回数据源名称
func (d *DBSource) Name() string {
	return d.SourceName
}

// Metadata 返回数据源元数据
func (d *DBSource) Metadata() map[string]interface{} {
	return map[string]interface{}{
		"type":       "database",
		"database":   d.DatabaseName,
		"query":      d.Query,
		"fetch_size": d.FetchSize,
	}
}

// JSONArraySource 表示JSON数组数据源
type JSONArraySource struct {
	Data       []interface{}
	SourceName string
	index      int
}

// NewJSONArraySource 创建JSON数组源
func NewJSONArraySource(data []interface{}, sourceName string) *JSONArraySource {
	if sourceName == "" {
		sourceName = "json-array-source"
	}

	return &JSONArraySource{
		Data:       data,
		SourceName: sourceName,
		index:      0,
	}
}

// Open 初始化数据源
func (j *JSONArraySource) Open(ctx context.Context) error {
	j.index = 0
	return nil
}

// Close 关闭数据源
func (j *JSONArraySource) Close() error {
	return nil
}

// Extract 从JSON数组提取数据
func (j *JSONArraySource) Extract(ctx context.Context, options map[string]interface{}) (chan interface{}, error) {
	// 创建数据通道
	dataChan := make(chan interface{})

	go func() {
		defer close(dataChan)

		for i, item := range j.Data {
			select {
			case <-ctx.Done():
				return
			default:
				// 处理项目，添加元数据
				var data map[string]interface{}

				switch v := item.(type) {
				case map[string]interface{}:
					// 已经是map，只需添加元数据
					data = v
				default:
					// 创建包装对象
					data = map[string]interface{}{
						"value": v,
					}
				}

				// 添加元数据
				data["_source"] = "json"
				data["_index"] = i

				// 发送数据
				select {
				case <-ctx.Done():
					return
				case dataChan <- data:
					// 数据已发送
				}
			}
		}
	}()

	return dataChan, nil
}

// Name 返回数据源名称
func (j *JSONArraySource) Name() string {
	return j.SourceName
}

// Metadata 返回数据源元数据
func (j *JSONArraySource) Metadata() map[string]interface{} {
	return map[string]interface{}{
		"type":  "json_array",
		"count": len(j.Data),
	}
}
