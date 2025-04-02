import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";

// 数据库表结构
interface TableSchema {
  name: string;
  description: string;
  columns: {
    name: string;
    type: string;
    description: string;
  }[];
}

// 模拟数据库模式数据
const mockDatabaseSchema: TableSchema[] = [
  {
    name: "users",
    description: "存储用户信息",
    columns: [
      { name: "id", type: "int", description: "用户唯一标识" },
      { name: "name", type: "varchar", description: "用户姓名" },
      { name: "email", type: "varchar", description: "用户邮箱" },
      { name: "created_at", type: "datetime", description: "创建时间" },
      { name: "last_login", type: "datetime", description: "最后登录时间" }
    ]
  },
  {
    name: "products",
    description: "存储产品信息",
    columns: [
      { name: "id", type: "int", description: "产品唯一标识" },
      { name: "name", type: "varchar", description: "产品名称" },
      { name: "price", type: "decimal", description: "产品价格" },
      { name: "category", type: "varchar", description: "产品类别" },
      { name: "stock", type: "int", description: "库存数量" }
    ]
  },
  {
    name: "orders",
    description: "存储订单信息",
    columns: [
      { name: "id", type: "int", description: "订单唯一标识" },
      { name: "user_id", type: "int", description: "关联用户ID" },
      { name: "order_date", type: "datetime", description: "订单日期" },
      { name: "status", type: "varchar", description: "订单状态" },
      { name: "total_amount", type: "decimal", description: "订单总金额" }
    ]
  }
];

// 构建系统提示
function buildSystemPrompt() {
  // 构建数据库结构描述
  let dbDescription = "数据库结构:\n";
  
  mockDatabaseSchema.forEach(table => {
    dbDescription += `表名: ${table.name} (${table.description})\n`;
    dbDescription += "列:\n";
    
    table.columns.forEach(column => {
      dbDescription += `- ${column.name} (${column.type}): ${column.description}\n`;
    });
    
    dbDescription += "\n";
  });
  
  // 系统提示
  return `你是LumosDB的AI助手，专门帮助用户管理和分析数据库。

作为数据库智能助手，你可以:
1. 根据用户需求生成SQL查询
2. 分析数据趋势和模式
3. 提供数据库优化建议
4. 回答有关LumosDB功能的问题

${dbDescription}

在回答用户问题时，请遵循以下原则:
- 保持专业、有帮助的态度
- 提供准确的信息和SQL查询
- 如果不确定答案，坦诚地告诉用户
- 使用简洁明了的语言解释复杂概念

当用户请求生成SQL查询时，请使用上述数据库结构信息来生成准确的查询。
如果用户要求生成SQL查询，请使用SQL代码块格式返回，例如：

-- SQL查询示例
SELECT * FROM users WHERE created_at > NOW() - INTERVAL 1 DAY;

此外，提供对查询的解释，告诉用户这个查询会做什么，以及为什么这是最佳选择。`;
}

// 创建数据库代理
export const dbAgent = new Agent({
  name: "DB Assistant",
  instructions: buildSystemPrompt(),
  model: openai("gpt-4o-mini")
}); 