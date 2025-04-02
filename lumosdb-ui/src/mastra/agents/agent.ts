import {
  Agent,
  CoreSystemMessage as SystemMessage,
  Tool,
  Message,
  createTools,
  Chat,
} from "@mastra/core";
import { OpenAI } from "@ai-sdk/openai";

// 创建一个OpenAI模型实例
const model = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  baseURL: process.env.OPENAI_BASE_URL,
  model: process.env.OPENAI_MODEL || "gpt-4o-mini",
});

// 数据库查询工具
const dbTools = createTools({
  generateSQL: {
    description: "生成SQL查询语句",
    parameters: {
      description: { type: "string", description: "用户想要查询的内容描述" },
      context: { 
        type: "object", 
        description: "上下文信息，包括可用的表和字段",
        properties: {
          tables: { type: "array", items: { type: "string" } },
          schemas: { type: "object" }
        }
      }
    },
    handler: async ({ description, context }: { description: string, context: any }) => {
      // 实际项目中，这里应该调用模型来生成SQL
      // 现在我们简单返回一个示例查询
      return {
        sql: `SELECT * FROM users WHERE created_at > date_sub(now(), interval 7 day)`,
        explanation: "查询最近7天注册的用户"
      };
    }
  },
  
  analyzeData: {
    description: "分析数据并提供洞察",
    parameters: {
      data: { type: "array", description: "需要分析的数据集" },
      type: { type: "string", description: "分析类型：trends, patterns, anomalies" }
    },
    handler: async ({ data, type }: { data: any[], type: string }) => {
      // 实际项目中，应该调用数据分析服务
      return {
        insights: "数据显示销售额在周末有明显增长，电子产品类别贡献了最大比例的收入。",
        recommendations: "考虑在周末增加促销活动，重点关注电子产品类别。"
      };
    }
  },
  
  getDatabaseSchema: {
    description: "获取数据库表结构",
    parameters: {},
    handler: async () => {
      // 实际项目中，应该连接到数据库获取表结构
      return {
        tables: [
          { name: "users", description: "用户表" },
          { name: "products", description: "产品表" },
          { name: "orders", description: "订单表" },
        ],
        schemas: {
          users: ["id", "name", "email", "created_at", "last_login"],
          products: ["id", "name", "price", "category", "stock"],
          orders: ["id", "user_id", "order_date", "status", "total_amount"]
        }
      };
    }
  }
});

// 系统提示，定义AI代理的行为和能力
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

当用户请求生成SQL查询时，首先使用getDatabaseSchema工具获取数据库结构，然后使用generateSQL工具生成查询语句。`;

// 自定义用户消息类型
class UserMessage implements Message {
  role: string = "user";
  content: string;
  
  constructor(content: string) {
    this.content = content;
  }
}

// 创建AI代理
export const createDBAgent = () => {
  const systemMessage = new SystemMessage(systemPrompt);

  return new Agent({
    tools: dbTools,
    chat: new Chat(model),
    initialMessages: [systemMessage],
  });
};

// 处理用户消息并获取响应
export async function getAgentResponse(message: string, history: Message[] = []) {
  const agent = createDBAgent();
  
  // 如果有历史记录，添加到代理中
  if (history.length > 0) {
    agent.initialMessages = [new SystemMessage(systemPrompt), ...history];
  }
  
  // 发送用户消息并获取响应
  return agent.run(new UserMessage(message));
}

// 创建一个代理服务，供UI组件使用
export class DBAgentService {
  private history: Message[] = [];

  constructor() {}

  // 发送消息，获取响应
  async sendMessage(message: string): Promise<{content: string, role: string}> {
    try {
      // 添加用户消息到历史
      const userMessage = new UserMessage(message);
      this.history.push(userMessage);
      
      // 获取代理响应
      const responseStream = await getAgentResponse(message, this.history);
      
      // 从流中获取完整响应
      let fullContent = "";
      for await (const chunk of responseStream) {
        if (chunk.content) {
          fullContent += chunk.content;
        }
      }
      
      // 创建助手消息并添加到历史
      const assistantMessage = {
        content: fullContent,
        role: "assistant"
      };
      
      // 将历史限制在最近20条消息以避免令牌限制
      if (this.history.length > 18) {
        this.history = [
          // 保留系统消息
          ...this.history.slice(0, 1),
          // 保留最近的消息
          ...this.history.slice(-17)
        ];
      }
      
      return assistantMessage;
    } catch (error) {
      console.error("代理响应错误:", error);
      return {
        content: "很抱歉，我在处理您的请求时遇到了问题。请稍后再试或尝试重新表述您的问题。",
        role: "assistant"
      };
    }
  }

  // 重置会话历史
  resetHistory(): void {
    this.history = [];
  }
}

// 导出代理服务实例，以便全局使用
export const dbAgentService = new DBAgentService(); 