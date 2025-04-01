# LumosDB UI 规划文档

## 1. 当前状态分析

### 1.1 已实现功能

- 基于 Next.js 和 shadcn/ui 的现代化界面
- 主页与仪表盘基础布局
- 侧边栏导航系统
- 暗色/亮色主题切换
- 数据概览展示(Dashboard)
- SQLite 表格管理基础页面
- 向量集合管理基础页面 ✓
- SQL 编辑器/查询界面 ✓
- 表结构编辑器/创建器 ✓
- DuckDB 分析页面 ✓
- 向量搜索界面 ✓
- 认证与权限系统 ✓

### 1.2 与 Supabase/PocketBase 的差距

- 缺少 API 密钥和配置管理
- 缺少数据导入/导出功能
- 缺少性能监控和分析工具
- 缺少实时数据更新功能
- 缺少移动端响应式优化

## 2. UI 优化路线图

### 2.1 第一阶段：基础功能完善（3-4周）

#### 2.1.1 SQL 编辑器 ✓

- 添加基于 Monaco Editor 的 SQL 查询工具 ✓
- 支持语法高亮和自动完成 ✓
- 查询历史记录和收藏功能 ✓
- 查询结果可视化展示与导出 ✓

### 2.2 第二阶段：高级功能开发（4-6周）

#### 2.2.1 向量搜索与管理界面 ✅

- [x] 向量集合创建与配置
- [x] 向量搜索测试界面
- [x] 相似度搜索可视化
- [x] 向量数据导入导出

#### 2.2.2 认证与权限系统 ✓

- 用户登录/注册界面 ✓
- 用户管理面板 ✓
- 角色与权限配置 ✓
- API 密钥管理 ✓

#### 2.2.3 API 文档与测试工具 ✓

- 内置 API 文档 ✓
- API 请求测试工具 ✓
- 示例代码生成 ✓

### 2.3 第三阶段：高级集成与优化（3-4周）

#### 2.3.1 实时数据更新 ✓

- WebSocket/SSE 集成 ✓
- 实时数据订阅界面 ✓
- 数据变更通知系统 ✓

#### 2.3.2 高级分析仪表盘 ✓

- 自定义仪表盘创建 ✓
- 多种数据可视化组件 ✓
- 仪表盘导出与分享 ✓

#### 2.3.3 移动端优化 ✅

- [x] 响应式布局组件开发
- [x] 移动友好的导航设计
- [x] 触控友好的交互设计
- [x] 优化移动端性能

#### 2.3.4 SQL 编辑器 ✅
- [x] 基于 Monaco Editor 集成的 SQL 编辑器
- [x] 语法高亮、自动补全和错误提示
- [x] 执行 SQL 查询并显示结果
- [x] 保存和加载查询的功能
- [x] 查询历史记录
- [x] 支持导出查询结果

## 3. API 接口需求

### 3.1 核心数据接口

#### 3.1.1 SQLite 表操作

```typescript
// 获取所有表
GET /api/sqlite/tables

// 获取表结构
GET /api/sqlite/tables/:tableName

// 获取表数据
GET /api/sqlite/tables/:tableName/data?limit=20&offset=0

// 创建表
POST /api/sqlite/tables

// 更新表结构
PUT /api/sqlite/tables/:tableName

// 删除表
DELETE /api/sqlite/tables/:tableName

// 执行SQL查询
POST /api/sqlite/query
```

#### 3.1.2 DuckDB 分析接口

```typescript
// 获取所有分析表
GET /api/duckdb/tables

// 执行分析查询
POST /api/duckdb/query

// 导出分析结果
GET /api/duckdb/export?query=SELECT...
```

#### 3.1.3 向量存储接口

```typescript
// 获取所有向量集合
GET /api/vectors/collections

// 获取集合详情
GET /api/vectors/collections/:collectionName

// 创建新集合
POST /api/vectors/collections

// 向集合添加向量
POST /api/vectors/collections/:collectionName/vectors

// 向量搜索
POST /api/vectors/collections/:collectionName/search
```

### 3.2 系统管理接口

#### 3.2.1 用户认证

```typescript
// 用户登录
POST /api/auth/login

// 用户注册
POST /api/auth/register

// 获取当前用户信息
GET /api/auth/me

// 更新用户信息
PUT /api/auth/me
```

#### 3.2.2 系统配置

```typescript
// 获取系统配置
GET /api/system/config

// 更新系统配置
PUT /api/system/config

// 系统状态监控
GET /api/system/status
```

## 4. 组件开发优先级

### 4.1 第一优先级（已全部实现）✓

1. SQL查询编辑器 ✓
2. 表结构管理界面 ✓
3. 数据浏览和编辑组件 ✓
4. 向量搜索界面 ✓
5. 基本认证系统 ✓

### 4.2 第二优先级（增强功能）

1. 高级分析仪表盘 ✓
2. API文档和测试工具 ✓
3. 数据导入/导出功能 ✓
4. 角色和权限管理 ✓
5. 系统监控和日志查看 ✅
   - [x] CPU、内存、磁盘使用率监控
   - [x] 数据库性能监控
   - [x] 系统日志查看和过滤
   - [x] 查询性能分析

### 4.3 第三优先级（锦上添花）

1. 实时数据更新功能 ✓
2. 自定义主题支持 ✓
3. 多语言支持 ✓
4. 移动端APP包装 ✓
5. AI辅助功能（智能查询生成、数据分析建议）✅
   - [x] SQL 查询生成器
   - [x] 数据分析助手
   - [x] 数据库模式设计辅助

## 5. 设计规范

### 5.1 颜色系统

- 主色：#0f172a（暗蓝色，类似Supabase）
- 次要色：#6366f1（靛蓝色）
- 成功色：#22c55e
- 警告色：#f59e0b
- 错误色：#ef4444
- 中性色：#64748b

### 5.2 排版

- 标题：Inter, font-weight: 700
- 正文：Inter, font-weight: 400
- 代码块：MonoLisa, Menlo, Monaco, Consolas

### 5.3 组件风格

- 圆角：0.375rem (6px)
- 阴影：轻量级阴影用于卡片和模态框
- 过渡：150ms ease-in-out
- 间距：使用4的倍数（4px, 8px, 16px, 24px, 32px等）

## 6. 兼容性与响应式设计

### 6.1 设备支持

- 桌面端：Chrome, Firefox, Safari, Edge (最新两个版本)
- 移动端：iOS Safari, Android Chrome (最新版本)
- 最小支持分辨率：375px宽度（移动设备）

### 6.2 响应式断点

- 移动端: 0px - 639px
- 平板端: 640px - 1023px
- 桌面端: 1024px及以上

## 7. 未来发展方向

### 7.1 AI集成

- 自然语言生成SQL查询
- 智能数据分析和异常检测
- 自动化报表生成
- 向量数据聚类和可视化

### 7.2 生态系统扩展

- 插件系统支持
- 第三方工具集成（BI工具、ETL工具等）
- 数据源连接器
- 云服务部署支持

## 8. 后续开发计划

- **2024 Q2**: 完成核心功能和接口开发
- **2024 Q3**: 实现高级特性和集成
- **2024 Q4**: 优化性能和用户体验，支持企业级部署
- **2025 Q1**: 扩展AI功能，构建开发者生态系统
