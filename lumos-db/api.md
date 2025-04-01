# LumosDB API 设计计划

## 1. 总体架构

LumosDB API 作为轻量级数据库管理平台的后端服务，采用分层架构设计，提供以下核心能力：

1. **数据库操作接口**：提供对 SQLite、DuckDB 和向量数据库的统一访问
2. **实时数据更新**：通过 WebSocket 实现数据变更实时推送
3. **AI 辅助功能**：智能查询生成和数据分析建议
4. **系统监控**：提供系统状态、性能和日志查询接口

## 2. 技术栈选择

- **基础框架**：Hono (替代 Express)，轻量高性能 Web 框架
- **运行时**：Bun，提供更快的执行性能
- **数据验证**：Zod，类型安全的请求验证
- **日志管理**：Winston，灵活的日志记录
- **数据库驱动**：
  - Better-SQLite3：SQLite 的高性能驱动
  - DuckDB Node.js API：DuckDB 的原生支持
  - 向量数据库连接器：根据具体实现选择

## 3. API 模块设计

### 3.1 SQLite 模块

#### 端点设计

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/sqlite/databases` | GET | 获取所有 SQLite 数据库 |
| `/api/sqlite/databases/:database/tables` | GET | 获取指定数据库的所有表 |
| `/api/sqlite/databases/:database/tables/:table` | GET | 获取指定表的数据 |
| `/api/sqlite/databases/:database/query` | POST | 执行 SQL 查询 |

#### 数据流

1. 客户端发送请求
2. API 服务验证请求参数
3. API 调用 LumosDB Server 的 SQLite 功能
4. 返回结果给客户端
5. 对于数据变更操作，通过 WebSocket 推送更新通知

### 3.2 DuckDB 模块

#### 端点设计

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/duckdb/tables` | GET | 获取所有 DuckDB 表 |
| `/api/duckdb/query` | POST | 执行 DuckDB 查询 |
| `/api/duckdb/import` | POST | 导入数据到 DuckDB |

#### 分析功能

1. 支持复杂的分析查询
2. 提供数据可视化所需的结构化输出
3. 支持从多种来源导入数据(CSV, JSON, Parquet, SQLite)

### 3.3 向量数据库模块

#### 端点设计

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/vector/collections` | GET | 获取所有向量集合 |
| `/api/vector/collections/:collection` | GET | 获取指定集合的向量 |
| `/api/vector/search` | POST | 执行向量搜索 |
| `/api/vector/collections/:collection` | POST | 添加向量到集合 |

#### 特性支持

1. 支持多种向量数据库后端
2. 提供向量相似度搜索
3. 支持元数据过滤

### 3.4 AI 辅助模块

#### 端点设计

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/ai/query-generator` | POST | 根据自然语言生成 SQL 查询 |
| `/api/ai/data-analysis` | POST | 生成数据分析建议 |

#### 功能特点

1. 自然语言到 SQL 转换
2. 数据分析建议和可视化方案
3. 支持多种数据库方言

### 3.5 系统管理模块

#### 端点设计

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/admin/logs` | GET | 获取系统日志 |
| `/api/admin/stats` | GET | 获取系统统计信息 |
| `/api/admin/users` | POST | 用户管理 |

## 4. 实时数据功能

### 4.1 WebSocket 设计

- **连接端点**：`/ws`
- **订阅机制**：客户端可以订阅特定表或集合的变更
- **消息格式**：JSON 格式的事件通知
- **事件类型**：
  - `record.created`：记录创建
  - `record.updated`：记录更新
  - `record.deleted`：记录删除
  - `collection.changed`：集合变更

### 4.2 实现方式

1. 客户端建立 WebSocket 连接
2. 客户端发送订阅请求
3. 服务器监听数据变更
4. 当数据变更时，服务器向订阅的客户端推送通知

## 5. 安全考虑

### 5.1 认证与授权

- 基于 JWT 的用户认证
- 基于角色的权限控制
- API 密钥认证用于集成场景

### 5.2 数据安全

- 请求验证和清理
- 防止 SQL 注入
- 敏感数据过滤

### 5.3 API 保护

- 速率限制
- CORS 配置
- HTTPS 支持

## 6. 与前端集成

### 6.1 数据交互模式

- 查询模型：前端发送请求，API 返回数据
- 订阅模型：前端订阅数据变更，API 推送更新

### 6.2 状态管理

- 初始数据加载：通过 REST API
- 实时更新：通过 WebSocket
- 缓存策略：适当缓存以提高性能

## 7. 与 LumosDB Server 集成

### 7.1 交互方式

- 直接调用：API 服务直接调用 LumosDB 核心库函数
- 进程通信：API 服务通过 IPC 与 LumosDB 服务通信
- HTTP 请求：API 服务通过 HTTP 调用 LumosDB 服务接口

### 7.2 数据流

```
+-------------+          +------------+          +-----------------+
|             |  HTTP/WS |            |  Native  |                 |
| LumosDB UI  <---------->  LumosDB   <---------->  LumosDB Server |
|             |          |    API     |   /IPC   |                 |
+-------------+          +------------+          +-----------------+
```

## 8. 扩展性考虑

### 8.1 插件系统

- 支持通过插件扩展 API 功能
- 插件可以添加新的端点或增强现有功能

### 8.2 自定义集成

- 提供 SDK 以便第三方应用集成
- 支持自定义事件和钩子

## 9. 开发与部署计划

### 9.1 阶段划分

1. 基础框架搭建：Hono 服务器、路由结构、中间件
2. 核心功能实现：SQLite、DuckDB、向量数据库接口
3. 增强功能：WebSocket 实时更新、AI 辅助功能
4. 安全加固：认证授权、数据验证、安全配置
5. 性能优化：缓存、查询优化、连接池

### 9.2 部署选项

- 单体部署：API 与 LumosDB Server 一起部署
- 分离部署：API 与 LumosDB Server 分别部署，通过网络通信
- 容器化：Docker 容器部署，便于扩展和管理

## 10. 测试策略

### 10.1 单元测试

- 路由和控制器测试
- 数据验证测试
- 错误处理测试

### 10.2 集成测试

- API 端点测试
- WebSocket 连接测试
- 与 LumosDB Server 集成测试

### 10.3 性能测试

- 负载测试
- 并发测试
- 长连接测试 