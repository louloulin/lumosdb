/**
 * Dashboard Service
 * Provides services for managing analytics dashboards and widgets
 */

import { sdkClient } from './sdk-client';
import { handleError } from './error-handler';

// 定义仪表盘小部件类型
export type WidgetType = 'bar' | 'line' | 'pie' | 'area' | 'stat' | 'table';

// 仪表盘小部件
export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  query: string;
  description?: string;
  width: 1 | 2;  // 1: 单列, 2: 双列
  height: 1 | 2; // 1: 标准高度, 2: 双倍高度
  options?: {
    xAxis?: string;
    yAxis?: string;
    colors?: string[];
    labels?: string[];
    showLegend?: boolean;
    stacked?: boolean;
    format?: string;
  };
  createdAt: number;
  updatedAt: number;
}

// 仪表盘定义
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: DashboardWidget[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

/**
 * Get a list of all dashboards
 * @returns Promise resolving to a list of dashboards
 */
export async function getDashboards(): Promise<Dashboard[]> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to get dashboards
    const response = await client.get('/api/dashboards');
    return response.data || [];
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Get a specific dashboard by ID
 * @param id The ID of the dashboard to retrieve
 * @returns Promise resolving to the dashboard
 */
export async function getDashboard(id: string): Promise<Dashboard> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to get dashboard by ID
    const response = await client.get(`/api/dashboards/${id}`);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Create a new dashboard
 * @param dashboard The dashboard definition to create
 * @returns Promise resolving to the created dashboard
 */
export async function createDashboard(dashboard: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to create a dashboard
    const response = await client.post('/api/dashboards', dashboard);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Update an existing dashboard
 * @param id The ID of the dashboard to update
 * @param dashboard The updated dashboard definition
 * @returns Promise resolving to the updated dashboard
 */
export async function updateDashboard(id: string, dashboard: Partial<Dashboard>): Promise<Dashboard> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to update a dashboard
    const response = await client.put(`/api/dashboards/${id}`, dashboard);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Delete a dashboard
 * @param id The ID of the dashboard to delete
 * @returns Promise resolving to true if successful
 */
export async function deleteDashboard(id: string): Promise<boolean> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to delete a dashboard
    await client.delete(`/api/dashboards/${id}`);
    return true;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Add a widget to a dashboard
 * @param dashboardId The ID of the dashboard to add the widget to
 * @param widget The widget definition to add
 * @returns Promise resolving to the updated dashboard
 */
export async function addWidget(dashboardId: string, widget: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>): Promise<Dashboard> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to add a widget to a dashboard
    const response = await client.post(`/api/dashboards/${dashboardId}/widgets`, widget);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Update an existing widget
 * @param dashboardId The ID of the dashboard containing the widget
 * @param widgetId The ID of the widget to update
 * @param widget The updated widget definition
 * @returns Promise resolving to the updated dashboard
 */
export async function updateWidget(dashboardId: string, widgetId: string, widget: Partial<DashboardWidget>): Promise<Dashboard> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to update a widget
    const response = await client.put(`/api/dashboards/${dashboardId}/widgets/${widgetId}`, widget);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Delete a widget from a dashboard
 * @param dashboardId The ID of the dashboard containing the widget
 * @param widgetId The ID of the widget to delete
 * @returns Promise resolving to the updated dashboard
 */
export async function deleteWidget(dashboardId: string, widgetId: string): Promise<Dashboard> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to delete a widget
    const response = await client.delete(`/api/dashboards/${dashboardId}/widgets/${widgetId}`);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Share a dashboard with other users
 * @param dashboardId The ID of the dashboard to share
 * @param options Sharing options
 * @returns Promise resolving to the sharing URL or token
 */
export async function shareDashboard(dashboardId: string, options: { 
  isPublic: boolean, 
  expiresAt?: number, 
  allowedUsers?: string[] 
}): Promise<{ url: string }> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to share a dashboard
    const response = await client.post(`/api/dashboards/${dashboardId}/share`, options);
    return response.data;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
} 