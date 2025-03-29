# Lumos DataFlow

Lumos DataFlow 是一个基于 Rust 和 Actix 的数据流处理和 ETL（提取、转换、加载）框架，设计用于数据迁移和集成场景。作为 Lumos-DB 的核心组件，它提供灵活且可扩展的数据处理能力。

## 主要特性

- **基于 Actix Actor 模型** - 利用 Actor 模型实现高并发和异步处理
- **DAG（有向无环图）任务管理** - 支持复杂任务依赖关系和执行顺序
- **YAML 配置** - 通过简单的 YAML 文件配置完整的 ETL 管道
- **可扩展的组件系统** - 易于开发和集成新的提取器、转换器和加载器
- **错误处理和重试机制** - 内置任务失败处理策略
- **监控和状态追踪** - 跟踪任务执行状态和统计信息
- **插件系统** - 支持通过动态库加载第三方扩展组件

## 架构

Lumos DataFlow 由以下主要组件构成：

1. **配置管理** - 解析和验证 YAML 配置文件
   - `ETLConfig` - 保存整个 ETL 流程的配置
   - `DAGConfig` - 管理任务依赖和执行顺序
   - YAML 解析和验证功能

2. **DAG 管理器** - 管理任务依赖和执行顺序
   - `DAGManager` - 核心 DAG 执行逻辑
   - `DAGManagerActor` - Actor 封装
   - 任务调度和状态管理

3. **提取器** - 从各种数据源提取数据
   - `CsvExtractor` - 从 CSV 文件提取数据
   - `JdbcExtractor` - 从数据库提取数据
   - `MemoryExtractor` - 从内存中提取数据
   - 提取器工厂 - 动态创建提取器实例

4. **转换器** - 处理和转换数据记录
   - `JsonTransformer` - 执行 JSON 数据转换
   - 自定义转换操作支持

5. **加载器** - 将数据加载到目标位置
   - `CsvLoader` - 加载数据到 CSV 文件
   - `JdbcLoader` - 加载数据到数据库
   - `MemoryLoader` - 加载数据到内存
   - 加载器工厂 - 动态创建加载器实例

6. **管道管理** - 协调 ETL 流程
   - `PipelineActor` - 协调提取、转换、加载流程
   - 异步处理和错误处理

7. **插件系统** - 允许第三方扩展
   - `PluginManager` - 加载和管理第三方插件
   - 插件接口 - 提供标准化的插件开发接口
   - 集成层 - 将插件与核心框架无缝集成

## 使用场景

### 1. 数据迁移

将数据从一个系统迁移到另一个系统，例如：
- 从传统数据库迁移到云平台
- 从一种数据库引擎迁移到另一种引擎
- 在系统更新过程中迁移数据

### 2. 数据集成

将多个来源的数据整合到一个统一的数据存储，例如：
- 收集多个业务系统的数据
- 整合第三方 API 数据
- 建立数据仓库或数据湖

### 3. 数据转换

对数据进行清洗、转换和标准化，例如：
- 数据格式转换
- 数据质量检查和修复
- 数据标准化和规范化

### 4. 定时数据处理

设置周期性的数据处理任务，例如：
- 日志数据处理和分析
- 定期报表生成
- 数据归档和清理

## 详细配置示例

### 1. CSV 到数据库迁移

```yaml
version: '1.0'
name: "CSV到PostgreSQL迁移"
description: "从CSV文件提取数据，转换后加载到PostgreSQL数据库"

jobs:
  extract_users:
    type: "extractor"
    extractor_type: "csv"
    options:
      file_path: "/data/users.csv"
      has_header: true
      delimiter: ","
      encoding: "utf-8"

  transform_users:
    type: "transformer"
    transformer_type: "json"
    options:
      transforms:
        - operation: "rename_field"
          from: "user_id"
          to: "id"
        - operation: "filter_field"
          field: "status"
          condition: "equals"
          value: "active"
        - operation: "format_date"
          field: "registration_date"
          from_format: "DD/MM/YYYY"
          to_format: "YYYY-MM-DD"

  load_to_postgres:
    type: "loader"
    loader_type: "jdbc"
    options:
      connection_string: "jdbc:postgresql://localhost:5432/mydb"
      table_name: "users"
      load_mode: "upsert"
      key_column: "id"
      batch_size: 500
      create_table: true
      table_schema: |
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          registration_date DATE,
          last_login TIMESTAMP
        )

dag:
  dependencies:
    transform_users: ["extract_users"]
    load_to_postgres: ["transform_users"]
  
  failure_policy: "fail"
  max_retries: 3
  retry_delay_seconds: 60
```

### 2. 使用插件的 MongoDB 数据迁移

