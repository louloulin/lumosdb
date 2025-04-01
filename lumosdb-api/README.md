# LumosDB API 服务

LumosDB 的后端 API 服务，提供数据库操作、实时数据更新和 AI 辅助功能。

## 特性

- 使用 Hono 框架构建的高性能 API
- SQLite 数据库操作
- DuckDB 分析查询
- 向量数据库支持
- AI 辅助功能

## 快速开始

### 安装依赖

```bash
bun install
```

### 开发模式运行

```bash
bun dev
```

默认情况下，服务器将在 http://localhost:3005 上运行。

### 构建生产版本

```bash
bun build
```

### 运行生产版本

```bash
bun start
```

## API 端点

### 通用端点

- `GET /health` - 健康检查
- `GET /ws` - WebSocket 连接点

### SQLite 操作

- `GET /api/sqlite/databases` - 获取所有 SQLite 数据库
- `GET /api/sqlite/databases/:database/tables` - 获取指定数据库的所有表
- `GET /api/sqlite/databases/:database/tables/:table` - 获取表数据
- `POST /api/sqlite/databases/:database/query` - 执行 SQL 查询

### DuckDB 操作

- `GET /api/duckdb/tables` - 获取所有 DuckDB 表
- `POST /api/duckdb/query` - 执行 DuckDB 查询

### 向量数据库操作

- `GET /api/vector/collections` - 获取所有向量集合
- `GET /api/vector/collections/:collection` - 获取集合中的向量

### AI 辅助功能

- `POST /api/ai/query-generator` - 根据自然语言生成 SQL 查询

## 环境变量

可以通过 `.env` 文件配置以下环境变量：

- `PORT` - 服务器端口（默认: 3005）
- `NODE_ENV` - 环境模式（development/production）
- `CORS_ORIGIN` - 允许的跨域来源
- `LOG_LEVEL` - 日志级别（debug/info/warn/error）

## 扩展开发

项目使用 Hono 框架和 TypeScript，遵循模块化设计原则。

路由文件位于 `src/routes/` 目录，每个功能模块都有单独的路由文件：

- `index.ts` - 主路由
- `sqlite.ts` - SQLite 路由
- `duckdb.ts` - DuckDB 路由
- `vector.ts` - 向量数据库路由
- `ai.ts` - AI 辅助功能路由 