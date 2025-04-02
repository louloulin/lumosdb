"use client";

import { useState, useRef, useEffect } from "react"
import { Metadata } from "next"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DocWrapper } from "@/components/doc-wrapper"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Code, Database, LineChart, Copy, MessageSquare, Send, RotateCcw, Table, CodeIcon, BarChart } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DataVisualizer } from "@/components/data-visualizer"
import { generateSQLQueryResult } from "@/lib/mock-data"

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isPending?: boolean;
}

interface SQLSuggestion {
  title: string;
  description: string;
  sql: string;
  tables: string[];
}

export const metadata: Metadata = {
  title: "AI Assistant | LumosDB",
  description: "AI-powered assistant for SQL queries and data analysis",
}

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("")
  const [modelType, setModelType] = useState("gpt-4")
  const [isGenerating, setIsGenerating] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 Hi there! I'm your AI database assistant. I can help you write SQL queries, analyze data patterns, optimize schema designs, and more. How can I help you today?",
      timestamp: new Date()
    }
  ])
  const [detectedSchema] = useState<{ tables: string[], columns: Record<string, string[]> }>({
    tables: ["users", "products", "orders", "categories", "customers", "transactions"],
    columns: {
      "users": ["id", "name", "email", "created_at", "last_login", "status"],
      "products": ["id", "name", "description", "price", "category_id", "stock", "created_at"],
      "orders": ["id", "user_id", "order_date", "status", "total_amount"],
      "categories": ["id", "name", "parent_id"],
      "customers": ["id", "user_id", "address", "phone", "preferred_payment"],
      "transactions": ["id", "order_id", "amount", "payment_method", "status", "timestamp"]
    }
  })
  
  const [currentQuery, setCurrentQuery] = useState({
    sql: "",
    explanation: "",
    data: [] as Record<string, unknown>[]
  });
  
  const [analysisResult, setAnalysisResult] = useState({
    title: "销售趋势分析",
    description: "最近30天按产品类别的销售数据",
    data: [] as Record<string, unknown>[]
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])
  
  const sqlSuggestions: SQLSuggestion[] = [
    {
      title: "Recent User Activity",
      description: "Find users who have placed orders in the last 7 days",
      sql: `SELECT DISTINCT u.id, u.name, u.email, MAX(o.order_date) as last_order
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE o.order_date >= DATE('now', '-7 days')
GROUP BY u.id
ORDER BY last_order DESC;`,
      tables: ["users", "orders"]
    },
    {
      title: "Product Performance",
      description: "Analyze product sales performance by category",
      sql: `SELECT 
  c.name as category,
  COUNT(p.id) as product_count,
  SUM(oi.quantity) as units_sold,
  SUM(oi.quantity * p.price) as revenue
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN order_items oi ON p.id = oi.product_id
JOIN orders o ON oi.order_id = o.id
WHERE o.status = 'completed'
GROUP BY c.name
ORDER BY revenue DESC;`,
      tables: ["products", "categories", "orders"]
    },
    {
      title: "Inventory Alert",
      description: "Find products that are low in stock",
      sql: `SELECT id, name, stock, category_id
FROM products
WHERE stock < 10
ORDER BY stock ASC;`,
      tables: ["products"]
    }
  ]
  
  const sendMessage = async () => {
    if (!prompt.trim()) return
    
    const messageId = Date.now().toString()
    
    const userMessage: Message = {
      id: messageId,
      role: "user",
      content: prompt,
      timestamp: new Date()
    }
    
    const pendingMessage: Message = {
      id: `${messageId}-response`,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isPending: true
    }
    
    setMessages(prev => [...prev, userMessage, pendingMessage])
    setIsGenerating(true)
    setPrompt("")
    
    setTimeout(() => {
      let response = ""
      
      if (prompt.toLowerCase().includes("sql") || prompt.toLowerCase().includes("query")) {
        response = `Here's a SQL query that should help:

\`\`\`sql
SELECT 
  u.name, 
  COUNT(o.id) as order_count,
  SUM(o.total_amount) as total_spent
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > DATE('now', '-90 days')
GROUP BY u.id
HAVING order_count > 0
ORDER BY total_spent DESC
LIMIT 10;
\`\`\`

This query finds your top 10 customers from the last 90 days based on their total spending. Let me know if you need any modifications!`
      } else if (prompt.toLowerCase().includes("schema") || prompt.toLowerCase().includes("table")) {
        response = `Based on your database structure, here's a suggested schema optimization:

1. Consider adding an index on \`users.email\` since it's likely used for lookups and authentication.
2. The \`products.category_id\` field should have a foreign key constraint to ensure data integrity.
3. You might want to consider adding a \`last_updated\` timestamp to the \`products\` table to track inventory changes.

Would you like me to provide the SQL statements to implement these changes?`
      } else {
        response = `I've analyzed your database structure and noticed a few patterns:

- Your user retention rate is approximately 68% based on repeat order patterns
- Most transactions occur between 2-5 PM on weekdays
- The "Electronics" category has the highest average order value

Would you like a more detailed analysis on any of these points?`
      }
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === `${messageId}-response` 
            ? { ...msg, content: response, isPending: false } 
            : msg
        )
      )
      setIsGenerating(false)
    }, 2000)
  }
  
  const generateSQL = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    setTimeout(() => {
      const result = generateSQLQueryResult(prompt);
      setCurrentQuery(result);
      setIsGenerating(false);
      
      if (prompt.toLowerCase().includes("分析") || 
          prompt.toLowerCase().includes("趋势") || 
          prompt.toLowerCase().includes("analyse") || 
          prompt.toLowerCase().includes("trend")) {
        setAnalysisResult({
          title: "数据分析结果",
          description: result.explanation,
          data: result.data
        });
      }
    }, 1500);
  };
  
  const clearConversation = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "👋 Hi there! I'm your AI database assistant. I can help you write SQL queries, analyze data patterns, optimize schema designs, and more. How can I help you today?",
      timestamp: new Date()
    }])
  }

  return (
    <DocWrapper className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">AI Assistant</h2>
        <div className="flex items-center gap-2">
          <Select value={modelType} onValueChange={setModelType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
              <SelectItem value="gpt-4">GPT-4</SelectItem>
              <SelectItem value="claude">Claude</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <Tabs defaultValue="chat" className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="flex items-center">
            <MessageSquare className="mr-2 h-4 w-4" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="sql-generator" className="flex items-center">
            <Code className="mr-2 h-4 w-4" />
            SQL Generator
          </TabsTrigger>
          <TabsTrigger value="data-analyzer" className="flex items-center">
            <LineChart className="mr-2 h-4 w-4" />
            Data Analyzer
          </TabsTrigger>
          <TabsTrigger value="schema-helper" className="flex items-center">
            <Database className="mr-2 h-4 w-4" />
            Schema Helper
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="chat" className="space-y-4">
          <Card className="border-none shadow-none">
            <CardContent className="p-0">
              <div className="flex h-[600px]">
                <div className="flex flex-col border-r w-3/4">
                  <div className="flex-1 p-4 overflow-hidden">
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div 
                            key={message.id} 
                            className={cn(
                              "flex gap-3 p-4 rounded-lg",
                              message.role === "user" ? "bg-primary/10 ml-10" : "bg-muted mr-10"
                            )}
                          >
                            <Avatar className={cn(
                              "h-8 w-8",
                              message.role === "user" ? "bg-primary" : "bg-background border"
                            )}>
                              {message.role === "user" ? "U" : "AI"}
                            </Avatar>
                            <div className="flex-1 space-y-2">
                              {message.isPending ? (
                                <div className="h-4 w-12 animate-pulse rounded bg-muted-foreground/20" />
                              ) : (
                                <div className="whitespace-pre-wrap break-words text-sm">
                                  {message.content}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-muted-foreground">
                                  {format(message.timestamp, "HH:mm")}
                                </div>
                                {message.role === "assistant" && !message.isPending && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => {
                                      navigator.clipboard.writeText(message.content)
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </div>
                  
                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea 
                        placeholder="Ask me about your database, SQL queries, or data analysis..." 
                        className="min-h-[60px] resize-none"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault()
                            if (!isGenerating) sendMessage()
                          }
                        }}
                      />
                      <Button 
                        size="icon" 
                        className="h-[60px]" 
                        disabled={!prompt.trim() || isGenerating}
                        onClick={sendMessage}
                      >
                        {isGenerating ? (
                          <span className="animate-spin">
                            <RotateCcw className="h-4 w-4" />
                          </span>
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-muted-foreground">
                        {modelType === "gpt-4" ? "GPT-4 model with database context awareness" : 
                         modelType === "gpt-3.5" ? "GPT-3.5 Turbo with fast response times" :
                         "Claude model with advanced reasoning"}
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs" 
                        onClick={clearConversation}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Clear conversation
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="w-1/4 p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Database Schema</h4>
                    <div className="rounded-md border overflow-hidden">
                      <ScrollArea className="h-[200px]">
                        <div className="p-3 space-y-3">
                          {detectedSchema.tables.map(table => (
                            <div key={table} className="space-y-1">
                              <div className="flex items-center gap-1 text-sm font-medium">
                                <Table className="h-3 w-3" />
                                {table}
                              </div>
                              <ul className="pl-5 text-xs text-muted-foreground">
                                {detectedSchema.columns[table].map(column => (
                                  <li key={column} className="text-xs">{column}</li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Quick SQL Suggestions</h4>
                    <ScrollArea className="h-[240px]">
                      <div className="space-y-2">
                        {sqlSuggestions.map((suggestion, index) => (
                          <Card key={index} className="p-2 cursor-pointer hover:bg-accent/50" onClick={() => {
                            setPrompt(`Can you help me with this query? ${suggestion.description}`)
                          }}>
                            <div className="text-xs font-medium">{suggestion.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{suggestion.description}</div>
                            <div className="flex gap-1 mt-1">
                              {suggestion.tables.map(table => (
                                <Badge key={table} variant="outline" className="text-[10px] py-0 h-4">{table}</Badge>
                              ))}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="sql-generator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generate SQL Queries</CardTitle>
              <CardDescription>Describe what you want to query in natural language</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="E.g., Find all users who haven't logged in for the past 30 days"
                  className="min-h-[120px] resize-y"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                
                <div className="flex flex-col space-y-2">
                  <div className="text-sm text-muted-foreground">Example prompts:</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => setPrompt("Find all active users sorted by last login date")}
                    >
                      Find recent users
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => setPrompt("Find products with low stock")}
                    >
                      Low stock products
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => setPrompt("Show orders that are currently in processing status")}
                    >
                      Processing orders
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setPrompt("")}>
                Clear
              </Button>
              <Button 
                onClick={generateSQL} 
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? 
                  "Generating..." : 
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate
                  </>
                }
              </Button>
            </CardFooter>
          </Card>
          
          {currentQuery.sql && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Generated SQL</CardTitle>
                  <CardDescription>{prompt}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <pre className="p-4 rounded-md bg-muted overflow-x-auto text-sm">
                      <code>{currentQuery.sql}</code>
                    </pre>
                    <Button 
                      size="icon"
                      variant="ghost"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => {
                        navigator.clipboard.writeText(currentQuery.sql)
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Explanation</h4>
                    <p className="text-sm text-muted-foreground">
                      {currentQuery.explanation}
                    </p>
                  </div>
                  
                  {currentQuery.data && currentQuery.data.length > 0 && (
                    <DataVisualizer
                      data={currentQuery.data}
                      title="Query Results"
                      description={`Results from: ${prompt}`}
                      defaultType="table"
                    />
                  )}
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="text-xs">
                    <CodeIcon className="h-3 w-3 mr-1" />
                    Open in SQL Editor
                  </Button>
                </CardFooter>
              </Card>
            </>
          )}
        </TabsContent>
        
        <TabsContent value="data-analyzer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>分析数据趋势</CardTitle>
              <CardDescription>从查询结果中挖掘关键洞察</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="描述你想分析的数据，例如：分析最近30天的销售趋势"
                  className="min-h-[120px] resize-y"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                
                <div className="flex flex-col space-y-2">
                  <div className="text-sm text-muted-foreground">示例分析：</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => setPrompt("分析最近30天的销售趋势，按产品类别分组")}
                    >
                      销售趋势分析
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => setPrompt("找出用户活跃度和购买金额之间的相关性")}
                    >
                      用户行为分析
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => setPrompt("分析不同地区的订单分布情况")}
                    >
                      地区分布分析
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setPrompt("")}>
                清除
              </Button>
              <Button 
                onClick={generateSQL} 
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? 
                  "生成中..." : 
                  <>
                    <BarChart className="mr-2 h-4 w-4" />
                    分析数据
                  </>
                }
              </Button>
            </CardFooter>
          </Card>
          
          {analysisResult.data && analysisResult.data.length > 0 && (
            <DataVisualizer 
              title={analysisResult.title}
              description={analysisResult.description}
              data={analysisResult.data}
              defaultType="line"
            />
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DataVisualizer 
              title="产品类别分布"
              description="各类别产品销售占比"
              data={[
                { category: '电子产品', value: 4000 },
                { category: '服装', value: 3000 },
                { category: '食品', value: 2000 },
                { category: '家居', value: 1000 },
                { category: '图书', value: 500 },
              ]}
              xAxis="category"
              yAxis="value"
              defaultType="pie"
            />
            
            <DataVisualizer 
              title="地区订单分布"
              description="各地区订单数量统计"
              data={[
                { region: '华东', orders: 2400 },
                { region: '华南', orders: 1398 },
                { region: '华北', orders: 9800 },
                { region: '西南', orders: 3908 },
                { region: '西北', orders: 4800 },
                { region: '东北', orders: 3800 },
              ]}
              xAxis="region"
              yAxis="orders"
              defaultType="bar"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="schema-helper" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>数据库结构助手</CardTitle>
              <CardDescription>获取数据库结构设计建议和优化</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="描述你的数据库结构需求，例如：设计一个电商平台的数据库结构"
                  className="min-h-[120px] resize-y"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                
                <div className="flex flex-col space-y-2">
                  <div className="text-sm text-muted-foreground">示例问题：</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge 
                      variant="outline" 
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => setPrompt("设计一个电商平台的数据库结构，包含用户、商品、订单、评价等模块")}
                    >
                      电商平台数据库
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => setPrompt("如何优化用户表的索引结构，提高邮箱和用户名的搜索效率")}
                    >
                      索引优化
                    </Badge>
                    <Badge 
                      variant="outline"
                      className="cursor-pointer hover:bg-secondary"
                      onClick={() => setPrompt("将我的MongoDB集合结构转换为关系型数据库")}
                    >
                      NoSQL转SQL
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setPrompt("")}>
                清除
              </Button>
              <Button 
                onClick={generateSQL} 
                disabled={!prompt.trim() || isGenerating}
              >
                {isGenerating ? 
                  "生成中..." : 
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    生成方案
                  </>
                }
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">数据库结构建议</CardTitle>
              <CardDescription>电商平台数据库设计</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <pre className="p-4 rounded-md bg-muted overflow-x-auto text-sm">
                  <code>{`-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active'
);

-- 产品表
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(12,2) NOT NULL
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);`}</code>
                </pre>
                <Button 
                  size="icon"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText(`-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active'
);

-- 产品表
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  total_amount DECIMAL(12,2) NOT NULL
);

-- 创建索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_orders_user ON orders(user_id);`)
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2">设计说明</h4>
                <p className="text-sm text-muted-foreground">
                  此结构采用了标准的关系型数据库设计，包含用户、产品和订单三张核心表。使用外键约束确保数据完整性，并添加了适当的索引优化查询性能。系统可根据业务需求扩展更多表，如评论表、购物车表等。
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DocWrapper>
  )
} 