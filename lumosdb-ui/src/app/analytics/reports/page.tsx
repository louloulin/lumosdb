'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Download, FileText, Plus, RefreshCw, Trash2 } from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { getAnalyticsReports, deleteAnalyticsReport, generateAnalyticsReport, getLatestReportResult, AnalyticsReport, ReportResult } from '@/lib/api/analytics-service';

export default function AnalyticsReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<AnalyticsReport[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingReportId, setGeneratingReportId] = useState<string | null>(null);
  const [reportResults, setReportResults] = useState<Record<string, ReportResult | null>>({});

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedReports = await getAnalyticsReports();
      setReports(fetchedReports);
      
      // Fetch latest results for each report
      const results: Record<string, ReportResult | null> = {};
      await Promise.all(
        fetchedReports.map(async (report) => {
          try {
            const result = await getLatestReportResult(report.id);
            results[report.id] = result;
          } catch (err) {
            console.error(`Error fetching result for report ${report.id}:`, err);
            results[report.id] = null;
          }
        })
      );
      
      setReportResults(results);
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('无法加载分析报告，请稍后再试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    try {
      await deleteAnalyticsReport(reportId);
      setReports(reports.filter(report => report.id !== reportId));
      toast({
        title: '删除成功',
        description: '分析报告已成功删除',
      });
    } catch (err) {
      console.error('Error deleting report:', err);
      toast({
        title: '删除失败',
        description: '无法删除分析报告，请稍后再试',
        variant: 'destructive',
      });
    }
  };

  const handleGenerateReport = async (reportId: string) => {
    setGeneratingReportId(reportId);
    try {
      const result = await generateAnalyticsReport(reportId);
      
      // Update the report results
      setReportResults(prev => ({
        ...prev,
        [reportId]: result,
      }));
      
      toast({
        title: '报告生成成功',
        description: '分析报告已成功生成',
      });
    } catch (err) {
      console.error('Error generating report:', err);
      toast({
        title: '生成失败',
        description: '无法生成分析报告，请稍后再试',
        variant: 'destructive',
      });
    } finally {
      setGeneratingReportId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline">草稿</Badge>;
      case 'scheduled':
        return <Badge variant="secondary">已计划</Badge>;
      case 'completed':
        return <Badge variant="success">已完成</Badge>;
      case 'failed':
        return <Badge variant="destructive">失败</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'html':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 hover:bg-blue-100">HTML</Badge>;
      case 'pdf':
        return <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-100">PDF</Badge>;
      case 'csv':
        return <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100">CSV</Badge>;
      case 'json':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100">JSON</Badge>;
      default:
        return <Badge variant="outline">{format}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6">分析报告</h1>
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
        <h1 className="text-2xl font-bold mb-6">分析报告</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>出错了</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchReports} className="mt-4">
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">分析报告</h1>
        <Button onClick={() => router.push('/analytics/reports/new')}>
          <Plus className="mr-2 h-4 w-4" />
          新建报告
        </Button>
      </div>

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          <TabsTrigger value="all">全部报告</TabsTrigger>
          <TabsTrigger value="scheduled">定时报告</TabsTrigger>
          <TabsTrigger value="draft">草稿</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {reports.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium">暂无分析报告</h3>
              <p className="mt-2 text-sm text-gray-500">
                创建您的第一个分析报告，生成数据洞察并下载或分享它们
              </p>
              <Button onClick={() => router.push('/analytics/reports/new')} className="mt-4">
                创建报告
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reports.map((report) => (
                <Card key={report.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{report.name}</CardTitle>
                        {getStatusBadge(report.status)}
                        <div className="mt-1">{getFormatBadge(report.format)}</div>
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
                          <DropdownMenuItem onClick={() => router.push(`/analytics/reports/${report.id}`)}>
                            查看详情
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/analytics/reports/${report.id}/edit`)}>
                            编辑报告
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleGenerateReport(report.id)}>
                            生成报告
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600" 
                            onClick={() => handleDeleteReport(report.id)}
                          >
                            删除报告
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardDescription className="mt-2 line-clamp-2">
                      {report.description || '暂无描述'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="text-sm text-gray-500 flex items-center mt-2">
                      <CalendarIcon className="h-4 w-4 mr-1" />
                      创建于 {format(new Date(report.createdAt), 'yyyy-MM-dd')}
                    </div>
                    {report.schedule && (
                      <div className="text-sm text-gray-500 mt-1 flex items-center">
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {report.schedule.frequency === 'daily' && '每日'}
                        {report.schedule.frequency === 'weekly' && '每周'}
                        {report.schedule.frequency === 'monthly' && '每月'}
                        {report.schedule.frequency === 'custom' && '自定义'}
                        {' 自动生成'}
                      </div>
                    )}
                    {report.lastGeneratedAt && (
                      <div className="text-sm text-gray-500 mt-1">
                        上次生成: {formatDistanceToNow(new Date(report.lastGeneratedAt), { addSuffix: true })}
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/analytics/reports/${report.id}`)}
                    >
                      查看
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      disabled={generatingReportId === report.id}
                      onClick={() => handleGenerateReport(report.id)}
                    >
                      {generatingReportId === report.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          生成中...
                        </>
                      ) : (
                        <>
                          生成报告
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.filter(report => report.status === 'scheduled').length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg col-span-full">
                <h3 className="text-lg font-medium">暂无定时报告</h3>
                <p className="mt-2 text-sm text-gray-500">
                  创建定时报告以自动获取最新数据洞察
                </p>
              </div>
            ) : (
              reports
                .filter(report => report.status === 'scheduled')
                .map((report) => (
                  <Card key={report.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{report.name}</CardTitle>
                          {getStatusBadge(report.status)}
                          <div className="mt-1">{getFormatBadge(report.format)}</div>
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
                            <DropdownMenuItem onClick={() => router.push(`/analytics/reports/${report.id}`)}>
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/analytics/reports/${report.id}/edit`)}>
                              编辑报告
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGenerateReport(report.id)}>
                              生成报告
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600" 
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              删除报告
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription className="mt-2 line-clamp-2">
                        {report.description || '暂无描述'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-gray-500 flex items-center mt-2">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        创建于 {format(new Date(report.createdAt), 'yyyy-MM-dd')}
                      </div>
                      {report.schedule && (
                        <div className="text-sm text-gray-500 mt-1 flex items-center">
                          <RefreshCw className="h-4 w-4 mr-1" />
                          {report.schedule.frequency === 'daily' && '每日'}
                          {report.schedule.frequency === 'weekly' && '每周'}
                          {report.schedule.frequency === 'monthly' && '每月'}
                          {report.schedule.frequency === 'custom' && '自定义'}
                          {' 自动生成'}
                        </div>
                      )}
                      {report.lastGeneratedAt && (
                        <div className="text-sm text-gray-500 mt-1">
                          上次生成: {formatDistanceToNow(new Date(report.lastGeneratedAt), { addSuffix: true })}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/analytics/reports/${report.id}`)}
                      >
                        查看
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        disabled={generatingReportId === report.id}
                        onClick={() => handleGenerateReport(report.id)}
                      >
                        {generatingReportId === report.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            生成中...
                          </>
                        ) : (
                          <>
                            生成报告
                          </>
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="draft">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.filter(report => report.status === 'draft').length === 0 ? (
              <div className="text-center py-12 border border-dashed rounded-lg col-span-full">
                <h3 className="text-lg font-medium">暂无草稿报告</h3>
                <p className="mt-2 text-sm text-gray-500">
                  创建草稿报告以便稍后编辑和完善
                </p>
              </div>
            ) : (
              reports
                .filter(report => report.status === 'draft')
                .map((report) => (
                  <Card key={report.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{report.name}</CardTitle>
                          {getStatusBadge(report.status)}
                          <div className="mt-1">{getFormatBadge(report.format)}</div>
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
                            <DropdownMenuItem onClick={() => router.push(`/analytics/reports/${report.id}`)}>
                              查看详情
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => router.push(`/analytics/reports/${report.id}/edit`)}>
                              编辑报告
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-red-600 focus:text-red-600" 
                              onClick={() => handleDeleteReport(report.id)}
                            >
                              删除报告
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardDescription className="mt-2 line-clamp-2">
                        {report.description || '暂无描述'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-gray-500 flex items-center mt-2">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        创建于 {format(new Date(report.createdAt), 'yyyy-MM-dd')}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/analytics/reports/${report.id}/edit`)}
                      >
                        编辑
                      </Button>
                    </CardFooter>
                  </Card>
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 