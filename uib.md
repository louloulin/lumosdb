# LumosDB UI 后端对接计划

## 1. 项目概述

LumosDB UI 是一个基于 Next.js 和 Shadcn UI 构建的前端应用，需要与 Rust 编写的 LumosDB 后端服务对接。对接将使用 TypeScript SDK （`clients/ts`）作为中间层，实现前端与后端的通信。

## 2. 技术栈

- **前端**: Next.js + Shadcn UI + TailwindCSS
- **后端**: Rust (作为服务器)
- **SDK**: TypeScript SDK
- **包管理**: Bun

## 3. 现状分析

### 3.1 前端结构

前端采用 Next.js App Router 结构，主要包含:
- `/src/app`: 页面路由
- `/src/components`: UI 组件
- `/src/lib/api`: API 请求模块
- `/src/contexts`: 上下文及状态管理

目前 API 请求模块中包含了大量 mock 数据，需要替换为实际的 SDK 调用。

### 3.2 SDK 结构

TS SDK 提供了核心功能模块:
- `LumosDBClient`: 主客户端类
- `DbClient`: 数据库操作
- `VectorClient`: 向量操作
- `HealthClient`: 健康检查

SDK 使用 axios 作为 HTTP 客户端，实现与后端 REST API 的通信。

### 3.3 后端结构

后端采用 Rust 开发，主要提供以下 API 端点:
- `/api/db/*`: 数据库相关操作
- `/api/health`: 健康检查
- 其他 REST 端点

## 4. 对接计划

### 4.1 基础设施配置 ✅

1. **环境变量配置** ✅
   - 更新 `.env.local` 设置后端 API 地址
   - 配置前端代理以解决可能的跨域问题

2. **SDK 集成** ✅
   - 在 UI 项目中添加 TS SDK 依赖
   - 配置 SDK 初始化参数

### 4.2 API 服务层改造 ✅

1. **创建 SDK 服务层** ✅
   - 实现 `/src/lib/api/sdk-client.ts`，封装 SDK 初始化和管理
   - 为各功能模块创建相应的服务类

2. **替换现有 Mock API** ✅
   - SQL 模块 (`sql.ts`) → 对接 `DbClient` ✅
   - 向量模块 (`vectors.ts`) → 对接 `VectorClient` ✅
   - 健康检查模块 → 对接 `HealthClient` ✅
   - 认证模块 (`auth.ts`) → 对接认证相关 API ✅
   - 实时数据模块 → 对接 WebSocket 或轮询机制 ✅
   - 数据传输模块 → 对接数据导入导出API ✅

### 4.3 具体功能对接 ✅

1. **SQL 编辑器对接** ✅
   - 查询执行: 替换 mock 的 `executeSql` 为 SDK 的 `db.query` ✅
   - 表结构获取: 替换 mock 的 `getTables`/`getTableSchema` 为 SDK 的 `db.getTables`/`getTableInfo` ✅
   - 数据操作: 替换 mock 的数据操作为 SDK 的 `db.execute` ✅

2. **向量数据库对接** ✅
   - 向量存储和检索: 替换 mock 方法为 SDK 的向量操作 API ✅
   - 相似度搜索: 使用 SDK 的向量近似查询功能 ✅

3. **实时数据对接** ✅
   - 使用适当的实时通信方式 (WebSocket/SSE)
   - 实现数据变更通知机制

4. **用户认证与授权** ✅
   - 登录验证: 使用 SDK 中的认证方法 ✅
   - 权限控制: 根据用户角色控制 UI 功能访问 ✅

5. **数据导入导出** ✅
   - 支持多种格式的数据导入导出
   - 文件上传和下载处理
   - 进度跟踪和错误处理

6. **仪表盘功能** ✅
   - 创建和管理仪表盘 ✅
   - 添加、编辑和删除图表小部件 ✅
   - 共享仪表盘功能 ✅
   - 删除仪表盘功能 ✅

### 4.4 错误处理与状态管理 ✅

1. **统一错误处理** ✅
   - 在 API 服务层捕获并分类处理错误
   - 实现友好的错误展示机制

