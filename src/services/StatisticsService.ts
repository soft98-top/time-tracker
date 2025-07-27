import type { SessionRecord, Statistics } from '../types';
import { TimerState } from '../types';
import { HistoryService } from './HistoryService';

/**
 * 时间段类型
 */
export type TimePeriod = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

/**
 * 自定义时间范围
 */
export interface CustomTimeRange {
  startTime: number;
  endTime: number;
}

/**
 * 扩展统计数据接口
 */
export interface ExtendedStatistics extends Statistics {
  // 基础统计
  totalSessions: number;
  completionRate: number;
  
  // 时间分布
  averageSessionDuration: number;
  longestSession: number;
  shortestSession: number;
  
  // 专注相关
  focusCompletionRate: number;
  averageReflectionTime: number;
  averageRestTime: number;
  
  // 趋势数据
  dailyAverages: {
    focusTime: number;
    sessions: number;
  };
  
  // 时间段信息
  periodStart: number;
  periodEnd: number;
  periodType: TimePeriod;
}

/**
 * 每日统计数据
 */
export interface DailyStatistics {
  date: string; // YYYY-MM-DD 格式
  timestamp: number;
  focusTime: number;
  reflectionTime: number;
  restTime: number;
  focusSessionCount: number;
  failedFocusCount: number;
  completionRate: number;
}

/**
 * 统计计算服务类
 */
export class StatisticsService {
  
  /**
   * 获取指定时间段的记录
   */
  private static getRecordsByPeriod(period: TimePeriod, customRange?: CustomTimeRange): SessionRecord[] {
    switch (period) {
      case 'today':
        return HistoryService.getTodayRecords();
      case 'week':
        return HistoryService.getWeekRecords();
      case 'month':
        return HistoryService.getMonthRecords();
      case 'year':
        return this.getYearRecords();
      case 'all':
        return HistoryService.getAllRecords();
      case 'custom':
        if (!customRange) {
          throw new Error('自定义时间范围需要提供 customRange 参数');
        }
        return HistoryService.getRecordsByTimeRange(customRange.startTime, customRange.endTime);
      default:
        throw new Error(`不支持的时间段类型: ${period}`);
    }
  }

  /**
   * 获取本年记录
   */
  private static getYearRecords(): SessionRecord[] {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1).getTime();
    const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
    
