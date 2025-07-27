import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StatisticsService, type TimePeriod, type CustomTimeRange } from './StatisticsService';
import { HistoryService } from './HistoryService';
import { TimerState, type SessionRecord } from '../types';

// Mock HistoryService
vi.mock('./HistoryService');

describe('StatisticsService', () => {
  const mockRecords: SessionRecord[] = [
    {
      id: '1',
      type: TimerState.FOCUS,
      startTime: new Date('2024-01-15T09:00:00').getTime(),
      endTime: new Date('2024-01-15T09:25:00').getTime(),
      duration: 25 * 60 * 1000, // 25分钟
      isCompleted: true,
      isFailed: false
    },
    {
      id: '2',
      type: TimerState.REFLECTION,
      startTime: new Date('2024-01-15T09:25:00').getTime(),
      endTime: new Date('2024-01-15T09:28:00').getTime(),
      duration: 3 * 60 * 1000, // 3分钟
      isCompleted: true
    },
    {
      id: '3',
      type: TimerState.REST,
      startTime: new Date('2024-01-15T09:28:00').getTime(),
      endTime: new Date('2024-01-15T09:33:00').getTime(),
      duration: 5 * 60 * 1000, // 5分钟
      isCompleted: true
    },
    {
      id: '4',
      type: TimerState.FOCUS,
      startTime: new Date('2024-01-15T10:00:00').getTime(),
      endTime: new Date('2024-01-15T10:05:00').getTime(),
      duration: 5 * 60 * 1000, // 5分钟
      isCompleted: false,
      isFailed: true
    },
    {
      id: '5',
      type: TimerState.FOCUS,
      startTime: new Date('2024-01-16T14:00:00').getTime(),
      endTime: new Date('2024-01-16T14:30:00').getTime(),
      duration: 30 * 60 * 1000, // 30分钟
      isCompleted: true,
      isFailed: false
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 设置默认的 mock 返回值
    vi.mocked(HistoryService.getAllRecords).mockReturnValue(mockRecords);
    vi.mocked(HistoryService.getTodayRecords).mockReturnValue(mockRecords.slice(0, 4));
    vi.mocked(HistoryService.getWeekRecords).mockReturnValue(mockRecords);
    vi.mocked(HistoryService.getMonthRecords).mockReturnValue(mockRecords);
    vi.mocked(HistoryService.getRecordsByTimeRange).mockReturnValue(mockRecords);
    vi.mocked(HistoryService.calculateStatistics).mockImplementation((records = mockRecords) => {
      const focusRecords = records.filter(r => r.type === TimerState.FOCUS);
      const reflectionRecords = records.filter(r => r.type === TimerState.REFLECTION);
      const restRecords = records.filter(r => r.type === TimerState.REST);
      
      const completedFocusRecords = focusRecords.filter(r => r.isCompleted && !r.isFailed);
      const failedFocusRecords = focusRecords.filter(r => r.isFailed);
      
      return {
        totalFocusTime: focusRecords.reduce((sum, r) => sum + r.duration, 0),
        totalReflectionTime: reflectionRecords.reduce((sum, r) => sum + r.duration, 0),
        totalRestTime: restRecords.reduce((sum, r) => sum + r.duration, 0),
        focusSessionCount: completedFocusRecords.length,
        failedFocusCount: failedFocusRecords.length,
        averageFocusTime: completedFocusRecords.length > 0 
          ? completedFocusRecords.reduce((sum, r) => sum + r.duration, 0) / completedFocusRecords.length 
          : 0,
        longestFocusStreak: 2
      };
    });
  });

  describe('calculateExtendedStatistics', () => {
    it('应该计算今日扩展统计数据', () => {
      const stats = StatisticsService.calculateExtendedStatistics('today');
      
      expect(stats.totalSessions).toBe(4);
      expect(stats.completionRate).toBe(75); // 3/4 完成
      expect(stats.focusCompletionRate).toBe(50); // 1/2 专注完成
      expect(stats.periodType).toBe('today');
      expect(stats.averageSessionDuration).toBeGreaterThan(0);
      expect(stats.longestSession).toBeGreaterThan(0);
      expect(stats.shortestSession).toBeGreaterThan(0);
    });

    it('应该计算本周扩展统计数据', () => {
      const stats = StatisticsService.calculateExtendedStatistics('week');
      
      expect(stats.totalSessions).toBe(5);
      expect(stats.periodType).toBe('week');
      expect(stats.dailyAverages.focusTime).toBeGreaterThan(0);
      expect(stats.dailyAverages.sessions).toBeGreaterThan(0);
    });

    it('应该计算自定义时间范围的统计数据', () => {
      const customRange: CustomTimeRange = {
        startTime: new Date('2024-01-15T00:00:00').getTime(),
        endTime: new Date('2024-01-15T23:59:59').getTime()
      };
      
      const stats = StatisticsService.calculateExtendedStatistics('custom', customRange);
      
      expect(stats.periodType).toBe('custom');
      expect(stats.periodStart).toBe(customRange.startTime);
      expect(stats.periodEnd).toBe(customRange.endTime);
    });

    it('应该处理空记录的情况', () => {
      vi.mocked(HistoryService.getAllRecords).mockReturnValue([]);
      vi.mocked(HistoryService.calculateStatistics).mockReturnValue({
        totalFocusTime: 0,
        totalReflectionTime: 0,
        totalRestTime: 0,
        focusSessionCount: 0,
        failedFocusCount: 0,
        averageFocusTime: 0,
        longestFocusStreak: 0
      });
      
      const stats = StatisticsService.calculateExtendedStatistics('all');
      
      expect(stats.totalSessions).toBe(0);
      expect(stats.completionRate).toBe(0);
      expect(stats.focusCompletionRate).toBe(0);
      expect(stats.averageSessionDuration).toBe(0);
      expect(stats.longestSession).toBe(0);
      expect(stats.shortestSession).toBe(0);
    });

    it('应该抛出自定义时间范围缺少参数的错误', () => {
      expect(() => {
        StatisticsService.calculateExtendedStatistics('custom');
      }).toThrow('自定义时间范围需要提供 customRange 参数');
    });
  });

  describe('getDailyStatistics', () => {
    it('应该返回每日统计数据', () => {
      const dailyStats = StatisticsService.getDailyStatistics('week');
      
      expect(Array.isArray(dailyStats)).toBe(true);
      expect(dailyStats.length).toBeGreaterThan(0);
      
      const firstDay = dailyStats[0];
      expect(firstDay).toHaveProperty('date');
      expect(firstDay).toHaveProperty('timestamp');
      expect(firstDay).toHaveProperty('focusTime');
      expect(firstDay).toHaveProperty('reflectionTime');
      expect(firstDay).toHaveProperty('restTime');
      expect(firstDay).toHaveProperty('focusSessionCount');
      expect(firstDay).toHaveProperty('failedFocusCount');
      expect(firstDay).toHaveProperty('completionRate');
      
      expect(typeof firstDay.date).toBe('string');
      expect(firstDay.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('应该按时间顺序排序每日统计', () => {
      const dailyStats = StatisticsService.getDailyStatistics('month');
      
      for (let i = 1; i < dailyStats.length; i++) {
        expect(dailyStats[i].timestamp).toBeGreaterThanOrEqual(dailyStats[i - 1].timestamp);
      }
    });

    it('应该包含没有记录的日期', () => {
      // 模拟只有部分日期有记录的情况
      const partialRecords = [mockRecords[0]]; // 只有一天的记录
      vi.mocked(HistoryService.getWeekRecords).mockReturnValue(partialRecords);
      
      const dailyStats = StatisticsService.getDailyStatistics('week');
      
      expect(dailyStats.length).toBe(7); // 一周7天都应该包含
      
      // 检查是否有零值的日期
      const zeroFocusDays = dailyStats.filter(day => day.focusTime === 0);
      expect(zeroFocusDays.length).toBeGreaterThan(0);
    });
  });

  describe('getComparisonStatistics', () => {
    it('应该返回比较统计数据', () => {
      const comparison = StatisticsService.getComparisonStatistics('week', 'month');
      
      expect(comparison).toHaveProperty('current');
      expect(comparison).toHaveProperty('previous');
      expect(comparison).toHaveProperty('changes');
      
      expect(comparison.changes).toHaveProperty('focusTime');
      expect(comparison.changes).toHaveProperty('sessions');
      expect(comparison.changes).toHaveProperty('completionRate');
      
      expect(comparison.changes.focusTime).toHaveProperty('value');
      expect(comparison.changes.focusTime).toHaveProperty('percentage');
    });

    it('应该正确计算变化百分比', () => {
      // 模拟不同的统计数据
      vi.mocked(HistoryService.calculateStatistics)
        .mockReturnValueOnce({
          totalFocusTime: 100 * 60 * 1000, // 当前：100分钟
          totalReflectionTime: 0,
          totalRestTime: 0,
          focusSessionCount: 4,
          failedFocusCount: 0,
          averageFocusTime: 25 * 60 * 1000,
          longestFocusStreak: 2
        })
        .mockReturnValueOnce({
          totalFocusTime: 50 * 60 * 1000, // 之前：50分钟
          totalReflectionTime: 0,
          totalRestTime: 0,
          focusSessionCount: 2,
          failedFocusCount: 0,
          averageFocusTime: 25 * 60 * 1000,
          longestFocusStreak: 1
        });
      
      vi.mocked(HistoryService.getWeekRecords)
        .mockReturnValueOnce(mockRecords.slice(0, 4)) // 当前周4个记录
        .mockReturnValueOnce(mockRecords.slice(0, 2)); // 之前周2个记录
      
      const comparison = StatisticsService.getComparisonStatistics('week', 'week');
      
      expect(comparison.changes.focusTime.percentage).toBe(100); // 增长100%
      expect(comparison.changes.sessions.percentage).toBe(100); // 增长100%
    });
  });

  describe('getHeatmapData', () => {
    it('应该返回热力图数据', () => {
      const heatmapData = StatisticsService.getHeatmapData('month');
      
      expect(Array.isArray(heatmapData)).toBe(true);
      
      if (heatmapData.length > 0) {
        const firstItem = heatmapData[0];
        expect(firstItem).toHaveProperty('date');
        expect(firstItem).toHaveProperty('value');
        expect(firstItem).toHaveProperty('level');
        
        expect(typeof firstItem.date).toBe('string');
        expect(typeof firstItem.value).toBe('number');
        expect(typeof firstItem.level).toBe('number');
        expect(firstItem.level).toBeGreaterThanOrEqual(0);
        expect(firstItem.level).toBeLessThanOrEqual(4);
      }
    });

    it('应该正确计算强度等级', () => {
      // 模拟有明显差异的每日数据
      const mockDailyStats = [
        { date: '2024-01-01', focusTime: 0, reflectionTime: 0, restTime: 0, focusSessionCount: 0, failedFocusCount: 0, completionRate: 0, timestamp: 0 },
        { date: '2024-01-02', focusTime: 25 * 60 * 1000, reflectionTime: 0, restTime: 0, focusSessionCount: 1, failedFocusCount: 0, completionRate: 100, timestamp: 0 },
        { date: '2024-01-03', focusTime: 100 * 60 * 1000, reflectionTime: 0, restTime: 0, focusSessionCount: 4, failedFocusCount: 0, completionRate: 100, timestamp: 0 }
      ];
      
      vi.spyOn(StatisticsService, 'getDailyStatistics').mockReturnValue(mockDailyStats);
      
      const heatmapData = StatisticsService.getHeatmapData('month');
      
      expect(heatmapData[0].level).toBe(0); // 无活动
      expect(heatmapData[1].level).toBeGreaterThan(0); // 有活动
      expect(heatmapData[2].level).toBe(4); // 最高活动
    });
  });

  describe('getHourlyDistribution', () => {
    it('应该返回24小时分布数据', () => {
      const hourlyData = StatisticsService.getHourlyDistribution('today');
      
      expect(hourlyData).toHaveLength(24);
      
      hourlyData.forEach((hour, index) => {
        expect(hour.hour).toBe(index);
        expect(typeof hour.focusTime).toBe('number');
        expect(typeof hour.sessionCount).toBe('number');
        expect(hour.focusTime).toBeGreaterThanOrEqual(0);
        expect(hour.sessionCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该正确统计各小时的数据', () => {
      // 检查9点和10点的数据（根据 mockRecords）
      const hourlyData = StatisticsService.getHourlyDistribution('today');
      
      const hour9 = hourlyData[9];
      const hour10 = hourlyData[10];
      
      expect(hour9.sessionCount).toBeGreaterThan(0); // 9点有记录
      expect(hour10.sessionCount).toBeGreaterThan(0); // 10点有记录
    });
  });

  describe('getWeeklyDistribution', () => {
    it('应该返回一周7天的分布数据', () => {
      const weeklyData = StatisticsService.getWeeklyDistribution('month');
      
      expect(weeklyData).toHaveLength(7);
      
      weeklyData.forEach((day, index) => {
        expect(day.dayOfWeek).toBe(index);
        expect(typeof day.dayName).toBe('string');
        expect(typeof day.focusTime).toBe('number');
        expect(typeof day.sessionCount).toBe('number');
        expect(day.focusTime).toBeGreaterThanOrEqual(0);
        expect(day.sessionCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('应该包含正确的星期名称', () => {
      const weeklyData = StatisticsService.getWeeklyDistribution('week');
      const expectedNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      
      weeklyData.forEach((day, index) => {
        expect(day.dayName).toBe(expectedNames[index]);
      });
    });
  });

  describe('getFocusDurationDistribution', () => {
    it('应该返回专注时长分布数据', () => {
      const distribution = StatisticsService.getFocusDurationDistribution('all');
      
      expect(Array.isArray(distribution)).toBe(true);
      expect(distribution.length).toBeGreaterThan(0);
      
      distribution.forEach(range => {
        expect(range).toHaveProperty('range');
        expect(range).toHaveProperty('count');
        expect(range).toHaveProperty('percentage');
        
        expect(typeof range.range).toBe('string');
        expect(typeof range.count).toBe('number');
        expect(typeof range.percentage).toBe('number');
        expect(range.count).toBeGreaterThanOrEqual(0);
        expect(range.percentage).toBeGreaterThanOrEqual(0);
        expect(range.percentage).toBeLessThanOrEqual(100);
      });
    });

    it('应该正确计算百分比总和', () => {
      const distribution = StatisticsService.getFocusDurationDistribution('all');
      const totalPercentage = distribution.reduce((sum, range) => sum + range.percentage, 0);
      
      // 允许浮点数精度误差
      expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.01);
    });
  });

  describe('getTrendData', () => {
    it('应该返回趋势数据', () => {
      const trendData = StatisticsService.getTrendData('week');
      
      expect(Array.isArray(trendData)).toBe(true);
      
      if (trendData.length > 0) {
        const firstItem = trendData[0];
        expect(firstItem).toHaveProperty('date');
        expect(firstItem).toHaveProperty('focusTime');
        expect(firstItem).toHaveProperty('reflectionTime');
        expect(firstItem).toHaveProperty('restTime');
        expect(firstItem).toHaveProperty('sessions');
        expect(firstItem).toHaveProperty('completionRate');
        
        expect(typeof firstItem.date).toBe('string');
        expect(typeof firstItem.focusTime).toBe('number');
        expect(typeof firstItem.reflectionTime).toBe('number');
        expect(typeof firstItem.restTime).toBe('number');
        expect(typeof firstItem.sessions).toBe('number');
        expect(typeof firstItem.completionRate).toBe('number');
      }
    });

    it('应该将时间转换为分钟', () => {
      const trendData = StatisticsService.getTrendData('today');
      
      // 时间应该是分钟单位，不是毫秒
      trendData.forEach(day => {
        expect(day.focusTime).toBeLessThan(1000); // 不太可能有1000分钟的专注
        expect(day.reflectionTime).toBeLessThan(1000);
        expect(day.restTime).toBeLessThan(1000);
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理不支持的时间段类型', () => {
      expect(() => {
        StatisticsService.calculateExtendedStatistics('invalid' as TimePeriod);
      }).toThrow('不支持的时间段类型');
    });

    it('应该处理 HistoryService 抛出的错误', () => {
      vi.mocked(HistoryService.getAllRecords).mockImplementation(() => {
        throw new Error('存储错误');
      });
      
      expect(() => {
        StatisticsService.calculateExtendedStatistics('all');
      }).toThrow('存储错误');
    });
  });

  describe('边界情况', () => {
    it('应该处理单个记录的情况', () => {
      const singleRecord = [mockRecords[0]];
      vi.mocked(HistoryService.getAllRecords).mockReturnValue(singleRecord);
      vi.mocked(HistoryService.calculateStatistics).mockReturnValue({
        totalFocusTime: singleRecord[0].duration,
        totalReflectionTime: 0,
        totalRestTime: 0,
        focusSessionCount: 1,
        failedFocusCount: 0,
        averageFocusTime: singleRecord[0].duration,
        longestFocusStreak: 1
      });
      
      const stats = StatisticsService.calculateExtendedStatistics('all');
      
      expect(stats.totalSessions).toBe(1);
      expect(stats.longestSession).toBe(singleRecord[0].duration);
      expect(stats.shortestSession).toBe(singleRecord[0].duration);
    });

    it('应该处理跨年的时间范围', () => {
      const customRange: CustomTimeRange = {
        startTime: new Date('2023-12-01T00:00:00').getTime(),
        endTime: new Date('2024-02-01T23:59:59').getTime()
      };
      
      expect(() => {
        StatisticsService.calculateExtendedStatistics('custom', customRange);
      }).not.toThrow();
    });
  });
});