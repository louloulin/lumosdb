"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Loader, LayoutDashboard, Plus, Edit, Share2, Download, Trash2, BarChart4, LineChart as LineChartIcon, PieChart as PieChartIcon, GanttChart, RefreshCcw, Save, Copy, MoveRight } from "lucide-react"

// 模拟数据
const generateData = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months.map(month => ({
    name: month,
    queries: Math.floor(Math.random() * 1000) + 200,
    users: Math.floor(Math.random() * 100) + 20,
    storage: Math.floor(Math.random() * 50) + 10
  }));
};

const pieData = [
  { name: 'SQLite 查询', value: 540, color: '#8884d8' },
  { name: 'DuckDB 分析', value: 320, color: '#82ca9d' },
  { name: '向量搜索', value: 180, color: '#ffc658' },
  { name: '数据导入', value: 120, color: '#ff8042' },
  { name: '数据导出', value: 80, color: '#0088fe' }
];

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe'];

// 模拟仪表盘预设
const dashboardPresets = [
  {
    id: 1,
    name: '系统概览',
    description: '显示系统性能和查询统计',
    isDefault: true,
    widgets: [
      { id: 1, type: 'line', title: '查询统计', dataKey: 'queries', span: 'col-span-2' },
      { id: 2, type: 'bar', title: '活跃用户', dataKey: 'users', span: 'col-span-1' },
      { id: 3, type: 'pie', title: '查询类型分布', dataKey: 'type', span: 'col-span-1' }
    ]
  },
  {
    id: 2,
    name: '存储分析',
    description: '数据库存储使用情况',
    isDefault: false,
    widgets: [
      { id: 4, type: 'area', title: '存储使用趋势', dataKey: 'storage', span: 'col-span-2' },
      { id: 5, type: 'bar', title: '表大小分布', dataKey: 'tableSize', span: 'col-span-2' }
    ]
  }
];

const widgetTypes = [
  { id: 'line', name: '折线图', icon: <LineChartIcon className="h-4 w-4" /> },
  { id: 'bar', name: '柱状图', icon: <BarChart4 className="h-4 w-4" /> },
  { id: 'area', name: '面积图', icon: <GanttChart className="h-4 w-4" /> },
  { id: 'pie', name: '饼图', icon: <PieChartIcon className="h-4 w-4" /> }
];

interface WidgetProps {
  type: string;
  title: string;
  dataKey?: string;
  span?: string;
}

