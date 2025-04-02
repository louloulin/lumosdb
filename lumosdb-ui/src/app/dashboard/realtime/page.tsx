"use client"

import { useState, useEffect } from "react"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import { PageHeader } from "@/components/page-header"
import { formatRelative } from "date-fns"
import { zhCN } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { 
  Activity,
  AlertCircle,
  CheckCircle2,
  Database, 
  Layers, 
  PlusCircle, 
  Trash2,
  XCircle
} from "lucide-react"
import { 
  useRealtimeConnection,
  ConnectionState,
  SubscriptionType,
  EventType,
  RealtimeEvent,
  SubscriptionOptions,
  realtimeClient
} from "@/lib/realtime"

export default function RealtimePage() {
  const [activeTab, setActiveTab] = useState("monitor");
  const [tables] = useState<string[]>([
    "users", "products", "orders", "transactions"
  ]);
  const [collections] = useState<string[]>([
    "product_embeddings", "customer_profiles", "support_docs"
  ]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionOptions[]>([]);
  const { connectionState, connect, disconnect } = useRealtimeConnection();
  
  // Add a default subscription for system events
  useEffect(() => {
    setSubscriptions([
      { type: SubscriptionType.SYSTEM_EVENTS }
    ]);
  }, []);
  
  // Add a new subscription
  const addSubscription = (subscription: SubscriptionOptions) => {
    setSubscriptions(prev => [...prev, subscription]);
    toast.success("已添加实时订阅");
  };
  
  // Remove a subscription
  const removeSubscription = (index: number) => {
    setSubscriptions(prev => prev.filter((_, i) => i !== index));
    toast.info("已移除实时订阅");
  };
  
  // Format connection state for display
  const getConnectionStatusBadge = () => {
    switch (connectionState) {
      case ConnectionState.OPEN:
        return <Badge className="bg-green-500">已连接</Badge>;
      case ConnectionState.CONNECTING:
        return <Badge className="bg-yellow-500">连接中</Badge>;
      case ConnectionState.CLOSING:
        return <Badge className="bg-orange-500">关闭中</Badge>;
      case ConnectionState.CLOSED:
        return <Badge className="bg-red-500">已断开</Badge>;
      default:
        return <Badge className="bg-gray-500">未知状态</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <PageHeader 
        title="实时数据" 
        description="监控和管理实时数据更新"
        actions={
          <div className="flex items-center space-x-4">
            <span className="text-sm mr-2">状态：{getConnectionStatusBadge()}</span>
            {connectionState === ConnectionState.CLOSED ? (
              <Button onClick={connect} variant="outline">
                <Activity className="h-4 w-4 mr-2" /> 连接
            </Button>
          ) : (
              <Button onClick={disconnect} variant="outline">
                <XCircle className="h-4 w-4 mr-2" /> 断开
            </Button>
          )}
          </div>
        }
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitor">实时监控</TabsTrigger>
          <TabsTrigger value="subscribe">管理订阅</TabsTrigger>
          <TabsTrigger value="settings">连接设置</TabsTrigger>
        </TabsList>
        
        {/* 实时监控标签内容 */}
        <TabsContent value="monitor" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>活跃订阅</CardTitle>
                <CardDescription>当前监控的实时数据更新</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-72">
                  {subscriptions.length === 0 ? (
                    <div className="text-center p-6 text-gray-500">
                      暂无活跃订阅
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {subscriptions.map((subscription, index) => (
                        <SubscriptionCard 
                          key={index} 
                          subscription={subscription} 
                          onRemove={() => removeSubscription(index)} 
                        />
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => setActiveTab("subscribe")}>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  添加订阅
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>事件日志</CardTitle>
                <CardDescription>接收到的所有实时事件</CardDescription>
              </CardHeader>
              <CardContent>
                <EventLog subscriptions={subscriptions} />
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>实时数据变化</CardTitle>
              <CardDescription>实时监控数据变更</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangeMonitor subscriptions={subscriptions} />
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* 管理订阅标签内容 */}
        <TabsContent value="subscribe" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>表变更订阅</CardTitle>
                <CardDescription>监控 SQLite 表数据变化</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const target = formData.get('table') as string;
                  
                  addSubscription({
                    type: SubscriptionType.TABLE_CHANGES,
                    target
                  });
                  
                  // Reset form
                  e.currentTarget.reset();
                }}>
                  <div className="space-y-2">
                    <Label htmlFor="table">选择表</Label>
                    <Select name="table" required>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要监控的表" />
                    </SelectTrigger>
                    <SelectContent>
                        {tables.map(table => (
                          <SelectItem key={table} value={table}>{table}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  </div>
                  <Button type="submit">添加表订阅</Button>
                </form>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>向量集合订阅</CardTitle>
                <CardDescription>监控向量集合变化</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const target = formData.get('collection') as string;
                  
                  addSubscription({
                    type: SubscriptionType.VECTOR_CHANGES,
                    target
                  });
                  
                  // Reset form
                  e.currentTarget.reset();
                }}>
                  <div className="space-y-2">
                    <Label htmlFor="collection">选择集合</Label>
                    <Select name="collection" required>
                      <SelectTrigger>
                        <SelectValue placeholder="选择要监控的集合" />
                    </SelectTrigger>
                    <SelectContent>
                        {collections.map(collection => (
                          <SelectItem key={collection} value={collection}>{collection}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  </div>
                  <Button type="submit">添加集合订阅</Button>
                </form>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>系统事件订阅</CardTitle>
              <CardDescription>监控系统级别事件</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium">系统事件</h4>
                  <p className="text-sm text-gray-500">接收有关系统状态和性能的通知</p>
                </div>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                    // Check if system events subscription already exists
                    const hasSystemSub = subscriptions.some(
                      sub => sub.type === SubscriptionType.SYSTEM_EVENTS
                    );
                    
                    if (!hasSystemSub) {
                      addSubscription({
                        type: SubscriptionType.SYSTEM_EVENTS
                      });
                    } else {
                      toast.info("已经订阅了系统事件");
                    }
                  }}
                >
                  添加系统订阅
                  </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">提示</h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    实时数据功能需要连接到支持WebSocket的后端服务。确保您的LumosDB服务器版本支持实时更新。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        {/* 连接设置标签内容 */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>WebSocket连接设置</CardTitle>
              <CardDescription>配置实时数据连接</CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reconnect">自动重连</Label>
                  <div className="flex items-center space-x-2">
                    <Switch id="reconnect" defaultChecked />
                    <Label htmlFor="reconnect">断开连接时自动重连</Label>
                        </div>
                      </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notification">通知设置</Label>
                  <div className="flex items-center space-x-2">
                    <Switch id="notification" defaultChecked />
                    <Label htmlFor="notification">接收数据变更通知</Label>
                    </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="buffer">事件缓冲区</Label>
                  <Input type="number" id="buffer" defaultValue="100" min="10" max="1000" />
                  <p className="text-sm text-gray-500">保留的最大历史事件数量</p>
                </div>
                
                <Button type="submit">保存设置</Button>
              </form>
            </CardContent>
          </Card>
        
          <Card>
            <CardHeader>
              <CardTitle>连接状态</CardTitle>
              <CardDescription>WebSocket连接诊断</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">当前状态</h4>
                    <div className="text-sm">{getConnectionStatusBadge()}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">活跃订阅</h4>
                    <div className="text-sm">{subscriptions.length}</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">服务器URL</h4>
                    <div className="text-sm truncate">ws://localhost:3008/realtime</div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-1">协议版本</h4>
                    <div className="text-sm">1.0</div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={connect}>测试连接</Button>
                  <Button variant="outline" onClick={disconnect}>断开连接</Button>
                      </div>
                      </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 订阅卡片组件
function SubscriptionCard({ 
  subscription, 
  onRemove 
}: { 
  subscription: SubscriptionOptions; 
  onRemove: () => void;
}) {
  let title = "";
  let icon = null;
  let description = "";
  
  switch (subscription.type) {
    case SubscriptionType.TABLE_CHANGES:
      title = subscription.target ? `表：${subscription.target}` : "所有表";
      icon = <Database className="h-4 w-4" />;
      description = "监控表数据更改";
      break;
    case SubscriptionType.VECTOR_CHANGES:
      title = subscription.target ? `集合：${subscription.target}` : "所有集合";
      icon = <Layers className="h-4 w-4" />;
      description = "监控向量集合更改";
      break;
    case SubscriptionType.SYSTEM_EVENTS:
      title = "系统事件";
      icon = <Activity className="h-4 w-4" />;
      description = "监控系统级别事件";
      break;
  }
  
  return (
    <div className="flex items-center justify-between p-3 border rounded-md">
      <div className="flex items-center space-x-3">
        <div className="bg-primary/10 p-2 rounded-md">
          {icon}
        </div>
        <div>
          <h4 className="text-sm font-medium">{title}</h4>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={onRemove}>
        <Trash2 className="h-4 w-4 text-gray-500" />
      </Button>
    </div>
  );
}

// 事件日志组件
function EventLog({ subscriptions }: { subscriptions: SubscriptionOptions[] }) {
  // Combine all subscription events
  const [allEvents, setAllEvents] = useState<RealtimeEvent[]>([]);
  
  // Create a stable subscription string for dependency array
  const subscriptionKey = JSON.stringify(subscriptions);
  
  // Use a single hook call at the top level
  useEffect(() => {
    // Only proceed if we have subscriptions
    if (subscriptions.length === 0) return;
    
    // Track unsubscribe functions
    const unsubscribes: (() => void)[] = [];
    
    // Handle new events from any subscription
    const handleNewEvent = (event: RealtimeEvent) => {
      setAllEvents(prev => {
        // Add new event and keep sorted
        const newEvents = [event, ...prev]
          .filter((event, index, self) => 
            index === self.findIndex(e => e.id === event.id)
          )
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 100); // Keep only most recent 100
          
        return newEvents;
      });
    };
    
    // Create a separate client subscription for each option
    subscriptions.forEach(subscription => {
      const unsub = realtimeClient.subscribe(subscription, handleNewEvent);
      unsubscribes.push(unsub);
    });
    
    // Cleanup subscriptions on component unmount or subscriptions change
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [subscriptionKey]);
  
  if (allEvents.length === 0) {
    return (
      <div className="h-72 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>暂无事件</p>
          <p className="text-xs">连接服务器后的事件将显示在这里</p>
        </div>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-72">
      <div className="space-y-2">
        {allEvents.map(event => (
          <div key={event.id} className="p-2 border-b text-sm">
            <div className="flex justify-between">
              <span className="font-medium flex items-center">
                {getEventTypeIcon(event.type)}
                {getEventTypeName(event.type)}
              </span>
              <span className="text-xs text-gray-500">
                {formatRelative(new Date(event.timestamp), new Date(), { locale: zhCN })}
              </span>
            </div>
            <div className="text-xs mt-1">
              {event.table && <span className="mr-2">表: {event.table}</span>}
              {event.collection && <span className="mr-2">集合: {event.collection}</span>}
              {event.record && <span>ID: {event.record.id || '未知'}</span>}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

// 变更监控组件
function ChangeMonitor({ subscriptions }: { subscriptions: SubscriptionOptions[] }) {
  // Combined state for all relevant events
  const [tableEvents, setTableEvents] = useState<RealtimeEvent[]>([]);
  const [vectorEvents, setVectorEvents] = useState<RealtimeEvent[]>([]);
  
  // Split subscriptions by type
  const tableSubscriptions = subscriptions.filter(
    sub => sub.type === SubscriptionType.TABLE_CHANGES
  );
  
  const vectorSubscriptions = subscriptions.filter(
    sub => sub.type === SubscriptionType.VECTOR_CHANGES
  );
  
  // Create stable keys for dependency arrays
  const tableSubKey = JSON.stringify(tableSubscriptions);
  const vectorSubKey = JSON.stringify(vectorSubscriptions);
  
  // Handle table subscriptions
  useEffect(() => {
    if (tableSubscriptions.length === 0) return;
    
    const unsubscribes: (() => void)[] = [];
    
    // Handle new table events
    const handleTableEvent = (event: RealtimeEvent) => {
      if (event.table) {
        setTableEvents(prev => {
          const newEvents = [event, ...prev]
            .filter((event, index, self) => 
              index === self.findIndex(e => e.id === event.id)
            )
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
            
          return newEvents;
        });
      }
    };
    
    // Subscribe to each table subscription
    tableSubscriptions.forEach(subscription => {
      const unsub = realtimeClient.subscribe(subscription, handleTableEvent);
      unsubscribes.push(unsub);
    });
    
    // Cleanup
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [tableSubKey]);
  
  // Handle vector subscriptions
  useEffect(() => {
    if (vectorSubscriptions.length === 0) return;
    
    const unsubscribes: (() => void)[] = [];
    
    // Handle new vector events
    const handleVectorEvent = (event: RealtimeEvent) => {
      if (event.collection) {
        setVectorEvents(prev => {
          const newEvents = [event, ...prev]
            .filter((event, index, self) => 
              index === self.findIndex(e => e.id === event.id)
            )
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 10);
            
          return newEvents;
        });
      }
    };
    
    // Subscribe to each vector subscription
    vectorSubscriptions.forEach(subscription => {
      const unsub = realtimeClient.subscribe(subscription, handleVectorEvent);
      unsubscribes.push(unsub);
    });
    
    // Cleanup
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [vectorSubKey]);
  
  if (tableEvents.length === 0 && vectorEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Database className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <h3 className="text-lg font-medium mb-1">没有数据变更</h3>
        <p className="max-w-md mx-auto text-sm">
          订阅数据表或向量集合后，数据变更将实时显示在这里。请在&ldquo;管理订阅&rdquo;标签页添加订阅。
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {tableEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">表数据变更</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>事件类型</TableHead>
                <TableHead>表名</TableHead>
                <TableHead>记录ID</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableEvents.map(event => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="flex items-center">
                      {getEventTypeIcon(event.type)}
                      <span className="ml-2">{getEventTypeName(event.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{event.table || '未知'}</TableCell>
                  <TableCell>{event.record?.id || '未知'}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatRelative(new Date(event.timestamp), new Date(), { locale: zhCN })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      
      {vectorEvents.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-3">向量数据变更</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>事件类型</TableHead>
                <TableHead>集合</TableHead>
                <TableHead>向量ID</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vectorEvents.map(event => (
                <TableRow key={event.id}>
                  <TableCell>
                    <div className="flex items-center">
                      {getEventTypeIcon(event.type)}
                      <span className="ml-2">{getEventTypeName(event.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{event.collection || '未知'}</TableCell>
                  <TableCell>{event.record?.id || '未知'}</TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatRelative(new Date(event.timestamp), new Date(), { locale: zhCN })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// 获取事件类型图标
function getEventTypeIcon(type: EventType) {
  switch (type) {
    case EventType.INSERT:
      return <PlusCircle className="h-4 w-4 text-green-500 mr-1" />;
    case EventType.UPDATE:
      return <CheckCircle2 className="h-4 w-4 text-blue-500 mr-1" />;
    case EventType.DELETE:
      return <Trash2 className="h-4 w-4 text-red-500 mr-1" />;
    case EventType.SYSTEM:
      return <AlertCircle className="h-4 w-4 text-yellow-500 mr-1" />;
    default:
      return <Activity className="h-4 w-4 mr-1" />;
  }
}

// 获取事件类型名称
function getEventTypeName(type: EventType) {
  switch (type) {
    case EventType.INSERT:
      return "新增";
    case EventType.UPDATE:
      return "更新";
    case EventType.DELETE:
      return "删除";
    case EventType.SYSTEM:
      return "系统";
    default:
      return "未知";
  }
} 