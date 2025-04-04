import { handleError, getUserFriendlyErrorMessage } from './error-handler';
import { sdkClient } from './sdk-client';
import type { 
  BackupType as SDKBackupType, 
  BackupOptions as SDKBackupOptions, 
  RestoreOptions as SDKRestoreOptions
} from '@sdk';
import { getDbClient } from './sdk-client';
import axios from 'axios';

/**
 * 备份类型枚举
 */
export const BackupType = {
  FULL: 'full',
  INCREMENTAL: 'incremental'
} as const;

export type BackupType = (typeof BackupType)[keyof typeof BackupType];

/**
 * 备份状态枚举
 */
export const BackupStatus = {
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SCHEDULED: 'scheduled'
} as const;

export type BackupStatus = (typeof BackupStatus)[keyof typeof BackupStatus];

/**
 * 备份选项接口
 */
export interface BackupOptions {
  databaseType?: string;       // 数据库类型：sqlite, duckdb, vector
  databaseName?: string;       // 数据库名称
  backupName?: string;         // 备份名称（可选，默认为自动生成）
  backupType?: BackupType;     // 备份类型：全量或增量
  compression?: boolean;       // 是否压缩
  encryption?: boolean;        // 是否加密
  scheduledTime?: Date;        // 计划执行时间（可选）
  description?: string;        // 备份描述（可选）
  includeData?: boolean;       // 是否包含数据（可选）
}

/**
 * SDK备份选项转换接口（临时解决类型兼容问题）
 */
interface SDKCompatibleBackupOptions extends Omit<SDKBackupOptions, 'databaseType' | 'databaseName' | 'backupType'> {
  databaseType?: string;
  databaseName?: string;
  backupType?: SDKBackupType;
}

/**
 * 恢复选项接口
 */
export interface RestoreOptions {
  backupId: string;            // 备份ID
  overwriteExisting?: boolean; // 是否覆盖现有数据库
  targetDatabase?: string;     // 目标数据库（可选，默认为原数据库）
  validateBeforeRestore?: boolean; // 恢复前是否验证
}

/**
 * 备份信息接口
 */
export interface BackupInfo {
  id: string;
  name: string;
  databaseType: string;
  databaseName: string;
  createdAt: Date;
  size: string;
  sizeBytes: number;
  type: BackupType;
  status: BackupStatus;
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  lastVerified?: Date;
  isValid?: boolean;
  description?: string;        // 备份描述
  includesData?: boolean;      // 是否包含数据
}

/**
 * API响应备份类型
 */
interface ApiBackupResponse {
  id: string;
  name?: string;
  databaseType?: string;
  databaseName?: string;
  createdAt?: string;
  created_at?: string;
  size?: string;
  sizeBytes?: number;
  type?: string;
  status?: string;
  compressionEnabled?: boolean;
  encryptionEnabled?: boolean;
  lastVerified?: string;
  isValid?: boolean;
  description?: string;
  includesData?: boolean;
  backupId?: string;
  success?: boolean;
  [key: string]: any;
}

/**
 * 备份结果接口
 */
export interface BackupResult {
  success: boolean;
  backupId?: string;
  error?: string;
}

/**
 * 恢复结果接口
 */
