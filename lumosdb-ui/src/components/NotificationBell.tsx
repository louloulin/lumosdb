'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getUnreadCount } from '@/lib/api/notification-service';
import { useLoadingApi } from '@/lib/hooks/use-loading-api';

interface NotificationBellProps {
  onClick?: () => void;
  className?: string;
}

/**
 * 通知铃铛组件
 * 显示未读通知数量，点击可打开通知面板
 */
export function NotificationBell({ onClick, className = '' }: NotificationBellProps) {
  const [count, setCount] = useState(0);
  
  // 加载未读通知数量的API
  const unreadCountApi = useLoadingApi(getUnreadCount, {
    module: 'notifications:unread-count',
    defaultErrorMessage: '无法加载未读通知数量'
  });

  // 加载未读通知数量
  useEffect(() => {
    loadUnreadCount();
    
    // 每60秒刷新一次未读通知数量
    const intervalId = setInterval(loadUnreadCount, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  // 获取未读通知数量
  const loadUnreadCount = async () => {
    try {
      const count = await unreadCountApi.execute();
      setCount(count);
    } catch (error) {
      console.error('加载未读通知数量失败:', error);
    }
  };

  // 处理点击事件
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      onClick={handleClick}
      className={`relative ${className}`}
      title="通知"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
} 