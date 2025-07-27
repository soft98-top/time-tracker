import { TimerError, TimerException } from '../types';

/**
 * 存储数据版本信息
 */
interface StorageVersion {
  version: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 存储数据包装器
 */
interface StorageWrapper<T> {
  version: string;
  data: T;
  createdAt: number;
  updatedAt: number;
  checksum?: string;
}

/**
 * 存储迁移函数类型
 */
type MigrationFunction<T> = (oldData: any, oldVersion: string) => T;

/**
 * 存储管理器类 - 封装 localStorage 操作，提供版本管理和错误处理
 */
export class StorageManager {
  private static readonly VERSION_KEY = 'flexible-pomodoro-versions';
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly BACKUP_SUFFIX = '_backup';
  private static readonly MAX_BACKUP_COUNT = 5;

  /**
   * 计算数据校验和
   */
  private static calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 验证数据完整性
   */
  private static verifyChecksum<T>(wrapper: StorageWrapper<T>): boolean {
    if (!wrapper.checksum) {
      return true; // 没有校验和时跳过验证
    }
    
    const calculatedChecksum = this.calculateChecksum(wrapper.data);
    return calculatedChecksum === wrapper.checksum;
  }

  /**
   * 获取版本信息
   */
  private static getVersionInfo(): Record<string, StorageVersion> {
    try {
      const stored = localStorage.getItem(this.VERSION_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('获取版本信息失败:', error);
      return {};
    }
  }

  /**
   * 更新版本信息
   */
  private static updateVersionInfo(key: string, version: string): void {
    try {
      const versions = this.getVersionInfo();
      const now = Date.now();
      
      versions[key] = {
        version,
        createdAt: versions[key]?.createdAt || now,
        updatedAt: now
      };
      
      localStorage.setItem(this.VERSION_KEY, JSON.stringify(versions));
    } catch (error) {
      console.warn('更新版本信息失败:', error);
    }
  }

  /**
   * 创建备份
   */
  private static createBackup(key: string, data: any): void {
    try {
      const backupKey = `${key}${this.BACKUP_SUFFIX}`;
      const existing = localStorage.getItem(backupKey);
      let backups: any[] = [];
      
      if (existing) {
        try {
          const parsed = JSON.parse(existing);
          backups = Array.isArray(parsed) ? parsed : [];
        } catch (parseError) {
          console.warn('解析备份数据失败，创建新的备份数组:', parseError);
          backups = [];
        }
      }
      
      // 添加新备份
      backups.unshift({
        data,
        timestamp: Date.now(),
        version: this.CURRENT_VERSION
      });
      
      // 限制备份数量
      if (backups.length > this.MAX_BACKUP_COUNT) {
        backups.splice(this.MAX_BACKUP_COUNT);
      }
      
      localStorage.setItem(backupKey, JSON.stringify(backups));
    } catch (error) {
      console.warn('创建备份失败:', error);
      // 备份失败不应该阻止主要操作
    }
  }

  /**
   * 恢复备份
   */
  static restoreFromBackup(key: string, backupIndex: number = 0): boolean {
    try {
      const backupKey = `${key}${this.BACKUP_SUFFIX}`;
      const stored = localStorage.getItem(backupKey);
      
      if (!stored) {
        return false;
      }
      
      const backups = JSON.parse(stored);
      if (!Array.isArray(backups) || backups.length <= backupIndex) {
        return false;
      }
      
      const backup = backups[backupIndex];
      if (!backup || !backup.data) {
        return false;
      }
      
      // 恢复数据
      const wrapper: StorageWrapper<any> = {
        version: backup.version || this.CURRENT_VERSION,
        data: backup.data,
        createdAt: backup.timestamp,
        updatedAt: Date.now()
      };
      
      localStorage.setItem(key, JSON.stringify(wrapper));
      this.updateVersionInfo(key, wrapper.version);
      
      return true;
    } catch (error) {
      console.error('恢复备份失败:', error);
      return false;
    }
  }

  /**
   * 获取备份列表
   */
  static getBackupList(key: string): Array<{ timestamp: number; version: string }> {
    try {
      const backupKey = `${key}${this.BACKUP_SUFFIX}`;
      const stored = localStorage.getItem(backupKey);
      
      if (!stored) {
        return [];
      }
      
      const backups = JSON.parse(stored);
      if (!Array.isArray(backups)) {
        return [];
      }
      
      return backups.map(backup => ({
        timestamp: backup.timestamp,
        version: backup.version || 'unknown'
      }));
    } catch (error) {
      console.error('获取备份列表失败:', error);
      return [];
    }
  }

  /**
   * 存储数据
   */
  static setItem<T>(key: string, data: T, enableBackup: boolean = true): void {
    try {
      // 创建备份（如果启用且存在旧数据）
      if (enableBackup) {
        const existing = localStorage.getItem(key);
        if (existing) {
          try {
            const oldWrapper = JSON.parse(existing);
            this.createBackup(key, oldWrapper.data);
          } catch (error) {
            console.warn('解析旧数据失败，跳过备份:', error);
          }
        }
      }
      
      // 包装数据
      const wrapper: StorageWrapper<T> = {
        version: this.CURRENT_VERSION,
        data,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        checksum: this.calculateChecksum(data)
      };
      
      // 存储数据
      localStorage.setItem(key, JSON.stringify(wrapper));
      
      // 更新版本信息
      this.updateVersionInfo(key, this.CURRENT_VERSION);
      
    } catch (error) {
      console.error('存储数据失败:', error);
      
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        throw new TimerException(
          TimerError.STORAGE_ERROR,
          '存储空间不足，请清理部分数据后重试',
          true
        );
      }
      
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '存储数据时发生错误',
        true
      );
    }
  }

