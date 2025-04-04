'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, TrendingDown, TrendingUp, Minus, Plus, RefreshCw, Target, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { format } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertCircle } from 'lucide-react';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/use-toast';
import { getDataMetrics, deleteDataMetric, DataMetric } from '@/lib/api/analytics-service';
import { Progress } from '@/components/ui/progress';

export default function AnalyticsMetricsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<DataMetric[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedMetrics = await getDataMetrics();
      setMetrics(fetchedMetrics);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      setError('无法加载数据指标，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMetric = async (metricId: string) => {
    try {
      await deleteDataMetric(metricId);
      setMetrics(metrics.filter(metric => metric.id !== metricId));
      toast({
        title: '删除成功',
        description: '数据指标已成功删除',
      });
    } catch (err) {
      console.error('Error deleting metric:', err);
      toast({
        title: '删除失败',
        description: '无法删除数据指标，请稍后再试',
        variant: 'destructive',
      });
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const getChangePercentageDisplay = (metric: DataMetric) => {
    if (metric.trend === 'up') {
      return <span className="text-green-500">+{metric.changePercentage.toFixed(1)}%</span>;
    } else if (metric.trend === 'down') {
      return <span className="text-red-500">-{Math.abs(metric.changePercentage).toFixed(1)}%</span>;
    } else {
      return <span className="text-gray-500">{metric.changePercentage.toFixed(1)}%</span>;
    }
  };

  const getThresholdStatus = (metric: DataMetric) => {
    if (!metric.thresholds) return null;
    
    if (metric.currentValue <= metric.thresholds.critical) {
      return <Badge variant="destructive">临界值</Badge>;
    } else if (metric.currentValue <= metric.thresholds.warning) {
      return <Badge variant="warning">警告</Badge>;
    } else {
      return <Badge variant="success">正常</Badge>;
    }
  };

  const getProgressColor = (metric: DataMetric) => {
    if (!metric.thresholds) return "bg-blue-500";
    
    if (metric.currentValue <= metric.thresholds.critical) {
      return "bg-red-500";
    } else if (metric.currentValue <= metric.thresholds.warning) {
      return "bg-yellow-500";
    } else {
      return "bg-green-500";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">数据指标</h1>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <span className="ml-3">加载中...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">数据指标</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>出错了</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchMetrics} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">数据指标</h1>
        <Button onClick={() => router.push('/analytics/metrics/new')}>
          <Plus className="mr-2 h-4 w-4" />
          新建指标
        </Button>
      </div>

      {metrics.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <BarChart className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">暂无数据指标</h3>
          <p className="mt-2 text-sm text-gray-500">
            创建您的第一个数据指标，监控重要的业务数据并设置警报阈值
          </p>
          <Button onClick={() => router.push('/analytics/metrics/new')} className="mt-4">
            创建指标
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metrics.map((metric) => (
            <Card key={metric.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl">{metric.name}</CardTitle>
                    {getThresholdStatus(metric)}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <span className="sr-only">打开菜单</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-4 w-4"
                        >
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="12" cy="5" r="1" />
                          <circle cx="12" cy="19" r="1" />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>操作</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => router.push(`/analytics/metrics/${metric.id}`)}>
                        查看详情
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => router.push(`/analytics/metrics/${metric.id}/edit`)}>
                        编辑指标
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600" 
                        onClick={() => handleDeleteMetric(metric.id)}
                      >
                        删除指标
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <CardDescription className="mt-2 line-clamp-2">
                  {metric.description || '暂无描述'}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="text-3xl font-bold">
                    {metric.currentValue.toLocaleString()}
                  </div>
                  <div className="flex items-center space-x-1">
                    {getTrendIcon(metric.trend)}
                    {getChangePercentageDisplay(metric)}
                  </div>
                </div>

                {metric.targetValue && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>当前: {metric.currentValue.toLocaleString()}</span>
                      <span>目标: {metric.targetValue.toLocaleString()}</span>
                    </div>
                    <Progress 
                      value={(metric.currentValue / metric.targetValue) * 100} 
                      className="h-2"
                      indicatorClassName={getProgressColor(metric)}
                    />
                  </div>
                )}

                {metric.thresholds && (
                  <div className="mt-4 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>临界值: {metric.thresholds.critical.toLocaleString()}</span>
                      <span>警告值: {metric.thresholds.warning.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  上次更新: {formatDistanceToNow(new Date(metric.lastUpdated), { addSuffix: true })}
                </div>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/analytics/metrics/${metric.id}`)}
                >
                  查看详情
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 