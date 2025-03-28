# Lumos-DB 4.0: 服务器Go到Rust迁移计划

## 背景与目标

Lumos-DB当前的架构分为两部分：
1. Core库（Rust）：提供底层数据处理能力
2. Server（Go）：提供HTTP API和服务能力

为了提高系统的一致性、性能和可维护性，我们决定将Go服务器部分迁移到Rust，使整个系统技术栈统一。这将带来以下优势：

- **技术栈统一**：减少跨语言交互的成本和复杂性
- **性能提升**：避免了FFI调用的开销，提高系统整体性能
- **安全性增强**：利用Rust的内存安全特性
- **简化开发流程**：统一工具链和开发流程
- **更好的代码共享**：核心库和服务器可以共享代码和类型定义

## 迁移阶段

### 第一阶段：服务器框架搭建（已完成）

- [x] 创建基础的API结构
- [x] 配置Actix Web服务器
- [x] 实现基本的路由系统
- [x] 处理请求和响应的基础模型

### 第二阶段：核心功能迁移（进行中）

- [x] 数据库操作API迁移
  - [x] 表操作API (创建、删除、查询等)
  - [x] 数据操作API (增删改查)
  - [x] SQL执行API
- [x] 向量操作API迁移
  - [x] 向量集合API (创建、列表)
  - [x] 向量嵌入API (添加、搜索)
  - [x] 向量索引API

### 第三阶段：高级功能和优化（待实现）

- [ ] 认证和授权系统
- [ ] 缓存优化
- [ ] 性能监控
- [ ] 分布式支持
- [ ] 优化Rust实现的特定功能

### 第四阶段：测试和部署（待实现）

- [ ] 单元测试
- [ ] 集成测试
- [ ] 性能基准测试
- [ ] 优化部署流程
- [ ] 文档更新

## 架构设计

### 模块结构

```
server/
  ├── src/
  │   ├── main.rs             # 程序入口
  │   ├── api/                # API模块
  │   │   ├── mod.rs
  │   │   └── rest/           # REST API实现
  │   │       ├── mod.rs
  │   │       ├── server.rs   # 服务器实现
  │   │       └── handlers/   # 请求处理程序
  │   │           ├── mod.rs
  │   │           ├── db_handler.rs     # 数据库处理
  │   │           └── vector_handlers.rs # 向量处理
  │   ├── db/                 # 数据库操作
  │   │   ├── mod.rs
  │   │   ├── executor.rs     # SQL执行器
  │   │   └── vector_executor.rs # 向量执行器
  │   ├── models/             # 数据模型
  │   │   ├── mod.rs
  │   │   ├── db.rs           # 数据库模型
  │   │   ├── response.rs     # 响应模型
  │   │   └── vector.rs       # 向量模型
  │   └── config.rs           # 配置模块
  ├── Cargo.toml
  └── tests/
```

### API 设计

#### 数据库API

| 方法   | 路径                                | 描述              |
|--------|-------------------------------------|-------------------|
| POST   | /api/db/{db_name}                   | 创建数据库        |
| DELETE | /api/db/{db_name}                   | 删除数据库        |
| GET    | /api/db/{db_name}/tables            | 列出表            |
| POST   | /api/db/{db_name}/tables/{table}    | 创建表            |
| DELETE | /api/db/{db_name}/tables/{table}    | 删除表            |
| POST   | /api/db/{db_name}/tables/{table}/rows | 插入数据        |
| GET    | /api/db/{db_name}/tables/{table}/rows | 查询数据        |
| GET    | /api/db/{db_name}/tables/{table}/rows/{id} | 获取单行  |
| PUT    | /api/db/{db_name}/tables/{table}/rows/{id} | 更新数据  |
| DELETE | /api/db/{db_name}/tables/{table}/rows/{id} | 删除数据  |
| POST   | /api/db/{db_name}/query             | 执行SQL查询      |

#### 向量API

| 方法   | 路径                                | 描述              |
|--------|-------------------------------------|-------------------|
| POST   | /api/vector/collections             | 创建向量集合      |
| GET    | /api/vector/collections             | 列出向量集合      |
| POST   | /api/vector/collections/{name}/embeddings | 添加向量嵌入 |
| POST   | /api/vector/collections/{name}/search | 搜索相似向量    |
| POST   | /api/vector/collections/{name}/index/{type} | 创建索引  |

## 已完成工作

1. 基础服务器架构
2. 数据库API框架
3. 向量API实现
4. 基本的错误处理
5. 配置系统

## 下一步工作

1. 完成数据库处理程序的具体实现
2. 添加认证系统
3. 实现更丰富的查询功能
4. 添加缓存机制
5. 实现性能监控

## 风险与挑战

1. Actix Web与Gin框架的差异适应
2. Rust的异步编程模型与Go的goroutine模型转换
3. 确保API完全兼容，避免客户端需要修改
4. 性能调优，确保Rust版本性能超过Go版本

## 结论

Go到Rust的迁移是提高Lumos-DB系统一致性和性能的关键一步。通过统一技术栈，我们可以简化开发流程，提高代码质量，并充分利用Rust的安全性和性能优势。目前迁移工作进展顺利，预计能够在计划时间内完成所有工作。 