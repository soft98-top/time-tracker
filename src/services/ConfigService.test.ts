import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from './ConfigService';
import { TimerConfig, TimerError, TimerException, defaultConfig } from '../types';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('ConfigService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('loadConfig', () => {
    it('应该返回默认配置当localStorage为空时', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const config = ConfigService.loadConfig();
      
      expect(config).toEqual(defaultConfig);
      expect(localStorageMock.getItem).toHaveBeenCalledWith('flexible-pomodoro-config');
    });

    it('应该加载有效的存储配置', () => {
      const storedConfig = {
        version: '1.0.0',
        config: {
          ...defaultConfig,
          focusDuration: 30
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedConfig));
      
      const config = ConfigService.loadConfig();
      
      expect(config.focusDuration).toBe(30);
      expect(config.restDuration).toBe(defaultConfig.restDuration);
    });

    it('应该使用默认配置当版本不匹配时', () => {
      const storedConfig = {
        version: '0.9.0',
        config: { focusDuration: 30 }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedConfig));
      
      const config = ConfigService.loadConfig();
      
      expect(config).toEqual(defaultConfig);
    });

    it('应该抛出异常当存储数据无效时', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      expect(() => ConfigService.loadConfig()).toThrow(TimerException);
    });

    it('应该抛出异常当配置验证失败时', () => {
      const storedConfig = {
        version: '1.0.0',
        config: {
          focusDuration: -1 // 无效值
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedConfig));
      
      expect(() => ConfigService.loadConfig()).toThrow(TimerException);
    });
  });

  describe('saveConfig', () => {
    it('应该保存有效的配置', () => {
      localStorageMock.getItem.mockReturnValue(null); // 模拟没有现有配置
      
      const newConfig: Partial<TimerConfig> = {
        focusDuration: 30,
        enableSound: false
      };
      
      ConfigService.saveConfig(newConfig);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
      const [key, value] = localStorageMock.setItem.mock.calls[0];
      expect(key).toBe('flexible-pomodoro-config');
      
      const stored = JSON.parse(value);
      expect(stored.version).toBe('1.0.0');
      expect(stored.config.focusDuration).toBe(30);
      expect(stored.config.enableSound).toBe(false);
      expect(stored.config.restDuration).toBe(defaultConfig.restDuration); // 应该保留默认值
    });

    it('应该合并现有配置', () => {
      const existingConfig = {
        version: '1.0.0',
        config: {
          ...defaultConfig,
          focusDuration: 20
        }
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingConfig));
      
      const newConfig: Partial<TimerConfig> = {
        restDuration: 10
      };
      
      ConfigService.saveConfig(newConfig);
      
      const [, value] = localStorageMock.setItem.mock.calls[0];
      const stored = JSON.parse(value);
      expect(stored.config.focusDuration).toBe(20); // 保留现有值
      expect(stored.config.restDuration).toBe(10); // 更新新值
    });

    it('应该验证配置值', () => {
      const invalidConfig: Partial<TimerConfig> = {
        focusDuration: -1
      };
      
      expect(() => ConfigService.saveConfig(invalidConfig)).toThrow(TimerException);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('应该验证专注失败时间不能大于专注时长', () => {
      const invalidConfig: Partial<TimerConfig> = {
        focusDuration: 5,
        focusFailureTime: 10
      };
      
      expect(() => ConfigService.saveConfig(invalidConfig)).toThrow(TimerException);
    });

    it('应该处理localStorage错误', () => {
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const config: Partial<TimerConfig> = { focusDuration: 30 };
      
      expect(() => ConfigService.saveConfig(config)).toThrow(TimerException);
    });
  });

  describe('配置验证', () => {
    it('应该验证正整数时长', () => {
      const testCases = [
        { focusDuration: 0 },
        { focusDuration: -1 },
        { focusDuration: 1.5 },
        { restDuration: 0 },
        { reflectionDuration: -5 },
        { focusFailureTime: 0 }
      ];
      
      testCases.forEach(config => {
        expect(() => ConfigService.saveConfig(config)).toThrow(TimerException);
      });
    });

    it('应该验证布尔值配置', () => {
      const testCases = [
        { enableSound: 'true' as any },
        { enableNotification: 1 as any }
      ];
      
      testCases.forEach(config => {
        expect(() => ConfigService.saveConfig(config)).toThrow(TimerException);
      });
    });

    it('应该接受有效配置', () => {
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockImplementation(() => {}); // Reset mock to not throw
      
      const validConfig: Partial<TimerConfig> = {
        focusDuration: 25,
        restDuration: 5,
        reflectionDuration: 3,
        focusFailureTime: 2,
        enableSound: true,
        enableNotification: false
      };
      
      expect(() => ConfigService.saveConfig(validConfig)).not.toThrow();
    });
  });

  describe('resetConfig', () => {
    it('应该移除存储的配置', () => {
      ConfigService.resetConfig();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('flexible-pomodoro-config');
    });

    it('应该处理localStorage错误', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => ConfigService.resetConfig()).toThrow(TimerException);
    });
  });

  describe('getDefaultConfig', () => {
    it('应该返回默认配置的副本', () => {
      const config = ConfigService.getDefaultConfig();
      
      expect(config).toEqual(defaultConfig);
      expect(config).not.toBe(defaultConfig); // 应该是副本，不是同一个对象
    });
  });

  describe('isDefaultConfig', () => {
    it('应该正确识别默认配置', () => {
      expect(ConfigService.isDefaultConfig(defaultConfig)).toBe(true);
      
      const modifiedConfig = { ...defaultConfig, focusDuration: 30 };
      expect(ConfigService.isDefaultConfig(modifiedConfig)).toBe(false);
    });
  });

  describe('exportConfig', () => {
    it('应该导出当前配置为JSON', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const exported = ConfigService.exportConfig();
      const parsed = JSON.parse(exported);
      
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.config).toEqual(defaultConfig);
      expect(parsed.exportedAt).toBeTypeOf('number');
    });
  });

  describe('importConfig', () => {
    it('应该导入有效的配置', () => {
      const configToImport = {
        version: '1.0.0',
        config: {
          ...defaultConfig,
          focusDuration: 30
        },
        exportedAt: Date.now()
      };
      
      localStorageMock.getItem.mockReturnValue(null);
      localStorageMock.setItem.mockImplementation(() => {}); // Reset mock to not throw
      
      ConfigService.importConfig(JSON.stringify(configToImport));
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该拒绝无效的导入格式', () => {
      expect(() => ConfigService.importConfig('invalid json')).toThrow(TimerException);
      expect(() => ConfigService.importConfig('{}')).toThrow(TimerException);
    });

    it('应该验证导入的配置', () => {
      const invalidConfig = {
        config: {
          focusDuration: -1
        }
      };
      
      expect(() => ConfigService.importConfig(JSON.stringify(invalidConfig))).toThrow(TimerException);
    });
  });
});