package etl

import (
	"context"
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"os"
	"reflect"
	"strings"
	"sync"
	"time"
)

// CSVSink 表示CSV文件数据目标
type CSVSink struct {
	FilePath      string
	Delimiter     rune
	WriteHeader   bool
	Columns       []string
	file          *os.File
	writer        *csv.Writer
	headerWritten bool
	mu            sync.Mutex
}

// NewCSVSink 创建CSV数据目标
func NewCSVSink(filePath string, delimiter rune, writeHeader bool, columns []string) *CSVSink {
	if delimiter == 0 {
		delimiter = ','
	}

	return &CSVSink{
		FilePath:    filePath,
		Delimiter:   delimiter,
		WriteHeader: writeHeader,
		Columns:     columns,
	}
}

// Open 打开CSV文件进行写入
func (c *CSVSink) Open(ctx context.Context) error {
	var err error

	c.mu.Lock()
	defer c.mu.Unlock()

	// 检查是否需要创建目录
	dir := strings.TrimSuffix(c.FilePath, "/"+c.FilePath[strings.LastIndex(c.FilePath, "/")+1:])
	if dir != c.FilePath {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory: %w", err)
		}
	}

	// 打开文件
	c.file, err = os.Create(c.FilePath)
	if err != nil {
		return fmt.Errorf("failed to create CSV file: %w", err)
	}

	c.writer = csv.NewWriter(c.file)
	c.writer.Comma = c.Delimiter
	c.headerWritten = false

	return nil
}

// Close 关闭CSV文件
func (c *CSVSink) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.writer != nil {
		c.writer.Flush()
	}

	if c.file != nil {
		return c.file.Close()
	}

	return nil
}

// Load 将单条数据写入CSV文件
func (c *CSVSink) Load(ctx context.Context, data interface{}) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if c.writer == nil {
		return fmt.Errorf("CSV sink not opened")
	}

	// 将数据转换为map
	record, err := convertToMap(data)
	if err != nil {
		return err
	}

	// 如果需要写入表头且尚未写入
	if c.WriteHeader && !c.headerWritten {
		// 如果没有指定列，从第一条记录推断
		if len(c.Columns) == 0 {
			for key := range record {
				// 跳过元数据字段
				if !strings.HasPrefix(key, "_") {
					c.Columns = append(c.Columns, key)
				}
			}
		}

		if err := c.writer.Write(c.Columns); err != nil {
			return fmt.Errorf("failed to write CSV header: %w", err)
		}

		c.headerWritten = true
	}

	// 将记录转换为字符串数组
	values := make([]string, len(c.Columns))
	for i, col := range c.Columns {
		if val, ok := record[col]; ok {
			values[i] = fmt.Sprintf("%v", val)
		} else {
			values[i] = "" // 缺失值
		}
	}

	// 写入记录
	if err := c.writer.Write(values); err != nil {
		return fmt.Errorf("failed to write CSV record: %w", err)
	}

	return nil
}

// BatchLoad 批量写入CSV文件
func (c *CSVSink) BatchLoad(ctx context.Context, dataBatch []interface{}) error {
	for _, data := range dataBatch {
		if err := c.Load(ctx, data); err != nil {
			return err
		}
	}

	c.writer.Flush()
	return nil
}

// Name 返回数据目标名称
func (c *CSVSink) Name() string {
	return "csv:" + c.FilePath
}

// JSONSink 表示JSON文件数据目标
type JSONSink struct {
	FilePath    string
	PrettyPrint bool
	Array       bool
	file        *os.File
	encoder     *json.Encoder
	count       int
	mu          sync.Mutex
}

// NewJSONSink 创建JSON数据目标
func NewJSONSink(filePath string, prettyPrint bool, asArray bool) *JSONSink {
	return &JSONSink{
		FilePath:    filePath,
		PrettyPrint: prettyPrint,
		Array:       asArray,
	}
}

// Open 打开JSON文件进行写入
func (j *JSONSink) Open(ctx context.Context) error {
	var err error

	j.mu.Lock()
	defer j.mu.Unlock()

	// 检查是否需要创建目录
	dir := strings.TrimSuffix(j.FilePath, "/"+j.FilePath[strings.LastIndex(j.FilePath, "/")+1:])
	if dir != j.FilePath {
		if err := os.MkdirAll(dir, 0755); err != nil {
			return fmt.Errorf("failed to create directory: %w", err)
		}
	}

	// 打开文件
	j.file, err = os.Create(j.FilePath)
	if err != nil {
		return fmt.Errorf("failed to create JSON file: %w", err)
	}

	j.count = 0
	j.encoder = json.NewEncoder(j.file)

	if j.PrettyPrint {
		j.encoder.SetIndent("", "  ")
	}

	// 如果是数组，写入起始括号
	if j.Array {
		if _, err := j.file.WriteString("[\n"); err != nil {
			return fmt.Errorf("failed to write JSON array start: %w", err)
		}
	}

	return nil
}

