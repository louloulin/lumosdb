"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { format } from "date-fns"
import { 
  BarChart, 
  ActivitySquare, 
  AlertCircle, 
  ArrowDownIcon, 
  ArrowUpIcon, 
  Clock, 
  Database, 
  Download, 
  FileText, 
  Filter, 
  HardDrive, 
  Laptop, 
  Loader2, 
  RefreshCw, 
  Search, 
  Server, 
  Bookmark
} from "lucide-react"

// 模拟系统状态数据
const systemStatus = {
  cpu: 32,
  memory: 45,
  disk: 28,
  network: {
    up: 1.2,
    down: 2.5,
  },
  uptime: "3d 5h 12m",
  databases: [
    { name: "main.db", size: "128MB", tables: 12, lastBackup: "2d ago" },
    { name: "analytics.db", size: "256MB", tables: 8, lastBackup: "12h ago" },
    { name: "vectors.db", size: "512MB", collections: 5, lastBackup: "1d ago" }
  ]
};

// 模拟日志数据生成
const generateLogs = (count: number) => {
  const logTypes = ["info", "warn", "error", "debug"];
  const components = ["sqlite", "duckdb", "vector", "system", "api", "auth"];
  const messages = [
    "Query executed successfully",
    "Slow query detected",
    "Connection established",
    "Authentication successful",
    "User session expired",
    "Data export completed",
    "Memory usage increased",
    "Vector collection optimized",
    "System backup started",
    "API request failed",
    "Database locked",
    "Index rebuilt"
  ];
  
  const logs = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const logType = logTypes[Math.floor(Math.random() * logTypes.length)];
    const component = components[Math.floor(Math.random() * components.length)];
    const message = messages[Math.floor(Math.random() * messages.length)];
    const timestamp = new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000);
    
    logs.push({
      id: `log-${i}`,
      timestamp,
      type: logType,
      component,
      message,
      details: `Details for log entry ${i}. Additional debug information and stack trace if applicable.`
    });
  }
  
  // 按时间排序，最新的在前
  return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

