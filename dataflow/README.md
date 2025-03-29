# Lumos DataFlow

Lumos DataFlow 是一个基于 Rust 和 Actix 的数据流处理和 ETL（提取、转换、加载）框架，设计用于数据迁移和集成场景。

## 主要特性

- **基于 Actix Actor 模型** - 利用 Actor 模型实现高并发和异步处理
- **DAG（有向无环图）任务管理** - 支持复杂任务依赖关系和执行顺序
- **YAML 配置** - 通过简单的 YAML 文件配置完整的 ETL 管道
- **可扩展的组件系统** - 易于开发和集成新的提取器、转换器和加载器
- **错误处理和重试机制** - 内置任务失败处理策略
- **监控和状态追踪** - 跟踪任务执行状态和统计信息

## 架构

Lumos DataFlow 由以下主要组件构成：

1. **配置管理** - 解析和验证 YAML 配置文件
2. **DAG 管理器** - 管理任务依赖和执行顺序
3. **提取器** - 从各种数据源提取数据（CSV, JDBC, 内存等）
4. **转换器** - 处理和转换数据记录
5. **加载器** - 将数据加载到目标位置（CSV, JDBC, 内存等）
6. **执行跟踪** - 跟踪执行状态和统计信息

## 示例配置

```yaml
version: '1.0'
name: "数据迁移作业"
description: "从CSV文件提取数据并加载到数据库"

# 任务配置
jobs:
  extract_csv:
    type: "extractor"
    extractor_type: "csv"
    options:
      file_path: "/path/to/data.csv"
      has_header: true
      delimiter: ","

  transform_data:
    type: "transformer"
    transformer_type: "json"
    options:
      transforms:
        - operation: "rename_field"
          from: "old_name"
          to: "new_name"

  load_to_db:
    type: "loader"
    loader_type: "jdbc"
    options:
      connection_string: "jdbc:postgresql://localhost:5432/mydb"
      table_name: "mytable"
      load_mode: "upsert"
      key_column: "id"

# DAG配置
dag:
  dependencies:
    transform_data: ["extract_csv"]
    load_to_db: ["transform_data"]
  
  failure_policy: "fail"
  max_retries: 3
  retry_delay_seconds: 60
```

## 运行示例

```bash
cargo run --example run_etl_job -- path/to/your/config.yaml
```

## 可用的提取器

- **CSV 提取器** - 从 CSV 文件提取数据
- **JDBC 提取器** - 从数据库提取数据
- **内存提取器** - 从内存中提取数据

## 可用的转换器

- **JSON 转换器** - 对 JSON 数据进行各种转换操作
- **基本转换器** - 提供基本的数据转换功能

## 可用的加载器

- **CSV 加载器** - 将数据加载到 CSV 文件
- **JDBC 加载器** - 将数据加载到数据库
- **内存加载器** - 将数据加载到内存中

## 扩展框架

要添加新的提取器、转换器或加载器，只需实现相应的 Actor 特性，并在工厂方法中注册。 