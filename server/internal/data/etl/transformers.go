package etl

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// 转换器工厂函数

// FilterTransformer 创建一个过滤转换器
func FilterTransformer(predicate func(data interface{}) bool) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		if predicate(data) {
			return data, nil
		}
		return nil, nil // 返回nil表示丢弃此记录
	}
}

// MapTransformer 创建一个映射转换器
func MapTransformer(mapper func(data interface{}) (interface{}, error)) TransformFunc {
	return mapper
}

// FlattenTransformer 创建一个展平嵌套结构的转换器
func FlattenTransformer(prefix string, separator string) TransformFunc {
	if separator == "" {
		separator = "."
	}

	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		flattened := make(map[string]interface{})
		flattenRecursive(record, prefix, separator, flattened)

		return flattened, nil
	}
}

// flattenRecursive 递归展平嵌套结构
func flattenRecursive(data map[string]interface{}, prefix string, separator string, result map[string]interface{}) {
	for k, v := range data {
		key := k
		if prefix != "" {
			key = prefix + separator + k
		}

		switch val := v.(type) {
		case map[string]interface{}:
			flattenRecursive(val, key, separator, result)
		case []interface{}:
			// 处理数组
			for i, item := range val {
				arrayKey := key + "[" + strconv.Itoa(i) + "]"

				if nestedMap, ok := item.(map[string]interface{}); ok {
					flattenRecursive(nestedMap, arrayKey, separator, result)
				} else {
					result[arrayKey] = item
				}
			}
		default:
			// 基本类型
			result[key] = val
		}
	}
}

// RenameTransformer 创建一个字段重命名转换器
func RenameTransformer(renames map[string]string) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		result := make(map[string]interface{})

		// 复制所有字段
		for k, v := range record {
			result[k] = v
		}

		// 应用重命名
		for oldName, newName := range renames {
			if val, exists := record[oldName]; exists {
				result[newName] = val
				delete(result, oldName)
			}
		}

		return result, nil
	}
}

// SelectTransformer 创建一个字段选择转换器
func SelectTransformer(fields []string) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		result := make(map[string]interface{})

		// 只复制指定字段
		for _, field := range fields {
			if val, exists := record[field]; exists {
				result[field] = val
			}
		}

		return result, nil
	}
}

// DropTransformer 创建一个字段删除转换器
func DropTransformer(fields []string) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		result := make(map[string]interface{})

		// 复制除指定字段外的所有字段
		for k, v := range record {
			shouldDrop := false
			for _, field := range fields {
				if k == field {
					shouldDrop = true
					break
				}
			}

			if !shouldDrop {
				result[k] = v
			}
		}

		return result, nil
	}
}

// CastTransformer 创建一个类型转换转换器
func CastTransformer(typeCasts map[string]string) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		result := make(map[string]interface{})

		// 复制并转换字段
		for k, v := range record {
			if targetType, shouldCast := typeCasts[k]; shouldCast {
				castedValue, err := castValue(v, targetType)
				if err != nil {
					return nil, fmt.Errorf("failed to cast field '%s': %w", k, err)
				}
				result[k] = castedValue
			} else {
				result[k] = v
			}
		}

		return result, nil
	}
}

// castValue 根据目标类型转换值
func castValue(value interface{}, targetType string) (interface{}, error) {
	targetType = strings.ToLower(targetType)

	switch targetType {
	case "string":
		return fmt.Sprintf("%v", value), nil
	case "int", "integer":
		switch v := value.(type) {
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
			return v, nil
		case float32, float64:
			return int64(v.(float64)), nil
		case string:
			return strconv.ParseInt(v, 10, 64)
		default:
			strVal := fmt.Sprintf("%v", v)
			return strconv.ParseInt(strVal, 10, 64)
		}
	case "float", "double":
		switch v := value.(type) {
		case float32, float64:
			return v, nil
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
			return float64(v.(int64)), nil
		case string:
			return strconv.ParseFloat(v, 64)
		default:
			strVal := fmt.Sprintf("%v", v)
			return strconv.ParseFloat(strVal, 64)
		}
	case "bool", "boolean":
		switch v := value.(type) {
		case bool:
			return v, nil
		case string:
			return strconv.ParseBool(v)
		case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
			return v != 0, nil
		default:
			strVal := fmt.Sprintf("%v", v)
			return strconv.ParseBool(strVal)
		}
	case "date", "datetime":
		switch v := value.(type) {
		case time.Time:
			return v, nil
		case string:
			// 尝试多种日期格式
			for _, layout := range []string{
				time.RFC3339,
				"2006-01-02",
				"2006-01-02 15:04:05",
				"01/02/2006",
				"01/02/2006 15:04:05",
			} {
				if t, err := time.Parse(layout, v); err == nil {
					return t, nil
				}
			}
			return nil, fmt.Errorf("failed to parse date from string: %s", v)
		default:
			return nil, fmt.Errorf("cannot cast %T to date", value)
		}
	default:
		return nil, fmt.Errorf("unsupported target type: %s", targetType)
	}
}