2. **加载状态管理** ✅
   - 实现统一的加载状态指示
   - 优化用户体验

3. **缓存策略** ✅
   - 实现适当的数据缓存机制
   - 减少不必要的请求

## 5. 测试与验证 ⚠️ (部分完成)

1. **单元测试** ✅
   - 为 API 服务层编写单元测试
   - 验证数据转换和错误处理逻辑

2. **集成测试** ⏳
   - 测试前端与后端的完整交互流程
   - 验证各功能模块的正确性

3. **端到端测试** ⏳
   - 测试完整用户流程
   - 模拟真实用户场景

## 6. 部署与配置 ⏳

1. **环境配置** ⏳
   - 开发环境: 使用 mock 或本地后端
   - 测试环境: 使用测试服务器
   - 生产环境: 使用生产环境配置

2. **部署流程** ⏳
   - 前端部署策略
   - 环境变量管理

## 7. 实施时间线

| 阶段 | 内容 | 预估时间 | 状态 |
|-----|------|---------|------|
| 准备 | 环境配置、SDK 集成 | 2天 | ✅ 已完成 |
| 基础架构 | 服务层改造、错误处理 | 3天 | ✅ 已完成 |
| SQL模块对接 | 查询、表操作、数据管理 | 4天 | ✅ 已完成 |
| 向量模块对接 | 向量存储、检索功能 | 3天 | ✅ 已完成 |
| 用户认证对接 | 登录、权限控制 | 2天 | ✅ 已完成 |
| 实时功能对接 | 实时数据更新 | 3天 | ✅ 已完成 |
| 数据传输对接 | 数据导入导出功能 | 3天 | ✅ 已完成 |
| 仪表盘功能对接 | 创建和管理仪表盘 | 3天 | ✅ 已完成 |
| 测试与优化 | 全面测试、性能优化 | 5天 | ⚠️ 部分完成 |
| 部署与文档 | 部署配置、使用文档 | 2天 | ⏳ 未开始 |

## 8. 风险与应对

1. **API 兼容性**
   - 风险: SDK 与后端 API 可能存在不一致
   - 应对: 先进行 API 一致性检查，必要时更新 SDK

2. **性能问题**
   - 风险: 大数据量下前端性能下降
   - 应对: 实现分页、虚拟滚动等优化方案

3. **用户体验**
   - 风险: 网络延迟影响操作流畅度
   - 应对: 加入骨架屏、预加载、乐观更新等机制

## 9. 未来拓展

1. **功能拓展**
   - 更多数据可视化组件
   - 高级查询构建器
   - AI 辅助功能

2. **性能优化**
   - 查询结果缓存
   - 数据压缩传输
   - 渲染性能优化

## 10. 已实现功能清单

### 10.1 基础设施
- ✅ SDK客户端封装 (`/src/lib/api/sdk-client.ts`)
- ✅ SDK初始化组件 (`/src/components/sdk-initializer.tsx`)
- ✅ 环境变量配置

### 10.2 API服务层
- ✅ SQL服务 (`/src/lib/api/sql-service.ts`)
- ✅ 向量服务 (`/src/lib/api/vector-service.ts`)
- ✅ 健康检查服务 (`/src/lib/api/health-service.ts`)
- ✅ 认证服务 (`/src/lib/api/auth-service.ts`)
- ✅ 错误处理机制 (`/src/lib/api/error-handler.ts`)
- ✅ 缓存服务 (`/src/lib/cache-service.ts`)
- ✅ 数据传输服务 (`/src/lib/api/data-transfer-service.ts`)
- ✅ 表管理服务 (`/src/lib/api/table-management-service.ts`)
- ✅ 备份恢复服务 (`/src/lib/api/backup-restore-service.ts`)
- ✅ 分析服务 (`/src/lib/api/analytics-service.ts`)
- ✅ 仪表盘服务 (`/src/lib/api/dashboard-service.ts`)

