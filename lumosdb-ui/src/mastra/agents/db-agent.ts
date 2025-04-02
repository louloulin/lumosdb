import { openai } from '@ai-sdk/openai';
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';

// 创建SQL生成工具
const generateSQLTool = createTool({
  id: "generateSQL",
  description: "生成SQL查询语句",
  input: {
    type: "object",
    properties: {
      description: { type: "string", description: "用户想要查询的内容描述" }
    },
    required: ["description"]
  },
  handler: async ({ description }) => {
    console.log(`生成SQL查询: ${description}`);
    
    // 模拟SQL生成逻辑
    const sql = `SELECT * FROM users WHERE created_at > date_sub(now(), interval 7 day)`;
    const explanation = `这个查询将返回最近7天注册的所有用户。它从users表中选择所有字段，并使用WHERE子句过滤那些创建时间在过去7天内的记录。`;
    
    return {
      sql,
      explanation
    };
  }
});

// 创建数据分析工具
const analyzeDataTool = createTool({
  id: "analyzeData",
  description: "分析数据并提供洞察",
  input: {
    type: "object",
    properties: {
      query: { type: "string", description: "需要分析的数据查询" }
    },
    required: ["query"]
  },
  handler: async ({ query }) => {
    console.log(`分析数据: ${query}`);
    
    // 模拟数据分析逻辑
    return {
      insights: "数据显示销售额在周末有明显增长，电子产品类别贡献了最大比例的收入。",
      recommendations: "考虑在周末增加促销活动，重点关注电子产品类别。"
    };
  }
});

// 系统提示
const systemPrompt = `你是LumosDB的AI助手，专门帮助用户管理和分析数据库。

作为数据库智能助手，你可以:
1. 根据用户需求生成SQL查询
2. 分析数据趋势和模式
3. 提供数据库优化建议
4. 回答有关LumosDB功能的问题

在回答用户问题时，请遵循以下原则:
- 保持专业、有帮助的态度
- 提供准确的信息和SQL查询
- 如果不确定答案，坦诚地告诉用户
- 使用简洁明了的语言解释复杂概念
- 在适当的时候使用工具来提供更精确的帮助

当用户请求生成SQL查询时，使用generateSQL工具来生成查询语句。
当用户请求分析数据时，使用analyzeData工具来提供分析结果。`;

// 创建数据库代理
export const dbAgent = new Agent({
  name: "DB Assistant",
  instructions: systemPrompt,
  model: openai("gpt-4o-mini"),
  tools: {
    generateSQL: generateSQLTool,
    analyzeData: analyzeDataTool
  }
}); 