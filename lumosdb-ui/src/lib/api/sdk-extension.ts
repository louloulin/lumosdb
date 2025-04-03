/**
 * SDK扩展文件
 * 为LumosDBClient添加BackupClient
 */
import { LumosDBClient } from '@sdk';
import { BackupClient } from './backup-client';

/**
 * 为LumosDBClient原型添加backup属性
 */
Object.defineProperty(LumosDBClient.prototype, 'backup', {
  get: function() {
    // 懒加载模式：首次访问时创建BackupClient实例
    if (!this._backupClient) {
      // LumosDBClient内部有_apiClient属性
      this._backupClient = new BackupClient(this._apiClient);
    }
    return this._backupClient;
  },
  enumerable: true,
  configurable: true
});

/**
 * 初始化SDK扩展
 * 应在应用启动时调用
 */
export function initSDKExtensions() {
  console.log('SDK扩展已初始化: BackupClient已添加到LumosDBClient');
} 