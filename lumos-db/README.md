# LumosDB

轻量级数据库管理与探索工具，支持 SQLite, DuckDB 和向量数据库。

## 功能特点

### 核心功能

- SQLite 数据库查询和管理
- DuckDB 数据分析能力
- 向量数据库支持
- SQL 编辑器与语法高亮
- 数据可视化仪表板

### 增强功能

- 高级分析仪表盘
- API文档和测试工具
- 数据导入/导出功能
- 角色和权限管理
- 系统监控和日志查看

### 特色功能

- 实时数据更新
- 自定义主题支持
- 多语言国际化
- 移动端适配
- AI辅助功能（智能查询生成、数据分析建议）

## 技术栈

### 前端

- **框架**: Next.js
- **UI库**: Shadcn UI
- **状态管理**: React Hooks
- **样式**: Tailwind CSS
- **图表**: Recharts/Chart.js
- **编辑器**: Monaco Editor
- **国际化**: next-intl

### 后端

- **运行时**: Bun
- **框架**: Express
- **数据库**:
  - SQLite (better-sqlite3)
  - DuckDB
  - 向量数据库支持
- **实时通信**: Socket.IO
- **认证**: JWT
- **日志**: Winston

## 快速开始

### 前提条件

- Node.js >= 18.0.0
- Bun >= 1.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/lumos-db.git
cd lumos-db

# 安装依赖
bun install
```

### 开发环境运行

```bash
# 运行前端
bun dev

# 运行后端 API (在另一个终端)
cd lumosdb-api
cp .env.example .env  # 根据需要修改配置
bun dev
```

### 生产环境构建

```bash
# 构建前端
bun build

# 构建后端
cd lumosdb-api
bun build
```

## 项目结构

```
lumos-db/
├── lumosdb-ui/           # 前端应用
│   ├── src/              # 源代码
│   │   ├── app/          # Next.js 应用目录
│   │   ├── components/   # UI组件
│   │   ├── lib/          # 工具函数
│   │   └── ...
│   ├── public/           # 静态资源
│   └── ...
│
├── lumosdb-api/          # 后端API服务
│   ├── src/              # 源代码
│   │   ├── controllers/  # 控制器
│   │   ├── models/       # 数据模型
│   │   ├── routes/       # API路由
│   │   ├── services/     # 业务逻辑
│   │   └── utils/        # 工具函数
│   ├── data/             # 数据存储目录
│   └── ...
│
├── docs/                 # 文档
└── ...
```

## 贡献指南

1. Fork 该仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。 