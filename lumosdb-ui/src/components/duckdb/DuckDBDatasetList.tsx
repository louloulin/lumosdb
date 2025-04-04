import React, { useEffect, useState } from 'react';
import { useLoadingApi } from '@/hooks/useLoadingApi';
import { 
  getDuckDBDatasets, 
  deleteDuckDBDataset,
  DuckDBDataset
} from '@/lib/api/duckdb-service';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { formatDistance } from 'date-fns';
import { 
  MoreHorizontal, 
  Trash, 
  FileSearch, 
  FileDown, 
  Pencil, 
  Database 
} from 'lucide-react';
import Link from 'next/link';
import { formatFileSize } from '@/lib/utils/format';

export default function DuckDBDatasetList() {
  const [datasets, setDatasets] = useState<DuckDBDataset[]>([]);
  
  const { 
    execute: fetchDatasets, 
    loading: isLoading, 
    error: loadError 
  } = useLoadingApi(async () => {
    const result = await getDuckDBDatasets();
    setDatasets(result);
    return result;
  });

  const { 
    execute: removeDataset, 
    loading: isDeleting
  } = useLoadingApi(async (datasetId: string) => {
    const success = await deleteDuckDBDataset(datasetId);
    if (success) {
      setDatasets(prev => prev.filter(d => d.id !== datasetId));
      toast({
        title: '删除成功',
        description: '数据集已成功删除'
      });
    }
    return success;
  });

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleDelete = async (dataset: DuckDBDataset) => {
    if (window.confirm(`确定要删除数据集 "${dataset.name}" 吗？此操作不可撤销。`)) {
      try {
        await removeDataset(dataset.id);
      } catch {
        toast({
          title: '删除失败',
          description: '无法删除数据集，请稍后重试',
          variant: 'destructive'
        });
      }
    }
  };

  if (loadError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>加载失败</CardTitle>
          <CardDescription>获取数据集列表时出错</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">{loadError.message}</p>
          <Button 
            variant="outline" 
            onClick={() => fetchDatasets()}
            className="mt-4"
          >
            重试
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>DuckDB 数据集</CardTitle>
          <CardDescription>管理您的本地和导入的数据集</CardDescription>
        </div>
        <Button asChild>
          <Link href="/analytics/datasets/new">
            <Database className="mr-2 h-4 w-4" />
            新建数据集
          </Link>
        </Button>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : datasets.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">没有找到数据集</p>
            <Button asChild>
              <Link href="/analytics/datasets/new">
                创建第一个数据集
              </Link>
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>数据集名称</TableHead>
                <TableHead>来源</TableHead>
                <TableHead className="text-right">大小</TableHead>
                <TableHead className="text-right">行数</TableHead>
                <TableHead>最后更新</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody>
              {datasets.map((dataset) => (
                <TableRow key={dataset.id}>
                  <TableCell className="font-medium">
                    <Link 
                      href={`/analytics/datasets/${dataset.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {dataset.name}
                    </Link>
                    {dataset.description && (
                      <p className="text-xs text-muted-foreground">{dataset.description}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{dataset.source}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatFileSize(dataset.sizeBytes)}
                  </TableCell>
                  <TableCell className="text-right">
                    {dataset.rowCount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {dataset.updatedAt ? (
                      <span title={new Date(dataset.updatedAt).toLocaleString()}>
                        {formatDistance(new Date(dataset.updatedAt), new Date(), { addSuffix: true })}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">打开菜单</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/analytics/datasets/${dataset.id}`}>
                            <FileSearch className="mr-2 h-4 w-4" />
                            查看详情
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/analytics/datasets/${dataset.id}/query`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            查询数据
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/analytics/datasets/${dataset.id}/export`}>
                            <FileDown className="mr-2 h-4 w-4" />
                            导出数据
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(dataset)}
                          disabled={isDeleting}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          删除数据集
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 