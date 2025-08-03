import { 
  ContinuousFocusStreak, 
  defaultContinuousFocusStreak,
  SessionRecord,
  TimerConfig,
  TimerState,
  TimerError,
  TimerException
} from '../types';
import { StorageManager } from './StorageManager';

/**
 * 连续专注次数服务类 - 管理连续专注次数的加载、保存、增加和重置操作
 */
export class ContinuousFocusStreakService {
  private static readonly STORAGE_KEY = 'continuous-focus-streak';

  /**
   * 加载连续专注次数
   */
  static loadStreak(): ContinuousFocusStreak {
    try {
      const streak = StorageManager.getItem<ContinuousFocusStreak>(
        this.STORAGE_KEY,
        defaultContinuousFocusStreak
      );
      
      if (!streak) {
        return defaultContinuousFocusStreak;
      }

      // 验证数据完整性
      return this.validateAndSanitize(streak);
    } catch (error) {
      console.warn('加载连续专注次数失败，使用默认值:', error);
      return defaultContinuousFocusStreak;
    }
  }

  /**
   * 保存连续专注次数
   */
  static saveStreak(streak: ContinuousFocusStreak): void {
    try {
      // 验证数据
      const validatedStreak = this.validateAndSanitize(streak);
      
      StorageManager.setItem(this.STORAGE_KEY, validatedStreak);
    } catch (error) {
      console.error('保存连续专注次数失败:', error);
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '保存连续专注次数时发生错误',
        true
      );
    }
  }

  /**
   * 增加连续专注次数
   */
  static incrementStreak(sessionId: string): ContinuousFocusStreak {
    try {
      const currentStreak = this.loadStreak();
      
      const newStreak: ContinuousFocusStreak = {
        count: currentStreak.count + 1,
        lastUpdateTime: Date.now(),
        lastSessionId: sessionId
      };

      this.saveStreak(newStreak);
      return newStreak;
    } catch (error) {
      console.error('增加连续专注次数失败:', error);
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '增加连续专注次数时发生错误',
        true
      );
    }
  }

  /**
   * 重置连续专注次数
   */
  static resetStreak(): ContinuousFocusStreak {
    try {
      const resetStreak: ContinuousFocusStreak = {
        count: 0,
        lastUpdateTime: Date.now()
      };

      this.saveStreak(resetStreak);
      return resetStreak;
    } catch (error) {
      console.error('重置连续专注次数失败:', error);
      throw new TimerException(
        TimerError.STORAGE_ERROR,
        '重置连续专注次数时发生错误',
        true
      );
    }
  }

  /**
   * 判断是否应该增加连续专注次数
   * 专注会话成功完成的条件：
   * 1. 会话类型为 FOCUS
   * 2. 会话已完成 (isCompleted = true)
   * 3. 会话未失败 (isFailed !== true)
   * 4. 专注时间达到或超过目标时间
   */
  static shouldIncrementStreak(session: SessionRecord, config: TimerConfig): boolean {
    // 必须是专注会话
    if (session.type !== TimerState.FOCUS) {
      return false;
    }

    // 必须已完成且未失败
    if (!session.isCompleted || session.isFailed) {
      return false;
    }

    // 检查是否达到目标时间
    // metadata.targetDuration 已经是毫秒，不需要再转换
    const targetDuration = session.metadata?.targetDuration || (config.focusDuration * 60 * 1000);
    
    return session.duration >= targetDuration;
  }

  /**
   * 判断是否应该重置连续专注次数
   * 专注会话失败的条件：
   * 1. 会话类型为 FOCUS
   * 2. 会话失败 (isFailed = true) 或未完成但时间不足
   */
  static shouldResetStreak(session: SessionRecord, config: TimerConfig): boolean {
    // 必须是专注会话
    if (session.type !== TimerState.FOCUS) {
      return false;
    }

    // 明确标记为失败
    if (session.isFailed) {
      return true;
    }

    // 未完成且时间不足
    if (!session.isCompleted) {
      // metadata.targetDuration 已经是毫秒，不需要再转换
      const targetDuration = session.metadata?.targetDuration || (config.focusDuration * 60 * 1000);
      return session.duration < targetDuration;
    }

    return false;
  }

  /**
   * 验证和清理连续专注次数数据
   */
  private static validateAndSanitize(streak: any): ContinuousFocusStreak {
    const sanitized: ContinuousFocusStreak = {
      count: Math.max(0, Math.floor(streak?.count || 0)),
      lastUpdateTime: streak?.lastUpdateTime || Date.now(),
      lastSessionId: typeof streak?.lastSessionId === 'string' ? streak.lastSessionId : undefined
    };

    // 验证时间戳合理性
    const now = Date.now();
    if (sanitized.lastUpdateTime > now || sanitized.lastUpdateTime < 0) {
      sanitized.lastUpdateTime = now;
    }

    return sanitized;
  }

  /**
   * 从错误中恢复
   */
  static recoverFromError(): ContinuousFocusStreak {
    try {
      // 尝试从备份恢复
      if (StorageManager.restoreFromBackup(this.STORAGE_KEY)) {
        const recovered = this.loadStreak();
        console.info('从备份成功恢复连续专注次数');
        return recovered;
      }
    } catch (error) {
      console.warn('从备份恢复失败:', error);
    }
    
    // 返回默认值
    console.info('使用默认连续专注次数值');
    return defaultContinuousFocusStreak;
  }

  /**
   * 获取连续专注次数的显示文本
   */
  static getDisplayText(streak: ContinuousFocusStreak): string {
    return `已持续专注${streak.count}次`;
  }

  /**
   * 检查连续专注次数数据的健康状态
   */
  static validateStreakHealth(): {
    isHealthy: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    try {
      // 直接从存储获取原始数据，不经过验证和清理
      const rawData = StorageManager.getItem<any>(this.STORAGE_KEY);
      
      if (!rawData) {
        // 没有数据不算问题
        return {
          isHealthy: true,
          issues: [],
          recommendations: []
        };
      }

      // 检查数据合理性
      if (typeof rawData.count === 'number' && rawData.count < 0) {
        issues.push('连续专注次数为负数');
        recommendations.push('重置连续专注次数');
      }

      if (typeof rawData.count === 'number' && rawData.count > 10000) {
        issues.push('连续专注次数异常高');
        recommendations.push('检查数据是否正确');
      }

      // 检查时间戳
      const now = Date.now();
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
      
      if (typeof rawData.lastUpdateTime === 'number' && rawData.lastUpdateTime > now) {
        issues.push('最后更新时间在未来');
        recommendations.push('重置时间戳');
      }

      if (typeof rawData.lastUpdateTime === 'number' && rawData.lastUpdateTime < oneYearAgo) {
        issues.push('最后更新时间过于久远');
        recommendations.push('考虑重置连续专注次数');
      }

    } catch (error) {
      issues.push('无法加载连续专注次数数据');
      recommendations.push('尝试从备份恢复或重置数据');
    }

    return {
      isHealthy: issues.length === 0,
      issues,
      recommendations
    };
  }
}