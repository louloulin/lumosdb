"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/page-header"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell,
} from "recharts"
import { 
  BarChart4,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  AreaChart as AreaChartIcon,
  Plus,
  Settings2,
  Save,
  Share2,
  Download,
  PanelLeft,
  Layout,
  Trash2,
  Copy,
  AlertCircle,
  ExternalLink,
  Loader2
} from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ApiConfig } from "@/lib/api-config"
// 导入仪表盘服务
import {
  getDashboards,
  getDashboard,
  createDashboard as createDashboardApi,
  updateDashboard as updateDashboardApi,
  deleteDashboard as deleteDashboardApi,
  addWidget as addWidgetApi,
  deleteWidget as deleteWidgetApi,
  shareDashboard as shareDashboardApi,
  Dashboard,
  DashboardWidget,
  WidgetType
} from "@/lib/api/dashboard-service"

// 示例数据
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

// 获取图表图标
function getChartIcon(type: WidgetType) {
  switch(type) {
    case 'bar':
      return <BarChart4 className="h-4 w-4 text-muted-foreground" />;
    case 'line':
      return <LineChartIcon className="h-4 w-4 text-muted-foreground" />;
    case 'pie':
      return <PieChartIcon className="h-4 w-4 text-muted-foreground" />;
    case 'area':
      return <AreaChartIcon className="h-4 w-4 text-muted-foreground" />;
    case 'stat':
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    case 'table':
      return <Layout className="h-4 w-4 text-muted-foreground" />;
  }
}

// 生成图表示例数据
function generateSampleData(type: WidgetType, count = 7) {
  const data = [];
  
  // 生成日期范围
  const endDate = new Date();
  const days = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(endDate.getDate() - i);
    days.push(date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }));
  }
  
  // 生成数据点
  for (let i = 0; i < count; i++) {
    const record: any = { date: days[i] };
    
    if (type === 'pie') {
      return [
        { name: '商品A', value: Math.floor(Math.random() * 1000) + 500 },
        { name: '商品B', value: Math.floor(Math.random() * 800) + 300 },
        { name: '商品C', value: Math.floor(Math.random() * 600) + 200 },
        { name: '商品D', value: Math.floor(Math.random() * 400) + 100 }
      ];
    } else if (type === 'stat') {
      return Math.floor(Math.random() * 10000) + 5000;
    } else {
      record['商品A'] = Math.floor(Math.random() * 1000) + 500;
      record['商品B'] = Math.floor(Math.random() * 800) + 300;
      record['商品C'] = Math.floor(Math.random() * 600) + 200;
      record['商品D'] = Math.floor(Math.random() * 400) + 100;
      data.push(record);
    }
  }
  
  return data;
}

