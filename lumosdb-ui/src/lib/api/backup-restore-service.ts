import { handleError, getUserFriendlyErrorMessage } from './error-handler';
import { sdkClient } from './sdk-client';
import type { 
  BackupType as SDKBackupType, 
  BackupOptions as SDKBackupOptions, 
  RestoreOptions as SDKRestoreOptions
} from '@sdk';

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
  databaseType: string;        // 数据库类型：sqlite, duckdb, vector
  databaseName: string;        // 数据库名称
  backupName?: string;         // 备份名称（可选，默认为自动生成）
  backupType: BackupType;      // 备份类型：全量或增量
  compression?: boolean;       // 是否压缩
  encryption?: boolean;        // 是否加密
  scheduledTime?: Date;        // 计划执行时间（可选）
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
    // 默认的备份名称
    if (!options.backupName) {
      const date = new Date();
      options.backupName = `${options.databaseName}_backup_${date.getFullYear()}${
        (date.getMonth() + 1).toString().padStart(2, '0')}${
        date.getDate().toString().padStart(2, '0')}_${
        date.getHours().toString().padStart(2, '0')}${
        date.getMinutes().toString().padStart(2, '0')}`;
    }

    // 调用SDK进行备份
    const sdkOptions: SDKBackupOptions = {
      ...options,
      backupType: options.backupType as SDKBackupType
    };
    return await sdkClient.getClient().backup.createBackup(sdkOptions, progressCallback);
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
    // 调用SDK进行恢复
    const sdkOptions: SDKRestoreOptions = { ...options };
    return await sdkClient.getClient().backup.restoreBackup(sdkOptions, progressCallback);
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
 * 获取备份详情
 * @param backupId 备份ID
 * @returns 备份详情
 */
export async function getBackupDetails(backupId: string): Promise<BackupInfo | null> {
  try {
    const backup = await sdkClient.getClient().backup.getBackupDetails(backupId);
    if (!backup) return null;
    
    return {
      ...backup,
      type: backup.type as BackupType,
      status: backup.status as BackupStatus
    };
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
    return await sdkClient.getClient().backup.deleteBackup(backupId);
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
    return await sdkClient.getClient().backup.exportBackup(backupId);
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
    return await sdkClient.getClient().backup.verifyBackup(backupId);
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
 * 获取支持的数据库类型
 * @returns 数据库类型列表
 */
export async function getSupportedDatabaseTypes(): Promise<string[]> {
  try {
    return await sdkClient.getClient().backup.getSupportedDatabaseTypes();
  } catch (error) {
    console.error('Error fetching database types:', error);
    return ['sqlite', 'duckdb', 'vectors']; // 默认支持的类型
  }
} 