'use server'

import { mastra } from '@/mastra'

/**
 * 发送消息到数据库AI助手
 * @param message 用户发送的消息
 * @returns AI助手的响应
 */
export async function sendToDBAgent(message: string) {
  try {
    // 获取数据库代理
    const agent = mastra.getAgent('dbAgent')
    
    // 生成响应
    const result = await agent.generate(message)
    
    // 返回结果
    return {
      role: 'assistant',
      content: result.text,
      success: true
    }
  } catch (error) {
    console.error('AI助手错误:', error)
    return {
      role: 'assistant',
      content: '很抱歉，处理您的请求时出现了问题。请稍后再试。',
      success: false
    }
  }
} 