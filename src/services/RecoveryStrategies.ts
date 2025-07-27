import { TimerError, TimerException, RecoveryStrategy } from '../types/errors';
import { TimerState } from '../types/timer';
import { globalErrorHandler } from './ErrorHandler';

/**
 * 存储错误恢复策略
 */
export class StorageRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: TimerException): boolean {
    return error.type === TimerError.STORAGE_ERROR && error.recoverable;
  }

  async recover(error: TimerException): Promise<boolean> {
    try {
      // 尝试清理损坏的数据
      const keysToCheck = [
        'timer_config',
        'timer_history',
        'timer_state',
        'timer_statistics'
      ];

      for (const key of keysToCheck) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            JSON.parse(data); // 验证数据是否有效
          }
        } catch (parseError) {
          console.warn(`Removing corrupted data for key: ${key}`);
          localStorage.removeItem(key);
        }
      }

      // 尝试重新初始化存储
      try {
        const testKey = 'timer_recovery_test';
        localStorage.setItem(testKey, JSON.stringify({ test: true }));
        localStorage.removeItem(testKey);
      } catch (testError) {
        console.error('Storage test failed:', testError);
        return false;
      }

      return true;
    } catch (recoveryError) {
      console.error('Storage recovery failed:', recoveryError);
      return false;
    }
  }
}

/**
 * 计时器同步错误恢复策略
 */
export class TimerSyncRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: TimerException): boolean {
    return error.type === TimerError.TIMER_SYNC_ERROR && error.recoverable;
  }

  async recover(error: TimerException): Promise<boolean> {
    try {
      // 重新同步计时器状态
      const savedState = localStorage.getItem('timer_state');
      if (savedState) {
        const state = JSON.parse(savedState);
        const now = Date.now();
        
        // 检查时间跳跃
        if (state.startTime && state.currentState !== TimerState.IDLE) {
          const expectedElapsed = now - state.startTime;
          const maxReasonableTime = 24 * 60 * 60 * 1000; // 24小时
          
          if (expectedElapsed > maxReasonableTime || expectedElapsed < 0) {
            // 时间跳跃过大，重置状态
            console.warn('Large time jump detected, resetting timer state');
            localStorage.setItem('timer_state', JSON.stringify({
              currentState: TimerState.IDLE,
              startTime: null,
              elapsedTime: 0,
              isDefaultTimeReached: false,
              canSwitchState: true
            }));
          } else {
            // 更新经过的时间
            state.elapsedTime = expectedElapsed;
            localStorage.setItem('timer_state', JSON.stringify(state));
          }
        }
      }

      return true;
    } catch (recoveryError) {
      console.error('Timer sync recovery failed:', recoveryError);
      return false;
    }
  }
}

/**
 * 配置验证错误恢复策略
 */
export class ConfigRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: TimerException): boolean {
    return error.type === TimerError.CONFIG_VALIDATION_ERROR && error.recoverable;
  }

  async recover(error: TimerException): Promise<boolean> {
    try {
      // 恢复默认配置
      const defaultConfig = {
        focusDuration: 25,
        restDuration: 5,
        reflectionDuration: 3,
        focusFailureTime: 2,
        enableSound: true,
        enableNotification: true
      };

      localStorage.setItem('timer_config', JSON.stringify(defaultConfig));

      
      return true;
    } catch (recoveryError) {
      console.error('Config recovery failed:', recoveryError);
      return false;
    }
  }
}

/**
 * 通知错误恢复策略
 */
export class NotificationRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: TimerException): boolean {
    return error.type === TimerError.NOTIFICATION_ERROR && error.recoverable;
  }

  async recover(error: TimerException): Promise<boolean> {
    try {
      // 检查通知权限
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          // 重新请求权限
          const permission = await Notification.requestPermission();
          return permission === 'granted';
        } else if (Notification.permission === 'denied') {
          // 权限被拒绝，禁用通知功能
          const config = JSON.parse(localStorage.getItem('timer_config') || '{}');
          config.enableNotification = false;
          localStorage.setItem('timer_config', JSON.stringify(config));
          console.warn('Notifications disabled due to permission denial');
          return true;
        }
      } else {
        // 浏览器不支持通知，禁用功能
        const config = JSON.parse(localStorage.getItem('timer_config') || '{}');
        config.enableNotification = false;
        localStorage.setItem('timer_config', JSON.stringify(config));
        console.warn('Notifications disabled - not supported by browser');
        return true;
      }

      return true;
    } catch (recoveryError) {
      console.error('Notification recovery failed:', recoveryError);
      return false;
    }
  }
}

/**
 * 状态转换错误恢复策略
 */
export class StateTransitionRecoveryStrategy implements RecoveryStrategy {
  canRecover(error: TimerException): boolean {
    return error.type === TimerError.INVALID_STATE_TRANSITION && error.recoverable;
  }

  async recover(error: TimerException): Promise<boolean> {
    try {
      // 重置到安全状态
      const safeState = {
        currentState: TimerState.IDLE,
        startTime: null,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: true
      };

      localStorage.setItem('timer_state', JSON.stringify(safeState));

      
      return true;
    } catch (recoveryError) {
      console.error('State transition recovery failed:', recoveryError);
      return false;
    }
  }
}

/**
 * 数据完整性检查器
 */