export default function AnalyticsDashboardPage() {
  // 状态
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedDashboard, setSelectedDashboard] = useState<Dashboard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboards");
  const [newWidgetType, setNewWidgetType] = useState<WidgetType>('bar');
  const [isCreatingWidget, setIsCreatingWidget] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('');
  const [widgetTitle, setWidgetTitle] = useState('');
  
  // 加载仪表盘
  useEffect(() => {
    const fetchDashboards = async () => {
      setIsLoading(true);
      try {
        // 使用API服务获取仪表盘
        const dashboardList = await getDashboards();
        setDashboards(dashboardList);
        if (dashboardList.length > 0) {
          setSelectedDashboard(dashboardList[0]);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading dashboards:', error);
        toast.error('加载仪表盘失败');
        setIsLoading(false);
        // 如果API失败，加载示例数据
        const sampleDashboards = generateSampleDashboards();
        setDashboards(sampleDashboards);
        if (sampleDashboards.length > 0) {
          setSelectedDashboard(sampleDashboards[0]);
        }
      }
    };
    
    fetchDashboards();
  }, []);
  
  // 创建新仪表盘
  const createDashboard = async () => {
    setIsLoading(true);
    try {
      const newDashboard = {
        name: '新建仪表盘',
        description: '描述你的仪表盘',
        widgets: [],
        isPublic: false
      };
      
      // 调用API创建仪表盘
      const createdDashboard = await createDashboardApi(newDashboard);
      
      setDashboards([...dashboards, createdDashboard]);
      setSelectedDashboard(createdDashboard);
      setIsEditing(true);
      toast.success('已创建新仪表盘');
    } catch (error) {
      console.error('Error creating dashboard:', error);
      toast.error('创建仪表盘失败');
      
      // 如果API失败，使用本地模拟
      const newDashboard: Dashboard = {
        id: `dashboard-${Date.now()}`,
        name: '新建仪表盘',
        description: '描述你的仪表盘',
        widgets: [],
        isPublic: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      setDashboards([...dashboards, newDashboard]);
      setSelectedDashboard(newDashboard);
      setIsEditing(true);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 选择仪表盘
  const selectDashboard = async (dashboard: Dashboard) => {
    setIsLoading(true);
    try {
      // 获取最新的仪表盘数据
      const refreshedDashboard = await getDashboard(dashboard.id);
      setSelectedDashboard(refreshedDashboard);
      setIsEditing(false);
    } catch (error) {
      console.error('Error getting dashboard:', error);
      toast.error('获取仪表盘详情失败');
      setSelectedDashboard(dashboard);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 创建小部件
  const createWidget = async () => {
    if (!selectedDashboard) return;
    if (!widgetTitle.trim() || !sqlQuery.trim()) {
      toast.error('请填写标题和查询语句');
      return;
    }
    
    setIsLoading(true);
    try {
      const newWidget = {
        type: newWidgetType,
        title: widgetTitle,
        query: sqlQuery,
        width: 1,
        height: 1,
        options: {
          showLegend: true
        }
      };
      
      // 调用API添加小部件
      const updatedDashboard = await addWidgetApi(selectedDashboard.id, newWidget);
      
      setSelectedDashboard(updatedDashboard);
      setDashboards(dashboards.map(d => d.id === updatedDashboard.id ? updatedDashboard : d));
      setIsCreatingWidget(false);
      setWidgetTitle('');
      setSqlQuery('');
      toast.success('已添加小部件');
    } catch (error) {
      console.error('Error adding widget:', error);
      toast.error('添加小部件失败');
      
      // 如果API失败，使用本地模拟
      const newWidget: DashboardWidget = {
        id: `widget-${Date.now()}`,
        type: newWidgetType,
        title: widgetTitle,
        query: sqlQuery,
        width: 1,
        height: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        options: {
          showLegend: true
        }
      };
      
      const updatedDashboard = {
        ...selectedDashboard,
        widgets: [...selectedDashboard.widgets, newWidget],
        updatedAt: Date.now()
      };
      
      setSelectedDashboard(updatedDashboard);
      setDashboards(dashboards.map(d => d.id === updatedDashboard.id ? updatedDashboard : d));
      setIsCreatingWidget(false);
      setWidgetTitle('');
      setSqlQuery('');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 删除小部件
  const deleteWidget = async (widgetId: string) => {
    if (!selectedDashboard) return;
    
    setIsLoading(true);
    try {
      // 调用API删除小部件
      const updatedDashboard = await deleteWidgetApi(selectedDashboard.id, widgetId);
      
      setSelectedDashboard(updatedDashboard);
      setDashboards(dashboards.map(d => d.id === updatedDashboard.id ? updatedDashboard : d));
      toast.success('已删除小部件');
    } catch (error) {
      console.error('Error deleting widget:', error);
      toast.error('删除小部件失败');
      
      // 如果API失败，使用本地模拟
      const updatedWidgets = selectedDashboard.widgets.filter(w => w.id !== widgetId);
      const updatedDashboard = {
        ...selectedDashboard,
        widgets: updatedWidgets,
        updatedAt: Date.now()
      };
      
      setSelectedDashboard(updatedDashboard);
      setDashboards(dashboards.map(d => d.id === updatedDashboard.id ? updatedDashboard : d));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 保存仪表盘
  const saveDashboard = async () => {
    if (!selectedDashboard) return;
    
    setIsLoading(true);
    try {
      // 调用API更新仪表盘
      const updatedDashboard = await updateDashboardApi(selectedDashboard.id, {
        name: selectedDashboard.name,
        description: selectedDashboard.description,
        isPublic: selectedDashboard.isPublic
      });
      
      setSelectedDashboard(updatedDashboard);
      setDashboards(dashboards.map(d => d.id === updatedDashboard.id ? updatedDashboard : d));
      setIsEditing(false);
      toast.success('仪表盘已保存');
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast.error('保存仪表盘失败');
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 删除仪表盘
  const deleteDashboard = async (dashboardId: string) => {
    setIsLoading(true);
    try {
      // 调用API删除仪表盘
      await deleteDashboardApi(dashboardId);
      
      const updatedDashboards = dashboards.filter(d => d.id !== dashboardId);
      setDashboards(updatedDashboards);
      
      if (selectedDashboard && selectedDashboard.id === dashboardId) {
        setSelectedDashboard(updatedDashboards.length > 0 ? updatedDashboards[0] : null);
      }
      
      toast.success('仪表盘已删除');
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      toast.error('删除仪表盘失败');
      
      // 如果API失败，使用本地模拟
      const updatedDashboards = dashboards.filter(d => d.id !== dashboardId);
      setDashboards(updatedDashboards);
      
      if (selectedDashboard && selectedDashboard.id === dashboardId) {
        setSelectedDashboard(updatedDashboards.length > 0 ? updatedDashboards[0] : null);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // 共享仪表盘
  const shareDashboard = async () => {
    if (!selectedDashboard) return;
    
    setIsLoading(true);
    try {
      // 调用API共享仪表盘
      const shareOptions = {
        isPublic: true,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天后过期
      };
      
      const shareResult = await shareDashboardApi(selectedDashboard.id, shareOptions);
      
      // 复制链接到剪贴板
      navigator.clipboard.writeText(shareResult.url)
        .then(() => {
          toast.success('分享链接已复制到剪贴板');
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          toast.error('复制链接失败');
        });
    } catch (error) {
      console.error('Error sharing dashboard:', error);
      toast.error('共享仪表盘失败');
      
      // 如果API失败，使用本地模拟
      const shareUrl = `${window.location.origin}/shared/dashboard/${selectedDashboard.id}`;
      
      // 复制到剪贴板
      navigator.clipboard.writeText(shareUrl)
        .then(() => {
          toast.success('分享链接已复制到剪贴板');
        })
        .catch(err => {
          console.error('Failed to copy:', err);
          toast.error('复制链接失败');
        });
    } finally {
      setIsLoading(false);
    }
  };
  
  // 自定义图表
  const renderChart = (widget: DashboardWidget) => {
    const data = generateSampleData(widget.type);
    
    switch(widget.type) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              {widget.options?.showLegend && <Legend />}
              <Bar dataKey="商品A" fill="#0088FE" />
              <Bar dataKey="商品B" fill="#00C49F" />
              <Bar dataKey="商品C" fill="#FFBB28" />
              <Bar dataKey="商品D" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              {widget.options?.showLegend && <Legend />}
              <Line type="monotone" dataKey="商品A" stroke="#0088FE" />
              <Line type="monotone" dataKey="商品B" stroke="#00C49F" />
              <Line type="monotone" dataKey="商品C" stroke="#FFBB28" />
              <Line type="monotone" dataKey="商品D" stroke="#FF8042" />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              {widget.options?.showLegend && <Legend />}
              <Area type="monotone" dataKey="商品A" stackId="1" fill="#0088FE" stroke="#0088FE" />
              <Area type="monotone" dataKey="商品B" stackId="1" fill="#00C49F" stroke="#00C49F" />
              <Area type="monotone" dataKey="商品C" stackId="1" fill="#FFBB28" stroke="#FFBB28" />
              <Area type="monotone" dataKey="商品D" stackId="1" fill="#FF8042" stroke="#FF8042" />
            </AreaChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {widget.options?.showLegend && <Legend />}
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'stat':
        // 简单的数字统计
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl font-bold">¥ 128,459</div>
              <div className="text-sm text-muted-foreground mt-2">较上月 +12.5%</div>
            </div>
          </div>
        );
        
      case 'table':
        // 简单的表格
        return (
          <div className="overflow-auto h-full">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">产品</th>
                  <th className="text-right p-2">数量</th>
                  <th className="text-right p-2">金额</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2">商品A</td>
                  <td className="text-right p-2">235</td>
                  <td className="text-right p-2">¥4,570</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">商品B</td>
                  <td className="text-right p-2">128</td>
                  <td className="text-right p-2">¥3,420</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">商品C</td>
                  <td className="text-right p-2">376</td>
                  <td className="text-right p-2">¥8,291</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2">商品D</td>
                  <td className="text-right p-2">97</td>
                  <td className="text-right p-2">¥2,154</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      
      default:
        return <div>不支持的图表类型</div>;
    }
  };
  
  // 生成示例仪表盘
  function generateSampleDashboards(): Dashboard[] {
    return [
      {
        id: '1',
        name: '示例仪表盘',
        description: '这是一个示例仪表盘，展示了不同类型的图表',
        isPublic: true,
        createdAt: Date.now() - 3600000 * 24 * 7,
        updatedAt: Date.now() - 3600000 * 24,
        widgets: [
          {
            id: '1-1',
            type: 'bar',
            title: '示例柱状图',
            query: 'SELECT date, product, SUM(quantity) FROM sales GROUP BY date, product ORDER BY date',
            width: 2,
            height: 1,
            options: {
              xAxis: 'date',
              yAxis: 'quantity',
              showLegend: true,
              stacked: true
            },
            createdAt: Date.now() - 3600000 * 24 * 7,
            updatedAt: Date.now() - 3600000 * 24
          },
          {
            id: '1-2',
            type: 'pie',
            title: '示例饼图',
            query: 'SELECT product, SUM(amount) as value FROM sales GROUP BY product',
            width: 1,
            height: 1,
            options: {
              showLegend: true
            },
            createdAt: Date.now() - 3600000 * 24 * 7,
            updatedAt: Date.now() - 3600000 * 24
          }
        ]
      }
    ];
  }
  
  return (
    <div className="container mx-auto p-6">
      <PageHeader 
        title="高级分析仪表盘" 
        description="创建自定义仪表盘和可视化图表"
        actions={
          <div className="flex space-x-2">
            {selectedDashboard && (
              <>
                {isEditing ? (
                  <Button onClick={saveDashboard} disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    保存仪表盘
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={shareDashboard}>
                      <Share2 className="mr-2 h-4 w-4" />
                      分享
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(true)}>
                      <Settings2 className="mr-2 h-4 w-4" />
                      编辑
                    </Button>
                  </>
                )}
              </>
            )}
            <Button onClick={createDashboard}>
              <Plus className="mr-2 h-4 w-4" />
              新建仪表盘
            </Button>
          </div>
        }
      />
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboards">我的仪表盘</TabsTrigger>
          <TabsTrigger value="shared">共享仪表盘</TabsTrigger>
        </TabsList>
        
        <TabsContent value="dashboards" className="space-y-6">
          {/* 仪表盘列表 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboards.map(dashboard => (
              <Card 
                key={dashboard.id} 
                className={`cursor-pointer hover:border-primary/50 transition-colors ${selectedDashboard?.id === dashboard.id ? 'border-primary' : ''}`}
                onClick={() => selectDashboard(dashboard)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{dashboard.name}</CardTitle>
                    {dashboard.isPublic && <Badge variant="outline">已共享</Badge>}
                  </div>
                  <CardDescription>{dashboard.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    <div>小部件: {dashboard.widgets.length}</div>
                    <div>更新时间: {new Date(dashboard.updatedAt).toLocaleDateString()}</div>
                  </div>
                </CardContent>
                <CardFooter className="pt-1">
                  <div className="flex justify-between w-full">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDashboard(dashboard.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={(e) => {
                        e.stopPropagation();
                        const newDashboard = {
                          ...dashboard,
                          id: `dashboard-${Date.now()}`,
                          name: `${dashboard.name} (复制)`,
                          createdAt: Date.now(),
                          updatedAt: Date.now()
                        };
                        setDashboards([...dashboards, newDashboard]);
                        toast.success('仪表盘已复制');
                      }}
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
          
          {/* 选中的仪表盘 */}
          {selectedDashboard && (
              <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">{selectedDashboard.name}</h2>
                  <p className="text-muted-foreground">{selectedDashboard.description}</p>
                </div>
                
                {isEditing && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button onClick={() => setIsCreatingWidget(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        添加小部件
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px]">
                      <DialogHeader>
                        <DialogTitle>创建新的小部件</DialogTitle>
                        <DialogDescription>
                          定义图表类型、数据源和显示选项
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="title">标题</Label>
                          <Input
                            id="title"
                            placeholder="输入小部件标题"
                            value={widgetTitle}
                            onChange={(e) => setWidgetTitle(e.target.value)}
                          />
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="type">图表类型</Label>
                          <Select value={newWidgetType} onValueChange={(v) => setNewWidgetType(v as WidgetType)}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bar">柱状图</SelectItem>
                              <SelectItem value="line">折线图</SelectItem>
                              <SelectItem value="pie">饼图</SelectItem>
                              <SelectItem value="area">面积图</SelectItem>
                              <SelectItem value="stat">数字统计</SelectItem>
                              <SelectItem value="table">表格</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="grid gap-2">
                          <Label htmlFor="sql">SQL查询</Label>
                          <Textarea
                            id="sql"
                            placeholder="输入SQL查询语句"
                            value={sqlQuery}
                            onChange={(e) => setSqlQuery(e.target.value)}
                            className="font-mono text-sm"
                            rows={5}
                          />
                          <p className="text-sm text-muted-foreground">
                            示例: SELECT date, SUM(amount) as value FROM sales GROUP BY date
                          </p>
                        </div>
                        
                        <div className="grid gap-2">
                          <Label>图表选项</Label>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="show-legend" defaultChecked />
                            <Label htmlFor="show-legend">显示图例</Label>
                          </div>
                          
                          {(newWidgetType === 'bar' || newWidgetType === 'area') && (
                            <div className="flex items-center space-x-2">
                              <Checkbox id="stacked" />
                              <Label htmlFor="stacked">堆叠显示</Label>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreatingWidget(false)}>取消</Button>
                        <Button onClick={createWidget}>创建</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
              
              {/* 小部件网格 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedDashboard.widgets.map(widget => (
                  <Card 
                    key={widget.id} 
                    className={`${widget.width === 2 ? 'md:col-span-2' : ''} ${widget.height === 2 ? 'row-span-2' : ''}`}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center">
                          {getChartIcon(widget.type)}
                          <CardTitle className="ml-2">{widget.title}</CardTitle>
                        </div>
                        {isEditing && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => deleteWidget(widget.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                      {widget.description && (
                        <CardDescription>{widget.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      {renderChart(widget)}
                    </CardContent>
                    <CardFooter className="pt-0">
                      <div className="text-xs text-muted-foreground w-full">
                        <div className="flex justify-between">
                          <span>查询: {widget.query.length > 30 ? widget.query.substring(0, 30) + '...' : widget.query}</span>
                          <span>更新于: {new Date(widget.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
                
                {selectedDashboard.widgets.length === 0 && (
                  <Card className="md:col-span-2 p-8">
                    <div className="flex flex-col items-center justify-center text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                      <h3 className="text-lg font-medium">没有小部件</h3>
                      <p className="text-muted-foreground mb-4 max-w-md">
                        这个仪表盘还没有任何数据可视化小部件。点击"添加小部件"按钮开始创建。
                      </p>
                      {isEditing && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button>
                              <Plus className="mr-2 h-4 w-4" />
                              添加小部件
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[600px]">
                            {/* 内容与上方相同 */}
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </Card>
                )}
              </div>
            </div>
          )}
          
          {!selectedDashboard && dashboards.length === 0 && (
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center text-center">
                <BarChart4 className="h-16 w-16 text-muted-foreground opacity-20 mb-4" />
                <h3 className="text-lg font-medium">开始创建分析仪表盘</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  创建自定义仪表盘来可视化你的数据。你可以添加各种图表、表格和统计信息。
                </p>
                <Button onClick={createDashboard}>
                  <Plus className="mr-2 h-4 w-4" />
                  新建仪表盘
                </Button>
              </div>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="shared" className="space-y-6">
          <Card className="p-6">
            <div className="flex flex-col items-center justify-center text-center">
              <Share2 className="h-12 w-12 text-muted-foreground opacity-20 mb-4" />
              <h3 className="text-lg font-medium">共享仪表盘</h3>
              <p className="text-muted-foreground mb-4 max-w-md">
                你可以共享仪表盘给其他人，让他们查看你的数据分析结果。共享链接不需要登录即可访问。
              </p>
              <div className="flex gap-2">
                <Button variant="outline" asChild>
                  <a href="#" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    访问示例仪表盘
                  </a>
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 