```yaml
version: '1.0'
name: "MongoDB数据迁移示例"
description: "从CSV文件提取数据，转换后加载到MongoDB数据库"

jobs:
  extract_from_csv:
    type: "extractor"
    extractor_type: "csv"
    options:
      file_path: "./sample_data/products.csv"
      has_header: true
      delimiter: ","
      encoding: "utf-8"

  transform_data:
    type: "transformer"
    transformer_type: "json"
    options:
      transforms:
        - operation: "rename_field"
          from: "product_id"
          to: "_id"
        - operation: "convert_field"
          field: "price"
          type: "float"
        - operation: "convert_field"
          field: "stock"
          type: "int"

  load_to_mongodb:
    type: "loader"
    loader_type: "mongodb"  # 使用 MongoDB 插件
    options:
      connection_string: "mongodb://localhost:27017"
      database: "products_db"
      collection: "products"
      mode: "upsert"
      key_field: "_id"
      batch_size: 100

dag:
  dependencies:
    transform_data: ["extract_from_csv"]
    load_to_mongodb: ["transform_data"]
  
  failure_policy: "fail"
  max_retries: 3
  retry_delay_seconds: 60
```

## 插件系统

Lumos DataFlow 支持通过插件系统扩展其功能。插件可以是提取器、转换器或加载器，也可以同时提供多种功能。

### 插件管理

使用命令行工具管理插件：

```bash
# 列出所有已安装的插件
cargo run -- plugin list

# 列出特定类型的插件
cargo run -- plugin list --type extractor

# 安装插件
cargo run -- plugin install path/to/plugin.so

# 查看插件信息
cargo run -- plugin info mongodb

# 卸载插件
cargo run -- plugin uninstall mongodb
```

### 测试验证插件

为了验证插件系统和插件功能是否正常工作，提供了测试脚本和示例：

```bash
# Linux/macOS下构建和测试MongoDB插件
cd examples/plugins
chmod +x build_and_test.sh
./build_and_test.sh

# Windows下构建和测试MongoDB插件
cd examples\plugins
build_and_test.bat

# 单独运行测试（需要先构建插件）
LUMOS_PLUGINS_DIR=./target/plugins cargo run --example test_plugins
```

测试脚本将：
1. 构建MongoDB示例插件
2. 将插件复制到插件目录
3. 运行测试验证插件功能
4. 报告成功或失败

测试输出提供详细的验证结果，包括插件加载、元数据读取、提取和加载功能测试。

### 开发插件

查看 [插件开发指南](examples/plugins/readme.md) 了解如何开发自定义插件。

## 运行示例

```bash
# 使用示例配置运行ETL作业
cargo run --example run_etl_job -- examples/jdbc_etl_config.yaml

# 使用MongoDB插件的示例
cargo run --example run_etl_job -- examples/mongodb_etl_config.yaml

# 创建自定义配置并运行
cargo run --example run_etl_job -- path/to/your/config.yaml
```

## 性能优化

Lumos DataFlow 设计时考虑了以下性能优化点：

1. **批处理** - 支持批量提取和加载数据，减少I/O操作
2. **并行处理** - 利用 Actix Actor 模型实现并行任务执行
3. **内存管理** - 流式处理大数据集，避免内存溢出
4. **错误恢复** - 支持部分失败恢复和任务重试

## 可用的提取器

- **CSV 提取器** - 从 CSV 文件提取数据
  - 支持自定义分隔符、编码和标题行
  - 支持数据类型转换
  
- **JDBC 提取器** - 从数据库提取数据
  - 支持多种数据库类型（MySQL, PostgreSQL, MSSQL, Oracle）
  - 支持参数化查询
  - 支持分批提取大数据集
  
- **内存提取器** - 从内存中提取数据
  - 用于测试和内部数据传递
  - 支持持久化内存数据
  
- **插件提取器** - 通过插件系统提供
  - MongoDB 提取器
  - 其他第三方提取器

## 可用的转换器

- **JSON 转换器** - 对 JSON 数据进行各种转换操作
  - 字段重命名、删除、添加
  - 数据类型转换
  - 日期时间格式化
  - 条件过滤
  
- **基本转换器** - 提供基本的数据转换功能
  - 字符串处理（大小写转换、修剪空白等）
  - 数值计算（四则运算、舍入等）
  - 数据合并与拆分
  
- **插件转换器** - 通过插件系统提供
  - 高级数据转换
  - 特定领域转换

## 可用的加载器

- **CSV 加载器** - 将数据加载到 CSV 文件
  - 支持追加或覆盖模式
  - 自定义分隔符和编码
  
- **JDBC 加载器** - 将数据加载到数据库
  - 支持多种数据库类型
  - 支持插入、更新、更新插入(upsert)模式
  - 批量操作优化
  
- **内存加载器** - 将数据加载到内存中
  - 用于测试和临时存储
  - 支持追加或替换模式
  
- **插件加载器** - 通过插件系统提供
  - MongoDB 加载器
  - 其他第三方加载器

## 扩展框架

要添加新的提取器、转换器或加载器，有两种方式：

1. **内置组件**: 实现相应的 Actor 特性和消息处理器，并在工厂方法中注册。
2. **插件开发**: 创建独立的动态库插件，实现 `Plugin` 接口。

