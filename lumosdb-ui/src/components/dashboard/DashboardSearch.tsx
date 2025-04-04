'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { searchDashboards, Dashboard } from '@/lib/api/dashboard-service';
import { useLoadingApi } from '@/lib/hooks/use-loading-api';
import { useToast } from '@/components/ui/use-toast';
import { getUserFriendlyErrorMessage, ApiError } from '@/lib/api/error-handler';

interface DashboardSearchProps {
  onResultsChange?: (dashboards: Dashboard[]) => void;
  placeholder?: string;
  autoSearch?: boolean;
  className?: string;
}

/**
 * 仪表盘搜索组件
 * 提供仪表盘搜索功能，可用于仪表盘列表页面
 */
export function DashboardSearch({
  onResultsChange,
  placeholder = '搜索仪表盘...',
  autoSearch = true,
  className = ''
}: DashboardSearchProps) {
  const [query, setQuery] = useState('');
  const { toast } = useToast();
  
  // 初始化搜索API
  const searchApi = useLoadingApi(searchDashboards, {
    module: 'dashboards:search',
    defaultErrorMessage: '搜索仪表盘失败'
  });

  // 自动搜索效果
  useEffect(() => {
    if (autoSearch && query.trim().length > 0) {
      const delayTimer = setTimeout(() => {
        handleSearch();
      }, 500); // 500ms防抖

      return () => clearTimeout(delayTimer);
    }
  }, [query, autoSearch]);

  // 处理搜索逻辑
  const handleSearch = async () => {
    if (!query.trim()) {
      // 空查询，不执行搜索
      if (onResultsChange) {
        onResultsChange([]);
      }
      return;
    }

    try {
      const dashboards = await searchApi.execute(query);
      
      // 通知父组件搜索结果变化
      if (onResultsChange) {
        onResultsChange(dashboards);
      }
    } catch (error) {
      toast({
        title: '搜索失败',
        description: getUserFriendlyErrorMessage(error as ApiError),
        variant: 'destructive',
      });
    }
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <form onSubmit={handleSubmit} className={`relative flex w-full items-center ${className}`}>
      <Input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pr-10"
      />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full"
        disabled={searchApi.isLoading}
      >
        <Search className="h-4 w-4" />
        <span className="sr-only">搜索</span>
      </Button>
    </form>
  );
} 