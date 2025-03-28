# Lumos-DB

Lumos-DB是一个轻量级数据平台，专为AI代理设计，提供高效的数据存储和查询功能。

## 功能特点

- **多引擎支持**：集成SQLite和DuckDB引擎，提供不同类型的数据处理能力
- **矢量搜索**：内置向量存储和相似度搜索功能，支持AI和机器学习应用
- **高效缓存**：多层次缓存策略，提高查询性能
- **灵活查询**：支持SQL查询和API操作，满足不同应用场景
- **数据同步**：提供表结构和数据同步功能

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

### 初始化数据库

```bash
# 使用默认路径初始化
cargo run -- init

# 指定数据库路径
cargo run -- init --path mydata.db
```

### 执行查询

```bash
# 创建表
cargo run -- query --path mydata.db --sql "CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT, age INTEGER);"

# 插入数据
cargo run -- query --path mydata.db --sql "INSERT INTO users (name, email, age) VALUES ('张三', 'zhangsan@example.com', 30);"

# 查询数据
cargo run -- query --path mydata.db --sql "SELECT * FROM users;"
```

### 启动服务器（待实现）

```bash
# 使用默认设置启动服务器
cargo run -- serve

# 指定主机和端口
cargo run -- serve --host 0.0.0.0 --port 3000
```

## 项目结构

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
├── src/                # CLI应用代码
├── examples/           # 使用示例
├── tests/              # 测试代码
└── Cargo.toml          # 主项目依赖配置
```

## 许可证

[MIT](LICENSE) 