框架的模块化设计使得扩展非常简单，无需修改核心代码。

## 依赖库

- **actix** - Actor系统实现
- **tokio** - 异步运行时
- **serde** - 序列化/反序列化支持
- **chrono** - 日期时间处理
- **csv** - CSV文件处理
- **sqlx** - 数据库交互（可选）
- **libloading** - 动态库加载（插件系统）

## 插件系统

Lumos DataFlow框架支持两种插件技术:

### 1. 动态库插件 (传统)

通过libloading加载动态共享库(.so, .dll, .dylib)，实现自定义提取器、转换器和加载器。

### 2. WebAssembly插件 (新)

基于WebAssembly和WIT (WebAssembly Interface Types)的插件系统，提供更好的安全性、平台无关性和性能。

#### WebAssembly插件优势:

- **安全沙箱**: 插件在受控环境中运行，无法访问主机系统资源
- **跨平台**: 同一个WASM插件可在任何支持WebAssembly的平台上运行
- **接口明确**: 通过WIT接口定义确保类型安全和版本兼容性
- **性能优异**: 接近原生性能的执行速度
- **多语言支持**: 可以使用Rust、C/C++、AssemblyScript等多种语言开发插件

## 使用示例

### 配置文件示例

```yaml
version: '1.0'
name: "MongoDB数据迁移示例"
description: "从CSV文件提取数据，转换后加载到MongoDB数据库"

jobs:
  - name: "csv-extract"
    type: "extractor"
    extractor_type: "csv"
    options:
      file_path: "./data/input.csv"
      has_header: true
    next: "transform-data"

  - name: "transform-data"
    type: "transformer"
    transformer_type: "default"
    options:
      operations:
        - type: "rename"
          from: "old_name"
          to: "new_name"
        - type: "filter"
          field: "status"
          operator: "equals"
          value: "active"
    next: "load-to-mongodb"

  - name: "load-to-mongodb"
    type: "loader"
    loader_type: "mongodb"
    options:
      connection_string: "mongodb://localhost:27017"
      database: "mydatabase"
      collection: "mycollection"
      mode: "replace"
```

### 插件管理

#### WebAssembly插件管理

```bash
# 列出所有已加载的WebAssembly插件
cargo run --example wasm_plugin_manager list

# 列出特定类型的插件
cargo run --example wasm_plugin_manager list --type extractor

# 验证WebAssembly插件
cargo run --example wasm_plugin_manager validate ./plugins/my-plugin.wasm

# 显示插件支持的功能
cargo run --example wasm_plugin_manager capabilities ./plugins/my-plugin.wasm
```

#### 传统动态库插件管理

```bash
# 列出所有已安装的插件
cargo run --example plugin_manager list

# 安装插件
cargo run --example plugin_manager install /path/to/plugin.so

# 卸载插件
cargo run --example plugin_manager uninstall plugin_name
```

## WebAssembly插件开发

### 定义接口

Lumos DataFlow使用WIT (WebAssembly Interface Types)定义插件接口:

```wit
// lumos-plugin.wit
package lumos:plugin;

record data-record {
    data: string
}

enum plugin-type {
    extractor,
    transformer,
    loader,
    all
}

record plugin-metadata {
    name: string,
    version: string,
    description: string,
    author: string,
}

interface plugin {
    get-metadata: func() -> plugin-metadata;
    get-type: func() -> plugin-type;
    init: func() -> ();
    shutdown: func() -> ();
}

interface extractor {
    extract: func(options: string) -> result<list<data-record>, string>;
}

interface transformer {
    transform: func(records: list<data-record>) -> list<data-record>;
}

interface loader {
    load: func(records: list<data-record>, options: string) -> result<u32, string>;
}

world plugin-world {
    export plugin;
    export extractor;
    export transformer;
    export loader;
    
    import logging: interface {
        debug: func(message: string);
        info: func(message: string);
        warn: func(message: string);
        error: func(message: string);
    }
}
```

### 创建MongoDB插件示例

```rust
// 使用wit-bindgen构建WASM插件
use serde_json::{json, Value};
use std::collections::HashMap;

// MongoDB WASM插件实现
// ...插件代码...

#[no_mangle]
pub extern "C" fn get_metadata() -> i64 {
    // 返回插件元数据
}

#[no_mangle]
pub extern "C" fn extract(options_ptr: i64) -> i64 {
    // 从MongoDB提取数据
}

#[no_mangle]
pub extern "C" fn transform(records_ptr: i64) -> i64 {
    // 转换数据
}

#[no_mangle]
pub extern "C" fn load(records_ptr: i64, options_ptr: i64) -> i64 {
    // 加载数据到MongoDB
}
```

## 构建和测试

```bash
# 构建库
cargo build

# 运行测试
cargo test

# 运行示例
cargo run --example csv_to_console
```

## 依赖

- Actix Actor框架
- Tokio异步运行时
- Serde序列化/反序列化
- Wasmtime WebAssembly运行时

## 许可证

MIT 