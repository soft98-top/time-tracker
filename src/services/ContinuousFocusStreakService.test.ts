import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ContinuousFocusStreakService } from './ContinuousFocusStreakService';
import { StorageManager } from './StorageManager';
import { 
  ContinuousFocusStreak, 
  defaultContinuousFocusStreak,
  SessionRecord,
  TimerConfig,
  TimerState,
  TimerError,
  TimerException,
  defaultConfig
} from '../types';

// Mock StorageManager
vi.mock('./StorageManager', () => ({
  StorageManager: {
    getItem: vi.fn(),
    setItem: vi.fn(),
    restoreFromBackup: vi.fn()
  }
}));

describe('ContinuousFocusStreakService', () => {
  const mockStorageManager = StorageManager as any;

  beforeEach(() => {
    vi.clearAllMocks();
    // 清理 localStorage
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadStreak', () => {
    it('应该返回默认值当存储为空时', () => {
      mockStorageManager.getItem.mockReturnValue(null);

      const result = ContinuousFocusStreakService.loadStreak();

      expect(result).toEqual(defaultContinuousFocusStreak);
      expect(mockStorageManager.getItem).toHaveBeenCalledWith(
        'continuous-focus-streak',
        defaultContinuousFocusStreak
      );
    });

    it('应该返回存储的连续专注次数', () => {
      const storedStreak: ContinuousFocusStreak = {
        count: 5,
        lastUpdateTime: Date.now(),
        lastSessionId: 'session-123'
      };
      mockStorageManager.getItem.mockReturnValue(storedStreak);

      const result = ContinuousFocusStreakService.loadStreak();

      expect(result).toEqual(storedStreak);
    });

    it('应该验证和清理无效数据', () => {
      const invalidStreak = {
        count: -5, // 负数
        lastUpdateTime: Date.now() + 1000000, // 未来时间
        lastSessionId: 123 // 非字符串
      };
      mockStorageManager.getItem.mockReturnValue(invalidStreak);

      const result = ContinuousFocusStreakService.loadStreak();

      expect(result.count).toBe(0); // 负数被修正为0
      expect(result.lastUpdateTime).toBeLessThanOrEqual(Date.now()); // 未来时间被修正
      expect(result.lastSessionId).toBeUndefined(); // 非字符串被清除
    });

    it('应该在存储错误时返回默认值', () => {
      mockStorageManager.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = ContinuousFocusStreakService.loadStreak();

      expect(result).toEqual(defaultContinuousFocusStreak);
    });
  });

  describe('saveStreak', () => {
    it('应该保存有效的连续专注次数', () => {
      const streak: ContinuousFocusStreak = {
        count: 3,
        lastUpdateTime: Date.now(),
        lastSessionId: 'session-456'
      };

      ContinuousFocusStreakService.saveStreak(streak);

      expect(mockStorageManager.setItem).toHaveBeenCalledWith(
        'continuous-focus-streak',
        streak
      );
    });

    it('应该验证和清理数据后再保存', () => {
      const invalidStreak = {
        count: -2,
        lastUpdateTime: Date.now() + 1000000,
        lastSessionId: null
      } as any;

      ContinuousFocusStreakService.saveStreak(invalidStreak);

      expect(mockStorageManager.setItem).toHaveBeenCalledWith(
        'continuous-focus-streak',
        expect.objectContaining({
          count: 0,
          lastUpdateTime: expect.any(Number),
          lastSessionId: undefined
        })
      );
    });

    it('应该在存储错误时抛出异常', () => {
      mockStorageManager.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const streak: ContinuousFocusStreak = {
        count: 1,
        lastUpdateTime: Date.now()
      };

      expect(() => {
        ContinuousFocusStreakService.saveStreak(streak);
      }).toThrow(TimerException);
    });
  });

  describe('incrementStreak', () => {
    it('应该增加连续专注次数', () => {
      const currentStreak: ContinuousFocusStreak = {
        count: 2,
        lastUpdateTime: Date.now() - 1000
      };
      mockStorageManager.getItem.mockReturnValue(currentStreak);

      const result = ContinuousFocusStreakService.incrementStreak('session-789');

      expect(result.count).toBe(3);
      expect(result.lastSessionId).toBe('session-789');
      expect(result.lastUpdateTime).toBeGreaterThan(currentStreak.lastUpdateTime);
      expect(mockStorageManager.setItem).toHaveBeenCalled();
    });

    it('应该从0开始增加', () => {
      mockStorageManager.getItem.mockReturnValue(defaultContinuousFocusStreak);

      const result = ContinuousFocusStreakService.incrementStreak('first-session');

      expect(result.count).toBe(1);
      expect(result.lastSessionId).toBe('first-session');
    });

    it('应该在存储错误时抛出异常', () => {
      mockStorageManager.getItem.mockReturnValue(defaultContinuousFocusStreak);
      mockStorageManager.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => {
        ContinuousFocusStreakService.incrementStreak('session-id');
      }).toThrow(TimerException);
    });
  });

  describe('resetStreak', () => {
    it('应该重置连续专注次数为0', () => {
      const result = ContinuousFocusStreakService.resetStreak();

      expect(result.count).toBe(0);
      expect(result.lastUpdateTime).toBeCloseTo(Date.now(), -2);
      expect(result.lastSessionId).toBeUndefined();
      expect(mockStorageManager.setItem).toHaveBeenCalledWith(
        'continuous-focus-streak',
        result
      );
    });

    it('应该在存储错误时抛出异常', () => {
      mockStorageManager.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(() => {
        ContinuousFocusStreakService.resetStreak();
      }).toThrow(TimerException);
    });
  });

  describe('shouldIncrementStreak', () => {
    const config: TimerConfig = defaultConfig;

    it('应该在成功完成专注会话时返回true', () => {
      const session: SessionRecord = {
        id: 'session-1',
        type: TimerState.FOCUS,
        startTime: Date.now() - 25 * 60 * 1000,
        endTime: Date.now(),
        duration: 25 * 60 * 1000, // 25分钟
        isCompleted: true,
        isFailed: false
      };

      const result = ContinuousFocusStreakService.shouldIncrementStreak(session, config);

      expect(result).toBe(true);
    });

    it('应该在专注时间达到目标时间时返回true', () => {
      const session: SessionRecord = {
        id: 'session-2',
        type: TimerState.FOCUS,
        startTime: Date.now() - 30 * 60 * 1000,
        endTime: Date.now(),
        duration: 30 * 60 * 1000, // 30分钟，超过目标25分钟
        isCompleted: true
      };

      const result = ContinuousFocusStreakService.shouldIncrementStreak(session, config);

      expect(result).toBe(true);
    });

    it('应该在使用自定义目标时间时正确判断', () => {
      const session: SessionRecord = {
        id: 'session-3',
        type: TimerState.FOCUS,
        startTime: Date.now() - 45 * 60 * 1000,
        endTime: Date.now(),
        duration: 45 * 60 * 1000, // 45分钟
        isCompleted: true,
        metadata: {
          targetDuration: 45, // 自定义45分钟目标
          wasInterrupted: false
        }
      };

      const result = ContinuousFocusStreakService.shouldIncrementStreak(session, config);

      expect(result).toBe(true);
    });

    it('应该在非专注会话时返回false', () => {
      const session: SessionRecord = {
        id: 'session-4',
        type: TimerState.REST,
        startTime: Date.now() - 5 * 60 * 1000,
        endTime: Date.now(),
        duration: 5 * 60 * 1000,
        isCompleted: true
      };

      const result = ContinuousFocusStreakService.shouldIncrementStreak(session, config);

      expect(result).toBe(false);
    });

    it('应该在会话未完成时返回false', () => {
      const session: SessionRecord = {
        id: 'session-5',
        type: TimerState.FOCUS,
        startTime: Date.now() - 10 * 60 * 1000,
        endTime: Date.now(),
        duration: 10 * 60 * 1000, // 只有10分钟
        isCompleted: false
      };

      const result = ContinuousFocusStreakService.shouldIncrementStreak(session, config);

      expect(result).toBe(false);
    });

    it('应该在会话失败时返回false', () => {
      const session: SessionRecord = {
        id: 'session-6',
        type: TimerState.FOCUS,
        startTime: Date.now() - 25 * 60 * 1000,
        endTime: Date.now(),
        duration: 25 * 60 * 1000,
        isCompleted: true,
        isFailed: true
      };

      const result = ContinuousFocusStreakService.shouldIncrementStreak(session, config);

      expect(result).toBe(false);
    });

    it('应该在专注时间不足时返回false', () => {
      const session: SessionRecord = {
        id: 'session-7',
        type: TimerState.FOCUS,
        startTime: Date.now() - 20 * 60 * 1000,
        endTime: Date.now(),
        duration: 20 * 60 * 1000, // 只有20分钟，不足25分钟
        isCompleted: true
      };

      const result = ContinuousFocusStreakService.shouldIncrementStreak(session, config);

      expect(result).toBe(false);
    });
  });

  describe('shouldResetStreak', () => {
    const config: TimerConfig = defaultConfig;

    it('应该在专注会话失败时返回true', () => {
      const session: SessionRecord = {
        id: 'session-1',
        type: TimerState.FOCUS,
        startTime: Date.now() - 10 * 60 * 1000,
        endTime: Date.now(),
        duration: 10 * 60 * 1000,
        isCompleted: false,
        isFailed: true
      };

      const result = ContinuousFocusStreakService.shouldResetStreak(session, config);

      expect(result).toBe(true);
    });

    it('应该在专注时间不足且未完成时返回true', () => {
      const session: SessionRecord = {
        id: 'session-2',
        type: TimerState.FOCUS,
        startTime: Date.now() - 15 * 60 * 1000,
        endTime: Date.now(),
        duration: 15 * 60 * 1000, // 15分钟，不足25分钟
        isCompleted: false
      };

      const result = ContinuousFocusStreakService.shouldResetStreak(session, config);

      expect(result).toBe(true);
    });

    it('应该在非专注会话时返回false', () => {
      const session: SessionRecord = {
        id: 'session-3',
        type: TimerState.REST,
        startTime: Date.now() - 3 * 60 * 1000,
        endTime: Date.now(),
        duration: 3 * 60 * 1000,
        isCompleted: false
      };

      const result = ContinuousFocusStreakService.shouldResetStreak(session, config);

      expect(result).toBe(false);
    });

    it('应该在成功完成专注会话时返回false', () => {
      const session: SessionRecord = {
        id: 'session-4',
        type: TimerState.FOCUS,
        startTime: Date.now() - 25 * 60 * 1000,
        endTime: Date.now(),
        duration: 25 * 60 * 1000,
        isCompleted: true,
        isFailed: false
      };

      const result = ContinuousFocusStreakService.shouldResetStreak(session, config);

      expect(result).toBe(false);
    });
  });

  describe('recoverFromError', () => {
    it('应该尝试从备份恢复', () => {
      const backupStreak: ContinuousFocusStreak = {
        count: 7,
        lastUpdateTime: Date.now(),
        lastSessionId: 'backup-session'
      };
      
      mockStorageManager.restoreFromBackup.mockReturnValue(true);
      mockStorageManager.getItem.mockReturnValue(backupStreak);

      const result = ContinuousFocusStreakService.recoverFromError();

      expect(mockStorageManager.restoreFromBackup).toHaveBeenCalledWith('continuous-focus-streak');
      expect(result).toEqual(backupStreak);
    });

    it('应该在备份恢复失败时返回默认值', () => {
      mockStorageManager.restoreFromBackup.mockReturnValue(false);

      const result = ContinuousFocusStreakService.recoverFromError();

      expect(result).toEqual(defaultContinuousFocusStreak);
    });

    it('应该在备份恢复抛出异常时返回默认值', () => {
      mockStorageManager.restoreFromBackup.mockImplementation(() => {
        throw new Error('Backup error');
      });

      const result = ContinuousFocusStreakService.recoverFromError();

      expect(result).toEqual(defaultContinuousFocusStreak);
    });
  });

  describe('getDisplayText', () => {
    it('应该返回正确的显示文本', () => {
      const streak: ContinuousFocusStreak = {
        count: 5,
        lastUpdateTime: Date.now()
      };

      const result = ContinuousFocusStreakService.getDisplayText(streak);

      expect(result).toBe('已持续专注5次');
    });

    it('应该处理0次的情况', () => {
      const streak: ContinuousFocusStreak = {
        count: 0,
        lastUpdateTime: Date.now()
      };

      const result = ContinuousFocusStreakService.getDisplayText(streak);

      expect(result).toBe('已持续专注0次');
    });
  });

  describe('validateStreakHealth', () => {
    it('应该在健康数据时返回健康状态', () => {
      const healthyStreak: ContinuousFocusStreak = {
        count: 5,
        lastUpdateTime: Date.now() - 1000
      };
      mockStorageManager.getItem.mockReturnValue(healthyStreak);

      const result = ContinuousFocusStreakService.validateStreakHealth();

      expect(result.isHealthy).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
    });

    it('应该检测负数次数', () => {
      const invalidStreak: ContinuousFocusStreak = {
        count: -1,
        lastUpdateTime: Date.now()
      };
      mockStorageManager.getItem.mockReturnValue(invalidStreak);

      const result = ContinuousFocusStreakService.validateStreakHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.issues).toContain('连续专注次数为负数');
      expect(result.recommendations).toContain('重置连续专注次数');
    });

    it('应该检测异常高的次数', () => {
      const invalidStreak: ContinuousFocusStreak = {
        count: 15000,
        lastUpdateTime: Date.now()
      };
      mockStorageManager.getItem.mockReturnValue(invalidStreak);

      const result = ContinuousFocusStreakService.validateStreakHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.issues).toContain('连续专注次数异常高');
      expect(result.recommendations).toContain('检查数据是否正确');
    });

    it('应该检测未来时间戳', () => {
      const invalidStreak: ContinuousFocusStreak = {
        count: 3,
        lastUpdateTime: Date.now() + 1000000 // 未来时间
      };
      mockStorageManager.getItem.mockReturnValue(invalidStreak);

      const result = ContinuousFocusStreakService.validateStreakHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.issues).toContain('最后更新时间在未来');
      expect(result.recommendations).toContain('重置时间戳');
    });

    it('应该检测过于久远的时间戳', () => {
      const oneYearAgo = Date.now() - 365 * 24 * 60 * 60 * 1000;
      const invalidStreak: ContinuousFocusStreak = {
        count: 3,
        lastUpdateTime: oneYearAgo - 1000 // 超过一年前
      };
      mockStorageManager.getItem.mockReturnValue(invalidStreak);

      const result = ContinuousFocusStreakService.validateStreakHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.issues).toContain('最后更新时间过于久远');
      expect(result.recommendations).toContain('考虑重置连续专注次数');
    });

    it('应该处理加载错误', () => {
      mockStorageManager.getItem.mockImplementation(() => {
        throw new Error('Load error');
      });

      const result = ContinuousFocusStreakService.validateStreakHealth();

      expect(result.isHealthy).toBe(false);
      expect(result.issues).toContain('无法加载连续专注次数数据');
      expect(result.recommendations).toContain('尝试从备份恢复或重置数据');
    });
  });
});