"use client";

import { useState } from "react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

// 定义可视化类型
type VisualizationType = "bar" | "line" | "pie" | "table";

// 定义组件属性
interface DataVisualizerProps {
  data: Record<string, unknown>[];
  title?: string;
  description?: string;
  className?: string;
  defaultType?: VisualizationType;
  xAxis?: string;
  yAxis?: string | string[];
  height?: number;
  onRefresh?: () => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A569BD', '#5DADE2', '#48C9B0', '#F4D03F'];

export function DataVisualizer({
  data,
  title = "数据可视化",
  description = "查询结果的可视化展示",
  className,
  defaultType = "bar",
  xAxis,
  yAxis: initialYAxis,
  height = 350,
  onRefresh
}: DataVisualizerProps) {
  const [visualizationType, setVisualizationType] = useState<VisualizationType>(defaultType);
  
  // 自动检测数据中可用的字段
  const allKeys = data.length > 0 
    ? Object.keys(data[0]).filter(key => typeof data[0][key] !== 'object')
    : [];
  
  // 如果没有指定x轴，使用第一个非数字字段
  const detectedXAxis = xAxis || allKeys.find(key => 
    data.some(item => isNaN(Number(item[key])))
  ) || allKeys[0];
  
  // 如果没有指定y轴，使用所有数字字段
  const numericFields = allKeys.filter(key => 
    data.every(item => !isNaN(Number(item[key])))
  );
  
  const defaultYAxis = initialYAxis || (numericFields.length > 0 ? numericFields[0] : allKeys[0]);
  const yAxisFields = Array.isArray(defaultYAxis) ? defaultYAxis : [defaultYAxis];
  
  // 导出数据为CSV
  const exportCSV = () => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]).join(',');
    const csvData = data.map(row => 
      Object.values(row).map(value => 
        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      ).join(',')
    ).join('\n');
    
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${csvData}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const renderChart = () => {
    switch (visualizationType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={detectedXAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisFields.map((field, index) => (
                <Bar 
                  key={field} 
                  dataKey={field} 
                  fill={COLORS[index % COLORS.length]} 
                  name={field}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
        
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={detectedXAxis} />
              <YAxis />
              <Tooltip />
              <Legend />
              {yAxisFields.map((field, index) => (
                <Line 
                  key={field} 
                  type="monotone" 
                  dataKey={field} 
                  stroke={COLORS[index % COLORS.length]} 
                  name={field}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
        
      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={height / 3}
                fill="#8884d8"
                dataKey={yAxisFields[0]}
                nameKey={detectedXAxis}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
        
      case 'table':
        return (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted">
                  {allKeys.map(key => (
                    <th key={key} className="p-2 text-left font-medium text-sm border">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/30'}>
                    {allKeys.map(key => (
                      <td key={`${i}-${key}`} className="p-2 border text-sm">
                        {typeof row[key] === 'object' ? JSON.stringify(row[key]) : String(row[key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        
      default:
        return (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            选择图表类型
          </div>
        );
    }
  };
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={visualizationType}
              onValueChange={(value) => setVisualizationType(value as VisualizationType)}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="选择图表类型" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">柱状图</SelectItem>
                <SelectItem value="line">折线图</SelectItem>
                <SelectItem value="pie">饼图</SelectItem>
                <SelectItem value="table">表格</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={exportCSV}
              title="导出数据"
            >
              <Download className="h-4 w-4" />
            </Button>
            
            {onRefresh && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={onRefresh}
                title="刷新数据"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            无数据可显示
          </div>
        ) : (
          renderChart()
        )}
      </CardContent>
    </Card>
  );
} 