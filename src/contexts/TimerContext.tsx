import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import type {
  TimerContextType,
  TimerReducerState,
  TimerAction,
  TimerStateData,
  TimerConfig,
  SessionRecord,
  Statistics
} from '../types';
import { TimerState, defaultConfig } from '../types';
import { ActionType } from '../types/context';
import { TimerStateMachine } from '../services/TimerStateMachine';
import { ConfigService } from '../services/ConfigService';
import { HistoryService } from '../services/HistoryService';
import { notificationManager } from '../services/NotificationManager';
// 创建 Context
const TimerContext = createContext<TimerContextType | null>(null);

// 初始状态
const initialTimerState: TimerStateData = {
  currentState: TimerState.IDLE,
  startTime: null,
  elapsedTime: 0,
  isDefaultTimeReached: false,
  canSwitchState: false,
  availableActions: {
    canStartFocus: true,
    canCancel: false,
    canSwitchToReflection: false,
    canSwitchToRest: false
  }
};

const initialReducerState: TimerReducerState = {
  timerState: initialTimerState,
  config: defaultConfig,
  sessionHistory: [],
  currentSessionId: null,
  reflectionDraft: ''
};

// Reducer 函数
function timerReducer(state: TimerReducerState, action: TimerAction): TimerReducerState {
  const stateMachine = new TimerStateMachine();
  
  switch (action.type) {
    case ActionType.START_FOCUS: {
      const newTimerState: TimerStateData = {
        currentState: TimerState.FOCUS,
        startTime: Date.now(),
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: false,
        availableActions: {
          canStartFocus: false, // 专注状态下不能再次开始专注
          canCancel: true,
          canSwitchToReflection: false, // 初始时不能切换
          canSwitchToRest: false // 初始时不能切换
        }
      };
      
      return {
        ...state,
        timerState: newTimerState
      };
    }

    case ActionType.START_REFLECTION: {
      // 验证状态转换
      const transitionResult = stateMachine.validateTransition(
        state.timerState.currentState,
        TimerState.REFLECTION,
        state.timerState,
        state.config
      );
      
      if (!transitionResult.success) {
        console.error('无法切换到反思状态:', transitionResult.error?.message);
        return state;
      }

      const newTimerState: TimerStateData = {
        currentState: TimerState.REFLECTION,
        startTime: Date.now(),
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: true,
        availableActions: stateMachine.calculateAvailableActions({
          currentState: TimerState.REFLECTION,
          startTime: Date.now(),
          elapsedTime: 0,
          isDefaultTimeReached: false,
          canSwitchState: true,
          availableActions: { canStartFocus: true, canCancel: true, canSwitchToReflection: false, canSwitchToRest: true }
        }, state.config)
      };
      
      return {
        ...state,
        timerState: newTimerState
      };
    }

    case ActionType.START_REST: {
      // 验证状态转换
      const transitionResult = stateMachine.validateTransition(
        state.timerState.currentState,
        TimerState.REST,
        state.timerState,
        state.config
      );
      
      if (!transitionResult.success) {
        console.error('无法切换到休息状态:', transitionResult.error?.message);
        return state;
      }

      const newTimerState: TimerStateData = {
        currentState: TimerState.REST,
        startTime: Date.now(),
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: true,
        availableActions: stateMachine.calculateAvailableActions({
          currentState: TimerState.REST,
          startTime: Date.now(),
          elapsedTime: 0,
          isDefaultTimeReached: false,
          canSwitchState: true,
          availableActions: { canStartFocus: true, canCancel: true, canSwitchToReflection: false, canSwitchToRest: false }
        }, state.config)
      };
      
      return {
        ...state,
        timerState: newTimerState
      };
    }

    case ActionType.CANCEL: {
      // 强制取消到IDLE状态，不进行状态转换验证
      const newTimerState: TimerStateData = {
        currentState: TimerState.IDLE,
        startTime: null,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: false,
        availableActions: {
          canStartFocus: true,
          canCancel: false,
          canSwitchToReflection: false,
          canSwitchToRest: false
        }
      };
      
      return {
        ...state,
        timerState: newTimerState,
        currentSessionId: null
      };
    }

    case ActionType.TICK: {
      if (state.timerState.currentState === TimerState.IDLE || !state.timerState.startTime) {
        return state;
      }

      const now = Date.now();
      const rawElapsedTime = now - state.timerState.startTime;
      
      // 只在极端异常情况下重置（超过48小时或负时间超过5分钟）
      const MAX_REASONABLE_TIME = 48 * 60 * 60 * 1000; // 48小时
      const MIN_TIME_DIFF = -5 * 60 * 1000; // 允许5分钟的时间回退
      
      if (rawElapsedTime > MAX_REASONABLE_TIME || rawElapsedTime < MIN_TIME_DIFF) {
        console.warn('检测到极端异常时间，以startTime为基准修复时间', {
          rawElapsedTime,
          maxReasonableTime: MAX_REASONABLE_TIME,
          minTimeDiff: MIN_TIME_DIFF,
          startTime: state.timerState.startTime,
          now
        });
        
        // 以startTime为基准，修复到合理的时间范围
        let fixedElapsedTime;
        if (rawElapsedTime > MAX_REASONABLE_TIME) {
          fixedElapsedTime = MAX_REASONABLE_TIME;
        } else if (rawElapsedTime < MIN_TIME_DIFF) {
          fixedElapsedTime = 0;
        } else {
          fixedElapsedTime = Math.max(0, rawElapsedTime);
        }
        
        // 检查是否达到默认时间
        const isDefaultTimeReached = stateMachine.checkDefaultTimeReached(
          state.timerState.currentState,
          fixedElapsedTime,
          state.config
        );
        
        const updatedTimerState = {
          ...state.timerState,
          elapsedTime: fixedElapsedTime,
          isDefaultTimeReached
        };
        
        const canSwitchState = stateMachine.updateCanSwitchState(updatedTimerState, state.config);
        const availableActions = stateMachine.calculateAvailableActions(updatedTimerState, state.config);
        
        return {
          ...state,
          timerState: {
            ...updatedTimerState,
            canSwitchState,
            availableActions
          }
        };
      }
      
      const elapsedTime = Math.max(0, rawElapsedTime);
      
      // 检查是否达到默认时间
      const isDefaultTimeReached = stateMachine.checkDefaultTimeReached(
        state.timerState.currentState,
        elapsedTime,
        state.config
      );
      
      // 更新是否可以切换状态
      const updatedTimerState = {
        ...state.timerState,
        elapsedTime,
        isDefaultTimeReached
      };
      
      const canSwitchState = stateMachine.updateCanSwitchState(updatedTimerState, state.config);
      const availableActions = stateMachine.calculateAvailableActions(updatedTimerState, state.config);
      
      return {
        ...state,
        timerState: {
          ...updatedTimerState,
          canSwitchState,
          availableActions
        }
      };
    }

    case ActionType.UPDATE_CONFIG: {
      const newConfig = action.payload as Partial<TimerConfig>;
      return {
        ...state,
        config: { ...state.config, ...newConfig }
      };
    }

    case ActionType.RESTORE_STATE: {
      const restoredState = action.payload as Partial<TimerReducerState>;
      return {
        ...state,
        ...restoredState
      };
    }

    case ActionType.SET_CURRENT_SESSION_ID: {
      return {
        ...state,
        currentSessionId: action.payload as string | null
      };
    }

    case ActionType.RESET: {
      return {
        ...initialReducerState,
        config: state.config // 保留配置
      };
    }

    default:
      return state;
  }
}