// Close 关闭JSON文件
func (j *JSONSink) Close() error {
	j.mu.Lock()
	defer j.mu.Unlock()

	if j.file != nil {
		// 如果是数组，写入结束括号
		if j.Array {
			if _, err := j.file.WriteString("\n]"); err != nil {
				return fmt.Errorf("failed to write JSON array end: %w", err)
			}
		}

		return j.file.Close()
	}

	return nil
}

// Load 将单条数据写入JSON文件
func (j *JSONSink) Load(ctx context.Context, data interface{}) error {
	j.mu.Lock()
	defer j.mu.Unlock()

	if j.file == nil {
		return fmt.Errorf("JSON sink not opened")
	}

	// 将数据转换为可序列化格式
	record, err := convertToMap(data)
	if err != nil {
		return err
	}

	// 如果是数组并且不是第一条记录，添加逗号
	if j.Array {
		if j.count > 0 {
			if _, err := j.file.WriteString(",\n"); err != nil {
				return fmt.Errorf("failed to write JSON separator: %w", err)
			}
		}

		// 写入缩进
		if j.PrettyPrint {
			if _, err := j.file.WriteString("  "); err != nil {
				return fmt.Errorf("failed to write JSON indent: %w", err)
			}
		}

		// 直接写入JSON，而不是通过encoder
		bytes, err := json.Marshal(record)
		if err != nil {
			return fmt.Errorf("failed to marshal JSON record: %w", err)
		}

		if _, err := j.file.Write(bytes); err != nil {
			return fmt.Errorf("failed to write JSON record: %w", err)
		}
	} else {
		// 非数组模式，每行一个JSON对象
		if err := j.encoder.Encode(record); err != nil {
			return fmt.Errorf("failed to write JSON record: %w", err)
		}
	}

	j.count++
	return nil
}

// BatchLoad 批量写入JSON文件
func (j *JSONSink) BatchLoad(ctx context.Context, dataBatch []interface{}) error {
	for _, data := range dataBatch {
		if err := j.Load(ctx, data); err != nil {
			return err
		}
	}

	return nil
}

// Name 返回数据目标名称
func (j *JSONSink) Name() string {
	return "json:" + j.FilePath
}

// DBSink 表示数据库表数据目标
type DBSink struct {
	DB         *sql.DB
	TableName  string
	Columns    []string
	InsertStmt string
	SinkName   string
	tx         *sql.Tx
	stmt       *sql.Stmt
	batchSize  int
	mu         sync.Mutex
}

// NewDBSink 创建数据库目标
func NewDBSink(db *sql.DB, tableName string, columns []string, sinkName string, batchSize int) *DBSink {
	if sinkName == "" {
		sinkName = "db-sink"
	}

	if batchSize <= 0 {
		batchSize = 100
	}

	return &DBSink{
		DB:        db,
		TableName: tableName,
		Columns:   columns,
		SinkName:  sinkName,
		batchSize: batchSize,
	}
}

// Open 初始化数据库连接
func (d *DBSink) Open(ctx context.Context) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.DB == nil {
		return fmt.Errorf("database connection is nil")
	}

	// 验证数据库连接
	if err := d.DB.PingContext(ctx); err != nil {
		return err
	}

	// 准备插入语句
	if len(d.Columns) == 0 {
		return fmt.Errorf("columns cannot be empty")
	}

	// 开始事务
	var err error
	d.tx, err = d.DB.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}

	// 构建插入语句
	placeholders := make([]string, len(d.Columns))
	for i := range placeholders {
		placeholders[i] = "?"
	}

	d.InsertStmt = fmt.Sprintf(
		"INSERT INTO %s (%s) VALUES (%s)",
		d.TableName,
		strings.Join(d.Columns, ", "),
		strings.Join(placeholders, ", "),
	)

	// 准备语句
	d.stmt, err = d.tx.PrepareContext(ctx, d.InsertStmt)
	if err != nil {
		d.tx.Rollback()
		d.tx = nil
		return fmt.Errorf("failed to prepare statement: %w", err)
	}

	return nil
}

// Close 关闭数据库连接
func (d *DBSink) Close() error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.stmt != nil {
		d.stmt.Close()
		d.stmt = nil
	}

	if d.tx != nil {
		if err := d.tx.Commit(); err != nil {
			d.tx.Rollback()
			return fmt.Errorf("failed to commit transaction: %w", err)
		}
		d.tx = nil
	}

	return nil
}

