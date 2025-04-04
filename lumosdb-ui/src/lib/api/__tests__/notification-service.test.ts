import { sdkClient } from '../sdk-client';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  createDashboardNotification,
  NotificationStatus
} from '../notification-service';
import { handleError } from '../error-handler';

// 模拟SDK客户端
jest.mock('../sdk-client', () => ({
  sdkClient: {
    getClient: jest.fn()
  }
}));

// 模拟错误处理
jest.mock('../error-handler', () => ({
  handleError: jest.fn(),
  getUserFriendlyErrorMessage: jest.fn(error => `User friendly: ${error.message}`)
}));

describe('Notification Service', () => {
  // 模拟客户端实例
  const mockExecuteRequest = jest.fn();
  const mockClient = {
    executeRequest: mockExecuteRequest
  };

  // 模拟通知数据
  const mockNotification = {
    id: '1',
    title: '测试通知',
    message: '这是一条测试通知',
    type: 'info',
    priority: 'medium',
    status: 'unread',
    createdAt: Date.now()
  };

  beforeEach(() => {
    // 清除所有模拟的调用记录
    jest.clearAllMocks();
    // 模拟SDK客户端获取函数
    (sdkClient.getClient as jest.Mock).mockReturnValue(mockClient);
    // 模拟handleError函数
    (handleError as jest.Mock).mockImplementation(error => ({
      code: 'test_error',
      message: error.message,
      details: {}
    }));
  });

  describe('getNotifications', () => {
    it('should return notifications list when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: [mockNotification]
      });

      const result = await getNotifications();
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/notifications');
      expect(result).toEqual([mockNotification]);
    });

    it('should use status filter when provided', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: [mockNotification]
      });

      const status: NotificationStatus = 'unread';
      const result = await getNotifications(status);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/notifications?status=unread');
      expect(result).toEqual([mockNotification]);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to get notifications');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(getNotifications()).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to get notifications',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: { count: 5 }
      });

      const result = await getUnreadCount();
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/notifications/unread/count');
      expect(result).toBe(5);
    });

    it('should default to 0 when count is not provided', async () => {
      // 模拟成功返回但没有count字段
      mockExecuteRequest.mockResolvedValueOnce({
        data: {}
      });

      const result = await getUnreadCount();
      
      expect(result).toBe(0);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to get unread count');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(getUnreadCount()).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to get unread count',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read when successful', async () => {
      // 模拟成功返回
      const updatedNotification = {
        ...mockNotification,
        status: 'read',
        readAt: Date.now()
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: updatedNotification
      });

      const result = await markAsRead('1');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('PUT', '/api/notifications/1/read');
      expect(result).toEqual(updatedNotification);
      expect(result.status).toBe('read');
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to mark notification as read');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(markAsRead('1')).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to mark notification as read',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({});

      const result = await markAllAsRead();
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('PUT', '/api/notifications/read-all');
      expect(result).toBe(true);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to mark all notifications as read');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(markAllAsRead()).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to mark all notifications as read',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({});

      const result = await deleteNotification('1');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('DELETE', '/api/notifications/1');
      expect(result).toBe(true);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to delete notification');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(deleteNotification('1')).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to delete notification',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteAllNotifications', () => {
    it('should delete all notifications when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({});

      const result = await deleteAllNotifications();
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('DELETE', '/api/notifications/all');
      expect(result).toBe(true);
    });

    it('should use status filter when provided', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({});

      const status: NotificationStatus = 'read';
      const result = await deleteAllNotifications(status);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('DELETE', '/api/notifications/all?status=read');
      expect(result).toBe(true);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to delete all notifications');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(deleteAllNotifications()).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to delete all notifications',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('createDashboardNotification', () => {
    it('should create dashboard notification when successful', async () => {
      // 模拟成功返回
      const dashboardNotification = {
        ...mockNotification,
        sourceType: 'dashboard',
        sourceId: 'dashboard-1'
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: dashboardNotification
      });

      const metadata = { name: '测试仪表盘' };
      const result = await createDashboardNotification('dashboard-1', 'shared', metadata);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith(
        'POST', 
        '/api/notifications/dashboard', 
        {
          sourceType: 'dashboard',
          sourceId: 'dashboard-1',
          event: 'shared',
          metadata
        }
      );
      
      expect(result).toEqual(dashboardNotification);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to create dashboard notification');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(createDashboardNotification('dashboard-1', 'shared')).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to create dashboard notification',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });
}); 