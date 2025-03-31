# PostgreSQL WASM 测试工具

这个工具用于测试PostgreSQL WASM插件的性能和功能。它允许你运行插件的ETL(提取、转换、加载)流程，并测量每个阶段的性能。

## 功能特点

- 测量提取、转换和加载阶段的性能
- 支持多次迭代测试，计算平均性能
- 提供详细的性能报告
- 支持不同的Wasmtime优化配置
- 支持将测试结果导出为CSV格式
- 支持插件比较，对比不同插件的性能差异
- 支持记录过滤，基于特定字段值

## 使用方法

### 基本用法

```bash
cargo run -- --plugin /path/to/plugin.wasm --connection "postgres://user:password@host:port" --database "mydb" --query "SELECT * FROM mytable" --table "mytable"
```

### 参数说明

- `--plugin`: WASM插件的路径
- `--connection`: PostgreSQL连接字符串
- `--database`: 数据库名称
- `--query`: 提取数据的SQL查询
- `--table`: 源表名称
- `--iterations`: 测试迭代次数（默认：5）
- `--heap-start`: 堆内存起始位置（默认：1024）

### 优化配置

你可以通过以下参数自定义Wasmtime优化配置：

- `--optimization-level`: 优化级别（none, speed, speed_and_size）
- `--compilation-mode`: 编译模式（eager, lazy）
- `--strategy`: 执行策略（cranelift, auto）
- `--simd`: 启用SIMD指令
- `--bulk-memory`: 启用批量内存操作
- `--threads`: 启用线程支持
- `--memory64`: 启用64位内存

### 高级功能

- `--compare`: 指定另一个插件进行比较
- `--export-csv`: 将结果导出为CSV文件
- `--filter-field`: 按指定字段过滤记录
- `--filter-value`: 过滤的字段值

## 示例

### 基本测试

```bash
cargo run -- --plugin plugins/postgresql-plugin.wasm --connection "postgres://user:password@localhost:5432" --database "testdb" --query "SELECT * FROM users" --table "users"
```

### 比较两个插件

```bash
cargo run -- --plugin plugins/v1/postgresql-plugin.wasm --compare plugins/v2/postgresql-plugin.wasm --connection "postgres://user:password@localhost:5432" --database "testdb" --query "SELECT * FROM users" --table "users"
```

### 导出CSV结果

```bash
cargo run -- --plugin plugins/postgresql-plugin.wasm --connection "postgres://user:password@localhost:5432" --database "testdb" --query "SELECT * FROM users" --table "users" --export-csv
```

### 使用特定优化配置

```bash
cargo run -- --plugin plugins/postgresql-plugin.wasm --connection "postgres://user:password@localhost:5432" --database "testdb" --query "SELECT * FROM users" --table "users" --optimization-level speed --compilation-mode eager --strategy cranelift --simd
```

## 优化配置文件

你可以在`optimization-profiles.toml`文件中定义常用的优化配置组合，以便在命令行中快速引用。 