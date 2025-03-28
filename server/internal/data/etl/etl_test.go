package etl

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap"
)

func TestCSVSource(t *testing.T) {
	// 创建测试CSV文件
	csvContent := `name,age,city
Alice,25,New York
Bob,30,San Francisco
Charlie,35,Chicago`

	tmpFile, err := os.CreateTemp("", "test_*.csv")
	assert.NoError(t, err)
	defer os.Remove(tmpFile.Name())

	_, err = tmpFile.WriteString(csvContent)
	assert.NoError(t, err)
	tmpFile.Close()

	// 创建CSV数据源
	source := NewCSVSource(tmpFile.Name(), ',', true, nil)
	ctx := context.Background()

	// 测试打开
	err = source.Open(ctx)
	assert.NoError(t, err)
	defer source.Close()

	// 测试提取数据
	dataChan, err := source.Extract(ctx, nil)
	assert.NoError(t, err)

	var records []map[string]interface{}
	for data := range dataChan {
		record, ok := data.(map[string]interface{})
		assert.True(t, ok)
		records = append(records, record)
	}

	// 验证提取的数据
	assert.Equal(t, 3, len(records))
	assert.Equal(t, "Alice", records[0]["name"])
	assert.Equal(t, "25", records[0]["age"])
	assert.Equal(t, "New York", records[0]["city"])
}

func TestJSONSink(t *testing.T) {
	// 创建临时JSON文件
	tmpFile, err := os.CreateTemp("", "test_*.json")
	assert.NoError(t, err)
	defer os.Remove(tmpFile.Name())

	// 创建JSON数据目标
	sink := NewJSONSink(tmpFile.Name(), true, true)
	ctx := context.Background()

	// 测试打开
	err = sink.Open(ctx)
	assert.NoError(t, err)

	// 测试数据写入
	testData := []interface{}{
		map[string]interface{}{
			"name": "Alice",
			"age":  25,
		},
		map[string]interface{}{
			"name": "Bob",
			"age":  30,
		},
	}

	err = sink.BatchLoad(ctx, testData)
	assert.NoError(t, err)

	// 关闭sink
	err = sink.Close()
	assert.NoError(t, err)

	// 读取并验证写入的数据
	content, err := os.ReadFile(tmpFile.Name())
	assert.NoError(t, err)

	var result []map[string]interface{}
	err = json.Unmarshal(content, &result)
	assert.NoError(t, err)

	assert.Equal(t, 2, len(result))
	assert.Equal(t, "Alice", result[0]["name"])
	assert.Equal(t, float64(25), result[0]["age"])
}

func TestTransformers(t *testing.T) {
	t.Run("FilterTransformer", func(t *testing.T) {
		filter := FilterTransformer(func(data interface{}) bool {
			record := data.(map[string]interface{})
			age, _ := record["age"].(int)
			return age > 25
		})

		data := map[string]interface{}{
			"name": "Alice",
			"age":  30,
		}

		result, err := filter(data)
		assert.NoError(t, err)
		assert.NotNil(t, result)

		data["age"] = 20
		result, err = filter(data)
		assert.NoError(t, err)
		assert.Nil(t, result)
	})

	t.Run("MapTransformer", func(t *testing.T) {
		mapper := MapTransformer(func(data interface{}) (interface{}, error) {
			record := data.(map[string]interface{})
			record["age"] = record["age"].(int) + 1
			return record, nil
		})

		data := map[string]interface{}{
			"name": "Alice",
			"age":  30,
		}

		result, err := mapper(data)
		assert.NoError(t, err)
		resultMap := result.(map[string]interface{})
		assert.Equal(t, 31, resultMap["age"])
	})
}

func TestEngine(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	engine := NewEngine(logger, 2)

	// 创建测试管道
	source := NewJSONArraySource([]interface{}{
		map[string]interface{}{"name": "Alice", "age": 25},
		map[string]interface{}{"name": "Bob", "age": 30},
	}, "test-source")

	var sink DataSink = NewMemorySink("test-sink")

	pipeline := &Pipeline{
		ID:     "test-pipeline",
		Name:   "Test Pipeline",
		Source: source,
		Transforms: []TransformFunc{
			MapTransformer(func(data interface{}) (interface{}, error) {
				record := data.(map[string]interface{})
				record["age"] = record["age"].(float64) + 1
				return record, nil
			}),
		},
		Sink:      sink,
		BatchSize: 10,
		Timeout:   time.Minute,
	}

	// 执行管道
	ctx := context.Background()
	executionID, err := engine.ExecutePipeline(ctx, pipeline, nil)
	assert.NoError(t, err)

	// 等待执行完成
	time.Sleep(time.Second)

	// 获取执行结果
	execution, err := engine.GetExecution(executionID)
	assert.NoError(t, err)
	assert.Equal(t, StatusCompleted, execution.Status)

	// 验证转换后的数据
	memorySink, ok := sink.(*MemorySink)
	if !assert.True(t, ok, "sink should be *MemorySink") {
		return
	}
	results := memorySink.GetData()
	assert.Equal(t, 2, len(results))

	firstResult := results[0].(map[string]interface{})
	assert.Equal(t, "Alice", firstResult["name"])
	assert.Equal(t, float64(26), firstResult["age"])
}

func TestManager(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	manager := NewManager(logger, 2)

	// 创建测试数据源和目标
	source := NewJSONArraySource([]interface{}{
		map[string]interface{}{"name": "Alice", "age": 25},
		map[string]interface{}{"name": "Bob", "age": 30},
	}, "test-source")

	var sink DataSink = NewMemorySink("test-sink")

	// 创建管道
	ctx := context.Background()
	pipeline, err := manager.CreatePipeline(
		ctx,
		"test-pipeline",
		"Test Pipeline Description",
		source,
		[]TransformFunc{
			MapTransformer(func(data interface{}) (interface{}, error) {
				record := data.(map[string]interface{})
				record["age"] = record["age"].(float64) + 1
				return record, nil
			}),
		},
		sink,
		DefaultPipelineOptions(),
	)
	assert.NoError(t, err)

	// 验证管道创建
	retrievedPipeline, err := manager.GetPipeline(ctx, pipeline.ID)
	assert.NoError(t, err)
	assert.Equal(t, pipeline.Name, retrievedPipeline.Name)

	// 执行管道
	executionID, err := manager.ExecutePipeline(ctx, pipeline.ID, nil)
	assert.NoError(t, err)

	// 等待执行完成
	time.Sleep(time.Second)

	// 获取执行结果
	execution, err := manager.GetExecution(ctx, executionID)
	assert.NoError(t, err)
	assert.Equal(t, StatusCompleted, execution.Status)

	// 验证执行统计
	stats, err := manager.GetExecutionStats(ctx, executionID)
	assert.NoError(t, err)
	assert.Equal(t, int64(2), stats.RecordsRead)
	assert.Equal(t, int64(2), stats.RecordsWritten)

	// 列出所有管道
	pipelines, err := manager.ListPipelines(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 1, len(pipelines))

	// 删除管道
	err = manager.DeletePipeline(ctx, pipeline.ID)
	assert.NoError(t, err)

	// 验证管道已删除
	pipelines, err = manager.ListPipelines(ctx)
	assert.NoError(t, err)
	assert.Equal(t, 0, len(pipelines))
}