export interface RestoreResult {
  success: boolean;
  error?: string;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

/**
 * 创建备份
 * @param options 备份选项
 * @param progressCallback 进度回调
 * @returns 备份结果
 */
export async function createBackup(
  options: BackupOptions, 
  progressCallback?: (progress: number) => void
): Promise<BackupResult> {
  try {
    // 将传入的描述添加到备份名称或元数据中
    const description = options.description || '';

    // 默认的备份名称
    if (!options.backupName && options.databaseName) {
      const date = new Date();
      options.backupName = `${options.databaseName}_backup_${date.getFullYear()}${
        (date.getMonth() + 1).toString().padStart(2, '0')}${
        date.getDate().toString().padStart(2, '0')}_${
        date.getHours().toString().padStart(2, '0')}${
        date.getMinutes().toString().padStart(2, '0')}`;
    }

    // 如果是简化的API，直接使用axios调用后端API端点
    if (!options.databaseType || !options.databaseName) {
      const client = getDbClient();
      const baseUrl = client.getBaseUrl().replace(/\/api$/, '');
      
      const response = await axios.post(`${baseUrl}/backup`, {
        description: description,
        includeData: options.includeData || true,
      });
      
      return {
        success: true,
        backupId: response.data.backupId || response.data.id
      };
    }

    // 调用SDK进行备份
    const sdkOptions: SDKCompatibleBackupOptions = {
      ...options,
      backupType: options.backupType as SDKBackupType
    };
    return await sdkClient.getClient().backup.createBackup(sdkOptions as SDKBackupOptions, progressCallback);
  } catch (error) {
    const apiError = handleError(error);
    return {
      success: false,
      error: getUserFriendlyErrorMessage(apiError)
    };
  }
}

/**
 * 恢复备份
 * @param options 恢复选项
 * @param progressCallback 进度回调
 * @returns 恢复结果
 */
export async function restoreBackup(
  options: RestoreOptions,
  progressCallback?: (progress: number) => void
): Promise<RestoreResult> {
  try {
    // 简化API调用
    const client = getDbClient();
    const baseUrl = client.getBaseUrl().replace(/\/api$/, '');
    
    // 尝试调用简化的API端点
    try {
      const response = await axios.post(`${baseUrl}/restore/${options.backupId}`, {
        overwriteExisting: options.overwriteExisting || false,
      });
      
      return {
        success: response.data.success || true,
      };
    } catch (directError) {
      // 如果简化API失败，尝试SDK方法
      console.warn('Simple restore API failed, trying SDK method', directError);
      
      // 调用SDK进行恢复
      const sdkOptions: SDKRestoreOptions = { ...options };
      return await sdkClient.getClient().backup.restoreBackup(sdkOptions, progressCallback);
    }
  } catch (error) {
    const apiError = handleError(error);
    return {
      success: false,
      error: getUserFriendlyErrorMessage(apiError)
    };
  }
}

/**
 * 获取备份列表
 * @param databaseType 数据库类型（可选）
 * @returns 备份列表
 */
export async function getBackups(databaseType?: string): Promise<BackupInfo[]> {
  try {
    const backups = await sdkClient.getClient().backup.getBackups(databaseType);
    return backups.map(backup => ({
      ...backup,
      type: backup.type as BackupType,
      status: backup.status as BackupStatus
    }));
  } catch (error) {
    console.error('Error fetching backups:', error);
    return [];
  }
}

/**
 * 获取备份列表 (别名，与测试脚本一致)
 * @returns 备份列表
 */
export async function listBackups(): Promise<BackupInfo[]> {
  try {
    // 尝试使用简化的API端点
    const client = getDbClient();
    const baseUrl = client.getBaseUrl().replace(/\/api$/, '');
    
    try {
      const response = await axios.get(`${baseUrl}/backups`);
      
      if (response.data && Array.isArray(response.data)) {
        return response.data.map((backup: ApiBackupResponse) => ({
          id: backup.id,
          name: backup.name || `Backup-${backup.id}`,
          databaseType: backup.databaseType || 'default',
          databaseName: backup.databaseName || 'default',
          createdAt: new Date(backup.createdAt || backup.created_at || Date.now()),
          size: backup.size || '0 KB',
          sizeBytes: backup.sizeBytes || 0,
          type: (backup.type || 'full') as BackupType,
          status: (backup.status || 'completed') as BackupStatus,
          compressionEnabled: backup.compressionEnabled || false,
          encryptionEnabled: backup.encryptionEnabled || false,
          lastVerified: backup.lastVerified ? new Date(backup.lastVerified) : undefined,
          isValid: backup.isValid !== undefined ? backup.isValid : true,
          description: backup.description,
          includesData: backup.includesData
        }));
      } else {
        throw new Error('Invalid response format');
      }
    } catch (directError) {
      // 如果简化API失败，回退到SDK方法
      console.warn('Simple list API failed, falling back to SDK method', directError);
      return await getBackups();
    }
  } catch (error) {
    console.error('Error listing backups:', error);
    return [];
  }
}

/**
 * 获取备份详情
 * @param backupId 备份ID
 * @returns 备份详情
 */
export async function getBackupDetails(backupId: string): Promise<BackupInfo | null> {
  try {
    // 尝试使用简化的API端点
    const client = getDbClient();
    const baseUrl = client.getBaseUrl().replace(/\/api$/, '');
    
    try {
      const response = await axios.get(`${baseUrl}/backup/${backupId}`);
      
      if (response.data) {
        const backup: ApiBackupResponse = response.data;
        return {
          id: backup.id,
          name: backup.name || `Backup-${backup.id}`,
          databaseType: backup.databaseType || 'default',
          databaseName: backup.databaseName || 'default',
          createdAt: new Date(backup.createdAt || backup.created_at || Date.now()),
          size: backup.size || '0 KB',
          sizeBytes: backup.sizeBytes || 0,
          type: (backup.type || 'full') as BackupType,
          status: (backup.status || 'completed') as BackupStatus,
          compressionEnabled: backup.compressionEnabled || false,
          encryptionEnabled: backup.encryptionEnabled || false,
          lastVerified: backup.lastVerified ? new Date(backup.lastVerified) : undefined,
          isValid: backup.isValid !== undefined ? backup.isValid : true,
          description: backup.description,
          includesData: backup.includesData
        };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (directError) {
      // 如果简化API失败，回退到SDK方法
      console.warn('Simple details API failed, falling back to SDK method', directError);
      
      const backup = await sdkClient.getClient().backup.getBackupDetails(backupId);
      if (!backup) return null;
      
      return {
        ...backup,
        type: backup.type as BackupType,
        status: backup.status as BackupStatus
      };
    }
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
export async function deleteBackup(backupId: string): Promise<{success: boolean; error?: string}> {
  try {
    // 尝试使用简化的API端点
    const client = getDbClient();
    const baseUrl = client.getBaseUrl().replace(/\/api$/, '');
    
    try {
      await axios.delete(`${baseUrl}/backup/${backupId}`);
      return { success: true };
    } catch (directError) {
      // 如果简化API失败，回退到SDK方法
      console.warn('Simple delete API failed, falling back to SDK method', directError);
      return await sdkClient.getClient().backup.deleteBackup(backupId);
    }
  } catch (error) {
    const apiError = handleError(error);
    return { 
      success: false,
      error: getUserFriendlyErrorMessage(apiError)
    };
  }
}

/**
 * 导出备份
 * @param backupId 备份ID
 * @returns 导出结果
 */
export async function exportBackup(backupId: string): Promise<{success: boolean; error?: string}> {
  try {
    // 尝试使用简化的API端点
    const client = getDbClient();
    const baseUrl = client.getBaseUrl().replace(/\/api$/, '');
    
    try {
      const response = await axios.get(`${baseUrl}/backup/${backupId}/export`, {
        responseType: 'blob'
      });
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backup_${backupId}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      return { success: true };
    } catch (directError) {
      // 如果简化API失败，回退到SDK方法
      console.warn('Simple export API failed, falling back to SDK method', directError);
      return await sdkClient.getClient().backup.exportBackup(backupId);
    }
  } catch (error) {
    const apiError = handleError(error);
    return { 
      success: false,
      error: getUserFriendlyErrorMessage(apiError)
    };
  }
}

/**
 * 验证备份
 * @param backupId 备份ID
 * @returns 验证结果
 */
export async function verifyBackup(backupId: string): Promise<{success: boolean; isValid: boolean; error?: string}> {
  try {
    // 尝试使用简化的API端点
    const client = getDbClient();
    const baseUrl = client.getBaseUrl().replace(/\/api$/, '');
    
    try {
      const response = await axios.post(`${baseUrl}/backup/${backupId}/verify`);
      
      return { 
        success: true,
        isValid: response.data.valid || response.data.isValid || false
      };
    } catch (directError) {
      // 如果简化API失败，回退到SDK方法
      console.warn('Simple verify API failed, falling back to SDK method', directError);
      return await sdkClient.getClient().backup.verifyBackup(backupId);
    }
  } catch (error) {
    const apiError = handleError(error);
    return { 
      success: false,
      isValid: false,
      error: getUserFriendlyErrorMessage(apiError)
    };
  }
}

/**
 * 验证备份 (别名，与测试脚本一致)
 * @param backupId 备份ID
 * @returns 验证结果
 */
export async function validateBackup(backupId: string): Promise<ValidationResult> {
  try {
    const result = await verifyBackup(backupId);
    return {
      valid: result.isValid,
      errors: result.error ? [result.error] : undefined
    };
  } catch (error) {
    const apiError = handleError(error);
    return {
      valid: false,
      errors: [getUserFriendlyErrorMessage(apiError)]
    };
  }
}

/**
 * 获取支持的数据库类型
 * @returns 数据库类型列表
 */
export async function getSupportedDatabaseTypes(): Promise<string[]> {
  try {
    // 尝试使用简化的API端点
    const client = getDbClient();
    const baseUrl = client.getBaseUrl().replace(/\/api$/, '');
    
    try {
      const response = await axios.get(`${baseUrl}/supported-database-types`);
      return response.data || ['sqlite', 'duckdb', 'vectors'];
    } catch (directError) {
      // 如果简化API失败，回退到SDK方法
      console.warn('Simple API failed, falling back to SDK method', directError);
      return await sdkClient.getClient().backup.getSupportedDatabaseTypes();
    }
  } catch (error) {
    console.error('Error fetching database types:', error);
    return ['sqlite', 'duckdb', 'vectors']; // 默认支持的类型
  }
} 