/**
 * Mock Notification Service
 * Provides mock implementation for notification-related functionality
 */

import { 
  Notification, 
  NotificationPriority, 
  NotificationType,
  NotificationStatus
} from '../notification-service';

// 模拟通知数据存储
let mockNotifications: Notification[] = [];

// 生成唯一ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

// 通知消息模板
const notificationTemplates = {
  dashboard: {
    shared: {
      title: '仪表盘已共享',
      message: '您的仪表盘 "{name}" 已成功共享给其他用户。'
    },
    updated: {
      title: '仪表盘已更新',
      message: '您的仪表盘 "{name}" 已被更新。'
    },
    deleted: {
      title: '仪表盘已删除',
      message: '您的仪表盘 "{name}" 已被删除。'
    },
    commented: {
      title: '仪表盘收到新评论',
      message: '您的仪表盘 "{name}" 收到了新的评论。'
    },
    mentioned: {
      title: '您在仪表盘中被提及',
      message: '您在仪表盘 "{name}" 中被提及。'
    }
  }
};

/**
 * 初始化模拟数据
 */
const initMockData = () => {
  const now = Date.now();
  
  mockNotifications = [
    {
      id: generateId(),
      title: '系统维护通知',
      message: 'LumosDB将于今晚22:00-23:00进行例行维护，期间服务可能不可用。',
      type: 'info',
      priority: 'high',
      status: 'unread',
      createdAt: now - 3600000, // 1小时前
    },
    {
      id: generateId(),
      title: '欢迎使用LumosDB',
      message: '感谢您使用LumosDB，有任何问题请随时联系我们的支持团队。',
      type: 'success',
      priority: 'medium',
      status: 'read',
      createdAt: now - 86400000, // 1天前
      readAt: now - 43200000, // 12小时前
    },
    {
      id: generateId(),
      title: '数据库性能警告',
      message: '您的数据库查询性能出现异常，请检查长时间运行的查询。',
      type: 'warning',
      priority: 'high',
      status: 'unread',
      createdAt: now - 7200000, // 2小时前
    }
  ] as Notification[];
};

// 初始化模拟数据
initMockData();

/**
 * 获取所有通知
 */
export const mockGetNotifications = async (status?: NotificationStatus): Promise<Notification[]> => {
  // 延迟模拟网络请求
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (status) {
    return mockNotifications.filter(notification => notification.status === status);
  }
  
  return [...mockNotifications];
};

/**
 * 获取未读通知数量
 */
export const mockGetUnreadCount = async (): Promise<number> => {
  // 延迟模拟网络请求
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return mockNotifications.filter(notification => notification.status === 'unread').length;
};

/**
 * 标记通知为已读
 */
export const mockMarkAsRead = async (id: string): Promise<Notification> => {
  // 延迟模拟网络请求
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const index = mockNotifications.findIndex(notification => notification.id === id);
  
  if (index === -1) {
    throw new Error(`找不到ID为 ${id} 的通知`);
  }
  
  mockNotifications[index] = {
    ...mockNotifications[index],
    status: 'read',
    readAt: Date.now()
  };
  
  return mockNotifications[index];
};

/**
 * 标记所有通知为已读
 */
export const mockMarkAllAsRead = async (): Promise<boolean> => {
  // 延迟模拟网络请求
  await new Promise(resolve => setTimeout(resolve, 300));
  
  mockNotifications = mockNotifications.map(notification => {
    if (notification.status === 'unread') {
      return {
        ...notification,
        status: 'read',
        readAt: Date.now()
      };
    }
    return notification;
  });
  
  return true;
};

/**
 * 删除通知
 */
export const mockDeleteNotification = async (id: string): Promise<boolean> => {
  // 延迟模拟网络请求
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const index = mockNotifications.findIndex(notification => notification.id === id);
  
  if (index === -1) {
    throw new Error(`找不到ID为 ${id} 的通知`);
  }
  
  mockNotifications.splice(index, 1);
  
  return true;
};

/**
 * 删除所有通知
 */
export const mockDeleteAllNotifications = async (status?: NotificationStatus): Promise<boolean> => {
  // 延迟模拟网络请求
  await new Promise(resolve => setTimeout(resolve, 300));
  
  if (status) {
    mockNotifications = mockNotifications.filter(notification => notification.status !== status);
  } else {
    mockNotifications = [];
  }
  
  return true;
};

/**
 * 创建仪表盘相关通知
 */
export const mockCreateDashboardNotification = async (
  dashboardId: string,
  event: 'shared' | 'updated' | 'deleted' | 'commented' | 'mentioned',
  metadata?: Record<string, unknown>
): Promise<Notification> => {
  // 延迟模拟网络请求
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const dashboardName = metadata?.name as string || '未命名仪表盘';
  const template = notificationTemplates.dashboard[event];
  
  const notification: Notification = {
    id: generateId(),
    title: template.title,
    message: template.message.replace('{name}', dashboardName),
    type: 'info',
    priority: 'medium',
    status: 'unread',
    createdAt: Date.now(),
    sourceId: dashboardId,
    sourceType: 'dashboard',
    metadata: metadata || {},
    link: `/dashboards/${dashboardId}`
  };
  
  // 添加到通知列表
  mockNotifications.unshift(notification);
  
  return notification;
}; 