  /**
   * 获取数据
   */
  static getItem<T>(
    key: string, 
    defaultValue?: T,
    migrations?: Record<string, MigrationFunction<T>>
  ): T | null {
    try {
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        return defaultValue || null;
      }
      
      const wrapper: StorageWrapper<T> = JSON.parse(stored);
      
      // 验证数据完整性
      if (!this.verifyChecksum(wrapper)) {
        console.warn('数据校验失败，尝试恢复备份');
        
        // 尝试从备份恢复
        if (this.restoreFromBackup(key)) {
          return this.getItem(key, defaultValue, migrations);
        }
        
        throw new TimerException(
          TimerError.STORAGE_ERROR,
          '数据完整性验证失败',
          true
        );
      }
      
      // 检查版本兼容性
      if (wrapper.version !== this.CURRENT_VERSION) {

        
        if (migrations && migrations[wrapper.version]) {
          try {
            const migratedData = migrations[wrapper.version](wrapper.data, wrapper.version);
            
            // 保存迁移后的数据
            this.setItem(key, migratedData, true);
            
            return migratedData;
          } catch (migrationError) {
            console.error('数据迁移失败:', migrationError);
            throw new TimerException(
              TimerError.STORAGE_ERROR,
              '数据迁移失败',
              true
            );
          }
        } else {
          console.warn('没有找到合适的迁移函数，返回默认值');
          return defaultValue || null;
        }
      }
      
      return wrapper.data;
      
    } catch (error) {
      console.error('获取数据失败:', error);
      
      if (error instanceof TimerException) {
        throw error;
      }
      
      // 尝试从备份恢复
      if (this.restoreFromBackup(key)) {

        return this.getItem(key, defaultValue, migrations);
      }
      
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '获取数据时发生错误',
        true
      );
    }
  }

  /**
   * 删除数据
   */
  static removeItem(key: string, createBackup: boolean = true): void {
    try {
      // 创建备份（如果启用）
      if (createBackup) {
        const existing = localStorage.getItem(key);
        if (existing) {
          try {
            const wrapper = JSON.parse(existing);
            this.createBackup(key, wrapper.data);
          } catch (error) {
            console.warn('创建删除备份失败:', error);
          }
        }
      }
      
      localStorage.removeItem(key);
      
      // 清理版本信息
      const versions = this.getVersionInfo();
      delete versions[key];
      localStorage.setItem(this.VERSION_KEY, JSON.stringify(versions));
      
    } catch (error) {
      console.error('删除数据失败:', error);
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '删除数据时发生错误',
        true
      );
    }
  }

  /**
   * 检查键是否存在
   */
  static hasItem(key: string): boolean {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error('检查键存在性失败:', error);
      return false;
    }
  }

  /**
   * 获取所有键
   */
  static getAllKeys(): string[] {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.endsWith(this.BACKUP_SUFFIX) && key !== this.VERSION_KEY) {
          keys.push(key);
        }
      }
      return keys;
    } catch (error) {
      console.error('获取所有键失败:', error);
      return [];
    }
  }

  /**
   * 清空所有数据
   */
  static clear(createBackup: boolean = true): void {
    try {
      if (createBackup) {
        // 为所有数据创建备份
        const keys = this.getAllKeys();
        for (const key of keys) {
          const data = localStorage.getItem(key);
          if (data) {
            try {
              const wrapper = JSON.parse(data);
              this.createBackup(key, wrapper.data);
            } catch (error) {
              console.warn(`为 ${key} 创建备份失败:`, error);
            }
          }
        }
      }
      
      localStorage.clear();
      
    } catch (error) {
      console.error('清空数据失败:', error);
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '清空数据时发生错误',
        true
      );
    }
  }

  /**
   * 获取存储使用情况
   */
  static getStorageUsage(): {
    used: number;
    total: number;
    available: number;
    percentage: number;
  } {
    try {
      let used = 0;
      
      // 计算已使用空间
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          if (value) {
            used += key.length + value.length;
          }
        }
      }
      
      // localStorage 通常限制为 5-10MB，这里使用 5MB 作为估算
      const total = 5 * 1024 * 1024; // 5MB in bytes
      const available = total - used;
      const percentage = (used / total) * 100;
      
      return {
        used,
        total,
        available,
        percentage
      };
    } catch (error) {
      console.error('获取存储使用情况失败:', error);
      return {
        used: 0,
        total: 0,
        available: 0,
        percentage: 0
      };
    }
  }

  /**
   * 清理过期备份
   */
  static cleanupBackups(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    try {
      const keys = this.getAllKeys();
      const cutoffTime = Date.now() - maxAge;
      
      for (const key of keys) {
        const backupKey = `${key}${this.BACKUP_SUFFIX}`;
        const stored = localStorage.getItem(backupKey);
        
        if (stored) {
          try {
            const backups = JSON.parse(stored);
            if (Array.isArray(backups)) {
              const validBackups = backups.filter(backup => 
                backup.timestamp && backup.timestamp > cutoffTime
              );
              
              if (validBackups.length !== backups.length) {
                if (validBackups.length > 0) {
                  localStorage.setItem(backupKey, JSON.stringify(validBackups));
                } else {
                  localStorage.removeItem(backupKey);
                }
              }
            }
          } catch (error) {
            console.warn(`清理 ${backupKey} 备份失败:`, error);
          }
        }
      }
    } catch (error) {
      console.error('清理备份失败:', error);
    }
  }

  /**
   * 验证存储健康状态
   */
  static validateStorage(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    try {
      // 检查存储可用性
      const testKey = '__storage_test__';
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      if (retrieved !== testValue) {
        issues.push('localStorage 读写测试失败');
      }
      
      // 检查存储使用情况
      const usage = this.getStorageUsage();
      if (usage.percentage > 80) {
        issues.push('存储空间使用率过高');
        recommendations.push('清理部分历史数据或备份');
      }
      
      // 检查数据完整性
      const keys = this.getAllKeys();
      let corruptedCount = 0;
      
      for (const key of keys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const wrapper = JSON.parse(stored);
            if (!this.verifyChecksum(wrapper)) {
              corruptedCount++;
            }
          }
        } catch (error) {
          corruptedCount++;
        }
      }
      
      if (corruptedCount > 0) {
        issues.push(`发现 ${corruptedCount} 个损坏的数据项`);
        recommendations.push('运行数据修复或从备份恢复');
      }
      
      // 检查版本一致性
      const versions = this.getVersionInfo();
      const outdatedKeys = keys.filter(key => {
        const version = versions[key];
        return !version || version.version !== this.CURRENT_VERSION;
      });
      
      if (outdatedKeys.length > 0) {
        issues.push(`发现 ${outdatedKeys.length} 个过期版本的数据`);
        recommendations.push('运行数据迁移');
      }
      
    } catch (error) {
      issues.push('存储健康检查失败');
      console.error('存储健康检查错误:', error);
    }
    
    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}