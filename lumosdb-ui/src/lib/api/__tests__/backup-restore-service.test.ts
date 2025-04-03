import axios, { AxiosProgressEvent } from 'axios';
import { 
  createBackup,
  restoreBackup,
  getBackups,
  getBackupDetails,
  deleteBackup,
  exportBackup,
  verifyBackup,
  getSupportedDatabaseTypes,
  BackupType,
  BackupStatus,
  BackupOptions,
  RestoreOptions
} from '../backup-restore-service';
import { sdkClient } from '../sdk-client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock SDK client
jest.mock('../sdk-client', () => ({
  sdkClient: {
    getClient: jest.fn()
  }
}));

// Mock document functions for testing export
global.URL.createObjectURL = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();

Object.defineProperty(document, 'createElement', {
  value: jest.fn().mockImplementation((tag) => {
    if (tag === 'a') {
      return {
        setAttribute: jest.fn(),
        href: '',
        click: mockClick
      };
    }
    return {};
  })
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild
});

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild
});

// Mock data
const mockBackups = [
  {
    id: '1',
    name: 'Daily Backup - Main DB',
    databaseType: 'sqlite',
    databaseName: 'main.db',
    createdAt: '2023-06-15T03:30:00.000Z',
    size: '42.7 MB',
    sizeBytes: 44757094,
    type: BackupType.FULL,
    status: BackupStatus.COMPLETED,
    compressionEnabled: true,
    encryptionEnabled: false
  },
  {
    id: '2',
    name: 'Weekly Backup - Analytics',
    databaseType: 'duckdb',
    databaseName: 'analytics.duckdb',
    createdAt: '2023-06-12T02:00:00.000Z',
    size: '156.3 MB',
    sizeBytes: 163886644,
    type: BackupType.FULL,
    status: BackupStatus.COMPLETED,
    compressionEnabled: true,
    encryptionEnabled: true
  }
];

const mockBackupDetails = {
  id: '1',
  name: 'Daily Backup - Main DB',
  databaseType: 'sqlite',
  databaseName: 'main.db',
  createdAt: '2023-06-15T03:30:00.000Z',
  size: '42.7 MB',
  sizeBytes: 44757094,
  type: BackupType.FULL,
  status: BackupStatus.COMPLETED,
  compressionEnabled: true,
  encryptionEnabled: false,
  lastVerified: '2023-06-15T04:00:00.000Z',
  isValid: true
};

