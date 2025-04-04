'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingIndicator } from '@/components/ui/loading-indicator';
import { useToast } from '@/components/ui/use-toast';
import { NotificationBell } from '@/components/NotificationBell';
import { 
  Notification, 
  NotificationStatus,
  getNotifications, 
  markAsRead, 
  markAllAsRead,
  deleteNotification
} from '@/lib/api/notification-service';
import { getUserFriendlyErrorMessage, ApiError } from '@/lib/api/error-handler';
import { useLoadingApi } from '@/lib/hooks/use-loading-api';
import { format, formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  Info, 
  AlertTriangle, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

/**
 * 通知面板组件
 * 显示用户通知列表，可标记为已读或删除
 */
export function NotificationPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<NotificationStatus | 'all'>('all');
  const router = useRouter();
  const { toast } = useToast();
  
  // 加载通知列表的API
  const notificationsApi = useLoadingApi(getNotifications, {
    module: 'notifications:list',
    defaultErrorMessage: '加载通知列表失败'
  });
  
  // 标记为已读的API
  const markAsReadApi = useLoadingApi(markAsRead, {
    module: 'notifications:mark-read',
    defaultErrorMessage: '标记通知为已读失败'
  });
  
  // 标记所有为已读的API
  const markAllAsReadApi = useLoadingApi(markAllAsRead, {
    module: 'notifications:mark-all-read',
    defaultErrorMessage: '标记所有通知为已读失败',
    successMessage: '已将所有通知标记为已读',
    showSuccessToast: true
  });
  
  // 删除通知的API
  const deleteNotificationApi = useLoadingApi(deleteNotification, {
    module: 'notifications:delete',
    defaultErrorMessage: '删除通知失败'
  });

  // 加载通知列表
  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, activeTab]);

  // 获取通知列表
  const loadNotifications = async () => {
    try {
      let status: NotificationStatus | undefined;
      if (activeTab !== 'all') {
        status = activeTab;
      }
      
      const data = await notificationsApi.execute(status);
      setNotifications(data);
    } catch (error) {
      toast({
        title: '加载通知失败',
        description: getUserFriendlyErrorMessage(error as ApiError),
        variant: 'destructive',
      });
    }
  };

  // 处理标记为已读
  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsReadApi.execute(id);
      // 刷新通知列表
      loadNotifications();
    } catch (error) {
      toast({
        title: '标记为已读失败',
        description: getUserFriendlyErrorMessage(error as ApiError),
        variant: 'destructive',
      });
    }
  };

  // 处理标记所有为已读
  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadApi.execute();
      // 刷新通知列表
      loadNotifications();
    } catch (error) {
      // 错误已通过 useLoadingApi 处理
    }
  };

  // 处理删除通知
  const handleDeleteNotification = async (id: string) => {
    try {
      await deleteNotificationApi.execute(id);
      // 刷新通知列表
      loadNotifications();
    } catch (error) {
      toast({
        title: '删除通知失败',
        description: getUserFriendlyErrorMessage(error as ApiError),
        variant: 'destructive',
      });
    }
  };

  // 处理点击通知
  const handleNotificationClick = (notification: Notification) => {
    // 如果通知未读，标记为已读
    if (notification.status === 'unread') {
      handleMarkAsRead(notification.id);
    }
    
    // 如果有链接，导航到对应页面
    if (notification.link) {
      router.push(notification.link);
    }
    
    // 关闭面板
    setIsOpen(false);
  };

  // 获取通知类型图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  // 格式化通知时间
  const formatNotificationTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    
    // 如果是今天内的通知，显示相对时间
    if (date.getDate() === now.getDate() && 
        date.getMonth() === now.getMonth() && 
        date.getFullYear() === now.getFullYear()) {
      return formatDistanceToNow(date, { addSuffix: true });
    }
    
    // 否则显示日期
    return format(date, 'yyyy-MM-dd HH:mm');
  };

  // 获取通知列表
  const getFilteredNotifications = () => {
    return notifications;
  };

  // 通知数量统计
  const unreadCount = notifications.filter(n => n.status === 'unread').length;
  const totalCount = notifications.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <div>
          <NotificationBell onClick={() => setIsOpen(true)} />
        </div>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader className="py-2">
          <div className="flex items-center justify-between">
            <SheetTitle>通知中心</SheetTitle>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
              >
                <CheckCheck className="mr-1 h-4 w-4" />
                全部已读
              </Button>
              <SheetClose asChild>
                <Button variant="ghost" size="sm">
                  关闭
                </Button>
              </SheetClose>
            </div>
          </div>
        </SheetHeader>
        
        <Tabs 
          defaultValue="all" 
          className="flex-1 flex flex-col"
          value={activeTab}
          onValueChange={value => setActiveTab(value as NotificationStatus | 'all')}
        >
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="all">
              全部 ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="unread">
              未读 ({unreadCount})
            </TabsTrigger>
            <TabsTrigger value="read">
              已读
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value={activeTab} className="flex-1 pt-2">
            {notificationsApi.isLoading ? (
              <div className="flex justify-center items-center h-40">
                <LoadingIndicator size="md" />
              </div>
            ) : getFilteredNotifications().length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center h-40 text-muted-foreground">
                <Bell className="h-12 w-12 mb-2 opacity-20" />
                <p>没有{activeTab === 'unread' ? '未读' : activeTab === 'read' ? '已读' : ''}通知</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="space-y-2 p-1">
                  {getFilteredNotifications().map(notification => (
                    <div 
                      key={notification.id} 
                      className={`
                        flex items-start p-3 rounded-md cursor-pointer
                        ${notification.status === 'unread' ? 'bg-muted' : 'bg-transparent'}
                        hover:bg-muted/80
                      `}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="mr-3 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-sm truncate pr-2">
                            {notification.title}
                          </h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatNotificationTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      <div className="ml-2 flex flex-col space-y-1">
                        {notification.status === 'unread' && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7"
                            onClick={e => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            title="标记为已读"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteNotification(notification.id);
                          }}
                          title="删除通知"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
} 