### 10.3 测试用例
- ✅ SQL服务测试 (`/src/lib/api/__tests__/sql-service.test.ts`)
- ✅ 健康检查服务测试 (`/src/lib/api/__tests__/health-service.test.ts`)
- ✅ 错误处理机制测试 (`/src/lib/api/__tests__/error-handler.test.ts`)
- ✅ 向量服务测试 (`/src/lib/api/__tests__/vector-service.test.ts`)
- ✅ 认证服务测试 (`/src/lib/api/__tests__/auth-service.test.ts`)
- ✅ 加载状态管理测试 (`/src/contexts/__tests__/loading-context.test.tsx`)
- ✅ 加载API钩子测试 (`/src/lib/hooks/__tests__/use-loading-api.test.tsx`)
- ✅ 数据传输服务测试 (`/src/lib/api/__tests__/data-transfer-service.test.ts`)
- ✅ 表管理服务测试 (`/src/lib/api/__tests__/table-management-service.test.ts`)
- ✅ 备份恢复服务测试 (`/src/lib/api/__tests__/backup-restore-service.test.ts`)
- ✅ 分析服务测试 (`/src/lib/api/__tests__/analytics-service.test.ts`)
- ✅ 仪表盘服务测试 (`/src/lib/api/__tests__/dashboard-service.test.ts`)
- ✅ 仪表盘删除功能测试 (`/scripts/test-dashboard-api.ts`) 用于API集成测试

### 10.4 UI组件
- ✅ 仪表盘列表组件 (`/src/components/dashboard/DashboardList.tsx`)
- ✅ 仪表盘页面 (`/src/app/dashboards/page.tsx`)

### 10.5 模拟实现
- ✅ 仪表盘模拟服务 (`/src/lib/api/mock/dashboard-mock.ts`) 提供仪表盘CRUD操作的本地模拟

### 10.6 新增功能
- ✅ 加载状态上下文 (`/src/contexts/loading-context.tsx`)
- ✅ 加载状态指示器组件 (`/src/components/ui/loading-indicator.tsx`)
- ✅ API请求加载状态钩子 (`/src/lib/hooks/use-loading-api.ts`)
- ✅ 向量相似度搜索功能 (文本查询)
- ✅ 向量集合统计信息查询
- ✅ 模块化SDK类型定义
- ✅ 用户认证与API密钥管理
- ✅ 废弃旧的mock实现并提供平滑迁移方案
- ✅ 实时数据服务实现
- ✅ 数据传输模块 (支持多种格式导入导出)
- ✅ 表管理功能 (获取表列表、表详情、删除表、清空表)
- ✅ 备份恢复功能 (创建备份、恢复备份、查看备份历史、导出备份、验证备份)
- ✅ 数据分析功能 (执行分析查询、生成统计报告、异常检测)
- ✅ 仪表盘管理功能 (创建、更新、删除仪表盘，添加、编辑和删除图表部件，分享仪表盘)

## 11. 下一步工作计划

1. **完善集成测试**
   - 实现前端与后端的完整交互测试
   - 添加端到端测试
   - 模拟真实用户场景进行测试

2. **环境配置**
   - 创建开发/测试/生产三套环境配置
   - 设置环境变量管理策略
   - 实现简化的本地开发环境

3. **部署流程**
   - 配置CI/CD流程
   - 建立自动化部署策略
   - 完善部署文档和指南

4. **文档更新**
   - 更新API文档
   - 编写用户使用指南
   - 为开发者提供集成文档

## 12. 最近更新内容

### 2024-04-04更新
1. **仪表盘功能改进**：
   - 修复了仪表盘加载失败的问题
   - 实现了仪表盘删除功能的前端接口
   - 添加了仪表盘列表组件和页面
   - 优化了仪表盘服务的TypeScript类型定义，提高类型安全性
   - 使用了`@ts-expect-error`注释替代了`@ts-ignore`，遵循最佳实践
   - 确保了API响应的正确类型转换

2. **新增仪表盘用户界面**:
   - 创建了仪表盘列表视图，支持查看所有仪表盘
   - 实现了仪表盘的CRUD操作用户界面
   - 添加了加载状态管理，优化用户体验
   - 添加了删除确认机制，防止误操作

3. **测试改进**:
   - 为删除仪表盘功能添加了专门的测试用例
   - 编写了针对实际API的集成测试脚本
   - 实现了模拟服务用于开发和测试环境