describe('备份与恢复服务', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBackup', () => {
    it('应成功创建备份并返回备份ID', async () => {
      // 设置mock返回值
      mockedAxios.post.mockResolvedValue({
        data: { backupId: '123456' }
      });

      // 测试参数
      const options: BackupOptions = {
        databaseType: 'sqlite',
        databaseName: 'main.db',
        backupName: 'test-backup',
        backupType: BackupType.FULL,
        compression: true
      };

      // 进度回调
      const progressCallback = jest.fn();

      // 执行测试
      const result = await createBackup(options, progressCallback);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.backupId).toBe('123456');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup'),
        options,
        expect.objectContaining({
          onUploadProgress: expect.any(Function)
        })
      );
    });

    it('应在未提供备份名称时自动生成', async () => {
      // 设置mock返回值
      mockedAxios.post.mockResolvedValue({
        data: { backupId: '123456' }
      });

      // 测试参数，不包含备份名称
      const options: BackupOptions = {
        databaseType: 'sqlite',
        databaseName: 'main.db',
        backupType: BackupType.FULL,
        compression: true
      };

      // 执行测试
      const result = await createBackup(options);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.backupId).toBe('123456');
      
      // 验证自动生成的备份名称
      const postCall = mockedAxios.post.mock.calls[0];
      const sentOptions = postCall[1] as BackupOptions;
      expect(sentOptions.backupName).toBeDefined();
      expect(sentOptions.backupName).toContain('main.db_backup_');
    });

    it('应处理创建备份时的错误', async () => {
      // 设置mock返回错误
      mockedAxios.post.mockRejectedValue(new Error('创建备份失败'));

      // 测试参数
      const options: BackupOptions = {
        databaseType: 'sqlite',
        databaseName: 'main.db',
        backupType: BackupType.FULL
      };

      // 执行测试
      const result = await createBackup(options);

      // 验证结果
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('应触发进度回调', async () => {
      // 设置mock返回值
      mockedAxios.post.mockResolvedValue({
        data: { backupId: '123456' }
      });

      // 测试参数
      const options: BackupOptions = {
        databaseType: 'sqlite',
        databaseName: 'main.db',
        backupType: BackupType.FULL
      };

      // 进度回调
      const progressCallback = jest.fn();

      // 执行测试
      await createBackup(options, progressCallback);

      // 获取onUploadProgress处理器
      const postCall = mockedAxios.post.mock.calls[0];
      const config = postCall[2] as any;
      const onUploadProgress = config.onUploadProgress;

      // 调用进度回调
      onUploadProgress({ loaded: 50, total: 100 } as AxiosProgressEvent);

      // 验证回调被调用
      expect(progressCallback).toHaveBeenCalledWith(50);
    });
  });

  describe('restoreBackup', () => {
    it('应成功恢复备份', async () => {
      // 设置mock返回值
      mockedAxios.post.mockResolvedValue({
        data: { success: true }
      });

      // 测试参数
      const options: RestoreOptions = {
        backupId: '123456',
        overwriteExisting: true
      };

      // 进度回调
      const progressCallback = jest.fn();

      // 执行测试
      const result = await restoreBackup(options, progressCallback);

      // 验证结果
      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup/restore'),
        options,
        expect.objectContaining({
          onDownloadProgress: expect.any(Function)
        })
      );
    });

    it('应处理恢复备份时的错误', async () => {
      // 设置mock返回错误
      mockedAxios.post.mockRejectedValue(new Error('恢复备份失败'));

      // 测试参数
      const options: RestoreOptions = {
        backupId: '123456'
      };

      // 执行测试
      const result = await restoreBackup(options);

      // 验证结果
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getBackups', () => {
    it('应获取所有备份', async () => {
      // 设置mock返回值
      mockedAxios.get.mockResolvedValue({
        data: { backups: mockBackups }
      });

      // 执行测试
      const result = await getBackups();

      // 验证结果
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup')
      );
    });

    it('应根据数据库类型过滤备份', async () => {
      // 设置mock返回值
      mockedAxios.get.mockResolvedValue({
        data: { backups: mockBackups.filter(b => b.databaseType === 'sqlite') }
      });

      // 执行测试
      const result = await getBackups('sqlite');

      // 验证结果
      expect(result).toHaveLength(1);
      expect(result[0].databaseType).toBe('sqlite');
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup?type=sqlite')
      );
    });

    it('应处理获取备份列表的错误并返回空数组', async () => {
      // 设置mock返回错误
      mockedAxios.get.mockRejectedValue(new Error('获取备份列表失败'));

      // 执行测试
      const result = await getBackups();

      // 验证结果
      expect(result).toEqual([]);
    });
  });

  describe('getBackupDetails', () => {
    it('应获取备份详情', async () => {
      // 设置mock返回值
      mockedAxios.get.mockResolvedValue({
        data: mockBackupDetails
      });

      // 执行测试
      const result = await getBackupDetails('1');

      // 验证结果
      expect(result).not.toBeNull();
      expect(result?.id).toBe('1');
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.lastVerified).toBeInstanceOf(Date);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup/1')
      );
    });

    it('应处理获取备份详情的错误并返回null', async () => {
      // 设置mock返回错误
      mockedAxios.get.mockRejectedValue(new Error('获取备份详情失败'));

      // 执行测试
      const result = await getBackupDetails('999');

      // 验证结果
      expect(result).toBeNull();
    });
  });

  describe('deleteBackup', () => {
    it('应成功删除备份', async () => {
      // 设置mock返回值
      mockedAxios.delete.mockResolvedValue({
        data: { success: true }
      });

      // 执行测试
      const result = await deleteBackup('1');

      // 验证结果
      expect(result.success).toBe(true);
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup/1')
      );
    });

    it('应处理删除备份时的错误', async () => {
      // 设置mock返回错误
      mockedAxios.delete.mockRejectedValue(new Error('删除备份失败'));

      // 执行测试
      const result = await deleteBackup('1');

      // 验证结果
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('exportBackup', () => {
    it('应成功导出备份', async () => {
      // 设置mock返回值
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('/export')) {
          return Promise.resolve({
            data: new Blob(['mock backup data'])
          });
        } else {
          return Promise.resolve({
            data: mockBackupDetails
          });
        }
      });

      // 执行测试
      const result = await exportBackup('1');

      // 验证结果
      expect(result.success).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup/1/export'),
        expect.objectContaining({
          responseType: 'blob'
        })
      );
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });

    it('应处理导出备份时的错误', async () => {
      // 设置mock返回错误
      mockedAxios.get.mockRejectedValue(new Error('导出备份失败'));

      // 执行测试
      const result = await exportBackup('1');

      // 验证结果
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifyBackup', () => {
    it('应成功验证备份', async () => {
      // 设置mock返回值
      mockedAxios.post.mockResolvedValue({
        data: { isValid: true }
      });

      // 执行测试
      const result = await verifyBackup('1');

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.isValid).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup/1/verify')
      );
    });

    it('应处理验证备份时的错误', async () => {
      // 设置mock返回错误
      mockedAxios.post.mockRejectedValue(new Error('验证备份失败'));

      // 执行测试
      const result = await verifyBackup('1');

      // 验证结果
      expect(result.success).toBe(false);
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('getSupportedDatabaseTypes', () => {
    it('应获取支持的数据库类型', async () => {
      // 设置mock返回值
      mockedAxios.get.mockResolvedValue({
        data: { types: ['sqlite', 'duckdb', 'vectors'] }
      });

      // 执行测试
      const result = await getSupportedDatabaseTypes();

      // 验证结果
      expect(result).toEqual(['sqlite', 'duckdb', 'vectors']);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/api/backup/database-types')
      );
    });

    it('应在出错时返回默认的数据库类型', async () => {
      // 设置mock返回错误
      mockedAxios.get.mockRejectedValue(new Error('获取数据库类型失败'));

      // 执行测试
      const result = await getSupportedDatabaseTypes();

      // 验证结果
      expect(result).toEqual(['sqlite', 'duckdb', 'vectors']);
    });
  });
}); 