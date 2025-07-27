import { SessionRecord, TimerState, TimerError, TimerException, Statistics } from '../types';

/**
 * 历史记录服务类 - 管理会话记录的增删改查操作
 */
export class HistoryService {
  private static readonly HISTORY_KEY = 'flexible-pomodoro-history';
  private static readonly HISTORY_VERSION = '1.0.0';
  private static readonly MAX_RECORDS = 10000; // 最大记录数限制

  /**
   * 验证会话记录数据完整性
   */
  private static validateSessionRecord(record: Partial<SessionRecord>): void {
    const errors: string[] = [];

    if (!record.id || typeof record.id !== 'string') {
      errors.push('记录ID必须为非空字符串');
    }

    if (!record.type || !Object.values(TimerState).includes(record.type as TimerState)) {
      errors.push('记录类型必须为有效的计时器状态');
    }

    if (typeof record.startTime !== 'number' || record.startTime <= 0) {
      errors.push('开始时间必须为正数时间戳');
    }

    if (typeof record.endTime !== 'number' || record.endTime <= 0) {
      errors.push('结束时间必须为正数时间戳');
    }

    if (record.startTime && record.endTime && record.startTime >= record.endTime) {
      errors.push('结束时间必须大于开始时间');
    }

    if (typeof record.duration !== 'number' || record.duration <= 0) {
      errors.push('持续时间必须为正数');
    }

    if (typeof record.isCompleted !== 'boolean') {
      errors.push('完成状态必须为布尔值');
    }

    if (record.isFailed !== undefined && typeof record.isFailed !== 'boolean') {
      errors.push('失败状态必须为布尔值');
    }

    // 验证反思总结
    if (record.reflectionSummary !== undefined) {
      if (typeof record.reflectionSummary !== 'object' || record.reflectionSummary === null) {
        errors.push('反思总结必须为对象');
      } else {
        if (typeof record.reflectionSummary.content !== 'string') {
          errors.push('反思总结内容必须为字符串');
        }
        if (typeof record.reflectionSummary.createdAt !== 'number' || record.reflectionSummary.createdAt <= 0) {
          errors.push('反思总结创建时间必须为正数时间戳');
        }
        if (typeof record.reflectionSummary.updatedAt !== 'number' || record.reflectionSummary.updatedAt <= 0) {
          errors.push('反思总结更新时间必须为正数时间戳');
        }
      }
    }

    // 验证持续时间与时间戳的一致性
    if (record.startTime && record.endTime && record.duration) {
      const calculatedDuration = record.endTime - record.startTime;
      const tolerance = 1000; // 1秒容差
      if (Math.abs(calculatedDuration - record.duration) > tolerance) {
        errors.push('持续时间与开始结束时间不一致');
      }
    }

    if (errors.length > 0) {
      throw new TimerException(
        TimerError.CONFIG_VALIDATION_ERROR,
        `会话记录验证失败: ${errors.join(', ')}`,
        true
      );
    }
  }

