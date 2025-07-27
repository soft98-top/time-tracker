/**
 * 错误类型枚举
 */
export enum TimerError {
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  STORAGE_ERROR = 'STORAGE_ERROR',
  TIMER_SYNC_ERROR = 'TIMER_SYNC_ERROR',
  CONFIG_VALIDATION_ERROR = 'CONFIG_VALIDATION_ERROR',
  NOTIFICATION_ERROR = 'NOTIFICATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * 自定义错误类
 */
export class TimerException extends Error {
  constructor(
    public type: TimerError,
    message: string,
    public recoverable: boolean = true,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'TimerException';
  }
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  type: TimerError;
  message: string;
  recoverable: boolean;
  timestamp: number;
  stack?: string;
}

/**
 * 错误处理器接口
 */
export interface ErrorHandler {
  handleError: (error: TimerException | Error) => void;
  clearError: () => void;
  getLastError: () => ErrorInfo | null;
}

/**
 * 错误恢复策略接口
 */
export interface RecoveryStrategy {
  canRecover: (error: TimerException) => boolean;
  recover: (error: TimerException) => Promise<boolean>;
}