"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { format } from "date-fns"
import { 
  Bell, 
  Database, 
  Play, 
  Square,
  Pause,
  RefreshCw, 
  Layers, 
  Table, 
  ListFilter, 
  Settings2, 
  PlusCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  BarChart4,
  ArrowRight,
  Loader2,
  AlertCircle
} from "lucide-react"

// 模拟WebSocket连接
class MockWebSocket {
  private callbacks: Record<string, Function[]> = {};
  private interval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private tables = ["users", "products", "orders", "categories"];
  private eventTypes = ["insert", "update", "delete"];

  constructor(private url: string) {}

  connect() {
    this.isConnected = true;
    this.dispatchEvent('open', {});
    
    // 模拟周期性发送消息
    this.interval = setInterval(() => {
      if (!this.isConnected) return;
      
      // 随机选择表和事件类型
      const table = this.tables[Math.floor(Math.random() * this.tables.length)];
      const eventType = this.eventTypes[Math.floor(Math.random() * this.eventTypes.length)];
      const id = Math.floor(Math.random() * 1000);
      
      // 构造数据变更通知
      const change = {
        table,
        event: eventType,
        id,
        timestamp: new Date().toISOString(),
        data: eventType !== "delete" ? this.generateFakeData(table, id) : null
      };
      
      this.dispatchEvent('message', { data: JSON.stringify(change) });
    }, 3000);
  }

  disconnect() {
    this.isConnected = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.dispatchEvent('close', {});
  }

  addEventListener(event: string, callback: Function) {
    if (!this.callbacks[event]) {
      this.callbacks[event] = [];
    }
    this.callbacks[event].push(callback);
  }

  removeEventListener(event: string, callback: Function) {
    if (!this.callbacks[event]) return;
    this.callbacks[event] = this.callbacks[event].filter(cb => cb !== callback);
  }

  private dispatchEvent(event: string, data: any) {
    if (!this.callbacks[event]) return;
    this.callbacks[event].forEach(callback => callback(data));
  }

  private generateFakeData(table: string, id: number) {
    switch (table) {
      case "users":
        return {
          id,
          name: `User ${id}`,
          email: `user${id}@example.com`,
          created_at: new Date().toISOString()
        };
      case "products":
        return {
          id,
          name: `Product ${id}`,
          price: parseFloat((Math.random() * 100).toFixed(2)),
          stock: Math.floor(Math.random() * 100)
        };
      case "orders":
        return {
          id,
          user_id: Math.floor(Math.random() * 100),
          total: parseFloat((Math.random() * 500).toFixed(2)),
          status: ["pending", "processing", "completed"][Math.floor(Math.random() * 3)]
        };
      default:
        return {
          id,
          name: `Item ${id}`,
          created_at: new Date().toISOString()
        };
    }
  }
}

interface ChangeEvent {
  id: string;
  table: string;
  event: "insert" | "update" | "delete";
  timestamp: string;
  data: any;
}