  /**
   * 生成唯一ID
   */
  private static generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 加载所有历史记录
   */
  private static loadAllRecords(): SessionRecord[] {
    try {
      const stored = localStorage.getItem(this.HISTORY_KEY);
      
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      
      // 检查版本兼容性
      if (parsed.version !== this.HISTORY_VERSION) {
        console.warn('历史记录版本不匹配，清空历史记录');
        return [];
      }

      if (!Array.isArray(parsed.records)) {
        console.warn('历史记录格式错误，清空历史记录');
        return [];
      }

      // 验证每条记录
      const validRecords: SessionRecord[] = [];
      for (const record of parsed.records) {
        try {
          this.validateSessionRecord(record);
          validRecords.push(record);
        } catch (error) {
          console.warn('发现无效记录，已跳过:', record, error);
        }
      }

      return validRecords;
      
    } catch (error) {
      console.error('加载历史记录失败:', error);
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '加载历史记录时发生错误',
        true
      );
    }
  }

  /**
   * 保存所有历史记录
   */
  private static saveAllRecords(records: SessionRecord[]): void {
    try {
      // 限制记录数量，保留最新的记录
      const limitedRecords = records
        .sort((a, b) => b.startTime - a.startTime)
        .slice(0, this.MAX_RECORDS);

      const toStore = {
        version: this.HISTORY_VERSION,
        records: limitedRecords,
        updatedAt: Date.now()
      };
      
      localStorage.setItem(this.HISTORY_KEY, JSON.stringify(toStore));
      
    } catch (error) {
      console.error('保存历史记录失败:', error);
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '保存历史记录时发生错误',
        true
      );
    }
  }

  /**
   * 添加新的会话记录
   */
  static addRecord(record: Omit<SessionRecord, 'id'>): SessionRecord {
    const newRecord: SessionRecord = {
      ...record,
      id: this.generateId()
    };

    // 验证记录
    this.validateSessionRecord(newRecord);

    // 加载现有记录
    const records = this.loadAllRecords();
    
    // 添加新记录
    records.push(newRecord);
    
    // 保存
    this.saveAllRecords(records);
    
    return newRecord;
  }

  /**
   * 获取所有历史记录
   */
  static getAllRecords(): SessionRecord[] {
    return this.loadAllRecords();
  }

  /**
   * 根据ID获取特定记录
   */
  static getRecordById(id: string): SessionRecord | null {
    const records = this.loadAllRecords();
    return records.find(record => record.id === id) || null;
  }

  /**
   * 根据类型筛选记录
   */
  static getRecordsByType(type: TimerState): SessionRecord[] {
    const records = this.loadAllRecords();
    return records.filter(record => record.type === type);
  }

  /**
   * 根据时间范围筛选记录
   */
  static getRecordsByTimeRange(startTime: number, endTime: number): SessionRecord[] {
    const records = this.loadAllRecords();
    return records.filter(record => 
      record.startTime >= startTime && record.endTime <= endTime
    );
  }

  /**
   * 获取今日记录
   */
  static getTodayRecords(): SessionRecord[] {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
    
    return this.getRecordsByTimeRange(startOfDay, endOfDay);
  }

  /**
   * 获取本周记录
   */
  static getWeekRecords(): SessionRecord[] {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    
    return this.getRecordsByTimeRange(startOfWeek.getTime(), endOfWeek.getTime());
  }

  /**
   * 获取本月记录
   */
  static getMonthRecords(): SessionRecord[] {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
    
    return this.getRecordsByTimeRange(startOfMonth, endOfMonth);
  }

  /**
   * 更新记录
   */
  static updateRecord(id: string, updates: Partial<Omit<SessionRecord, 'id'>>): SessionRecord | null {
    const records = this.loadAllRecords();
    const index = records.findIndex(record => record.id === id);
    
    if (index === -1) {
      return null;
    }

    const updatedRecord = { ...records[index], ...updates };
    
    // 验证更新后的记录
    this.validateSessionRecord(updatedRecord);
    
    records[index] = updatedRecord;
    this.saveAllRecords(records);
    
    return updatedRecord;
  }

  /**
   * 更新反思总结
   */
  static updateReflectionSummary(id: string, content: string): SessionRecord | null {

    const now = Date.now();
    const record = this.getRecordById(id);
    
    if (!record) {

      return null;
    }



    const reflectionSummary = {
      content,
      createdAt: record.reflectionSummary?.createdAt || now,
      updatedAt: now
    };


    const result = this.updateRecord(id, { reflectionSummary });

    return result;
  }

  /**
   * 删除记录
   */
  static deleteRecord(id: string): boolean {
    const records = this.loadAllRecords();
    const index = records.findIndex(record => record.id === id);
    
    if (index === -1) {
      return false;
    }

    records.splice(index, 1);
    this.saveAllRecords(records);
    
    return true;
  }

  /**
   * 清空所有记录
   */
  static clearAllRecords(): void {
    try {
      localStorage.removeItem(this.HISTORY_KEY);
    } catch (error) {
      console.error('清空历史记录失败:', error);
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '清空历史记录时发生错误',
        true
      );
    }
  }

  /**
   * 计算统计数据
   */
  static calculateStatistics(records?: SessionRecord[]): Statistics {
    const targetRecords = records || this.loadAllRecords();
    
    const focusRecords = targetRecords.filter(r => r.type === TimerState.FOCUS);
    const reflectionRecords = targetRecords.filter(r => r.type === TimerState.REFLECTION);
    const restRecords = targetRecords.filter(r => r.type === TimerState.REST);
    
    const completedFocusRecords = focusRecords.filter(r => r.isCompleted);
    const failedFocusRecords = focusRecords.filter(r => r.isFailed);
    
    const totalFocusTime = focusRecords.reduce((sum, r) => sum + r.duration, 0);
    const totalReflectionTime = reflectionRecords.reduce((sum, r) => sum + r.duration, 0);
    const totalRestTime = restRecords.reduce((sum, r) => sum + r.duration, 0);
    
    const averageFocusTime = completedFocusRecords.length > 0 
      ? completedFocusRecords.reduce((sum, r) => sum + r.duration, 0) / completedFocusRecords.length 
      : 0;

    // 计算最长专注连续次数
    let longestFocusStreak = 0;
    let currentStreak = 0;
    
    const sortedRecords = targetRecords.sort((a, b) => a.startTime - b.startTime);
    for (const record of sortedRecords) {
      if (record.type === TimerState.FOCUS && record.isCompleted && !record.isFailed) {
        currentStreak++;
        longestFocusStreak = Math.max(longestFocusStreak, currentStreak);
      } else if (record.type === TimerState.FOCUS && record.isFailed) {
        currentStreak = 0;
      }
    }

    return {
      totalFocusTime,
      totalReflectionTime,
      totalRestTime,
      focusSessionCount: completedFocusRecords.length,
      failedFocusCount: failedFocusRecords.length,
      averageFocusTime,
      longestFocusStreak
    };
  }

  /**
   * 获取今日统计
   */
  static getTodayStatistics(): Statistics {
    return this.calculateStatistics(this.getTodayRecords());
  }

  /**
   * 获取本周统计
   */
  static getWeekStatistics(): Statistics {
    return this.calculateStatistics(this.getWeekRecords());
  }

  /**
   * 获取本月统计
   */
  static getMonthStatistics(): Statistics {
    return this.calculateStatistics(this.getMonthRecords());
  }

  /**
   * 导出历史记录
   */
  static exportRecords(): string {
    const records = this.loadAllRecords();
    return JSON.stringify({
      version: this.HISTORY_VERSION,
      records,
      exportedAt: Date.now()
    }, null, 2);
  }

  /**
   * 导入历史记录
   */
  static importRecords(jsonString: string, merge: boolean = false): void {
    try {
      const imported = JSON.parse(jsonString);
      
      if (!imported.records || !Array.isArray(imported.records)) {
        throw new Error('无效的历史记录格式');
      }

      // 验证所有记录
      const validRecords: SessionRecord[] = [];
      for (const record of imported.records) {
        try {
          this.validateSessionRecord(record);
          validRecords.push(record);
        } catch (error) {
          console.warn('跳过无效记录:', record, error);
        }
      }

      if (merge) {
        // 合并模式：与现有记录合并，去重
        const existingRecords = this.loadAllRecords();
        const existingIds = new Set(existingRecords.map(r => r.id));
        
        const newRecords = validRecords.filter(r => !existingIds.has(r.id));
        const allRecords = [...existingRecords, ...newRecords];
        
        this.saveAllRecords(allRecords);
      } else {
        // 替换模式：完全替换现有记录
        this.saveAllRecords(validRecords);
      }
      
    } catch (error) {
      console.error('导入历史记录失败:', error);
      throw new TimerException(
        TimerError.CONFIG_VALIDATION_ERROR,
        '导入历史记录失败，请检查数据格式',
        true
      );
    }
  }

  /**
   * 获取记录总数
   */
  static getRecordCount(): number {
    return this.loadAllRecords().length;
  }

  /**
   * 检查存储空间使用情况
   */
  static getStorageInfo(): { recordCount: number; estimatedSize: number; maxRecords: number } {
    const records = this.loadAllRecords();
    const estimatedSize = JSON.stringify(records).length;
    
    return {
      recordCount: records.length,
      estimatedSize,
      maxRecords: this.MAX_RECORDS
    };
  }
}