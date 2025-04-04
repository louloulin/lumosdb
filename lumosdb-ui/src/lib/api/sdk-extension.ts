/**
 * SDK扩展文件
 * 为LumosDBClient添加BackupClient
 */
import { LumosDBClient, DbClient } from '@sdk';
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

// 扩展DbClient添加更健壮的错误处理和参数验证
export function extendDbClient(dbClient: DbClient): void {
  // 保存原始方法引用
  const originalGetTableInfo = dbClient.getTableInfo;
  
  // 重写getTableInfo方法，添加参数验证
  dbClient.getTableInfo = async function(params: any): Promise<any> {
    console.log('调用扩展的getTableInfo方法，参数:', params);
    
    // 参数验证和修正
    let tableParam = '';
    
    // 如果是字符串，直接使用
    if (typeof params === 'string') {
      tableParam = params;
    } 
    // 如果是对象，检查是否有table属性
    else if (params && typeof params === 'object') {
      if ('table' in params) {
        // 如果table属性是字符串，使用它
        if (typeof params.table === 'string') {
          tableParam = params.table;
        } else {
          // 尝试将非字符串table转为字符串
          tableParam = String(params.table);
        }
      } else if ('name' in params) {
        // 尝试使用name属性
        tableParam = String(params.name);
      } else {
        // 无法提取表名，抛出错误
        throw new Error('无效的表名参数: 无法从对象中提取表名');
      }
    } else {
      // 无效参数类型
      throw new Error(`无效的表名参数类型: ${typeof params}`);
    }
    
    console.log(`处理后的表名参数: "${tableParam}"`);
    
    try {
      // 调用原始方法，传入处理后的参数
      if (typeof originalGetTableInfo === 'function') {
        return await originalGetTableInfo.call(this, tableParam);
      } else {
        throw new Error('原始getTableInfo方法不可用');
      }
    } catch (error) {
      console.error('调用SDK getTableInfo方法失败:', error);
      throw error;
    }
  };
} 