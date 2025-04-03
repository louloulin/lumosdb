import { ApiClient } from '@sdk';
import type { 
  BackupType, 
  BackupStatus, 
  BackupOptions, 
  RestoreOptions, 
  BackupInfo, 
  BackupResult, 
  RestoreResult,
  VerifyBackupResult 
} from '@sdk';

/**
 * 备份客户端实现
 * 提供备份和恢复相关的API调用
 */
export class BackupClient {
  private apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    this.apiClient = apiClient;
  }

  /**
   * 创建备份
   * @param options 备份选项
   * @param progressCallback 进度回调
   * @returns 备份结果
   */
  async createBackup(
    options: BackupOptions, 
    progressCallback?: (progress: number) => void
  ): Promise<BackupResult> {
    try {
      const response = await this.apiClient.post<{ backupId: string }>('/api/backup', options as unknown as Record<string, unknown>);
      
      if (progressCallback) {
        progressCallback(100); // 模拟进度完成
      }
      
      return {
        success: true,
        backupId: response.data.backupId
      };
    } catch (error) {
      console.error('Error creating backup:', error);
      return {
        success: false,
        error: 'Failed to create backup'
      };
    }
  }

  /**
   * 恢复备份
   * @param options 恢复选项
   * @param progressCallback 进度回调
   * @returns 恢复结果
   */
  async restoreBackup(
    options: RestoreOptions,
    progressCallback?: (progress: number) => void
  ): Promise<RestoreResult> {
    try {
      await this.apiClient.post('/api/backup/restore', options as unknown as Record<string, unknown>);
      
      if (progressCallback) {
        progressCallback(100); // 模拟进度完成
      }
      
      return {
        success: true
      };
    } catch (error) {
      console.error('Error restoring backup:', error);
      return {
        success: false,
        error: 'Failed to restore backup'
      };
    }
  }

  /**
   * 获取备份列表
   * @param databaseType 数据库类型（可选）
   * @returns 备份列表
   */
  async getBackups(databaseType?: string): Promise<BackupInfo[]> {
    try {
      let url = '/api/backup';
      if (databaseType) {
        url += `?type=${databaseType}`;
      }
      
      const response = await this.apiClient.get<{ backups: Record<string, unknown>[] }>(url);
      
      return response.data.backups.map(backup => ({
        ...backup,
        createdAt: new Date(backup.createdAt as string),
        lastVerified: backup.lastVerified ? new Date(backup.lastVerified as string) : undefined,
        type: backup.type as BackupType,
        status: backup.status as BackupStatus
      })) as unknown as BackupInfo[];
    } catch (error) {
      console.error('Error fetching backups:', error);
      return [];
    }
  }

  /**
   * 获取备份详情
   * @param backupId 备份ID
   * @returns 备份详情
   */
  async getBackupDetails(backupId: string): Promise<BackupInfo | null> {
    try {
      const response = await this.apiClient.get<Record<string, unknown>>(`/api/backup/${backupId}`);
      const backup = response.data;
      
      return {
        ...backup,
        createdAt: new Date(backup.createdAt as string),
        lastVerified: backup.lastVerified ? new Date(backup.lastVerified as string) : undefined,
        type: backup.type as BackupType,
        status: backup.status as BackupStatus
      } as unknown as BackupInfo;
    } catch (error) {
      console.error('Error fetching backup details:', error);
      return null;
    }
  }

  /**
   * 删除备份
   * @param backupId 备份ID
   * @returns 操作结果
   */
  async deleteBackup(backupId: string): Promise<{success: boolean; error?: string}> {
    try {
      await this.apiClient.delete(`/api/backup/${backupId}`);
      return { success: true };
    } catch (error) {
      console.error('Error deleting backup:', error);
      return { 
        success: false,
        error: 'Failed to delete backup'
      };
    }
  }

  /**
   * 导出备份
   * @param backupId 备份ID
   * @returns 导出结果
   */
  async exportBackup(backupId: string): Promise<{success: boolean; error?: string}> {
    try {
      // 这个接口需要特殊处理，因为它返回二进制数据
      // 这里只是模拟行为，实际需要使用fetch或axios等处理二进制响应
      const response = await fetch(`/api/backup/${backupId}/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to export backup');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const backupDetails = await this.getBackupDetails(backupId);
      const fileName = backupDetails ? 
        `${backupDetails.name}.zip` : 
        `backup_${backupId}.zip`;
      
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting backup:', error);
      return { 
        success: false,
        error: 'Failed to export backup'
      };
    }
  }

  /**
   * 验证备份
   * @param backupId 备份ID
   * @returns 验证结果
   */
  async verifyBackup(backupId: string): Promise<VerifyBackupResult> {
    try {
      const response = await this.apiClient.post<{ isValid: boolean }>(`/api/backup/${backupId}/verify`, {});
      
      return { 
        success: true,
        isValid: response.data.isValid
      };
    } catch (error) {
      console.error('Error verifying backup:', error);
      return { 
        success: false,
        isValid: false,
        error: 'Failed to verify backup'
      };
    }
  }

  /**
   * 获取支持的数据库类型
   * @returns 数据库类型列表
   */
  async getSupportedDatabaseTypes(): Promise<string[]> {
    try {
      const response = await this.apiClient.get<{ types: string[] }>('/api/backup/database-types');
      return response.data.types;
    } catch (error) {
      console.error('Error fetching database types:', error);
      return ['sqlite', 'duckdb', 'vectors']; // 默认支持的类型
    }
  }
} 