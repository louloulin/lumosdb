"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Expand, Minimize2, X, SendHorizontal, Maximize2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { sendToDBAgent } from "@/app/actions";

// 消息接口
interface Message {
  role: string;
  content: string;
}

interface AIAssistantFloatingProps {
  className?: string;
}

export const AIAssistantFloating = ({ className }: AIAssistantFloatingProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "你好！我是LumosDB的AI助手。我可以帮你生成SQL查询、分析数据或回答关于数据库的问题。请告诉我你需要什么帮助？",
    },
  ]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const handleDragStart = (e: React.MouseEvent) => {
    if (isFullscreen) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDrag = useCallback(
    (e: MouseEvent) => {
      if (isDragging && !isFullscreen) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    },
    [isDragging, dragStart, isFullscreen]
  );

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded);
    if (isFullscreen && !isExpanded) {
      setIsFullscreen(false);
    }
  };
  
  const handleToggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isExpanded && !isFullscreen) {
      setIsExpanded(true);
    }
  };
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // ESC键退出全屏
    if (e.key === 'Escape' && isFullscreen) {
      setIsFullscreen(false);
    }
    
    // F11或Ctrl+Enter切换全屏
    if ((e.key === 'F11' || (e.key === 'Enter' && e.ctrlKey)) && isExpanded) {
      e.preventDefault();
      setIsFullscreen(!isFullscreen);
    }
  }, [isFullscreen, isExpanded]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && !isFullscreen) {
        setPosition({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleDragEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleDragEnd);
    };
  }, [handleDrag, isDragging, isFullscreen, dragStart]);

  const sendMessage = async () => {
    if (!userInput.trim()) return;

    const newMessage: Message = {
      role: "user",
      content: userInput,
    };

    setMessages((prev) => [...prev, newMessage]);
    setUserInput("");
    setIsLoading(true);

    try {
      // 使用服务器端操作发送消息
      const aiResponse = await sendToDBAgent(userInput);
      
      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("发送消息错误:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "很抱歉，处理您的请求时出错了。请稍后再试。",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const clearChatHistory = () => {
    setMessages([
      {
        role: "assistant",
        content: "聊天历史已清除。有什么我可以帮你的吗？",
      },
    ]);
  };
  
  const isBotMessage = (role: string) => role === 'assistant';

  return (
    <Card
      ref={cardRef}
      className={cn(
        "fixed transition-all duration-300 shadow-lg z-50",
        isExpanded
          ? isFullscreen
            ? "inset-4 max-w-none w-auto h-auto"
            : "w-96 h-[500px]" 
          : "w-14 h-14 rounded-full",
        isDragging ? "opacity-70" : "opacity-100",
        className
      )}
      style={
        !isFullscreen
          ? {
              right: `${position.x}px`,
              bottom: `${position.y}px`,
            }
          : {}
      }
    >
      {isExpanded ? (
        <>
          <CardHeader 
            className={cn(
              "flex flex-row items-center justify-between space-y-0 gap-2 cursor-move",
              isFullscreen ? "p-6" : "p-3"
            )}
            onMouseDown={handleDragStart}
          >
            <div>
              <CardTitle className={cn(isFullscreen ? "text-2xl" : "text-base")}>AI 助手</CardTitle>
              <CardDescription className={cn(isFullscreen ? "text-base" : "text-xs")}>
                我可以帮你生成SQL查询和分析数据
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              {isFullscreen && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={clearChatHistory}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-5 w-5" />
                ) : (
                  <Maximize2 className="h-5 w-5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleExpand}
              >
                {isExpanded ? <X className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-grow overflow-hidden">
            <ScrollArea className={cn("h-[calc(100%-130px)]", isFullscreen ? "px-6" : "px-3")}>
              <div className={cn("flex flex-col gap-4", isFullscreen ? "p-4" : "p-2")}>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex",
                      isBotMessage(message.role)
                        ? "justify-start pr-10"
                        : "justify-end pl-10",
                      isFullscreen && "mb-2"
                    )}
                  >
                    <div
                      className={cn(
                        "flex gap-2",
                        isBotMessage(message.role)
                          ? "flex-row"
                          : "flex-row-reverse"
                      )}
                    >
                      <Avatar className={cn(isFullscreen ? "h-10 w-10" : "h-8 w-8")}>
                        {isBotMessage(message.role) ? (
                          <>
                            <AvatarImage src="/logo.png" />
                            <AvatarFallback>AI</AvatarFallback>
                          </>
                        ) : (
                          <>
                            <AvatarImage src="/user.png" />
                            <AvatarFallback>Me</AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div
                        className={cn(
                          "rounded-lg p-3",
                          isBotMessage(message.role)
                            ? "bg-primary-foreground"
                            : "bg-primary text-primary-foreground",
                          isFullscreen && "p-4"
                        )}
                      >
                        {isBotMessage(message.role) ? (
                          <div
                            className={cn(
                              "prose prose-sm max-w-none dark:prose-invert",
                              isFullscreen ? "text-base" : "text-sm"
                            )}
                          >
                            <ReactMarkdown>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className={cn(isFullscreen ? "text-base" : "text-sm")}>
                            {message.content}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <CardFooter className={cn("flex flex-col gap-2", isFullscreen ? "p-6" : "p-3")}>
            <div className="flex w-full gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="输入你的问题..."
                className={cn(isFullscreen ? "min-h-20 text-base" : "min-h-16 text-sm")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
              />
              <div>
                <Button
                  className={isFullscreen ? "h-20" : "h-10"}
                  onClick={sendMessage}
                  disabled={isLoading || !userInput.trim()}
                >
                  <SendHorizontal className="h-5 w-5" />
                </Button>
              </div>
            </div>
            {isFullscreen && (
              <p className="text-[9px] text-muted-foreground text-center mt-1">
                按ESC退出全屏模式
              </p>
            )}
          </CardFooter>
        </>
      ) : (
        <div
          className="flex h-full w-full items-center justify-center cursor-pointer bg-primary text-primary-foreground rounded-full"
          onClick={handleToggleExpand}
          onMouseDown={handleDragStart}
        >
          AI
        </div>
      )}
    </Card>
  );
}; 