// Provider 组件的 Props
interface TimerProviderProps {
  children: React.ReactNode;
}

// Provider 组件
export function TimerProvider({ children }: TimerProviderProps) {
  const [state, dispatch] = useReducer(timerReducer, initialReducerState);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const stateMachineRef = useRef<TimerStateMachine>(new TimerStateMachine());
  const isInitializedRef = useRef<boolean>(false);
  const reflectionContentRef = useRef<string>('');

  // 启动定时器
  const startTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      dispatch({ type: ActionType.TICK });
    }, 1000);
  };

  // 停止定时器
  const stopTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // 保存会话记录
  const saveSessionRecord = (
    type: TimerState,
    startTime: number,
    endTime: number,
    isCompleted: boolean,
    isFailed?: boolean,
    reflectionContent?: string
  ): string | null => {
    const duration = endTime - startTime;
    const targetDuration = stateMachineRef.current.getTargetDuration(type, state.config) * 60 * 1000;
    
    const record: Omit<SessionRecord, 'id'> = {
      type,
      startTime,
      endTime,
      duration,
      isCompleted,
      isFailed,
      metadata: {
        targetDuration,
        wasInterrupted: !isCompleted
      }
    };
    
    // 如果有反思内容，添加到记录中
    if (reflectionContent && reflectionContent.trim()) {
      record.reflectionSummary = {
        content: reflectionContent,
        createdAt: endTime,
        updatedAt: endTime
      };
    }
    
    try {
      const savedRecord = HistoryService.addRecord(record);

      return savedRecord.id;
    } catch (error) {
      console.error('保存会话记录失败:', error);
      return null;
    }
  };

  // 初始化通知管理器设置
  const initializeNotificationManager = () => {
    notificationManager.setNotificationEnabled(state.config.enableNotification);
    notificationManager.setSoundEnabled(state.config.enableSound);
  };

  // 请求通知权限（不自动请求，由用户主动触发）
  const requestNotificationPermission = async () => {
    return await notificationManager.requestNotificationPermission();
  };

  // 监听状态变化，管理定时器
  useEffect(() => {
    if (state.timerState.currentState !== TimerState.IDLE) {
      startTimer();
    } else {
      stopTimer();
    }
    
    return () => stopTimer();
  }, [state.timerState.currentState]);

  // 监听默认时间到达，发送通知
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    if (state.timerState.isDefaultTimeReached && state.timerState.currentState !== TimerState.IDLE) {
      const elapsedMinutes = Math.floor(state.timerState.elapsedTime / (60 * 1000));
      notificationManager.notifyTimeReached(state.timerState.currentState, elapsedMinutes);
    }
  }, [state.timerState.isDefaultTimeReached, state.timerState.currentState]);

  // 监听配置变化，更新通知管理器设置
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    notificationManager.setNotificationEnabled(state.config.enableNotification);
    notificationManager.setSoundEnabled(state.config.enableSound);
  }, [state.config.enableNotification, state.config.enableSound]);

  // 状态持久化键
  const STATE_STORAGE_KEY = 'flexible-pomodoro-state';

  // 保存当前状态到 localStorage
  const saveCurrentState = () => {
    try {
      const stateToSave = {
        timerState: state.timerState,
        config: state.config,
        currentSessionId: state.currentSessionId,
        timestamp: Date.now()
      };
      localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.error('保存状态失败:', error);
    }
  };

  // 从 localStorage 恢复状态
  const restoreState = () => {
    try {
      const saved = localStorage.getItem(STATE_STORAGE_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved);
      const { timerState, config, currentSessionId, timestamp } = parsed;

      // 验证数据完整性
      if (!timerState || !config || typeof timestamp !== 'number') {
        console.warn('保存的状态数据不完整，清除');
        localStorage.removeItem(STATE_STORAGE_KEY);
        return null;
      }

      const now = Date.now();
      const timeSinceSave = now - timestamp;
      
      // 检查时间合理性
      const maxAge = 24 * 60 * 60 * 1000; // 24小时
      if (timeSinceSave > maxAge || timeSinceSave < -60000) { // 允许1分钟的时间回退
        console.warn('保存的状态过旧或时间异常，清除');
        localStorage.removeItem(STATE_STORAGE_KEY);
        return null;
      }

      // 如果有活动状态，需要重新计算已用时间
      if (timerState.currentState !== TimerState.IDLE && timerState.startTime) {
        const savedElapsedTime = timerState.elapsedTime || 0;
        const newElapsedTime = savedElapsedTime + timeSinceSave;
        
        // 验证计算结果的合理性
        const MAX_SESSION_TIME = 4 * 60 * 60 * 1000; // 4小时
        if (newElapsedTime > MAX_SESSION_TIME || newElapsedTime < 0) {
          console.warn('计算出的时间不合理，重置状态');
          localStorage.removeItem(STATE_STORAGE_KEY);
          return null;
        }

        // 检查是否达到默认时间
        const isDefaultTimeReached = stateMachineRef.current.checkDefaultTimeReached(
          timerState.currentState,
          newElapsedTime,
          config
        );

        // 更新是否可以切换状态
        const updatedTimerState = {
          ...timerState,
          elapsedTime: newElapsedTime,
          isDefaultTimeReached
        };

        const canSwitchState = stateMachineRef.current.updateCanSwitchState(updatedTimerState, config);
        const availableActions = stateMachineRef.current.calculateAvailableActions(updatedTimerState, config);

        return {
          timerState: {
            ...updatedTimerState,
            canSwitchState,
            availableActions
          },
          config,
          currentSessionId: currentSessionId || null,
          sessionHistory: []
        };
      }

      // 为旧数据添加 availableActions 字段
      const timerStateWithActions = {
        ...timerState,
        availableActions: timerState.availableActions || stateMachineRef.current.calculateAvailableActions(timerState, config)
      };

      return {
        timerState: timerStateWithActions,
        config,
        currentSessionId: currentSessionId || null,
        sessionHistory: []
      };
    } catch (error) {
      console.error('恢复状态失败:', error);
      localStorage.removeItem(STATE_STORAGE_KEY);
      return null;
    }
  };

  // 清除保存的状态
  const clearSavedState = () => {
    try {
      localStorage.removeItem(STATE_STORAGE_KEY);
    } catch (error) {
      console.error('清除保存状态失败:', error);
    }
  };

  // 初始化：加载配置和恢复状态
  useEffect(() => {
    if (isInitializedRef.current) return;
    
    try {
      // 首先尝试恢复状态
      const restoredState = restoreState();
      
      if (restoredState) {
        // 如果有保存的状态，使用它
        dispatch({ type: ActionType.RESTORE_STATE, payload: restoredState });
      } else {
        // 否则只加载配置
        const config = ConfigService.loadConfig();
        dispatch({ type: ActionType.UPDATE_CONFIG, payload: config });
      }
      
      // 初始化通知管理器
      initializeNotificationManager();
      
      isInitializedRef.current = true;
    } catch (error) {
      console.error('初始化失败:', error);
      // 发生错误时使用默认配置
      try {
        const config = ConfigService.loadConfig();
        dispatch({ type: ActionType.UPDATE_CONFIG, payload: config });
        initializeNotificationManager();
      } catch (configError) {
        console.error('加载默认配置失败:', configError);
      }
      isInitializedRef.current = true;
    }
  }, []);

  // 状态变化时保存状态
  useEffect(() => {
    if (!isInitializedRef.current) return;
    
    // 如果是活动状态，保存到 localStorage
    if (state.timerState.currentState !== TimerState.IDLE) {
      saveCurrentState();
    } else {
      // 如果是空闲状态，清除保存的状态
      clearSavedState();
    }
  }, [state.timerState.currentState, state.timerState.elapsedTime, state.config, state.currentSessionId]);

  // 页面卸载时保存状态
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (state.timerState.currentState !== TimerState.IDLE) {
        saveCurrentState();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state]);

  // 组件卸载时清理通知管理器
  useEffect(() => {
    return () => {
      notificationManager.dispose();
    };
  }, []);

  // Context 值
  const contextValue: TimerContextType = {
    // 状态
    state: state.timerState,
    config: state.config,
    
    // 操作
    startFocus: () => {
      const previousState = state.timerState.currentState;
      const finalReflectionContent = reflectionContentRef.current;
      
      // 如果当前有活动状态，先保存记录
      if (state.timerState.currentState !== TimerState.IDLE && state.timerState.startTime) {
        const now = Date.now();
        const isCompleted = state.timerState.isDefaultTimeReached;
        const isFailed = state.timerState.currentState === TimerState.FOCUS && 
                        stateMachineRef.current.isFocusFailed(state.timerState, state.config);
        
        // 如果是反思状态，保存反思会话记录
        if (state.timerState.currentState === TimerState.REFLECTION) {
          saveSessionRecord(
            TimerState.REFLECTION,
            state.timerState.startTime,
            now,
            isCompleted,
            false,
            finalReflectionContent
          );
        } else {
          saveSessionRecord(
            state.timerState.currentState,
            state.timerState.startTime,
            now,
            isCompleted,
            isFailed
          );
        }

        // 发送会话完成通知
        if (isCompleted) {
          const duration = now - state.timerState.startTime;
          notificationManager.notifySessionCompleted(state.timerState.currentState, duration / 1000);
        } else if (isFailed) {
          const duration = now - state.timerState.startTime;
          notificationManager.notifyFocusFailed(duration / 1000);
        }
      }
      
      // 清除currentSessionId
      dispatch({ type: ActionType.SET_CURRENT_SESSION_ID, payload: null });
      dispatch({ type: ActionType.START_FOCUS });
      
      // 发送状态切换通知
      if (previousState !== TimerState.FOCUS) {
        notificationManager.notifyStateChanged(previousState, TimerState.FOCUS);
      }
    },
    
    startReflection: () => {
      const previousState = state.timerState.currentState;
      let focusSessionId: string | null = null;
      
      // 保存当前专注记录
      if (state.timerState.currentState === TimerState.FOCUS && state.timerState.startTime) {
        const now = Date.now();
        const isCompleted = state.timerState.isDefaultTimeReached;
        const isFailed = false; // 切换到反思说明专注成功
        
        focusSessionId = saveSessionRecord(
          TimerState.FOCUS,
          state.timerState.startTime,
          now,
          isCompleted,
          isFailed
        );

        // 发送专注会话完成通知
        const duration = now - state.timerState.startTime;
        notificationManager.notifySessionCompleted(TimerState.FOCUS, duration / 1000);
      }
      
      // 设置当前会话 ID 用于反思总结（优先使用专注会话 ID）
      if (focusSessionId) {
        dispatch({ type: ActionType.SET_CURRENT_SESSION_ID, payload: focusSessionId });
      } else if (!state.currentSessionId) {
        // 如果没有专注会话且没有当前会话 ID，创建一个临时会话
        const tempSessionId = `temp-reflection-${Date.now()}`;
        dispatch({ type: ActionType.SET_CURRENT_SESSION_ID, payload: tempSessionId });
      }
      
      dispatch({ type: ActionType.START_REFLECTION });
      
      // 发送状态切换通知
      notificationManager.notifyStateChanged(previousState, TimerState.REFLECTION);
    },
    
    startRest: (reflectionContent?: string) => {
      const previousState = state.timerState.currentState;
      const finalReflectionContent = reflectionContent || reflectionContentRef.current;

      
      // 保存当前状态记录
      if (state.timerState.currentState !== TimerState.IDLE && state.timerState.startTime) {

        const now = Date.now();
        const isCompleted = state.timerState.isDefaultTimeReached;
        const isFailed = state.timerState.currentState === TimerState.FOCUS && 
                        stateMachineRef.current.isFocusFailed(state.timerState, state.config);
        
        // 如果是反思状态，保存反思会话记录

        if (state.timerState.currentState === TimerState.REFLECTION) {
          saveSessionRecord(
            TimerState.REFLECTION,
            state.timerState.startTime,
            now,
            isCompleted,
            false,
            finalReflectionContent
          );
        } else {
          saveSessionRecord(
            state.timerState.currentState,
            state.timerState.startTime,
            now,
            isCompleted,
            isFailed
          );
        }

        // 发送会话完成通知
        if (isCompleted) {
          const duration = now - state.timerState.startTime;
          notificationManager.notifySessionCompleted(state.timerState.currentState, duration / 1000);
        } else if (isFailed) {
          const duration = now - state.timerState.startTime;
          notificationManager.notifyFocusFailed(duration / 1000);
        }
      }
      
      // 清除currentSessionId
      dispatch({ type: ActionType.SET_CURRENT_SESSION_ID, payload: null });
      dispatch({ type: ActionType.START_REST });
      
      // 发送状态切换通知
      notificationManager.notifyStateChanged(previousState, TimerState.REST);
    },
    
    cancel: (reflectionContent?: string) => {
      const previousState = state.timerState.currentState;
      const finalReflectionContent = reflectionContent || reflectionContentRef.current;

      console.log('Cancel operation started:', {
        previousState,
        currentState: state.timerState.currentState,
        startTime: state.timerState.startTime,
        elapsedTime: state.timerState.elapsedTime
      });
      
      // 保存当前状态记录
      if (state.timerState.currentState !== TimerState.IDLE && state.timerState.startTime) {
        const now = Date.now();
        const isCompleted = state.timerState.isDefaultTimeReached;
        const isFailed = state.timerState.currentState === TimerState.FOCUS && 
                        stateMachineRef.current.isFocusFailed(state.timerState, state.config);
        
        console.log('Saving session record on cancel:', {
          type: state.timerState.currentState,
          duration: now - state.timerState.startTime,
          isCompleted,
          isFailed
        });
        
        // 如果是反思状态，保存反思会话记录
        if (state.timerState.currentState === TimerState.REFLECTION) {
          saveSessionRecord(
            TimerState.REFLECTION,
            state.timerState.startTime,
            now,
            isCompleted,
            false,
            finalReflectionContent
          );
        } else {
          saveSessionRecord(
            state.timerState.currentState,
            state.timerState.startTime,
            now,
            isCompleted,
            isFailed
          );
        }

        // 如果是专注失败，发送失败通知
        if (isFailed) {
          const duration = now - state.timerState.startTime;
          notificationManager.notifyFocusFailed(duration / 1000);
        }
      }
      
      // 清除currentSessionId
      dispatch({ type: ActionType.SET_CURRENT_SESSION_ID, payload: null });
      
      console.log('Dispatching CANCEL action');
      dispatch({ type: ActionType.CANCEL });
      
      // 发送状态切换通知
      if (previousState !== TimerState.IDLE) {
        notificationManager.notifyStateChanged(previousState, TimerState.IDLE);
      }
      
      console.log('Cancel operation completed');
    },
    
    // 配置
    updateConfig: (newConfig: Partial<TimerConfig>) => {
      try {
        ConfigService.saveConfig(newConfig);
        dispatch({ type: ActionType.UPDATE_CONFIG, payload: newConfig });
      } catch (error) {
        console.error('更新配置失败:', error);
        throw error;
      }
    },
    
    // 通知
    requestNotificationPermission: () => {
      return notificationManager.requestNotificationPermission();
    },
    
    getNotificationPermissionStatus: () => {
      return notificationManager.getPermissionStatus();
    },
    
    // 历史记录
    getSessionHistory: () => {
      try {
        return HistoryService.getAllRecords();
      } catch (error) {
        console.error('获取历史记录失败:', error);
        return [];
      }
    },
    
    getStatistics: (period: 'today' | 'week' | 'month') => {
      try {
        switch (period) {
          case 'today':
            return HistoryService.getTodayStatistics();
          case 'week':
            return HistoryService.getWeekStatistics();
          case 'month':
            return HistoryService.getMonthStatistics();
          default:
            return HistoryService.getTodayStatistics();
        }
      } catch (error) {
        console.error('获取统计数据失败:', error);
        return {
          totalFocusTime: 0,
          totalReflectionTime: 0,
          totalRestTime: 0,
          focusSessionCount: 0,
          failedFocusCount: 0,
          averageFocusTime: 0,
          longestFocusStreak: 0
        };
      }
    },
    
    // 反思总结
    updateReflectionSummary: (sessionId: string, content: string) => {
      try {
        // 存储当前反思内容到 ref
        reflectionContentRef.current = content;
        
        // 如果不是临时会话，直接更新记录
        if (!sessionId.startsWith('temp-reflection-')) {
          const result = HistoryService.updateReflectionSummary(sessionId, content);

          return result;
        }
        
        // 临时会话的内容将在状态切换时保存

        return null;
      } catch (error) {
        console.error('更新反思总结失败:', error);
        throw error;
      }
    },
    
    getCurrentSessionId: () => {
      return state.currentSessionId;
    },
    
    // 删除记录
    deleteRecord: (recordId: string) => {
      try {
        return HistoryService.deleteRecord(recordId);
      } catch (error) {
        console.error('删除记录失败:', error);
        throw error;
      }
    }
  };

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
}

// Hook for using the context
export function useTimer(): TimerContextType {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
}