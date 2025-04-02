import { NextRequest, NextResponse } from 'next/server';
import { dbAgent } from '@/mastra/server';

// POST处理器，接收客户端消息并调用Mastra代理
export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }
    
    // 调用Mastra代理
    const response = await dbAgent.generate(message);
    
    // 返回结果
    return NextResponse.json({
      content: response.text,
      role: 'assistant'
    });
  } catch (error) {
    console.error('AI API错误:', error);
    return NextResponse.json(
      { error: '处理请求时发生错误' },
      { status: 500 }
    );
  }
} 