# Lumos-DB

Lumos-DB是一个轻量级数据平台，专为AI代理设计，提供高效的数据存储、查询功能和数据流处理能力。

## 功能特点

- **多引擎支持**：集成SQLite和DuckDB引擎，提供不同类型的数据处理能力
- **矢量搜索**：内置向量存储和相似度搜索功能，支持AI和机器学习应用
- **高效缓存**：多层次缓存策略，提高查询性能
- **灵活查询**：支持SQL查询和API操作，满足不同应用场景
- **数据同步**：提供表结构和数据同步功能
- **ETL能力**：通过Lumos-DataFlow模块，支持强大的数据提取、转换和加载功能
- **基于Actor模型**：利用Actix框架实现高并发、异步处理
- **DAG工作流**：支持复杂任务依赖关系管理和流程编排

## 架构

```
lumos-db/
├── core/               # 核心库代码
│   ├── src/
│   │   ├── sqlite/     # SQLite引擎相关代码
│   │   ├── duckdb/     # DuckDB引擎相关代码
│   │   ├── query/      # 查询处理逻辑
│   │   ├── sync/       # 数据同步功能
│   │   ├── vector/     # 向量存储和搜索
│   │   └── lib.rs      # 库入口
│   └── Cargo.toml      # 核心库依赖配置
├── dataflow/           # ETL数据流处理模块
│   ├── src/            # 源代码
│   │   ├── actors/     # Actor实现
│   │   ├── extractors/ # 数据提取器
│   │   ├── transformers/ # 数据转换器
│   │   ├── loaders/    # 数据加载器
│   │   ├── types.rs    # 类型定义
│   │   ├── config.rs   # 配置管理
│   │   └── dag.rs      # DAG依赖管理
│   ├── examples/       # 示例代码
│   └── Cargo.toml      # 依赖配置
├── src/                # CLI应用代码
├── examples/           # 使用示例
├── tests/              # 测试代码
└── Cargo.toml          # 主项目依赖配置
```

## 安装

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/yourusername/lumos-db.git
cd lumos-db

# 构建项目
cargo build --release

# 安装二进制文件（可选）
cargo install --path .
```

## 基本用法

### 数据库操作

```bash
# 初始化数据库
cargo run -- init --path mydata.db

# 执行查询
cargo run -- query --path mydata.db --sql "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT, age INTEGER);"
cargo run -- query --path mydata.db --sql "INSERT INTO users (name, email, age) VALUES ('张三', 'zhangsan@example.com', 30);"
cargo run -- query --path mydata.db --sql "SELECT * FROM users;"
```

### ETL数据流处理

Lumos-DB包含强大的ETL模块（提取、转换、加载），用于数据迁移和集成。

#### 配置示例

ETL流程通过YAML配置文件定义，例如：

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

#### 运行ETL作业

```bash
# 运行示例ETL作业
cargo run --package lumos-dataflow --example run_etl_job -- path/to/your/config.yaml
```

## 核心组件

### 1. 数据库引擎

- **SQLite引擎**: 适用于轻量级应用和嵌入式场景
- **DuckDB引擎**: 适用于分析查询和大数据处理

### 2. 数据流处理

- **提取器**: 支持从CSV文件、数据库、内存等源头提取数据
- **转换器**: 支持数据清洗、映射、聚合等转换操作
- **加载器**: 支持将处理后的数据加载到CSV文件、数据库、内存等目标位置

### 3. DAG任务管理

- **有向无环图**: 管理任务依赖关系
- **失败策略**: 支持失败重试、继续执行或终止整个流程
- **状态跟踪**: 实时跟踪任务执行状态和统计信息

## 高级用法

### 开发自定义提取器

```rust
use actix::prelude::*;
use lumos_dataflow::types::{DataRecord, ETLError};
use lumos_dataflow::actors::messages::ExtractData;

pub struct MyCustomExtractor {
    config: HashMap<String, serde_json::Value>,
}

impl MyCustomExtractor {
    pub fn new(config: HashMap<String, serde_json::Value>) -> Self {
        Self { config }
    }
    
    async fn extract_data(&self, options: &HashMap<String, serde_json::Value>) -> Result<Vec<DataRecord>, ETLError> {
        // 自定义数据提取逻辑
        // ...
    }
}

impl Actor for MyCustomExtractor {
    type Context = Context<Self>;
}

impl Handler<ExtractData> for MyCustomExtractor {
    type Result = ResponseFuture<Result<Vec<DataRecord>, ETLError>>;
    
    fn handle(&mut self, msg: ExtractData, _: &mut Context<Self>) -> Self::Result {
        // 处理提取请求
        // ...
    }
}
```

### 启动服务器（待实现）

```bash
# 使用默认设置启动服务器
cargo run -- serve

# 指定主机和端口
cargo run -- serve --host 0.0.0.0 --port 3000
```

## 集成

### 与AI框架集成

Lumos-DB设计用于与AI框架无缝集成，特别是：

- **向量存储**: 存储和检索大型语言模型的嵌入向量
- **上下文管理**: 高效管理会话上下文和历史记录
- **知识库**: 构建和查询结构化知识库

## 贡献

欢迎通过以下方式贡献：

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启Pull Request

## 许可证

[MIT](LICENSE) 