    return HistoryService.getRecordsByTimeRange(startOfYear, endOfYear);
  }

  /**
   * 获取时间段的开始和结束时间
   */
  private static getPeriodRange(period: TimePeriod, customRange?: CustomTimeRange): { start: number; end: number } {
    const now = Date.now();
    
    switch (period) {
      case 'today': {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const end = start + 24 * 60 * 60 * 1000 - 1;
        return { start, end };
      }
      case 'week': {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const start = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
        return { start: start.getTime(), end: end.getTime() };
      }
      case 'month': {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        return { start, end };
      }
      case 'year': {
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 1).getTime();
        const end = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999).getTime();
        return { start, end };
      }
      case 'all': {
        const allRecords = HistoryService.getAllRecords();
        if (allRecords.length === 0) {
          return { start: now, end: now };
        }
        const start = Math.min(...allRecords.map(r => r.startTime));
        const end = Math.max(...allRecords.map(r => r.endTime));
        return { start, end };
      }
      case 'custom': {
        if (!customRange) {
          throw new Error('自定义时间范围需要提供 customRange 参数');
        }
        return { start: customRange.startTime, end: customRange.endTime };
      }
      default:
        throw new Error(`不支持的时间段类型: ${period}`);
    }
  }

  /**
   * 计算扩展统计数据
   */
  static calculateExtendedStatistics(period: TimePeriod, customRange?: CustomTimeRange): ExtendedStatistics {
    const records = this.getRecordsByPeriod(period, customRange);
    const { start, end } = this.getPeriodRange(period, customRange);
    
    // 基础统计
    const baseStats = HistoryService.calculateStatistics(records);
    
    // 按类型分组
    const focusRecords = records.filter(r => r.type === TimerState.FOCUS);
    const reflectionRecords = records.filter(r => r.type === TimerState.REFLECTION);
    const restRecords = records.filter(r => r.type === TimerState.REST);
    
    const completedFocusRecords = focusRecords.filter(r => r.isCompleted && !r.isFailed);
    const failedFocusRecords = focusRecords.filter(r => r.isFailed);
    
    // 总会话数
    const totalSessions = records.length;
    
    // 完成率
    const completionRate = totalSessions > 0 
      ? (records.filter(r => r.isCompleted).length / totalSessions) * 100 
      : 0;
    
    // 专注完成率
    const focusCompletionRate = focusRecords.length > 0 
      ? (completedFocusRecords.length / focusRecords.length) * 100 
      : 0;
    
    // 会话时长统计
    const allDurations = records.map(r => r.duration);
    const averageSessionDuration = allDurations.length > 0 
      ? allDurations.reduce((sum, d) => sum + d, 0) / allDurations.length 
      : 0;
    const longestSession = allDurations.length > 0 ? Math.max(...allDurations) : 0;
    const shortestSession = allDurations.length > 0 ? Math.min(...allDurations) : 0;
    
    // 平均反思和休息时间
    const averageReflectionTime = reflectionRecords.length > 0 
      ? reflectionRecords.reduce((sum, r) => sum + r.duration, 0) / reflectionRecords.length 
      : 0;
    const averageRestTime = restRecords.length > 0 
      ? restRecords.reduce((sum, r) => sum + r.duration, 0) / restRecords.length 
      : 0;
    
    // 计算日均数据
    const periodDays = Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
    const dailyAverages = {
      focusTime: baseStats.totalFocusTime / periodDays,
      sessions: totalSessions / periodDays
    };
    
    return {
      ...baseStats,
      totalSessions,
      completionRate,
      averageSessionDuration,
      longestSession,
      shortestSession,
      focusCompletionRate,
      averageReflectionTime,
      averageRestTime,
      dailyAverages,
      periodStart: start,
      periodEnd: end,
      periodType: period
    };
  }

  /**
   * 获取每日统计数据
   */
  static getDailyStatistics(period: TimePeriod, customRange?: CustomTimeRange): DailyStatistics[] {
    const records = this.getRecordsByPeriod(period, customRange);
    const { start, end } = this.getPeriodRange(period, customRange);
    
    // 按日期分组记录
    const dailyRecords = new Map<string, SessionRecord[]>();
    
    // 生成日期范围内的所有日期
    const startDate = new Date(start);
    const endDate = new Date(end);
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateKey = currentDate.toISOString().split('T')[0];
      dailyRecords.set(dateKey, []);
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // 将记录分配到对应日期
    records.forEach(record => {
      const recordDate = new Date(record.startTime);
      const dateKey = recordDate.toISOString().split('T')[0];
      
      if (dailyRecords.has(dateKey)) {
        dailyRecords.get(dateKey)!.push(record);
      }
    });
    
    // 计算每日统计
    const dailyStats: DailyStatistics[] = [];
    
    dailyRecords.forEach((dayRecords, dateKey) => {
      const dayStats = HistoryService.calculateStatistics(dayRecords);
      const focusRecords = dayRecords.filter(r => r.type === TimerState.FOCUS);
      const completionRate = focusRecords.length > 0 
        ? (focusRecords.filter(r => r.isCompleted && !r.isFailed).length / focusRecords.length) * 100 
        : 0;
      
      dailyStats.push({
        date: dateKey,
        timestamp: new Date(dateKey).getTime(),
        focusTime: dayStats.totalFocusTime,
        reflectionTime: dayStats.totalReflectionTime,
        restTime: dayStats.totalRestTime,
        focusSessionCount: dayStats.focusSessionCount,
        failedFocusCount: dayStats.failedFocusCount,
        completionRate
      });
    });
    
    return dailyStats.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * 获取时间段比较数据
   */
  static getComparisonStatistics(currentPeriod: TimePeriod, previousPeriod: TimePeriod): {
    current: ExtendedStatistics;
    previous: ExtendedStatistics;
    changes: {
      focusTime: { value: number; percentage: number };
      sessions: { value: number; percentage: number };
      completionRate: { value: number; percentage: number };
    };
  } {
    const current = this.calculateExtendedStatistics(currentPeriod);
    const previous = this.calculateExtendedStatistics(previousPeriod);
    
    // 计算变化
    const focusTimeChange = current.totalFocusTime - previous.totalFocusTime;
    const focusTimePercentage = previous.totalFocusTime > 0 
      ? (focusTimeChange / previous.totalFocusTime) * 100 
      : 0;
    
    const sessionsChange = current.totalSessions - previous.totalSessions;
    const sessionsPercentage = previous.totalSessions > 0 
      ? (sessionsChange / previous.totalSessions) * 100 
      : 0;
    
    const completionRateChange = current.completionRate - previous.completionRate;
    const completionRatePercentage = previous.completionRate > 0 
      ? (completionRateChange / previous.completionRate) * 100 
      : 0;
    
    return {
      current,
      previous,
      changes: {
        focusTime: { value: focusTimeChange, percentage: focusTimePercentage },
        sessions: { value: sessionsChange, percentage: sessionsPercentage },
        completionRate: { value: completionRateChange, percentage: completionRatePercentage }
      }
    };
  }

  /**
   * 获取热力图数据（用于显示活动强度）
   */
  static getHeatmapData(period: TimePeriod, customRange?: CustomTimeRange): Array<{
    date: string;
    value: number;
    level: number; // 0-4 强度等级
  }> {
    const dailyStats = this.getDailyStatistics(period, customRange);
    
    // 找出最大专注时间用于归一化
    const maxFocusTime = Math.max(...dailyStats.map(d => d.focusTime), 1);
    
    return dailyStats.map(day => {
      const normalizedValue = day.focusTime / maxFocusTime;
      let level = 0;
      
      if (normalizedValue > 0.8) level = 4;
      else if (normalizedValue > 0.6) level = 3;
      else if (normalizedValue > 0.4) level = 2;
      else if (normalizedValue > 0.2) level = 1;
      
      return {
        date: day.date,
        value: day.focusTime,
        level
      };
    });
  }

  /**
   * 获取时间分布数据（按小时统计）
   */
  static getHourlyDistribution(period: TimePeriod, customRange?: CustomTimeRange): Array<{
    hour: number;
    focusTime: number;
    sessionCount: number;
  }> {
    const records = this.getRecordsByPeriod(period, customRange);
    
    // 初始化24小时数据
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      focusTime: 0,
      sessionCount: 0
    }));
    
    // 统计每小时的数据
    records.forEach(record => {
      const hour = new Date(record.startTime).getHours();
      
      if (record.type === TimerState.FOCUS) {
        hourlyData[hour].focusTime += record.duration;
      }
      hourlyData[hour].sessionCount += 1;
    });
    
    return hourlyData;
  }

  /**
   * 获取周分布数据（按星期几统计）
   */
  static getWeeklyDistribution(period: TimePeriod, customRange?: CustomTimeRange): Array<{
    dayOfWeek: number; // 0-6 (周日到周六)
    dayName: string;
    focusTime: number;
    sessionCount: number;
  }> {
    const records = this.getRecordsByPeriod(period, customRange);
    const dayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
    // 初始化一周数据
    const weeklyData = Array.from({ length: 7 }, (_, dayOfWeek) => ({
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      focusTime: 0,
      sessionCount: 0
    }));
    
    // 统计每天的数据
    records.forEach(record => {
      const dayOfWeek = new Date(record.startTime).getDay();
      
      if (record.type === TimerState.FOCUS) {
        weeklyData[dayOfWeek].focusTime += record.duration;
      }
      weeklyData[dayOfWeek].sessionCount += 1;
    });
    
    return weeklyData;
  }

  /**
   * 获取专注时长分布
   */
  static getFocusDurationDistribution(period: TimePeriod, customRange?: CustomTimeRange): Array<{
    range: string;
    count: number;
    percentage: number;
  }> {
    const records = this.getRecordsByPeriod(period, customRange);
    const focusRecords = records.filter(r => r.type === TimerState.FOCUS && r.isCompleted);
    
    // 定义时长区间（分钟）
    const ranges = [
      { min: 0, max: 10, label: '0-10分钟' },
      { min: 10, max: 20, label: '10-20分钟' },
      { min: 20, max: 30, label: '20-30分钟' },
      { min: 30, max: 45, label: '30-45分钟' },
      { min: 45, max: 60, label: '45-60分钟' },
      { min: 60, max: Infinity, label: '60分钟以上' }
    ];
    
    const distribution = ranges.map(range => {
      const count = focusRecords.filter(record => {
        const durationMinutes = record.duration / (1000 * 60);
        return durationMinutes >= range.min && durationMinutes < range.max;
      }).length;
      
      const percentage = focusRecords.length > 0 ? (count / focusRecords.length) * 100 : 0;
      
      return {
        range: range.label,
        count,
        percentage
      };
    });
    
    return distribution;
  }

  /**
   * 获取趋势数据（用于图表显示）
   */
  static getTrendData(period: TimePeriod, customRange?: CustomTimeRange): Array<{
    date: string;
    focusTime: number;
    reflectionTime: number;
    restTime: number;
    sessions: number;
    completionRate: number;
  }> {
    const dailyStats = this.getDailyStatistics(period, customRange);
    
    return dailyStats.map(day => ({
      date: day.date,
      focusTime: Math.round(day.focusTime / (1000 * 60)), // 转换为分钟
      reflectionTime: Math.round(day.reflectionTime / (1000 * 60)),
      restTime: Math.round(day.restTime / (1000 * 60)),
      sessions: day.focusSessionCount,
      completionRate: Math.round(day.completionRate * 100) / 100
    }));
  }
}