// 图表组件
const ChartWidget = ({ type, title, dataKey = 'queries' }: WidgetProps) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    // 模拟数据加载
    setTimeout(() => {
      setData(generateData());
      setIsLoading(false);
    }, 600);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-64">
      {type === 'line' && (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={dataKey} stroke="#8884d8" activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
      
      {type === 'bar' && (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey={dataKey} fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      )}
      
      {type === 'area' && (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey={dataKey} stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      )}
      
      {type === 'pie' && (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              label={({ name, percent }: { name: string, percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default function AnalyticsDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("1");
  const [dashboards, setDashboards] = useState(dashboardPresets);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDashboard, setCurrentDashboard] = useState(dashboardPresets[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState("");
  const [newDashboardDesc, setNewDashboardDesc] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newWidgetType, setNewWidgetType] = useState("line");
  const [newWidgetTitle, setNewWidgetTitle] = useState("");
  const [newWidgetDataKey, setNewWidgetDataKey] = useState("queries");
  const [newWidgetSpan, setNewWidgetSpan] = useState("col-span-1");
  
  const selectDashboard = (id: string) => {
    setActiveTab(id);
    const dashboard = dashboards.find(d => d.id.toString() === id);
    if (dashboard) {
      setCurrentDashboard(dashboard);
      setIsEditing(false);
    }
  };
  
  const createDashboard = () => {
    if (!newDashboardName.trim()) return;
    
    const newDashboard = {
      id: dashboards.length + 1,
      name: newDashboardName,
      description: newDashboardDesc || `Created on ${new Date().toLocaleDateString()}`,
      isDefault: false,
      widgets: []
    };
    
    setDashboards([...dashboards, newDashboard]);
    setActiveTab(newDashboard.id.toString());
    setCurrentDashboard(newDashboard);
    setIsCreating(false);
    setNewDashboardName("");
    setNewDashboardDesc("");
  };
  
  const addWidget = () => {
    if (!newWidgetTitle.trim()) return;
    
    const newWidget = {
      id: currentDashboard.widgets.length + 1,
      type: newWidgetType,
      title: newWidgetTitle,
      dataKey: newWidgetDataKey,
      span: newWidgetSpan
    };
    
    const updatedDashboard = {
      ...currentDashboard,
      widgets: [...currentDashboard.widgets, newWidget]
    };
    
    setDashboards(dashboards.map(d => d.id === currentDashboard.id ? updatedDashboard : d));
    setCurrentDashboard(updatedDashboard);
    setIsAdding(false);
    setNewWidgetTitle("");
    setNewWidgetType("line");
    setNewWidgetDataKey("queries");
    setNewWidgetSpan("col-span-1");
  };
  
  const deleteDashboard = (id: number) => {
    if (dashboards.length <= 1) return;
    
    const updatedDashboards = dashboards.filter(d => d.id !== id);
    setDashboards(updatedDashboards);
    
    // 切换到第一个仪表盘
    setActiveTab(updatedDashboards[0].id.toString());
    setCurrentDashboard(updatedDashboards[0]);
  };
  
  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">高级分析仪表盘</h1>
        <p className="text-muted-foreground mt-2">
          创建自定义仪表盘，可视化您的数据
        </p>
      </div>
      
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={selectDashboard} className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                {dashboards.map((dashboard) => (
                  <TabsTrigger key={dashboard.id} value={dashboard.id.toString()}>
                    {dashboard.name}
                    {dashboard.isDefault && <span className="ml-2 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">默认</span>}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      取消
                    </Button>
                    <Button size="sm" variant="default">
                      <Save className="mr-2 h-4 w-4" /> 保存布局
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
                      <Plus className="mr-2 h-4 w-4" /> 新建仪表盘
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="mr-2 h-4 w-4" /> 编辑布局
                    </Button>
                    <Button size="sm" variant="outline">
                      <Share2 className="mr-2 h-4 w-4" /> 分享
                    </Button>
                    <Button size="sm" variant="outline">
                      <Download className="mr-2 h-4 w-4" /> 导出
                    </Button>
                  </>
                )}
              </div>
            </div>
            
            {dashboards.map((dashboard) => (
              <TabsContent key={dashboard.id} value={dashboard.id.toString()} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">{dashboard.name}</h2>
                    <p className="text-muted-foreground text-sm">{dashboard.description}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                      <RefreshCcw className="mr-2 h-4 w-4" /> 刷新数据
                    </Button>
                    
                    {!dashboard.isDefault && (
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => deleteDashboard(dashboard.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 删除仪表盘
                      </Button>
                    )}
                  </div>
                </div>
                
                {dashboard.widgets.length === 0 ? (
                  <div className="border border-dashed rounded-lg p-12 text-center">
                    <LayoutDashboard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">仪表盘为空</h3>
                    <p className="text-muted-foreground mt-2 mb-4">此仪表盘暂无图表小部件</p>
                    <Button onClick={() => setIsAdding(true)}>
                      <Plus className="mr-2 h-4 w-4" /> 添加第一个小部件
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {dashboard.widgets.map((widget) => (
                      <Card key={widget.id} className={widget.span || "col-span-1"}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-md">{widget.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ChartWidget
                            type={widget.type}
                            title={widget.title}
                            dataKey={widget.dataKey}
                          />
                        </CardContent>
                      </Card>
                    ))}
                    
                    {isEditing && (
                      <div 
                        className="border border-dashed rounded-lg flex flex-col items-center justify-center p-6 col-span-1 cursor-pointer hover:bg-accent/5"
                        onClick={() => setIsAdding(true)}
                      >
                        <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">添加图表</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>
      
      {/* 创建仪表盘对话框 */}
      {isCreating && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">创建新仪表盘</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dashboard-name">仪表盘名称</Label>
                  <Input
                    id="dashboard-name"
                    value={newDashboardName}
                    onChange={(e) => setNewDashboardName(e.target.value)}
                    placeholder="输入仪表盘名称"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dashboard-desc">描述（可选）</Label>
                  <Input
                    id="dashboard-desc"
                    value={newDashboardDesc}
                    onChange={(e) => setNewDashboardDesc(e.target.value)}
                    placeholder="输入描述"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                取消
              </Button>
              <Button onClick={createDashboard} disabled={!newDashboardName.trim()}>
                创建仪表盘
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* 添加图表对话框 */}
      {isAdding && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border rounded-lg shadow-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">添加图表</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="widget-title">图表标题</Label>
                  <Input
                    id="widget-title"
                    value={newWidgetTitle}
                    onChange={(e) => setNewWidgetTitle(e.target.value)}
                    placeholder="输入图表标题"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>图表类型</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {widgetTypes.map((type) => (
                      <div
                        key={type.id}
                        className={`border rounded-md p-2 flex flex-col items-center justify-center cursor-pointer ${
                          newWidgetType === type.id ? "bg-primary/10 border-primary" : ""
                        }`}
                        onClick={() => setNewWidgetType(type.id)}
                      >
                        {type.icon}
                        <span className="text-xs mt-1">{type.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="data-key">数据系列</Label>
                  <Select value={newWidgetDataKey} onValueChange={setNewWidgetDataKey}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="queries">查询数</SelectItem>
                      <SelectItem value="users">用户数</SelectItem>
                      <SelectItem value="storage">存储用量</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="widget-span">宽度</Label>
                  <Select value={newWidgetSpan} onValueChange={setNewWidgetSpan}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="col-span-1">1/3</SelectItem>
                      <SelectItem value="col-span-2">2/3</SelectItem>
                      <SelectItem value="col-span-3">全宽</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => setIsAdding(false)}>
                取消
              </Button>
              <Button onClick={addWidget} disabled={!newWidgetTitle.trim()}>
                添加图表
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 