import { Mastra } from "@mastra/core";
import { dbAgent } from "./agents/dbAgent";

// 初始化Mastra实例
export const mastra = new Mastra({
  agents: {
    dbAgent
  }
});

// 导出Mastra实例
export default mastra;
