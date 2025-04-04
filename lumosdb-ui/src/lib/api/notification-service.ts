/**
 * Notification Service
 * Provides services for managing user notifications
 */

import { sdkClient } from './sdk-client';
import { handleError } from './error-handler';

// Extend the LumosDBClient type to include executeRequest method
declare module '@sdk' {
  interface LumosDBClient {
    executeRequest(
      method: string, 
      url: string, 
      data?: Record<string, unknown>
    ): Promise<Record<string, unknown>>;
  }
}

// 通知优先级
export type NotificationPriority = 'low' | 'medium' | 'high';

// 通知类型
export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'system';

// 通知状态
export type NotificationStatus = 'unread' | 'read' | 'archived';

// 通知定义
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  createdAt: number;
  readAt?: number;
  link?: string;
  sourceId?: string;
  sourceType?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Get all user notifications
 * @param status Optional status filter (unread, read, archived)
 * @returns Promise resolving to a list of notifications
 */
export async function getNotifications(status?: NotificationStatus): Promise<Notification[]> {
  const client = sdkClient.getClient();
  
  try {
    // Create the query parameter if status is provided
    const queryParam = status ? `?status=${status}` : '';
    
    // SDK call to get notifications
    // @ts-expect-error - LumosDBClient has executeRequest method
    const response = await client.executeRequest('GET', `/api/notifications${queryParam}`);
    return (response.data || []) as Notification[];
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Get unread notification count
 * @returns Promise resolving to the count of unread notifications
 */
export async function getUnreadCount(): Promise<number> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to get unread count
    // @ts-expect-error - LumosDBClient has executeRequest method
    const response = await client.executeRequest('GET', '/api/notifications/unread/count');
    return (response.data?.count || 0) as number;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Mark a notification as read
 * @param id Notification ID
 * @returns Promise resolving to the updated notification
 */
export async function markAsRead(id: string): Promise<Notification> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to mark notification as read
    // @ts-expect-error - LumosDBClient has executeRequest method
    const response = await client.executeRequest('PUT', `/api/notifications/${id}/read`);
    return response.data as Notification;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Mark all notifications as read
 * @returns Promise resolving to true if successful
 */
export async function markAllAsRead(): Promise<boolean> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to mark all notifications as read
    // @ts-expect-error - LumosDBClient has executeRequest method
    await client.executeRequest('PUT', '/api/notifications/read-all');
    return true;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Delete a notification
 * @param id Notification ID to delete
 * @returns Promise resolving to true if successful
 */
export async function deleteNotification(id: string): Promise<boolean> {
  const client = sdkClient.getClient();
  
  try {
    // SDK call to delete a notification
    // @ts-expect-error - LumosDBClient has executeRequest method
    await client.executeRequest('DELETE', `/api/notifications/${id}`);
    return true;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Delete all notifications
 * @param status Optional status filter (unread, read, archived)
 * @returns Promise resolving to true if successful
 */
export async function deleteAllNotifications(status?: NotificationStatus): Promise<boolean> {
  const client = sdkClient.getClient();
  
  try {
    // Create the query parameter if status is provided
    const queryParam = status ? `?status=${status}` : '';
    
    // SDK call to delete all notifications
    // @ts-expect-error - LumosDBClient has executeRequest method
    await client.executeRequest('DELETE', `/api/notifications/all${queryParam}`);
    return true;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
}

/**
 * Generate system notification from dashboard event
 * @param dashboardId Dashboard ID that triggered the notification
 * @param event Event type (shared, updated, deleted, etc.)
 * @returns Promise resolving to the created notification
 */
export async function createDashboardNotification(
  dashboardId: string, 
  event: 'shared' | 'updated' | 'deleted' | 'commented' | 'mentioned',
  metadata?: Record<string, unknown>
): Promise<Notification> {
  const client = sdkClient.getClient();
  
  try {
    const payload = {
      sourceType: 'dashboard',
      sourceId: dashboardId,
      event,
      metadata
    };
    
    // SDK call to create dashboard notification
    // @ts-expect-error - LumosDBClient has executeRequest method
    const response = await client.executeRequest('POST', '/api/notifications/dashboard', payload);
    return response.data as Notification;
  } catch (error) {
    const apiError = handleError(error);
    throw apiError;
  }
} 