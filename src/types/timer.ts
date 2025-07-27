/**
 * 计时器状态枚举
 */
export enum TimerState {
  IDLE = 'idle',
  FOCUS = 'focus',
  REFLECTION = 'reflection',
  REST = 'rest'
}

/**
 * 计时器配置接口
 */
export interface TimerConfig {
  focusDuration: number;      // 默认专注时长(分钟)
  restDuration: number;       // 默认休息时长(分钟)
  reflectionDuration: number; // 默认反思时长(分钟)
  focusFailureTime: number;   // 专注失败时间(分钟)
  enableSound: boolean;       // 是否启用声音提醒
  enableNotification: boolean; // 是否启用桌面通知
}

/**
 * 计时器状态数据接口
 */
export interface TimerStateData {
  currentState: TimerState;
  startTime: number | null;
  elapsedTime: number;
  isDefaultTimeReached: boolean;
  canSwitchState: boolean;
  // 新增：操作可用性控制
  availableActions: {
    canStartFocus: boolean;
    canCancel: boolean;
    canSwitchToReflection: boolean;
    canSwitchToRest: boolean;
  };
}

/**
 * 会话记录接口
 */
export interface SessionRecord {
  id: string;
  type: TimerState;
  startTime: number;
  endTime: number;
  duration: number;
  isCompleted: boolean;
  isFailed?: boolean;
  metadata?: {
    targetDuration: number;
    wasInterrupted: boolean;
  };
  // 新增：反思总结
  reflectionSummary?: {
    content: string;
    createdAt: number;
    updatedAt: number;
  };
}

/**
 * 统计数据接口
 */
export interface Statistics {
  totalFocusTime: number;
  totalReflectionTime: number;
  totalRestTime: number;
  focusSessionCount: number;
  failedFocusCount: number;
  averageFocusTime: number;
  longestFocusStreak: number;
}

/**
 * 错误类型枚举
 */
export enum TimerError {
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  STORAGE_ERROR = 'STORAGE_ERROR',
  TIMER_SYNC_ERROR = 'TIMER_SYNC_ERROR',
  CONFIG_VALIDATION_ERROR = 'CONFIG_VALIDATION_ERROR'
}

/**
 * 计时器异常类
 */
export class TimerException extends Error {
  constructor(
    public type: TimerError,
    message: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'TimerException';
  }
}

/**
 * 默认配置
 */
export const defaultConfig: TimerConfig = {
  focusDuration: 25,
  restDuration: 5,
  reflectionDuration: 3,
  focusFailureTime: 2,
  enableSound: true,
  enableNotification: true
};