"use client";

import { useState, useRef, useEffect } from "react";
import { X, Minimize2, Sparkles, Send, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateSQLQueryResult } from "@/lib/mock-data";
import { format } from "date-fns";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isPending?: boolean;
}

export function AIAssistantFloating() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 我是LumosDB智能助手。有什么可以帮到您的？",
      timestamp: new Date()
    }
  ]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // 移动到底部
  useEffect(() => {
    if (messagesEndRef.current && isExpanded) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isExpanded]);

  // 切换展开/收起
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // 发送消息
  const sendMessage = async () => {
    if (!prompt.trim()) return;
    
    const messageId = Date.now().toString();
    
    // 添加用户消息
    const userMessage: Message = {
      id: messageId,
      role: "user",
      content: prompt,
      timestamp: new Date()
    };
    
    // 添加等待中的助手消息
    const pendingMessage: Message = {
      id: `${messageId}-response`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isPending: true
    };
    
    setMessages(prev => [...prev, userMessage, pendingMessage]);
    setIsGenerating(true);
    setPrompt("");
    
    // 模拟响应
    setTimeout(() => {
      let response = "";
      
      // 使用模拟数据生成不同类型的响应
      if (prompt.toLowerCase().includes("sql") || prompt.toLowerCase().includes("查询")) {
        const result = generateSQLQueryResult(prompt);
        response = `我生成了以下SQL查询:
\`\`\`sql
${result.sql}
\`\`\`

${result.explanation}

要运行这个查询，请到SQL编辑器页面，或者让我帮您解释结果。`;
      } else if (prompt.toLowerCase().includes("数据") || prompt.toLowerCase().includes("分析")) {
        response = "根据您的数据分析需求，我发现最近30天的销售额增长了15%，主要来自电子产品类别。您想了解更详细的分析吗？";
      } else if (prompt.toLowerCase().includes("帮助") || prompt.toLowerCase().includes("功能")) {
        response = "LumosDB是一个现代数据库管理工具，提供以下功能：\n• SQL编辑和执行\n• 实时数据可视化\n• 向量数据库支持\n• DuckDB本地分析\n• AI驱动的数据洞察\n\n您想了解哪一项功能的更多细节？";
      } else {
        response = "我理解您的问题。作为LumosDB的AI助手，我可以帮您生成SQL查询、分析数据趋势、优化数据库架构或回答产品使用问题。您需要我在哪方面提供更具体的帮助？";
      }
      
      // 更新消息
      setMessages(prev => 
        prev.map(msg => 
          msg.id === `${messageId}-response` 
            ? { ...msg, content: response, isPending: false } 
            : msg
        )
      );
      setIsGenerating(false);
    }, 1500);
  };

  // 悬浮球渲染
  if (!isExpanded) {
    return (
      <div 
        className="fixed z-50 cursor-pointer"
        style={{ 
          right: '20px', 
          bottom: '20px',
          transition: 'all 0.3s ease'
        }}
        onClick={toggleExpanded}
      >
        <div className="rounded-full p-3 shadow-lg bg-primary text-primary-foreground hover:scale-110 transition-transform">
          <Bot size={24} />
        </div>
      </div>
    );
  }
  
  // 展开后的聊天界面
  return (
    <div 
      className="fixed z-50"
      style={{ 
        right: '20px', 
        bottom: '20px',
        transition: 'all 0.3s ease'
      }}
    >
      <Card className="w-[350px] h-[450px] flex flex-col overflow-hidden shadow-xl border">
        <CardHeader className="border-b px-4 py-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg font-medium flex items-center">
            <Sparkles className="text-primary mr-2 h-4 w-4" />
            LumosDB AI 助手
          </CardTitle>
          <div className="flex space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={toggleExpanded}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8" 
              onClick={toggleExpanded}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 p-4 overflow-auto">
          <ScrollArea className="h-full pr-2">
            <div className="space-y-4">
              {messages.map((message) => (
                <div 
                  key={message.id} 
                  className={cn(
                    "flex gap-3 p-3 rounded-lg text-sm",
                    message.role === "user" ? "bg-primary/10 ml-10" : "bg-muted mr-10"
                  )}
                >
                  <Avatar className={cn(
                    "h-6 w-6",
                    message.role === "user" ? "bg-primary" : "bg-background border"
                  )}>
                    {message.role === "user" ? "用" : "AI"}
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    {message.isPending ? (
                      <div className="h-4 w-12 animate-pulse rounded bg-muted-foreground/20" />
                    ) : (
                      <div className="whitespace-pre-wrap break-words text-xs">
                        {message.content}
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground">
                      {format(message.timestamp, "HH:mm")}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </CardContent>
        
        <CardFooter className="border-t p-3">
          <div className="flex gap-2 w-full items-end">
            <Textarea 
              placeholder="询问数据分析、SQL生成或使用帮助..." 
              className="min-h-[40px] max-h-[120px] resize-none flex-1 text-sm p-2"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!isGenerating) sendMessage();
                }
              }}
            />
            <Button 
              size="icon" 
              className="h-[40px]" 
              disabled={!prompt.trim() || isGenerating}
              onClick={sendMessage}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
} 