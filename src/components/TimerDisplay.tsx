import React from 'react';
import { useTimer } from '../contexts/TimerContext';
import { TimerState } from '../types';
import { t } from '../i18n';

/**
 * 格式化时间显示（毫秒转换为 MM:SS 格式）
 */
function formatTime(milliseconds: number): string {
  // 防止异常值
  if (!Number.isFinite(milliseconds) || milliseconds < 0) {
    return '00:00';
  }
  
  // 防止过大的值（超过24小时显示为24:00:00）
  const maxTime = 24 * 60 * 60 * 1000;
  const safeTime = Math.min(milliseconds, maxTime);
  
  const totalSeconds = Math.floor(safeTime / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 获取状态显示名称
 */
function getStateDisplayName(state: TimerState): string {
  return t(`states.${state}`);
}

/**
 * 获取状态提示信息
 */
function getStateMessage(state: TimerState, isDefaultTimeReached: boolean, canSwitchState: boolean): string {
  if (state === TimerState.IDLE) {
    return '点击开始专注按钮开始新的番茄时钟';
  }

  if (isDefaultTimeReached) {
    return t('controlPanel.timeReached');
  }

  switch (state) {
    case TimerState.FOCUS:
      if (canSwitchState) {
        return '专注进行中，可以切换到反思或休息状态';
      } else {
        return '专注进行中，请继续保持专注';
      }
    case TimerState.REFLECTION:
      return '反思进行中，总结刚才的专注成果';
    case TimerState.REST:
      return '休息进行中，放松一下为下次专注做准备';
    default:
      return '';
  }
}

/**
 * 获取状态对应的CSS类名
 */
function getStateClassName(state: TimerState): string {
  const classNames = {
    [TimerState.IDLE]: 'timer-display--idle',
    [TimerState.FOCUS]: 'timer-display--focus',
    [TimerState.REFLECTION]: 'timer-display--reflection',
    [TimerState.REST]: 'timer-display--rest'
  };
  return classNames[state];
}

/**
 * 计时器显示组件
 * 显示当前状态、已用时间和状态提示信息
 */
export function TimerDisplay(): React.ReactElement {
  const { state, config } = useTimer();
  
  const stateDisplayName = getStateDisplayName(state.currentState);
  const formattedTime = formatTime(state.elapsedTime);
  const stateMessage = getStateMessage(state.currentState, state.isDefaultTimeReached, state.canSwitchState);
  const stateClassName = getStateClassName(state.currentState);

  // 获取目标时间（用于显示进度）
  const getTargetTime = (): number => {
    switch (state.currentState) {
      case TimerState.FOCUS:
        return config.focusDuration * 60 * 1000;
      case TimerState.REFLECTION:
        return config.reflectionDuration * 60 * 1000;
      case TimerState.REST:
        return config.restDuration * 60 * 1000;
      default:
        return 0;
    }
  };

  const targetTime = getTargetTime();
  const progress = targetTime > 0 ? Math.min((state.elapsedTime / targetTime) * 100, 100) : 0;

  return (
    <div className={`timer-display ${stateClassName}`} data-testid="timer-display">
      {/* 状态标题 */}
      <div className="timer-display__header">
        <h2 className="timer-display__state-name" data-testid="timer-state">{stateDisplayName}</h2>
        {state.isDefaultTimeReached && (
          <div className="timer-display__notification-badge" data-testid="notification-indicator">
            {t('timerDisplay.completed')}
          </div>
        )}
      </div>

      {/* 时间显示 */}
      <div className="timer-display__time-section">
        <div className="timer-display__time" data-testid="timer-display">{formattedTime}</div>
        
        {/* 进度条 */}
        {state.currentState !== TimerState.IDLE && (
          <div className="timer-display__progress-container">
            <div className="timer-display__progress-bar">
              <div 
                className="timer-display__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="timer-display__target-time">
              {t('timerDisplay.target')}: {formatTime(targetTime)}
            </div>
          </div>
        )}
      </div>

      {/* 状态提示信息 */}
      <div className="timer-display__message">
        <p>{stateMessage}</p>
      </div>

      {/* 额外状态指示器 */}
      {state.currentState === TimerState.FOCUS && !state.canSwitchState && (
        <div className="timer-display__focus-lock">
          <small>{t('controlPanel.focusLocked', { minutes: Math.ceil((config.focusFailureTime * 60 * 1000 - state.elapsedTime) / 60000) })}</small>
        </div>
      )}
    </div>
  );
}