// EnrichTransformer 创建一个数据扩充转换器
func EnrichTransformer(enricher func(data interface{}) (map[string]interface{}, error)) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		// 调用扩充函数获取额外字段
		extraFields, err := enricher(record)
		if err != nil {
			return nil, err
		}

		// 添加额外字段
		for k, v := range extraFields {
			record[k] = v
		}

		return record, nil
	}
}

// RegexExtractTransformer 创建一个基于正则表达式提取字段的转换器
func RegexExtractTransformer(sourceField string, targetFields map[string]string) TransformFunc {
	regexMap := make(map[string]*regexp.Regexp)

	// 编译正则表达式
	for field, pattern := range targetFields {
		regex, err := regexp.Compile(pattern)
		if err != nil {
			// 在初始化时就报告错误
			panic(fmt.Sprintf("invalid regex pattern for field '%s': %v", field, err))
		}
		regexMap[field] = regex
	}

	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		// 获取源字段值
		sourceValue, exists := record[sourceField]
		if !exists {
			return record, nil // 源字段不存在，返回原始记录
		}

		sourceStr := fmt.Sprintf("%v", sourceValue)

		// 应用正则表达式
		for field, regex := range regexMap {
			matches := regex.FindStringSubmatch(sourceStr)
			if len(matches) > 1 {
				// 使用第一个捕获组
				record[field] = matches[1]
			} else if len(matches) == 1 {
				// 没有捕获组，使用整个匹配
				record[field] = matches[0]
			}
		}

		return record, nil
	}
}

// TimeFormatTransformer 创建一个日期时间格式转换的转换器
func TimeFormatTransformer(field string, sourceFormat string, targetFormat string) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		// 获取字段值
		value, exists := record[field]
		if !exists {
			return record, nil // 字段不存在，返回原始记录
		}

		// 处理日期时间
		var t time.Time

		switch v := value.(type) {
		case time.Time:
			t = v
		case string:
			parsedTime, err := time.Parse(sourceFormat, v)
			if err != nil {
				return nil, fmt.Errorf("failed to parse time from '%s' using format '%s': %w", v, sourceFormat, err)
			}
			t = parsedTime
		default:
			return record, nil // 不是可处理的类型，返回原始记录
		}

		// 格式化时间
		record[field] = t.Format(targetFormat)

		return record, nil
	}
}

// ComputeTransformer 创建一个计算派生字段的转换器
func ComputeTransformer(computations map[string]func(map[string]interface{}) (interface{}, error)) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		// 应用所有计算
		for field, computation := range computations {
			value, err := computation(record)
			if err != nil {
				return nil, fmt.Errorf("failed to compute field '%s': %w", field, err)
			}
			record[field] = value
		}

		return record, nil
	}
}

// LookupTransformer 创建一个数据查找/转换的转换器
func LookupTransformer(field string, lookupMap map[interface{}]interface{}, defaultValue interface{}) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		// 获取字段值
		value, exists := record[field]
		if !exists {
			return record, nil // 字段不存在，返回原始记录
		}

		// 查找映射值
		if mappedValue, ok := lookupMap[value]; ok {
			record[field] = mappedValue
		} else if defaultValue != nil {
			record[field] = defaultValue
		}

		return record, nil
	}
}

// ValidationTransformer 创建一个数据验证的转换器
func ValidationTransformer(validators map[string]func(interface{}) error) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		// 应用所有验证
		for field, validator := range validators {
			value, exists := record[field]
			if !exists {
				continue // 字段不存在，跳过验证
			}

			if err := validator(value); err != nil {
				return nil, fmt.Errorf("validation failed for field '%s': %w", field, err)
			}
		}

		return record, nil
	}
}

// LoggingTransformer 创建一个记录转换进度的转换器
func LoggingTransformer(logger func(string, ...interface{}), template string) TransformFunc {
	return func(data interface{}) (interface{}, error) {
		record, err := convertToMap(data)
		if err != nil {
			return nil, err
		}

		// 构建日志消息
		var args []interface{}
		// 替换模板中的占位符
		message := replaceTemplateFields(template, record, &args)

		// 记录日志
		logger(message, args...)

		return record, nil
	}
}

// replaceTemplateFields 替换模板中的字段引用
func replaceTemplateFields(template string, record map[string]interface{}, args *[]interface{}) string {
	// 匹配 ${field} 格式的占位符
	re := regexp.MustCompile(`\${([^}]+)}`)
	result := re.ReplaceAllStringFunc(template, func(match string) string {
		fieldName := match[2 : len(match)-1]
		if value, exists := record[fieldName]; exists {
			*args = append(*args, value)
			return "%v"
		}
		return match
	})

	return result
}
