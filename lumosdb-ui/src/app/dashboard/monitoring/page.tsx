"use client"

import { useState, useEffect } from "react"
import { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ResponsiveContainer } from "@/components/ui/responsive-container"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Cpu, Database, HardDrive, AlertCircle, Activity, MemoryStick, Clock } from "lucide-react"

export const metadata: Metadata = {
  title: "System Monitoring | LumosDB",
  description: "System monitoring and logs for LumosDB",
}

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

interface SystemMetric {
  name: string
  value: string | number
  unit?: string
  status: "healthy" | "warning" | "critical"
  icon: React.ReactNode
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
  
  // Mock data for system metrics
  const systemMetrics: SystemMetric[] = [
    { 
      name: "CPU Usage", 
      value: 32, 
      unit: "%", 
      status: "healthy",
      icon: <Cpu className="h-4 w-4" />
    },
    { 
      name: "Memory Usage", 
      value: 2.1, 
      unit: "GB", 
      status: "healthy",
      icon: <MemoryStick className="h-4 w-4" />
    },
    { 
      name: "Disk Space", 
      value: 45, 
      unit: "%", 
      status: "healthy",
      icon: <HardDrive className="h-4 w-4" />
    },
    { 
      name: "Database Size", 
      value: 256, 
      unit: "MB", 
      status: "healthy",
      icon: <Database className="h-4 w-4" />
    },
    { 
      name: "Active Connections", 
      value: 24, 
      status: "healthy",
      icon: <Activity className="h-4 w-4" />
    },
    { 
      name: "Uptime", 
      value: "4d 12h 37m", 
      status: "healthy",
      icon: <Clock className="h-4 w-4" />
    },
  ]

  // Mock data for logs
  const logsData: LogEntry[] = [
    {
      timestamp: "2023-06-15 14:32:01",
      level: "info",
      message: "SQL query executed successfully",
      source: "SQL Engine"
    },
    {
      timestamp: "2023-06-15 14:30:45",
      level: "info",
      message: "New connection established from 192.168.1.24",
      source: "Network"
    },
    {
      timestamp: "2023-06-15 14:28:17",
      level: "warning",
      message: "Slow query detected (execution time: 1.5s)",
      source: "SQL Engine"
    },
    {
      timestamp: "2023-06-15 14:25:03",
      level: "error",
      message: "Failed to connect to vector database",
      source: "Vector Engine"
    },
    {
      timestamp: "2023-06-15 14:24:30",
      level: "info",
      message: "Backup completed successfully",
      source: "Backup System"
    },
    {
      timestamp: "2023-06-15 14:22:12",
      level: "info",
      message: "System startup completed",
      source: "System"
    },
    {
      timestamp: "2023-06-15 14:21:58",
      level: "info",
      message: "Database initialized",
      source: "Database"
    },
    {
      timestamp: "2023-06-15 14:21:45",
      level: "info",
      message: "Configuration loaded",
      source: "Config"
    }
  ]

  const getStatusColor = (status: SystemMetric["status"]) => {
    switch (status) {
      case "healthy":
        return "bg-green-500"
      case "warning":
        return "bg-yellow-500"
      case "critical":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getLogLevelBadge = (level: LogEntry["type"]) => {
    switch (level) {
      case "info":
        return <Badge className="bg-blue-500">Info</Badge>
      case "warn":
        return <Badge className="bg-yellow-500">Warning</Badge>
      case "error":
        return <Badge className="bg-red-500">Error</Badge>
      case "debug":
        return <Badge className="bg-green-500">Debug</Badge>
      default:
        return <Badge>Unknown</Badge>
    }
  }

  return (
    <ResponsiveContainer className="space-y-4 p-4 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">System Monitoring</h2>
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>System Status</AlertTitle>
        <AlertDescription>
          System is operating normally. Last checked: June 15, 2023 14:45:00.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">System Metrics</TabsTrigger>
          <TabsTrigger value="logs">System Logs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {systemMetrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <div 
                      className={`h-2 w-2 rounded-full ${getStatusColor(metric.status)}`} 
                      title={`Status: ${metric.status}`}
                    />
                    {metric.icon}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metric.value}{metric.unit || ""}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metric.status === "healthy" ? "Normal range" : 
                     metric.status === "warning" ? "Above normal" : "Critical level"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Logs</CardTitle>
              <CardDescription>
                Recent system activities and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logsData.map((log, index) => (
                  <div key={index} className="flex flex-col space-y-1 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getLogLevelBadge(log.type)}
                        <span className="font-medium">{log.component}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {format(log.timestamp, "yyyy-MM-dd HH:mm:ss")}
                      </span>
                    </div>
                    <p className="text-sm">{log.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Query Performance</CardTitle>
              <CardDescription>
                Top 5 slowest queries in the last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({length: 5}).map((_, index) => (
                  <div key={index} className="rounded-md border p-3">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-sm">
                        {["SELECT", "INSERT", "UPDATE", "JOIN", "ANALYZE"][index]} query
                      </span>
                      <Badge variant="outline">{(Math.random() * 2 + 0.5).toFixed(2)}s</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono overflow-x-auto whitespace-nowrap">
                      {[
                        "SELECT * FROM users WHERE last_login > DATE_SUB(NOW(), INTERVAL 7 DAY)",
                        "INSERT INTO logs (timestamp, user_id, action) VALUES (NOW(), 42, 'login')",
                        "UPDATE products SET stock = stock - 1 WHERE id = 123",
                        "SELECT o.id, c.name FROM orders o JOIN customers c ON o.customer_id = c.id",
                        "ANALYZE TABLE large_dataset"
                      ][index]}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ResponsiveContainer>
  )
} 