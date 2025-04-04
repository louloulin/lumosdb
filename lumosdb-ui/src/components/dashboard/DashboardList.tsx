import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, BarChart, Share2, Trash2, Edit } from 'lucide-react';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { useToast } from '@/components/ui/use-toast';
import { getDashboards, Dashboard, deleteDashboard } from '@/lib/api/dashboard-service';
import { getUserFriendlyErrorMessage, ApiError } from '@/lib/api/error-handler';
import { useLoadingApi } from '@/lib/hooks/use-loading-api';
import { useLoading } from '@/contexts/loading-context';

/**
 * 仪表盘列表组件
 * 显示用户的所有仪表盘，提供创建、编辑和删除功能
 */
export function DashboardList() {
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const router = useRouter();
  const { toast } = useToast();
  const { isModuleLoading } = useLoading();
  
  // 初始化API加载钩子
  const dashboardsApi = useLoadingApi(getDashboards, {
    module: 'dashboards:list',
    defaultErrorMessage: '加载仪表盘列表失败'
  });
  
  const deleteApi = useLoadingApi(deleteDashboard, {
    module: 'dashboards:delete',
    successMessage: '仪表盘已成功删除',
    showSuccessToast: true
  });

  // 加载仪表盘列表
  useEffect(() => {
    loadDashboards();
  }, []);

  // 获取仪表盘数据
  const loadDashboards = async () => {
    try {
      const data = await dashboardsApi.execute();
      setDashboards(data);
    } catch (error) {
      toast({
        title: '加载仪表盘失败',
        description: getUserFriendlyErrorMessage(error as ApiError),
        variant: 'destructive',
      });
    }
  };

  // 创建新仪表盘
  const handleCreateDashboard = () => {
    router.push('/dashboards/new');
  };

  // 查看仪表盘
  const handleViewDashboard = (id: string) => {
    router.push(`/dashboards/${id}`);
  };

  // 编辑仪表盘
  const handleEditDashboard = (id: string) => {
    router.push(`/dashboards/${id}/edit`);
  };

  // 删除仪表盘
  const handleDeleteDashboard = async (id: string) => {
    if (!confirm('确定要删除这个仪表盘吗？此操作不可恢复。')) {
      return;
    }

    try {
      await deleteApi.execute(id);
      // 重新加载仪表盘列表
      loadDashboards();
    } catch {
      // 错误已通过 useLoadingApi 处理，无需额外处理
    }
  };

  // 显示加载状态
  const loading = isModuleLoading('dashboards:list');
  if (loading && dashboards.length === 0) {
    return (
      <div className="flex justify-center items-center h-[400px]">
        <LoadingIndicator size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">我的仪表盘</h2>
        <Button onClick={handleCreateDashboard}>
          <PlusCircle className="mr-2 h-4 w-4" />
          新建仪表盘
        </Button>
      </div>

      {dashboards.length === 0 ? (
        <Card className="bg-muted/40">
          <CardContent className="pt-6 text-center">
            <div className="mx-auto my-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <BarChart className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">没有仪表盘</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              创建您的第一个仪表盘来开始数据可视化之旅。
            </p>
            <Button onClick={handleCreateDashboard} className="mt-4">
              <PlusCircle className="mr-2 h-4 w-4" />
              创建仪表盘
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dashboards.map((dashboard) => (
            <Card key={dashboard.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold truncate" title={dashboard.name}>
                  {dashboard.name}
                </CardTitle>
                {dashboard.description && (
                  <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                    {dashboard.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pb-2">
                <div className="text-sm text-muted-foreground">
                  <p>{dashboard.widgets.length} 个图表</p>
                  <p>创建于 {new Date(dashboard.createdAt).toLocaleDateString()}</p>
                  {dashboard.isPublic && <p className="text-green-600">已共享</p>}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-3">
                <Button variant="outline" size="sm" onClick={() => handleViewDashboard(dashboard.id)}>
                  查看
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditDashboard(dashboard.id)}
                    title="编辑仪表盘"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/dashboards/${dashboard.id}/share`)}
                    title="共享仪表盘"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteDashboard(dashboard.id)}
                    title="删除仪表盘"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    disabled={isModuleLoading('dashboards:delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 