interface LogEntry {
  id: string;
  timestamp: Date;
  type: string;
  component: string;
  message: string;
  details: string;
}

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState("system");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [logTypeFilter, setLogTypeFilter] = useState("all");
  const [componentFilter, setComponentFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [bookmarkedLogs, setBookmarkedLogs] = useState<string[]>([]);
  
  useEffect(() => {
    setIsLoading(true);
    // 模拟数据加载
    setTimeout(() => {
      const generatedLogs = generateLogs(100);
      setLogs(generatedLogs);
      setFilteredLogs(generatedLogs);
      setIsLoading(false);
    }, 800);
  }, []);
  
  useEffect(() => {
    let filtered = [...logs];
    
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        log => 
          log.message.toLowerCase().includes(query) || 
          log.component.toLowerCase().includes(query) ||
          log.details.toLowerCase().includes(query)
      );
    }
    
    // 类型过滤
    if (logTypeFilter !== "all") {
      filtered = filtered.filter(log => log.type === logTypeFilter);
    }
    
    // 组件过滤
    if (componentFilter !== "all") {
      filtered = filtered.filter(log => log.component === componentFilter);
    }
    
    setFilteredLogs(filtered);
  }, [logs, searchQuery, logTypeFilter, componentFilter]);
  
  const refreshData = () => {
    setIsLoading(true);
    setSelectedLog(null);
    
    // 模拟刷新数据
    setTimeout(() => {
      const newLogs = generateLogs(100);
      setLogs(newLogs);
      setFilteredLogs(newLogs);
      setIsLoading(false);
    }, 800);
  };
  
  const toggleBookmark = (logId: string) => {
    if (bookmarkedLogs.includes(logId)) {
      setBookmarkedLogs(bookmarkedLogs.filter(id => id !== logId));
    } else {
      setBookmarkedLogs([...bookmarkedLogs, logId]);
    }
  };
  
  const showBookmarkedOnly = () => {
    if (bookmarkedLogs.length === 0) return;
    
    const bookmarked = logs.filter(log => bookmarkedLogs.includes(log.id));
    setFilteredLogs(bookmarked);
  };
  
  const resetFilters = () => {
    setSearchQuery("");
    setLogTypeFilter("all");
    setComponentFilter("all");
    setFilteredLogs(logs);
  };
  
  const downloadLogs = () => {
    const logsJson = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([logsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lumos-logs-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">系统监控</h1>
        <p className="text-muted-foreground mt-2">
          监控系统性能和查看应用日志
        </p>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="system">
            <Server className="mr-2 h-4 w-4" />
            系统状态
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="mr-2 h-4 w-4" />
            应用日志
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <ActivitySquare className="mr-2 h-4 w-4" /> CPU 使用率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>使用率</span>
                    <span className="font-medium">{systemStatus.cpu}%</span>
                  </div>
                  <Progress value={systemStatus.cpu} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <Laptop className="mr-2 h-4 w-4" /> 内存使用率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>使用率</span>
                    <span className="font-medium">{systemStatus.memory}%</span>
                  </div>
                  <Progress value={systemStatus.memory} className="h-2" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-md flex items-center">
                  <HardDrive className="mr-2 h-4 w-4" /> 磁盘使用率
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>使用率</span>
                    <span className="font-medium">{systemStatus.disk}%</span>
                  </div>
                  <Progress value={systemStatus.disk} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-md flex items-center">
                  <Database className="mr-2 h-4 w-4" /> 数据库状态
                </CardTitle>
                <CardDescription>
                  各数据库状态与统计信息
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {systemStatus.databases.map((db, index) => (
                    <div key={index} className="border-b pb-3 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center">
                          <Database className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="font-medium">{db.name}</span>
                        </div>
                        <Badge variant="outline">{db.size}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                        <div>表/集合: {db.tables || db.collections}</div>
                        <div>最后备份: {db.lastBackup}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-md flex items-center">
                  <BarChart className="mr-2 h-4 w-4" /> 网络与系统信息
                </CardTitle>
                <CardDescription>
                  系统运行状况与网络传输统计
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-sm">系统运行时间</span>
                    </div>
                    <Badge variant="outline">{systemStatus.uptime}</Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">网络传输</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center">
                        <ArrowUpIcon className="h-4 w-4 mr-2 text-green-500" />
                        <span className="text-sm">上传</span>
                      </div>
                      <span className="text-sm font-medium">{systemStatus.network.up} MB/s</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center">
                        <ArrowDownIcon className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="text-sm">下载</span>
                      </div>
                      <span className="text-sm font-medium">{systemStatus.network.down} MB/s</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={refreshData}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      刷新监控数据
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-md flex items-center">
                <FileText className="mr-2 h-4 w-4" /> 应用日志
              </CardTitle>
              <CardDescription>
                查看和分析系统日志
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索日志消息..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <Select value={logTypeFilter} onValueChange={setLogTypeFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="日志类型" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="info">信息</SelectItem>
                      <SelectItem value="warn">警告</SelectItem>
                      <SelectItem value="error">错误</SelectItem>
                      <SelectItem value="debug">调试</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={componentFilter} onValueChange={setComponentFilter}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="组件" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部组件</SelectItem>
                      <SelectItem value="sqlite">SQLite</SelectItem>
                      <SelectItem value="duckdb">DuckDB</SelectItem>
                      <SelectItem value="vector">向量存储</SelectItem>
                      <SelectItem value="system">系统</SelectItem>
                      <SelectItem value="api">API</SelectItem>
                      <SelectItem value="auth">认证</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" size="icon" onClick={resetFilters} title="重置过滤器">
                    <Filter className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={showBookmarkedOnly} title="仅显示书签">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={downloadLogs} title="下载日志">
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Button variant="outline" size="icon" onClick={refreshData} title="刷新日志">
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="border rounded-md">
                  <div className="grid grid-cols-12 bg-muted py-2 px-4 text-xs font-medium border-b">
                    <div className="col-span-2">时间</div>
                    <div className="col-span-1">级别</div>
                    <div className="col-span-2">组件</div>
                    <div className="col-span-7">消息</div>
                  </div>
                  
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mr-2" />
                      <span>加载日志...</span>
                    </div>
                  ) : filteredLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mb-2" />
                      <span>没有找到匹配的日志</span>
                    </div>
                  ) : (
                    <ScrollArea className="h-[400px]">
                      {filteredLogs.map((log) => (
                        <div 
                          key={log.id}
                          className={`grid grid-cols-12 py-2 px-4 border-b text-sm hover:bg-muted/50 cursor-pointer ${selectedLog?.id === log.id ? 'bg-muted' : ''}`}
                          onClick={() => setSelectedLog(log.id === selectedLog?.id ? null : log)}
                        >
                          <div className="col-span-2 text-muted-foreground">
                            {format(log.timestamp, "yyyy-MM-dd HH:mm:ss")}
                          </div>
                          <div className="col-span-1">
                            <LogLevelBadge type={log.type} />
                          </div>
                          <div className="col-span-2 font-mono text-xs">{log.component}</div>
                          <div className="col-span-6 truncate">{log.message}</div>
                          <div className="col-span-1 flex justify-end">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-5 w-5" 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBookmark(log.id);
                              }}
                            >
                              <Bookmark 
                                className={`h-4 w-4 ${bookmarkedLogs.includes(log.id) ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`} 
                              />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  )}
                </div>
                
                {selectedLog && (
                  <Card>
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm">日志详情</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">ID:</span> {selectedLog.id}
                          </div>
                          <div>
                            <span className="text-muted-foreground">时间:</span> {format(selectedLog.timestamp, "yyyy-MM-dd HH:mm:ss")}
                          </div>
                          <div>
                            <span className="text-muted-foreground">级别:</span> <LogLevelBadge type={selectedLog.type} />
                          </div>
                          <div>
                            <span className="text-muted-foreground">组件:</span> {selectedLog.component}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">消息:</span> {selectedLog.message}
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">详情:</span>
                          <pre className="mt-1 p-2 bg-muted rounded-md text-xs whitespace-pre-wrap">{selectedLog.details}</pre>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LogLevelBadge({ type }: { type: string }) {
  switch (type) {
    case 'info':
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/20">信息</Badge>;
    case 'warn':
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">警告</Badge>;
    case 'error':
      return <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">错误</Badge>;
    case 'debug':
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">调试</Badge>;
    default:
      return <Badge variant="outline">{type}</Badge>;
  }
} 