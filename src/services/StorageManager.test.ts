import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StorageManager } from './StorageManager';
import { TimerError, TimerException } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('StorageManager', () => {
  const testKey = 'test-key';
  const testData = { message: 'hello', count: 42 };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.length = 0;
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
    localStorageMock.clear.mockImplementation(() => {});
    localStorageMock.key.mockReturnValue(null);
  });

  describe('setItem', () => {
    it('应该存储数据并包装版本信息', () => {
      StorageManager.setItem(testKey, testData);
      
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(2); // 数据 + 版本信息
      
      const [key, value] = localStorageMock.setItem.mock.calls[0];
      expect(key).toBe(testKey);
      
      const wrapper = JSON.parse(value);
      expect(wrapper.version).toBe('1.0.0');
      expect(wrapper.data).toEqual(testData);
      expect(wrapper.createdAt).toBeTypeOf('number');
      expect(wrapper.updatedAt).toBeTypeOf('number');
      expect(wrapper.checksum).toBeTypeOf('string');
    });

    it('应该创建备份当存在旧数据时', () => {
      const oldWrapper = {
        version: '1.0.0',
        data: { old: 'data' },
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldWrapper));
      
      StorageManager.setItem(testKey, testData);
      
      // 应该调用 getItem 检查旧数据
      expect(localStorageMock.getItem).toHaveBeenCalledWith(testKey);
      // 应该调用 setItem 至少两次：一次保存备份，一次保存新数据，一次保存版本信息
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(3);
      
      // 检查是否有备份调用
      const backupCall = localStorageMock.setItem.mock.calls.find(call => 
        call[0].includes('_backup')
      );
      expect(backupCall).toBeDefined();
    });

    it('应该处理存储配额超出错误', () => {
      const quotaError = new DOMException('Quota exceeded', 'QuotaExceededError');
      localStorageMock.setItem.mockImplementation(() => {
        throw quotaError;
      });
      
      expect(() => StorageManager.setItem(testKey, testData)).toThrow(TimerException);
    });

    it('应该处理其他存储错误', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => StorageManager.setItem(testKey, testData)).toThrow(TimerException);
    });
  });

  describe('getItem', () => {
    it('应该返回存储的数据', () => {
      const wrapper = {
        version: '1.0.0',
        data: testData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        checksum: StorageManager['calculateChecksum'](testData)
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(wrapper));
      
      const result = StorageManager.getItem(testKey);
      
      expect(result).toEqual(testData);
    });

    it('应该返回默认值当数据不存在时', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const defaultValue = { default: true };
      const result = StorageManager.getItem(testKey, defaultValue);
      
      expect(result).toEqual(defaultValue);
    });

    it('应该返回null当没有默认值且数据不存在时', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = StorageManager.getItem(testKey);
      
      expect(result).toBeNull();
    });

    it('应该验证数据校验和', () => {
      const wrapper = {
        version: '1.0.0',
        data: testData,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        checksum: 'invalid-checksum'
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(wrapper));
      
      expect(() => StorageManager.getItem(testKey)).toThrow(TimerException);
    });

    it('应该处理版本迁移', () => {
      const oldData = { oldField: 'value' };
      const wrapper = {
        version: '0.9.0',
        data: oldData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(wrapper));
      
      const migrations = {
        '0.9.0': (data: any) => ({ newField: data.oldField })
      };
      
      const result = StorageManager.getItem(testKey, null, migrations);
      
      expect(result).toEqual({ newField: 'value' });
      expect(localStorageMock.setItem).toHaveBeenCalled(); // 应该保存迁移后的数据
    });

    it('应该处理迁移失败', () => {
      const wrapper = {
        version: '0.9.0',
        data: testData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(wrapper));
      
      const migrations = {
        '0.9.0': () => {
          throw new Error('Migration failed');
        }
      };
      
      expect(() => StorageManager.getItem(testKey, null, migrations)).toThrow(TimerException);
    });

    it('应该返回默认值当没有合适的迁移函数时', () => {
      const wrapper = {
        version: '0.8.0',
        data: testData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(wrapper));
      
      const defaultValue = { default: true };
      const result = StorageManager.getItem(testKey, defaultValue);
      
      expect(result).toEqual(defaultValue);
    });
  });

  describe('removeItem', () => {
    it('应该删除数据', () => {
      StorageManager.removeItem(testKey);
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(testKey);
    });

    it('应该创建删除备份', () => {
      const wrapper = {
        version: '1.0.0',
        data: testData,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(wrapper));
      
      StorageManager.removeItem(testKey);
      
      // 应该调用 setItem 至少一次（备份和版本信息）
      expect(localStorageMock.setItem).toHaveBeenCalled();
      
      // 检查是否有备份调用
      const backupCall = localStorageMock.setItem.mock.calls.find(call => 
        call[0].includes('_backup')
      );
      expect(backupCall).toBeDefined();
    });

    it('应该处理删除错误', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Remove error');
      });
      
      expect(() => StorageManager.removeItem(testKey)).toThrow(TimerException);
    });
  });

  describe('hasItem', () => {
    it('应该返回true当项存在时', () => {
      localStorageMock.getItem.mockReturnValue('some data');
      
      const result = StorageManager.hasItem(testKey);
      
      expect(result).toBe(true);
    });

    it('应该返回false当项不存在时', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = StorageManager.hasItem(testKey);
      
      expect(result).toBe(false);
    });

    it('应该处理检查错误', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Check error');
      });
      
      const result = StorageManager.hasItem(testKey);
      
      expect(result).toBe(false);
    });
  });

  describe('getAllKeys', () => {
    it('应该返回所有非备份键', () => {
      localStorageMock.length = 4;
      localStorageMock.key
        .mockReturnValueOnce('key1')
        .mockReturnValueOnce('key2_backup')
        .mockReturnValueOnce('flexible-pomodoro-versions')
        .mockReturnValueOnce('key3');
      
      const keys = StorageManager.getAllKeys();
      
      expect(keys).toEqual(['key1', 'key3']);
    });

    it('应该处理获取键错误', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockImplementation(() => {
        throw new Error('Key error');
      });
      
      const keys = StorageManager.getAllKeys();
      
      expect(keys).toEqual([]);
    });
  });

  describe('clear', () => {
    it('应该清空所有数据', () => {
      StorageManager.clear(false); // 不创建备份
      
      expect(localStorageMock.clear).toHaveBeenCalled();
    });

    it('应该为所有数据创建备份', () => {
      localStorageMock.length = 2;
      localStorageMock.key
        .mockReturnValueOnce('key1')
        .mockReturnValueOnce('key2');
      localStorageMock.getItem
        .mockReturnValueOnce(JSON.stringify({ version: '1.0.0', data: 'data1' }))
        .mockReturnValueOnce(JSON.stringify({ version: '1.0.0', data: 'data2' }));
      
      StorageManager.clear(true);
      
      // 应该调用 setItem 为每个键创建备份
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(localStorageMock.clear).toHaveBeenCalled();
      
      // 检查是否有备份调用
      const backupCalls = localStorageMock.setItem.mock.calls.filter(call => 
        call[0].includes('_backup')
      );
      expect(backupCalls.length).toBeGreaterThan(0);
    });

    it('应该处理清空错误', () => {
      localStorageMock.clear.mockImplementation(() => {
        throw new Error('Clear error');
      });
      
      expect(() => StorageManager.clear()).toThrow(TimerException);
    });
  });

  describe('备份功能', () => {
    it('应该恢复备份', () => {
      const backupData = [
        {
          data: testData,
          timestamp: Date.now(),
          version: '1.0.0'
        }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(backupData));
      
      const result = StorageManager.restoreFromBackup(testKey);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        testKey,
        expect.any(String)
      );
    });

    it('应该返回false当没有备份时', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = StorageManager.restoreFromBackup(testKey);
      
      expect(result).toBe(false);
    });

    it('应该获取备份列表', () => {
      const backupData = [
        {
          data: 'data1',
          timestamp: 1000,
          version: '1.0.0'
        },
        {
          data: 'data2',
          timestamp: 2000,
          version: '0.9.0'
        }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(backupData));
      
      const backups = StorageManager.getBackupList(testKey);
      
      expect(backups).toEqual([
        { timestamp: 1000, version: '1.0.0' },
        { timestamp: 2000, version: '0.9.0' }
      ]);
    });
  });

  describe('getStorageUsage', () => {
    it('应该计算存储使用情况', () => {
      localStorageMock.length = 2;
      localStorageMock.key
        .mockReturnValueOnce('key1')
        .mockReturnValueOnce('key2');
      localStorageMock.getItem
        .mockReturnValueOnce('value1')
        .mockReturnValueOnce('value2');
      
      const usage = StorageManager.getStorageUsage();
      
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.total).toBe(5 * 1024 * 1024); // 5MB
      expect(usage.available).toBe(usage.total - usage.used);
      expect(usage.percentage).toBe((usage.used / usage.total) * 100);
    });

    it('应该处理计算错误', () => {
      localStorageMock.length = 1;
      localStorageMock.key.mockImplementation(() => {
        throw new Error('Key error');
      });
      
      const usage = StorageManager.getStorageUsage();
      
      expect(usage).toEqual({
        used: 0,
        total: 0,
        available: 0,
        percentage: 0
      });
    });
  });

  describe('cleanupBackups', () => {
    it('应该清理过期备份', () => {
      const now = Date.now();
      const oldTime = now - 8 * 24 * 60 * 60 * 1000; // 8天前
      const recentTime = now - 1 * 24 * 60 * 60 * 1000; // 1天前
      
      localStorageMock.length = 1;
      localStorageMock.key.mockReturnValueOnce('key1');
      
      const backupData = [
        { data: 'recent', timestamp: recentTime },
        { data: 'old', timestamp: oldTime }
      ];
      localStorageMock.getItem.mockReturnValue(JSON.stringify(backupData));
      
      StorageManager.cleanupBackups(7 * 24 * 60 * 60 * 1000); // 7天
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'key1_backup',
        JSON.stringify([{ data: 'recent', timestamp: recentTime }])
      );
    });
  });

  describe('validateStorage', () => {
    it('应该返回健康状态当一切正常时', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === '__storage_test__') return 'test';
        return null;
      });
      localStorageMock.length = 0;
      
      const health = StorageManager.validateStorage();
      
      expect(health.isHealthy).toBe(true);
      expect(health.issues).toHaveLength(0);
    });

    it('应该检测存储问题', () => {
      // 模拟读写测试失败
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === '__storage_test__') return 'wrong_value';
        return null;
      });
      
      const health = StorageManager.validateStorage();
      
      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('localStorage 读写测试失败');
    });

    it('应该处理验证错误', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const health = StorageManager.validateStorage();
      
      expect(health.isHealthy).toBe(false);
      expect(health.issues).toContain('存储健康检查失败');
    });
  });
});