// Load 将单条数据写入数据库
func (d *DBSink) Load(ctx context.Context, data interface{}) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.stmt == nil {
		return fmt.Errorf("database sink not opened")
	}

	// 将数据转换为map
	record, err := convertToMap(data)
	if err != nil {
		return err
	}

	// 提取值按列顺序
	values := make([]interface{}, len(d.Columns))
	for i, col := range d.Columns {
		if val, ok := record[col]; ok {
			values[i] = val
		} else {
			values[i] = nil // 缺失值为NULL
		}
	}

	// 执行插入
	_, err = d.stmt.ExecContext(ctx, values...)
	if err != nil {
		return fmt.Errorf("failed to insert record: %w", err)
	}

	return nil
}

// BatchLoad 批量写入数据库
func (d *DBSink) BatchLoad(ctx context.Context, dataBatch []interface{}) error {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.stmt == nil {
		return fmt.Errorf("database sink not opened")
	}

	// 逐条插入
	for _, data := range dataBatch {
		// 将数据转换为map
		record, err := convertToMap(data)
		if err != nil {
			return err
		}

		// 提取值按列顺序
		values := make([]interface{}, len(d.Columns))
		for i, col := range d.Columns {
			if val, ok := record[col]; ok {
				values[i] = val
			} else {
				values[i] = nil // 缺失值为NULL
			}
		}

		// 执行插入
		_, err = d.stmt.ExecContext(ctx, values...)
		if err != nil {
			return fmt.Errorf("failed to insert record: %w", err)
		}
	}

	return nil
}

// Name 返回数据目标名称
func (d *DBSink) Name() string {
	return d.SinkName
}

// MemorySink 用于测试和内存中数据收集的内存数据目标
type MemorySink struct {
	SinkName string
	Data     []interface{}
	mu       sync.RWMutex
}

// NewMemorySink 创建内存数据目标
func NewMemorySink(name string) *MemorySink {
	if name == "" {
		name = "memory-sink"
	}

	return &MemorySink{
		SinkName: name,
		Data:     make([]interface{}, 0),
	}
}

// Open 初始化内存存储
func (m *MemorySink) Open(ctx context.Context) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.Data = make([]interface{}, 0)
	return nil
}

// Close 关闭内存存储
func (m *MemorySink) Close() error {
	return nil
}

// Load 将单条数据存储到内存
func (m *MemorySink) Load(ctx context.Context, data interface{}) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	// 将数据转换为map并添加时间戳
	record, err := convertToMap(data)
	if err != nil {
		return err
	}

	// 添加时间戳
	record["_timestamp"] = time.Now()

	// 存储记录
	m.Data = append(m.Data, record)

	return nil
}

// BatchLoad 批量存储数据到内存
func (m *MemorySink) BatchLoad(ctx context.Context, dataBatch []interface{}) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	timestamp := time.Now()

	for _, data := range dataBatch {
		// 将数据转换为map并添加时间戳
		record, err := convertToMap(data)
		if err != nil {
			return err
		}

		// 添加时间戳
		record["_timestamp"] = timestamp

		// 存储记录
		m.Data = append(m.Data, record)
	}

	return nil
}

// GetData 获取存储的数据
func (m *MemorySink) GetData() []interface{} {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// 返回副本
	result := make([]interface{}, len(m.Data))
	copy(result, m.Data)

	return result
}

// Name 返回数据目标名称
func (m *MemorySink) Name() string {
	return m.SinkName
}

// 辅助函数

// convertToMap 将数据转换为map[string]interface{}
func convertToMap(data interface{}) (map[string]interface{}, error) {
	switch v := data.(type) {
	case map[string]interface{}:
		return v, nil
	case map[interface{}]interface{}:
		// 转换键为字符串
		result := make(map[string]interface{})
		for key, val := range v {
			strKey, ok := key.(string)
			if !ok {
				strKey = fmt.Sprintf("%v", key)
			}
			result[strKey] = val
		}
		return result, nil
	case []byte:
		// 尝试解析JSON
		var result map[string]interface{}
		if err := json.Unmarshal(v, &result); err != nil {
			return nil, fmt.Errorf("failed to unmarshal JSON data: %w", err)
		}
		return result, nil
	default:
		// 尝试使用反射获取字段
		val := reflect.ValueOf(data)
		if val.Kind() == reflect.Ptr {
			val = val.Elem()
		}

		if val.Kind() == reflect.Struct {
			result := make(map[string]interface{})
			typ := val.Type()

			for i := 0; i < val.NumField(); i++ {
				field := typ.Field(i)
				// 只获取导出字段
				if field.PkgPath == "" {
					// 优先使用JSON标签
					name := field.Tag.Get("json")
					if name == "" {
						name = field.Name
					} else {
						// 去除JSON标签中的选项
						if idx := strings.Index(name, ","); idx > 0 {
							name = name[:idx]
						}
					}

					if name != "-" { // 跳过忽略的字段
						result[name] = val.Field(i).Interface()
					}
				}
			}

			return result, nil
		}

		return nil, fmt.Errorf("unsupported data type for conversion: %T", data)
	}
}
