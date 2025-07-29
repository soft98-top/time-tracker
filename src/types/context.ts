import type { TimerStateData, TimerConfig, SessionRecord, Statistics } from './timer';

/**
 * Timer Context 类型定义
 */
export interface TimerContextType {
  // 状态
  state: TimerStateData;
  config: TimerConfig;
  
  // 操作
  startFocus: () => void;
  startReflection: () => void;
  startRest: (reflectionContent?: string) => void;
  cancel: (reflectionContent?: string) => void;
  
  // 配置
  updateConfig: (config: Partial<TimerConfig>) => void;
  
  // 通知
  requestNotificationPermission: () => Promise<boolean>;
  getNotificationPermissionStatus: () => NotificationPermission;
  
  // 历史记录
  getSessionHistory: () => SessionRecord[];
  getStatistics: (period: 'today' | 'week' | 'month') => Statistics;
  
  // 反思总结
  updateReflectionSummary: (sessionId: string, content: string) => void;
  getCurrentSessionId: () => string | null;
  
  // 删除记录
  deleteRecord: (recordId: string) => boolean;
}

/**
 * Action 类型定义
 */
export enum ActionType {
  START_FOCUS = 'START_FOCUS',
  START_REFLECTION = 'START_REFLECTION',
  START_REST = 'START_REST',
  CANCEL = 'CANCEL',
  TICK = 'TICK',
  UPDATE_CONFIG = 'UPDATE_CONFIG',
  RESTORE_STATE = 'RESTORE_STATE',
  RESET = 'RESET',
  SET_CURRENT_SESSION_ID = 'SET_CURRENT_SESSION_ID'
}

/**
 * Action 接口定义
 */
export interface TimerAction {
  type: ActionType;
  payload?: unknown;
}

/**
 * Reducer State 类型
 */
export interface TimerReducerState {
  timerState: TimerStateData;
  config: TimerConfig;
  sessionHistory: SessionRecord[];
  currentSessionId: string | null;
  reflectionDraft: string;
}