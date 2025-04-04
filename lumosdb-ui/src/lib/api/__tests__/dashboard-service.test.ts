import { sdkClient } from '../sdk-client';
import {
  getDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  addWidget,
  updateWidget,
  deleteWidget,
  shareDashboard,
  Dashboard,
  DashboardWidget
} from '../dashboard-service';
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

describe('Dashboard Service', () => {
  // 模拟客户端实例
  const mockExecuteRequest = jest.fn();
  const mockClient = {
    executeRequest: mockExecuteRequest
  };

  // 模拟仪表盘数据
  const mockDashboard: Dashboard = {
    id: '1',
    name: '测试仪表盘',
    description: '这是一个测试仪表盘',
    widgets: [],
    isPublic: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  // 模拟小部件数据
  const mockWidget: DashboardWidget = {
    id: '1',
    type: 'bar',
    title: '测试图表',
    query: 'SELECT * FROM test',
    width: 1,
    height: 1,
    createdAt: Date.now(),
    updatedAt: Date.now()
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

  describe('getDashboards', () => {
    it('should return dashboards list when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: [mockDashboard]
      });

      const result = await getDashboards();
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/dashboards');
      expect(result).toEqual([mockDashboard]);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Failed to get dashboards');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(getDashboards()).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to get dashboards',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('getDashboard', () => {
    it('should return a dashboard by id when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: mockDashboard
      });

      const result = await getDashboard('1');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('GET', '/api/dashboards/1');
      expect(result).toEqual(mockDashboard);
    });

    it('should throw error when request fails', async () => {
      // 模拟请求失败
      const error = new Error('Dashboard not found');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(getDashboard('1')).rejects.toEqual({
        code: 'test_error',
        message: 'Dashboard not found',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('createDashboard', () => {
    it('should create a dashboard when successful', async () => {
      // 模拟请求参数
      const newDashboard = {
        name: '新仪表盘',
        description: '新建的仪表盘',
        widgets: [],
        isPublic: false
      };
      
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: { ...mockDashboard, name: '新仪表盘', description: '新建的仪表盘' }
      });

      const result = await createDashboard(newDashboard);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/dashboards', newDashboard);
      expect(result.name).toEqual('新仪表盘');
      expect(result.description).toEqual('新建的仪表盘');
    });

    it('should throw error when request fails', async () => {
      // 模拟请求参数
      const newDashboard = {
        name: '新仪表盘',
        description: '新建的仪表盘',
        widgets: [],
        isPublic: false
      };
      
      // 模拟请求失败
      const error = new Error('Failed to create dashboard');
      mockExecuteRequest.mockRejectedValueOnce(error);

      await expect(createDashboard(newDashboard)).rejects.toEqual({
        code: 'test_error',
        message: 'Failed to create dashboard',
        details: {}
      });
      
      expect(handleError).toHaveBeenCalledWith(error);
    });
  });

  describe('updateDashboard', () => {
    it('should update a dashboard when successful', async () => {
      // 模拟请求参数
      const updatedData = {
        name: '更新后的仪表盘',
        description: '已更新的描述'
      };
      
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: { ...mockDashboard, ...updatedData }
      });

      const result = await updateDashboard('1', updatedData);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('PUT', '/api/dashboards/1', updatedData);
      expect(result.name).toEqual('更新后的仪表盘');
      expect(result.description).toEqual('已更新的描述');
    });
  });

  describe('deleteDashboard', () => {
    it('should delete a dashboard when successful', async () => {
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({});

      const result = await deleteDashboard('1');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('DELETE', '/api/dashboards/1');
      expect(result).toBe(true);
    });
  });

  describe('addWidget', () => {
    it('should add a widget to a dashboard when successful', async () => {
      // 模拟请求参数
      const newWidget = {
        type: 'line' as const,
        title: '新图表',
        query: 'SELECT * FROM test',
        width: 2 as const,
        height: 1 as const
      };
      
      // 模拟成功返回
      const updatedDashboard = {
        ...mockDashboard,
        widgets: [{ ...mockWidget, ...newWidget, id: '2' }]
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: updatedDashboard
      });

      const result = await addWidget('1', newWidget);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/dashboards/1/widgets', newWidget);
      expect(result.widgets.length).toBe(1);
      expect(result.widgets[0].type).toBe('line');
      expect(result.widgets[0].title).toBe('新图表');
    });
  });

  describe('updateWidget', () => {
    it('should update a widget in a dashboard when successful', async () => {
      // 模拟请求参数
      const widgetUpdate = {
        title: '已更新的图表',
        width: 2 as const
      };
      
      // 模拟成功返回
      const dashboardWithUpdatedWidget = {
        ...mockDashboard,
        widgets: [{ ...mockWidget, ...widgetUpdate }]
      };
      
      mockExecuteRequest.mockResolvedValueOnce({
        data: dashboardWithUpdatedWidget
      });

      const result = await updateWidget('1', '1', widgetUpdate);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('PUT', '/api/dashboards/1/widgets/1', widgetUpdate);
      expect(result.widgets[0].title).toBe('已更新的图表');
      expect(result.widgets[0].width).toBe(2);
    });
  });

  describe('deleteWidget', () => {
    it('should delete a widget from a dashboard when successful', async () => {
      // 模拟成功返回 - 没有小部件的仪表盘
      mockExecuteRequest.mockResolvedValueOnce({
        data: { ...mockDashboard, widgets: [] }
      });

      const result = await deleteWidget('1', '1');
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('DELETE', '/api/dashboards/1/widgets/1');
      expect(result.widgets.length).toBe(0);
    });
  });

  describe('shareDashboard', () => {
    it('should share a dashboard when successful', async () => {
      // 模拟请求参数
      const shareOptions = {
        isPublic: true,
        expiresAt: Date.now() + 86400000
      };
      
      // 模拟成功返回
      mockExecuteRequest.mockResolvedValueOnce({
        data: { url: 'https://example.com/shared/dashboard/1' }
      });

      const result = await shareDashboard('1', shareOptions);
      
      expect(mockExecuteRequest).toHaveBeenCalledWith('POST', '/api/dashboards/1/share', shareOptions);
      expect(result.url).toBe('https://example.com/shared/dashboard/1');
    });
  });
}); 