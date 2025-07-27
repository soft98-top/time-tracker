import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HistoryService } from './HistoryService';
import { SessionRecord, TimerState, TimerError, TimerException } from '../types';

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

describe('HistoryService', () => {
  const mockRecord: Omit<SessionRecord, 'id'> = {
    type: TimerState.FOCUS,
    startTime: Date.now() - 1500000, // 25分钟前
    endTime: Date.now(),
    duration: 1500000, // 25分钟
    isCompleted: true,
    isFailed: false,
    metadata: {
      targetDuration: 1500000,
      wasInterrupted: false
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    localStorageMock.removeItem.mockImplementation(() => {});
  });

  describe('addRecord', () => {
    it('应该添加有效的会话记录', () => {
      const record = HistoryService.addRecord(mockRecord);
      
      expect(record.id).toBeDefined();
      expect(record.type).toBe(mockRecord.type);
      expect(record.startTime).toBe(mockRecord.startTime);
      expect(record.endTime).toBe(mockRecord.endTime);
      expect(record.duration).toBe(mockRecord.duration);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该生成唯一ID', () => {
      const record1 = HistoryService.addRecord(mockRecord);
      const record2 = HistoryService.addRecord(mockRecord);
      
      expect(record1.id).not.toBe(record2.id);
    });

    it('应该验证记录数据', () => {
      const invalidRecord = {
        ...mockRecord,
        startTime: -1 // 无效时间戳
      };
      
      expect(() => HistoryService.addRecord(invalidRecord)).toThrow(TimerException);
    });

    it('应该验证时间一致性', () => {
      const inconsistentRecord = {
        ...mockRecord,
        duration: 1000, // 与时间戳不一致
      };
      
      expect(() => HistoryService.addRecord(inconsistentRecord)).toThrow(TimerException);
    });
  });

  describe('getAllRecords', () => {
    it('应该返回空数组当没有记录时', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const records = HistoryService.getAllRecords();
      
      expect(records).toEqual([]);
    });

    it('应该返回存储的记录', () => {
      const storedData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'test-id' }]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const records = HistoryService.getAllRecords();
      
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('test-id');
    });

    it('应该处理版本不匹配', () => {
      const storedData = {
        version: '0.9.0',
        records: [{ ...mockRecord, id: 'test-id' }]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const records = HistoryService.getAllRecords();
      
      expect(records).toEqual([]);
    });

    it('应该跳过无效记录', () => {
      const storedData = {
        version: '1.0.0',
        records: [
          { ...mockRecord, id: 'valid-id' },
          { ...mockRecord, id: 'invalid-id', startTime: -1 } // 无效记录
        ]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const records = HistoryService.getAllRecords();
      
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('valid-id');
    });
  });

  describe('getRecordById', () => {
    it('应该返回指定ID的记录', () => {
      const storedData = {
        version: '1.0.0',
        records: [
          { ...mockRecord, id: 'test-id-1' },
          { ...mockRecord, id: 'test-id-2' }
        ]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const record = HistoryService.getRecordById('test-id-1');
      
      expect(record).not.toBeNull();
      expect(record!.id).toBe('test-id-1');
    });

    it('应该返回null当记录不存在时', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const record = HistoryService.getRecordById('non-existent');
      
      expect(record).toBeNull();
    });
  });

  describe('getRecordsByType', () => {
    it('应该按类型筛选记录', () => {
      const storedData = {
        version: '1.0.0',
        records: [
          { ...mockRecord, id: 'focus-1', type: TimerState.FOCUS },
          { ...mockRecord, id: 'rest-1', type: TimerState.REST },
          { ...mockRecord, id: 'focus-2', type: TimerState.FOCUS }
        ]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const focusRecords = HistoryService.getRecordsByType(TimerState.FOCUS);
      
      expect(focusRecords).toHaveLength(2);
      expect(focusRecords.every(r => r.type === TimerState.FOCUS)).toBe(true);
    });
  });

  describe('getRecordsByTimeRange', () => {
    it('应该按时间范围筛选记录', () => {
      const now = Date.now();
      const oneHourAgo = now - 3600000;
      const twoHoursAgo = now - 7200000;
      
      const storedData = {
        version: '1.0.0',
        records: [
          { 
            ...mockRecord, 
            id: 'recent', 
            startTime: oneHourAgo, 
            endTime: now,
            duration: 3600000
          },
          { 
            ...mockRecord, 
            id: 'old', 
            startTime: twoHoursAgo, 
            endTime: twoHoursAgo + 1800000,
            duration: 1800000
          }
        ]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const recentRecords = HistoryService.getRecordsByTimeRange(oneHourAgo - 1000, now + 1000);
      
      expect(recentRecords).toHaveLength(1);
      expect(recentRecords[0].id).toBe('recent');
    });
  });

  describe('updateRecord', () => {
    it('应该更新存在的记录', () => {
      const storedData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'test-id' }]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const updatedRecord = HistoryService.updateRecord('test-id', { isCompleted: false });
      
      expect(updatedRecord).not.toBeNull();
      expect(updatedRecord!.isCompleted).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该返回null当记录不存在时', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = HistoryService.updateRecord('non-existent', { isCompleted: false });
      
      expect(result).toBeNull();
    });

    it('应该验证更新后的记录', () => {
      const storedData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'test-id' }]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      expect(() => {
        HistoryService.updateRecord('test-id', { startTime: -1 });
      }).toThrow(TimerException);
    });
  });

  describe('deleteRecord', () => {
    it('应该删除存在的记录', () => {
      const storedData = {
        version: '1.0.0',
        records: [
          { ...mockRecord, id: 'test-id-1' },
          { ...mockRecord, id: 'test-id-2' }
        ]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const result = HistoryService.deleteRecord('test-id-1');
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该返回false当记录不存在时', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = HistoryService.deleteRecord('non-existent');
      
      expect(result).toBe(false);
    });
  });

  describe('clearAllRecords', () => {
    it('应该清空所有记录', () => {
      HistoryService.clearAllRecords();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('flexible-pomodoro-history');
    });

    it('应该处理localStorage错误', () => {
      localStorageMock.removeItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      expect(() => HistoryService.clearAllRecords()).toThrow(TimerException);
    });
  });

  describe('calculateStatistics', () => {
    it('应该计算正确的统计数据', () => {
      const records: SessionRecord[] = [
        {
          id: '1',
          type: TimerState.FOCUS,
          startTime: 1000,
          endTime: 2500000,
          duration: 1500000, // 25分钟
          isCompleted: true,
          isFailed: false
        },
        {
          id: '2',
          type: TimerState.FOCUS,
          startTime: 3000000,
          endTime: 4200000,
          duration: 1200000, // 20分钟
          isCompleted: true,
          isFailed: false
        },
        {
          id: '3',
          type: TimerState.FOCUS,
          startTime: 5000000,
          endTime: 5120000,
          duration: 120000, // 2分钟，失败
          isCompleted: false,
          isFailed: true
        },
        {
          id: '4',
          type: TimerState.REST,
          startTime: 6000000,
          endTime: 6300000,
          duration: 300000, // 5分钟
          isCompleted: true,
          isFailed: false
        }
      ];
      
      const stats = HistoryService.calculateStatistics(records);
      
      expect(stats.totalFocusTime).toBe(2820000); // 25+20+2分钟
      expect(stats.totalRestTime).toBe(300000); // 5分钟
      expect(stats.focusSessionCount).toBe(2); // 只计算完成的
      expect(stats.failedFocusCount).toBe(1);
      expect(stats.averageFocusTime).toBe(1350000); // (25+20)/2分钟
    });

    it('应该计算最长专注连续次数', () => {
      const records: SessionRecord[] = [
        {
          id: '1',
          type: TimerState.FOCUS,
          startTime: 1000,
          endTime: 1500000,
          duration: 1500000,
          isCompleted: true,
          isFailed: false
        },
        {
          id: '2',
          type: TimerState.FOCUS,
          startTime: 2000000,
          endTime: 3500000,
          duration: 1500000,
          isCompleted: true,
          isFailed: false
        },
        {
          id: '3',
          type: TimerState.FOCUS,
          startTime: 4000000,
          endTime: 4120000,
          duration: 120000,
          isCompleted: false,
          isFailed: true
        },
        {
          id: '4',
          type: TimerState.FOCUS,
          startTime: 5000000,
          endTime: 6500000,
          duration: 1500000,
          isCompleted: true,
          isFailed: false
        }
      ];
      
      const stats = HistoryService.calculateStatistics(records);
      
      expect(stats.longestFocusStreak).toBe(2); // 前两次连续成功
    });
  });

  describe('时间范围查询', () => {
    beforeEach(() => {
      // Mock Date for consistent testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-15 10:00:00')); // 周一
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('应该获取今日记录', () => {
      const today = new Date('2024-01-15 08:00:00').getTime();
      const yesterday = new Date('2024-01-14 08:00:00').getTime();
      
      const storedData = {
        version: '1.0.0',
        records: [
          { 
            ...mockRecord, 
            id: 'today', 
            startTime: today, 
            endTime: today + 1800000,
            duration: 1800000
          },
          { 
            ...mockRecord, 
            id: 'yesterday', 
            startTime: yesterday, 
            endTime: yesterday + 1800000,
            duration: 1800000
          }
        ]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const todayRecords = HistoryService.getTodayRecords();
      
      expect(todayRecords).toHaveLength(1);
      expect(todayRecords[0].id).toBe('today');
    });
  });

  describe('exportRecords', () => {
    it('应该导出所有记录', () => {
      const storedData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'test-id' }]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const exported = HistoryService.exportRecords();
      const parsed = JSON.parse(exported);
      
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.records).toHaveLength(1);
      expect(parsed.exportedAt).toBeTypeOf('number');
    });
  });

  describe('importRecords', () => {
    it('应该导入有效记录（替换模式）', () => {
      const importData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'imported-id' }]
      };
      
      HistoryService.importRecords(JSON.stringify(importData), false);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该导入有效记录（合并模式）', () => {
      const existingData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'existing-id' }]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingData));
      
      const importData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'imported-id' }]
      };
      
      HistoryService.importRecords(JSON.stringify(importData), true);
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('应该跳过重复记录在合并模式下', () => {
      const existingData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'duplicate-id' }]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(existingData));
      
      const importData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'duplicate-id' }] // 相同ID
      };
      
      HistoryService.importRecords(JSON.stringify(importData), true);
      
      // 应该只调用一次setItem（没有新记录添加）
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('应该拒绝无效格式', () => {
      expect(() => HistoryService.importRecords('invalid json')).toThrow(TimerException);
      expect(() => HistoryService.importRecords('{}')).toThrow(TimerException);
    });
  });

  describe('getStorageInfo', () => {
    it('应该返回存储信息', () => {
      const storedData = {
        version: '1.0.0',
        records: [{ ...mockRecord, id: 'test-id' }]
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedData));
      
      const info = HistoryService.getStorageInfo();
      
      expect(info.recordCount).toBe(1);
      expect(info.estimatedSize).toBeGreaterThan(0);
      expect(info.maxRecords).toBe(10000);
    });
  });
});