export default function RealtimePage() {
  const [activeTab, setActiveTab] = useState("changes");
  const [isConnected, setIsConnected] = useState(false);
  const [changes, setChanges] = useState<ChangeEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [showNotifications, setShowNotifications] = useState(true);
  const [tablesData, setTablesData] = useState<Record<string, any[]>>({
    users: [],
    products: [],
    orders: [],
    categories: []
  });
  const [subscriptions, setSubscriptions] = useState([
    { id: 1, table: "users", event: "all", active: true, name: "用户变更监控" },
    { id: 2, table: "orders", event: "insert", active: true, name: "新订单通知" }
  ]);
  const [newSubscriptionName, setNewSubscriptionName] = useState("");
  const [newSubscriptionTable, setNewSubscriptionTable] = useState("users");
  const [newSubscriptionEvent, setNewSubscriptionEvent] = useState("all");
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false);
  const socketRef = useRef<MockWebSocket | null>(null);
  
  // 连接WebSocket
  const connectWebSocket = () => {
    setIsLoading(true);
    
    // 模拟连接延迟
    setTimeout(() => {
      if (!socketRef.current) {
        socketRef.current = new MockWebSocket('ws://localhost:4000/realtime');
        
        socketRef.current.addEventListener('open', () => {
          setIsConnected(true);
          setIsLoading(false);
          toast({
            title: "实时连接已建立",
            description: "数据变更将实时显示",
          });
        });
        
        socketRef.current.addEventListener('message', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            // 检查是否订阅了此表和事件类型
            const hasSubscription = subscriptions.some(
              sub => 
                sub.active && 
                (sub.table === "all" || sub.table === data.table) &&
                (sub.event === "all" || sub.event === data.event)
            );
            
            if (hasSubscription) {
              setChanges(prev => [
                { 
                  id: `${Date.now()}`,
                  table: data.table,
                  event: data.event,
                  timestamp: data.timestamp,
                  data: data.data
                },
                ...prev.slice(0, 99) // 只保留最近100条
              ]);
              
              // 更新表数据
              if (data.event === "insert" || data.event === "update") {
                setTablesData(prev => ({
                  ...prev,
                  [data.table]: updateTableData(prev[data.table] || [], data)
                }));
              } else if (data.event === "delete") {
                setTablesData(prev => ({
                  ...prev,
                  [data.table]: (prev[data.table] || []).filter(item => item.id !== data.id)
                }));
              }
              
              // 显示通知
              if (showNotifications) {
                toast({
                  title: `${getEventLabel(data.event)} - ${data.table}`,
                  description: `ID: ${data.id}`,
                  action: (
                    <ToastAction altText="查看">查看</ToastAction>
                  ),
                });
              }
            }
          } catch (err) {
            console.error('Error parsing message:', err);
          }
        });
        
        socketRef.current.addEventListener('close', () => {
          setIsConnected(false);
          setIsLoading(false);
          toast({
            title: "连接已断开",
            description: "实时数据更新已停止",
            variant: "destructive",
          });
        });
        
        socketRef.current.connect();
      } else {
        socketRef.current.connect();
      }
    }, 1000);
  };
  
  // 断开WebSocket连接
  const disconnectWebSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      setIsConnected(false);
    }
  };
  
  // 添加订阅
  const addSubscription = () => {
    if (!newSubscriptionName.trim()) return;
    
    const newSub = {
      id: Date.now(),
      table: newSubscriptionTable,
      event: newSubscriptionEvent,
      active: true,
      name: newSubscriptionName
    };
    
    setSubscriptions([...subscriptions, newSub]);
    setNewSubscriptionName("");
    setIsCreatingSubscription(false);
    
    toast({
      title: "订阅已创建",
      description: `已创建 "${newSubscriptionName}" 订阅`
    });
  };
  
  // 切换订阅状态
  const toggleSubscription = (id: number) => {
    setSubscriptions(subscriptions.map(sub => 
      sub.id === id ? { ...sub, active: !sub.active } : sub
    ));
  };
  
  // 删除订阅
  const deleteSubscription = (id: number) => {
    setSubscriptions(subscriptions.filter(sub => sub.id !== id));
  };
  
  // 更新表数据
  const updateTableData = (currentData: any[], change: any) => {
    const { event, data, id } = change;
    
    if (event === "insert") {
      return [...currentData, data];
    } else if (event === "update") {
      return currentData.map(item => 
        item.id === id ? { ...item, ...data } : item
      );
    }
    
    return currentData;
  };
  
  // 获取事件类型标签
  const getEventLabel = (event: string) => {
    switch (event) {
      case "insert": return "新增";
      case "update": return "更新";
      case "delete": return "删除";
      default: return event;
    }
  };
  
  // 获取事件类型徽章样式
  const getEventBadgeVariant = (event: string) => {
    switch (event) {
      case "insert": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "update": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "delete": return "bg-red-500/10 text-red-500 border-red-500/20";
      default: return "";
    }
  };
  
  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);
  
  // 过滤变更记录
  const filteredChanges = changes.filter(change => 
    (selectedTable === "all" || change.table === selectedTable) &&
    (selectedEvent === "all" || change.event === selectedEvent)
  );

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">实时数据更新</h1>
        <p className="text-muted-foreground mt-2">
          实时监控数据库变更
        </p>
      </div>
      
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {!isConnected ? (
            <Button 
              onClick={connectWebSocket} 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  连接中...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  启动实时连接
                </>
              )}
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              onClick={disconnectWebSocket}
            >
              <Square className="mr-2 h-4 w-4" />
              断开连接
            </Button>
          )}
          
          <div className="flex items-center gap-2 ml-4">
            <Switch
              id="notifications"
              checked={showNotifications}
              onCheckedChange={setShowNotifications}
            />
            <Label htmlFor="notifications" className="cursor-pointer">
              弹出通知 
              <Bell className="ml-1 h-4 w-4 inline-block text-muted-foreground" />
            </Label>
          </div>
        </div>
        
        <Badge 
          variant={isConnected ? "default" : "outline"}
          className={isConnected ? "bg-green-500" : ""}
        >
          {isConnected ? "已连接" : "未连接"}
        </Badge>
      </div>
      
      {!isConnected && !isLoading && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            当前未连接到实时服务。点击"启动实时连接"按钮开始监听数据变更。
          </AlertDescription>
        </Alert>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="changes">
            <RefreshCw className="mr-2 h-4 w-4" />
            变更记录
          </TabsTrigger>
          <TabsTrigger value="subscriptions">
            <Bell className="mr-2 h-4 w-4" />
            订阅管理
          </TabsTrigger>
          <TabsTrigger value="livedata">
            <Database className="mr-2 h-4 w-4" />
            实时数据
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="changes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <RefreshCw className="mr-2 h-5 w-5" />
                数据变更记录
              </CardTitle>
              <CardDescription>
                显示数据库中的所有变更事件
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Select value={selectedTable} onValueChange={setSelectedTable}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="选择表" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有表</SelectItem>
                      <SelectItem value="users">用户表</SelectItem>
                      <SelectItem value="products">产品表</SelectItem>
                      <SelectItem value="orders">订单表</SelectItem>
                      <SelectItem value="categories">分类表</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="选择事件类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">所有事件</SelectItem>
                      <SelectItem value="insert">新增</SelectItem>
                      <SelectItem value="update">更新</SelectItem>
                      <SelectItem value="delete">删除</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSelectedTable("all");
                      setSelectedEvent("all");
                    }}
                  >
                    重置过滤器
                  </Button>
                </div>
                
                {filteredChanges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                    <Database className="h-12 w-12 mb-4 opacity-20" />
                    <h3 className="text-lg font-medium mb-1">暂无变更记录</h3>
                    <p>连接到实时服务后，数据变更将显示在此处</p>
                    {isConnected && (
                      <p className="mt-1 text-sm">正在等待数据变更...</p>
                    )}
                  </div>
                ) : (
                  <ScrollArea className="h-[460px] border rounded-md">
                    <div className="divide-y">
                      {filteredChanges.map((change) => (
                        <div key={change.id} className="p-3 hover:bg-muted/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant="outline" 
                                className={getEventBadgeVariant(change.event)}
                              >
                                {getEventLabel(change.event)}
                              </Badge>
                              <span className="font-medium">{change.table}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(change.timestamp), "yyyy-MM-dd HH:mm:ss")}
                            </span>
                          </div>
                          
                          <div className="rounded bg-muted/50 p-2 font-mono text-xs overflow-x-auto">
                            {change.event !== "delete" ? (
                              <pre>{JSON.stringify(change.data, null, 2)}</pre>
                            ) : (
                              <span className="text-muted-foreground">ID: {change.data?.id || "未知"} 的记录已删除</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="subscriptions" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center">
                    <Bell className="mr-2 h-5 w-5" />
                    订阅管理
                  </CardTitle>
                  <CardDescription>
                    创建和管理数据变更订阅
                  </CardDescription>
                </div>
                <Button onClick={() => setIsCreatingSubscription(true)} disabled={isCreatingSubscription}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  新建订阅
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isCreatingSubscription && (
                <Card className="mb-6 border-dashed">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-md">新建订阅</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="sub-name">订阅名称</Label>
                        <Input 
                          id="sub-name" 
                          value={newSubscriptionName}
                          onChange={(e) => setNewSubscriptionName(e.target.value)}
                          placeholder="输入订阅名称" 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="sub-table">监听表</Label>
                          <Select value={newSubscriptionTable} onValueChange={setNewSubscriptionTable}>
                            <SelectTrigger id="sub-table">
                              <SelectValue placeholder="选择表" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">所有表</SelectItem>
                              <SelectItem value="users">用户表</SelectItem>
                              <SelectItem value="products">产品表</SelectItem>
                              <SelectItem value="orders">订单表</SelectItem>
                              <SelectItem value="categories">分类表</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="sub-event">事件类型</Label>
                          <Select value={newSubscriptionEvent} onValueChange={setNewSubscriptionEvent}>
                            <SelectTrigger id="sub-event">
                              <SelectValue placeholder="选择事件类型" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">所有事件</SelectItem>
                              <SelectItem value="insert">新增</SelectItem>
                              <SelectItem value="update">更新</SelectItem>
                              <SelectItem value="delete">删除</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" onClick={() => setIsCreatingSubscription(false)}>
                      取消
                    </Button>
                    <Button onClick={addSubscription} disabled={!newSubscriptionName.trim()}>
                      创建订阅
                    </Button>
                  </CardFooter>
                </Card>
              )}
              
              {subscriptions.length === 0 ? (
                <div className="text-center py-12">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-20" />
                  <h3 className="text-lg font-medium mb-1">暂无订阅</h3>
                  <p className="text-muted-foreground mb-4">创建一个订阅以开始接收数据变更通知</p>
                  <Button onClick={() => setIsCreatingSubscription(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    新建订阅
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <Card key={sub.id} className={`border ${sub.active ? 'border-primary/30' : 'border-muted'}`}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-md flex items-center">
                            {sub.active ? (
                              <CheckCircle2 className="mr-2 h-4 w-4 text-primary" />
                            ) : (
                              <XCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                            )}
                            {sub.name}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={sub.active} 
                              onCheckedChange={() => toggleSubscription(sub.id)}
                            />
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => deleteSubscription(sub.id)}
                              className="h-8 w-8 p-0"
                            >
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center text-sm">
                          <Badge variant="outline" className="mr-2">
                            {sub.table === "all" ? "所有表" : sub.table}
                          </Badge>
                          <ArrowRight className="h-3 w-3 mx-1 text-muted-foreground" />
                          <Badge variant="outline">
                            {sub.event === "all" ? "所有事件" : getEventLabel(sub.event)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="livedata" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Database className="mr-2 h-5 w-5" />
                实时数据视图
              </CardTitle>
              <CardDescription>
                显示最新的数据状态
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="users">用户表</TabsTrigger>
                  <TabsTrigger value="products">产品表</TabsTrigger>
                  <TabsTrigger value="orders">订单表</TabsTrigger>
                  <TabsTrigger value="categories">分类表</TabsTrigger>
                </TabsList>
                
                {["users", "products", "orders", "categories"].map((table) => (
                  <TabsContent key={table} value={table}>
                    {!isConnected ? (
                      <div className="text-center py-10">
                        <Database className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground">
                          启动实时连接以加载最新数据
                        </p>
                      </div>
                    ) : tablesData[table]?.length === 0 ? (
                      <div className="text-center py-10">
                        <Table className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-20" />
                        <p className="text-muted-foreground">
                          暂无数据
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <ScrollArea className="h-[400px]">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="px-4 py-2 text-left font-medium">ID</th>
                                {table === "users" && (
                                  <>
                                    <th className="px-4 py-2 text-left font-medium">名称</th>
                                    <th className="px-4 py-2 text-left font-medium">邮箱</th>
                                    <th className="px-4 py-2 text-left font-medium">创建时间</th>
                                  </>
                                )}
                                {table === "products" && (
                                  <>
                                    <th className="px-4 py-2 text-left font-medium">产品名</th>
                                    <th className="px-4 py-2 text-left font-medium">价格</th>
                                    <th className="px-4 py-2 text-left font-medium">库存</th>
                                  </>
                                )}
                                {table === "orders" && (
                                  <>
                                    <th className="px-4 py-2 text-left font-medium">用户ID</th>
                                    <th className="px-4 py-2 text-left font-medium">总价</th>
                                    <th className="px-4 py-2 text-left font-medium">状态</th>
                                  </>
                                )}
                                {table === "categories" && (
                                  <>
                                    <th className="px-4 py-2 text-left font-medium">名称</th>
                                    <th className="px-4 py-2 text-left font-medium">创建时间</th>
                                  </>
                                )}
                              </tr>
                            </thead>
                            <tbody>
                              {tablesData[table]?.map((row) => (
                                <tr key={row.id} className="border-t hover:bg-muted/50">
                                  <td className="px-4 py-2">{row.id}</td>
                                  {table === "users" && (
                                    <>
                                      <td className="px-4 py-2">{row.name}</td>
                                      <td className="px-4 py-2 font-mono text-xs">{row.email}</td>
                                      <td className="px-4 py-2 text-sm text-muted-foreground">
                                        {row.created_at ? format(new Date(row.created_at), "yyyy-MM-dd HH:mm") : "-"}
                                      </td>
                                    </>
                                  )}
                                  {table === "products" && (
                                    <>
                                      <td className="px-4 py-2">{row.name}</td>
                                      <td className="px-4 py-2">¥{row.price?.toFixed(2)}</td>
                                      <td className="px-4 py-2">{row.stock}</td>
                                    </>
                                  )}
                                  {table === "orders" && (
                                    <>
                                      <td className="px-4 py-2">{row.user_id}</td>
                                      <td className="px-4 py-2">¥{row.total?.toFixed(2)}</td>
                                      <td className="px-4 py-2">
                                        <Badge variant="outline" className={
                                          row.status === "completed" ? "bg-green-500/10 text-green-500" :
                                          row.status === "processing" ? "bg-blue-500/10 text-blue-500" :
                                          "bg-yellow-500/10 text-yellow-500"
                                        }>
                                          {row.status}
                                        </Badge>
                                      </td>
                                    </>
                                  )}
                                  {table === "categories" && (
                                    <>
                                      <td className="px-4 py-2">{row.name}</td>
                                      <td className="px-4 py-2 text-sm text-muted-foreground">
                                        {row.created_at ? format(new Date(row.created_at), "yyyy-MM-dd HH:mm") : "-"}
                                      </td>
                                    </>
                                  )}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </ScrollArea>
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 