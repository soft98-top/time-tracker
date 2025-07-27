import { TimerError, TimerException, ErrorInfo, ErrorHandler, RecoveryStrategy } from '../types/errors';

/**
 * 全局错误处理服务
 */
class GlobalErrorHandler implements ErrorHandler {
  private lastError: ErrorInfo | null = null;
  private errorListeners: ((error: ErrorInfo) => void)[] = [];
  private recoveryStrategies: Map<TimerError, RecoveryStrategy> = new Map();

  constructor() {
    // 监听未捕获的错误
    window.addEventListener('error', this.handleWindowError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  /**
   * 处理错误
   */
  handleError = (error: TimerException | Error): void => {
    const timerError = error instanceof TimerException ? error : this.convertToTimerException(error);
    
    const errorInfo: ErrorInfo = {
      type: timerError.type,
      message: timerError.message,
      recoverable: timerError.recoverable,
      timestamp: Date.now(),
      stack: timerError.stack
    };

    this.lastError = errorInfo;
    
    // 记录错误
    this.logError(errorInfo);
    
    // 通知监听器
    this.notifyListeners(errorInfo);
    
    // 尝试自动恢复
    this.attemptRecovery(timerError);
  };

  /**
   * 清除错误
   */
  clearError = (): void => {
    this.lastError = null;
  };

  /**
   * 获取最后一个错误
   */
  getLastError = (): ErrorInfo | null => {
    return this.lastError;
  };

  /**
   * 添加错误监听器
   */
  addErrorListener = (listener: (error: ErrorInfo) => void): void => {
    this.errorListeners.push(listener);
  };

  /**
   * 移除错误监听器
   */
  removeErrorListener = (listener: (error: ErrorInfo) => void): void => {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  };

  /**
   * 注册恢复策略
   */
  registerRecoveryStrategy = (errorType: TimerError, strategy: RecoveryStrategy): void => {
    this.recoveryStrategies.set(errorType, strategy);
  };

  /**
   * 处理窗口错误
   */
  private handleWindowError = (event: ErrorEvent): void => {
    const error = new TimerException(
      TimerError.UNKNOWN_ERROR,
      event.message,
      true,
      event.error
    );
    this.handleError(error);
  };

  /**
   * 处理未处理的 Promise 拒绝
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = new TimerException(
      TimerError.UNKNOWN_ERROR,
      `Unhandled promise rejection: ${event.reason}`,
      true
    );
    this.handleError(error);
  };

  /**
   * 将普通错误转换为 TimerException
   */
  private convertToTimerException = (error: Error): TimerException => {
    // 根据错误消息或类型推断错误类型
    let errorType = TimerError.UNKNOWN_ERROR;
    const message = error.message.toLowerCase();
    
    if (message.includes('localstorage') || message.includes('storage') || message.includes('quota')) {
      errorType = TimerError.STORAGE_ERROR;
    } else if (message.includes('notification') || message.includes('permission')) {
      errorType = TimerError.NOTIFICATION_ERROR;
    } else if (message.includes('state') || message.includes('transition')) {
      errorType = TimerError.INVALID_STATE_TRANSITION;
    } else if (message.includes('config') || message.includes('validation')) {
      errorType = TimerError.CONFIG_VALIDATION_ERROR;
    } else if (message.includes('timer') || message.includes('sync') || message.includes('time')) {
      errorType = TimerError.TIMER_SYNC_ERROR;
    }

    return new TimerException(errorType, error.message, true, error);
  };

  /**
   * 记录错误
   */
  private logError = (errorInfo: ErrorInfo): void => {
    console.error(`[${errorInfo.type}] ${errorInfo.message}`, {
      timestamp: new Date(errorInfo.timestamp).toISOString(),
      recoverable: errorInfo.recoverable,
      stack: errorInfo.stack
    });

    // 保存到本地存储用于调试
    try {
      const errorLogs = JSON.parse(localStorage.getItem('timer_error_logs') || '[]');
      errorLogs.push(errorInfo);
      
      // 只保留最近的 50 个错误日志
      if (errorLogs.length > 50) {
        errorLogs.splice(0, errorLogs.length - 50);
      }
      
      localStorage.setItem('timer_error_logs', JSON.stringify(errorLogs));
    } catch (e) {
      console.warn('Failed to save error log:', e);
    }
  };

  /**
   * 通知监听器
   */
  private notifyListeners = (errorInfo: ErrorInfo): void => {
    this.errorListeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  };

  /**
   * 尝试自动恢复
   */
  private attemptRecovery = async (error: TimerException): Promise<void> => {
    const strategy = this.recoveryStrategies.get(error.type);
    
    if (strategy && strategy.canRecover(error)) {
      try {
        const recovered = await strategy.recover(error);
        if (recovered) {

          this.clearError();
        }
      } catch (recoveryError) {
        console.error('Recovery failed:', recoveryError);
      }
    }
  };

  /**
   * 销毁处理器
   */
  destroy = (): void => {
    window.removeEventListener('error', this.handleWindowError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    this.errorListeners.length = 0;
    this.recoveryStrategies.clear();
  };
}

// 创建全局实例
export const globalErrorHandler = new GlobalErrorHandler();

/**
 * 创建错误的便捷函数
 */
export const createTimerError = (
  type: TimerError,
  message: string,
  recoverable: boolean = true,
  originalError?: Error
): TimerException => {
  return new TimerException(type, message, recoverable, originalError);
};

/**
 * 处理错误的便捷函数
 */
export const handleError = (error: TimerException | Error): void => {
  globalErrorHandler.handleError(error);
};

export default GlobalErrorHandler;