export class DataIntegrityChecker {
  /**
   * 检查并修复数据完整性
   */
  static async checkAndRepair(): Promise<boolean> {
    try {
      let hasIssues = false;

      // 检查配置数据
      if (!this.validateConfig()) {
        hasIssues = true;
        await this.repairConfig();
      }

      // 检查状态数据
      if (!this.validateState()) {
        hasIssues = true;
        await this.repairState();
      }

      // 检查历史记录数据
      if (!this.validateHistory()) {
        hasIssues = true;
        await this.repairHistory();
      }

      if (hasIssues) {

      }

      return true;
    } catch (error) {
      console.error('Data integrity check failed:', error);
      return false;
    }
  }

  private static validateConfig(): boolean {
    try {
      const configData = localStorage.getItem('timer_config');
      if (!configData) return true; // 没有配置是正常的

      const config = JSON.parse(configData);
      
      // 检查必需字段
      const requiredFields = ['focusDuration', 'restDuration', 'reflectionDuration', 'focusFailureTime'];
      for (const field of requiredFields) {
        if (typeof config[field] !== 'number' || config[field] <= 0) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private static async repairConfig(): Promise<void> {
    const strategy = new ConfigRecoveryStrategy();
    const error = new TimerException(TimerError.CONFIG_VALIDATION_ERROR, 'Config validation failed', true);
    await strategy.recover(error);
  }

  private static validateState(): boolean {
    try {
      const stateData = localStorage.getItem('timer_state');
      if (!stateData) return true; // 没有状态是正常的

      const state = JSON.parse(stateData);
      
      // 检查状态字段
      if (!Object.values(TimerState).includes(state.currentState)) {
        return false;
      }

      // 检查时间字段
      if (state.startTime !== null && (typeof state.startTime !== 'number' || state.startTime < 0)) {
        return false;
      }

      if (typeof state.elapsedTime !== 'number' || state.elapsedTime < 0) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private static async repairState(): Promise<void> {
    const strategy = new StateTransitionRecoveryStrategy();
    const error = new TimerException(TimerError.INVALID_STATE_TRANSITION, 'State validation failed', true);
    await strategy.recover(error);
  }

  private static validateHistory(): boolean {
    try {
      const historyData = localStorage.getItem('timer_history');
      if (!historyData) return true; // 没有历史记录是正常的

      const history = JSON.parse(historyData);
      
      if (!Array.isArray(history)) {
        return false;
      }

      // 检查历史记录项
      for (const record of history) {
        if (!record.id || !record.type || typeof record.startTime !== 'number' || 
            typeof record.endTime !== 'number' || typeof record.duration !== 'number') {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  private static async repairHistory(): Promise<void> {
    try {
      // 尝试修复历史记录，如果无法修复则清空
      const historyData = localStorage.getItem('timer_history');
      if (historyData) {
        try {
          const history = JSON.parse(historyData);
          const validRecords = history.filter((record: any) => {
            return record.id && record.type && 
                   typeof record.startTime === 'number' && 
                   typeof record.endTime === 'number' && 
                   typeof record.duration === 'number';
          });
          localStorage.setItem('timer_history', JSON.stringify(validRecords));
        } catch (error) {
          // 如果无法修复，清空历史记录
          localStorage.setItem('timer_history', JSON.stringify([]));
        }
      }
    } catch (error) {
      console.error('History repair failed:', error);
    }
  }
}

/**
 * 初始化所有恢复策略
 */
export function initializeRecoveryStrategies(): void {
  globalErrorHandler.registerRecoveryStrategy(TimerError.STORAGE_ERROR, new StorageRecoveryStrategy());
  globalErrorHandler.registerRecoveryStrategy(TimerError.TIMER_SYNC_ERROR, new TimerSyncRecoveryStrategy());
  globalErrorHandler.registerRecoveryStrategy(TimerError.CONFIG_VALIDATION_ERROR, new ConfigRecoveryStrategy());
  globalErrorHandler.registerRecoveryStrategy(TimerError.NOTIFICATION_ERROR, new NotificationRecoveryStrategy());
  globalErrorHandler.registerRecoveryStrategy(TimerError.INVALID_STATE_TRANSITION, new StateTransitionRecoveryStrategy());
}

/**
 * 应用启动时的恢复检查
 */
export async function performStartupRecovery(): Promise<boolean> {
  try {

    
    // 检查数据完整性
    const integrityOk = await DataIntegrityChecker.checkAndRepair();
    
    // 检查是否有未完成的会话需要恢复
    const stateData = localStorage.getItem('timer_state');
    if (stateData) {
      const state = JSON.parse(stateData);
      if (state.currentState !== TimerState.IDLE && state.startTime) {
        const now = Date.now();
        const elapsed = now - state.startTime;
        const maxReasonableTime = 24 * 60 * 60 * 1000; // 24小时
        
        if (elapsed > maxReasonableTime) {
          console.warn('Session too old, resetting to idle state');
          const strategy = new StateTransitionRecoveryStrategy();
          const error = new TimerException(TimerError.TIMER_SYNC_ERROR, 'Session too old', true);
          await strategy.recover(error);
        } else {

        }
      }
    }
    

    return integrityOk;
  } catch (error) {
    console.error('Startup recovery failed:', error);
    return false;
  }
}