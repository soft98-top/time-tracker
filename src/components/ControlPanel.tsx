import React, { useState } from 'react';
import { useTimer } from '../contexts/TimerContext';
import { TimerState } from '../types';
import { t } from '../i18n';

/**
 * 按钮配置接口
 */
interface ButtonConfig {
  label: string;
  action: () => void;
  disabled: boolean;
  disabledReason?: string;
  variant: 'primary' | 'secondary' | 'danger';
  icon?: string;
}

/**
 * 确认对话框组件
 */
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}

function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = t('common.confirm'),
  cancelText = t('common.cancel')
}: ConfirmDialogProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <div className="control-panel__dialog-overlay">
      <div className="control-panel__dialog">
        <div className="control-panel__dialog-header">
          <h3>{title}</h3>
        </div>
        <div className="control-panel__dialog-body">
          <p>{message}</p>
        </div>
        <div className="control-panel__dialog-actions">
          <button
            className="control-panel__button control-panel__button--secondary"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            className="control-panel__button control-panel__button--primary"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 错误提示组件
 */
interface ErrorToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

function ErrorToast({ message, isVisible, onClose }: ErrorToastProps): React.ReactElement | null {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 5000); // 5秒后自动关闭
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="control-panel__error-toast">
      <div className="control-panel__error-content">
        <span className="control-panel__error-icon">⚠️</span>
        <span className="control-panel__error-message">{message}</span>
        <button
          className="control-panel__error-close"
          onClick={onClose}
          aria-label={t('common.close')}
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * 控制面板组件
 * 处理用户操作，包括状态切换、按钮状态管理和操作确认
 */
interface ControlPanelProps {
  customStartRest?: () => void;
  customCancel?: () => void;
  onOpenReflection?: () => void;
}

export function ControlPanel({ customStartRest, customCancel, onOpenReflection }: ControlPanelProps = {}): React.ReactElement {
  const { state, config, startFocus, startReflection, startRest, cancel } = useTimer();
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isErrorVisible, setIsErrorVisible] = useState<boolean>(false);

  /**
   * 显示错误提示
   */
  const showError = (message: string) => {
    setErrorMessage(message);
    setIsErrorVisible(true);
  };

  /**
   * 隐藏错误提示
   */
  const hideError = () => {
    setIsErrorVisible(false);
  };

  /**
   * 显示确认对话框
   */
  const showConfirmDialog = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      onConfirm
    });
  };

  /**
   * 隐藏确认对话框
   */
  const hideConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {}
    });
  };

  /**
   * 执行操作并处理错误
   */
  const executeAction = async (action: () => void, actionName: string) => {
    try {
      action();
    } catch (error) {
      console.error(`Execute ${actionName} failed:`, error);
      showError(t('controlPanel.actionFailed', { action: actionName }));
    }
  };

  /**
   * 处理开始专注
   */
  const handleStartFocus = () => {
    // 检查是否可以开始专注
    if (!state.availableActions.canStartFocus) {
      if (state.currentState === TimerState.FOCUS) {
        showError(t('controlPanel.alreadyFocusing'));
        return;
      }
    }

    if (state.currentState !== TimerState.IDLE) {
      showConfirmDialog(
        t('dialogs.switchToFocus.title'),
        t('dialogs.switchToFocus.message'),
        () => {
          executeAction(startFocus, t('controlPanel.startFocus'));
          hideConfirmDialog();
        }
      );
    } else {
      executeAction(startFocus, t('controlPanel.startFocus'));
    }
  };

  /**
   * 处理开始反思
   */
  const handleStartReflection = () => {
    if (state.currentState === TimerState.FOCUS) {
      showConfirmDialog(
        t('dialogs.switchToReflection.title'),
        t('dialogs.switchToReflection.message'),
        () => {
          executeAction(startReflection, t('controlPanel.startReflection'));
          hideConfirmDialog();
        }
      );
    } else {
      executeAction(startReflection, t('controlPanel.startReflection'));
    }
  };

  /**
   * 处理开始休息
   */
  const handleStartRest = () => {
    if (state.currentState !== TimerState.IDLE) {
      const currentStateName = t(`states.${state.currentState}`);
      showConfirmDialog(
        t('dialogs.switchToRest.title'),
        t('dialogs.switchToRest.message', { currentState: currentStateName }),
        () => {
          executeAction(customStartRest || startRest, t('controlPanel.startRest'));
          hideConfirmDialog();
        }
      );
    } else {
      executeAction(customStartRest || startRest, t('controlPanel.startRest'));
    }
  };

  /**
   * 处理取消操作
   */
  const handleCancel = () => {
    const currentStateName = t(`states.${state.currentState}`);
    
    if (state.currentState === TimerState.FOCUS && !state.canSwitchState) {
      showConfirmDialog(
        t('dialogs.cancelFocus.title'),
        t('dialogs.cancelFocus.message'),
        () => {
          executeAction(customCancel || cancel, t('controlPanel.cancel'));
          hideConfirmDialog();
        }
      );
    } else if (state.currentState !== TimerState.IDLE) {
      showConfirmDialog(
        t('dialogs.cancelActivity.title', { currentState: currentStateName }),
        t('dialogs.cancelActivity.message', { currentState: currentStateName }),
        () => {
          executeAction(customCancel || cancel, t('controlPanel.cancel'));
          hideConfirmDialog();
        }
      );
    }
  };

  /**
   * 获取按钮配置
   */
  const getButtonConfigs = (): ButtonConfig[] => {
    const configs: ButtonConfig[] = [];

    // 专注按钮
    configs.push({
      label: t('controlPanel.startFocus'),
      action: handleStartFocus,
      disabled: !state.availableActions.canStartFocus,
      disabledReason: !state.availableActions.canStartFocus ? 
        (state.currentState === TimerState.FOCUS ? t('controlPanel.alreadyFocusing') : t('controlPanel.cannotStartFocus')) : 
        undefined,
      variant: 'primary',
      icon: '🍅'
    });

    // 反思按钮
    configs.push({
      label: t('controlPanel.startReflection'),
      action: handleStartReflection,
      disabled: !state.availableActions.canSwitchToReflection,
      disabledReason: !state.availableActions.canSwitchToReflection ? 
        (state.currentState === TimerState.FOCUS ? t('controlPanel.needMinFocusTime') : t('controlPanel.cannotSwitchToReflection')) : 
        undefined,
      variant: 'secondary',
      icon: '🤔'
    });

    // 反思总结按钮（只在反思状态下显示）
    if (state.currentState === TimerState.REFLECTION && onOpenReflection) {
      configs.push({
        label: t('controlPanel.reflectionSummary'),
        action: onOpenReflection,
        disabled: false,
        variant: 'secondary',
        icon: '📝'
      });
    }

    // 休息按钮
    configs.push({
      label: t('controlPanel.startRest'),
      action: handleStartRest,
      disabled: !state.availableActions.canSwitchToRest,
      disabledReason: !state.availableActions.canSwitchToRest ? 
        (state.currentState === TimerState.FOCUS ? t('controlPanel.needMinFocusTime') : t('controlPanel.cannotSwitchToRest')) : 
        undefined,
      variant: 'secondary',
      icon: '☕'
    });

    // 取消按钮
    if (state.availableActions.canCancel) {
      configs.push({
        label: t('controlPanel.cancel'),
        action: handleCancel,
        disabled: false,
        variant: 'danger',
        icon: '❌'
      });
    }

    return configs;
  };

  const buttonConfigs = getButtonConfigs();

  return (
    <div className="control-panel" data-testid="control-panel">
      <div className="control-panel__header">
        <h3 className="control-panel__title">{t('controlPanel.title')}</h3>
        {state.currentState !== TimerState.IDLE && (
          <div className="control-panel__status">
            {t('controlPanel.currentStatus')}: {t(`states.${state.currentState}`)}
          </div>
        )}
      </div>

      <div className="control-panel__buttons">
        {buttonConfigs.map((config, index) => {
          // Generate test id based on button label
          const getTestId = (label: string) => {
            if (label === t('controlPanel.startFocus')) return 'start-focus-btn';
            if (label === t('controlPanel.startReflection')) return 'start-reflection-btn';
            if (label === t('controlPanel.startRest')) return 'start-rest-btn';
            if (label === t('controlPanel.cancel')) return 'cancel-btn';
            if (label === t('controlPanel.reflectionSummary')) return 'open-reflection-btn';
            return `button-${index}`;
          };

          return (
            <div key={index} className="control-panel__button-container">
              <button
                className={`control-panel__button control-panel__button--${config.variant}`}
                onClick={config.action}
                disabled={config.disabled}
                title={config.disabledReason}
                data-testid={getTestId(config.label)}
              >
                {config.icon && (
                  <span className="control-panel__button-icon">{config.icon}</span>
                )}
                <span className="control-panel__button-text">{config.label}</span>
              </button>
            
            {config.disabled && config.disabledReason && (
              <div className="control-panel__disabled-reason">
                {config.disabledReason}
              </div>
            )}
          </div>
        )})}
      </div>

      {/* 状态提示 */}
      {state.currentState === TimerState.FOCUS && !state.canSwitchState && (
        <div className="control-panel__info">
          <div className="control-panel__info-icon">ℹ️</div>
          <div className="control-panel__info-text">
            {t('controlPanel.focusLocked', { 
              minutes: Math.ceil((config.focusFailureTime * 60 * 1000 - state.elapsedTime) / 60000) 
            })}
          </div>
        </div>
      )}

      {state.currentState === TimerState.FOCUS && !state.availableActions.canStartFocus && (
        <div className="control-panel__info">
          <div className="control-panel__info-icon">📝</div>
          <div className="control-panel__info-text">
            {t('controlPanel.focusLockedInfo')}
          </div>
        </div>
      )}

      {state.isDefaultTimeReached && (
        <div className="control-panel__notification">
          <div className="control-panel__notification-icon">🔔</div>
          <div className="control-panel__notification-text">
            {t('controlPanel.timeReached')}
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={hideConfirmDialog}
      />

      {/* 错误提示 */}
      <ErrorToast
        message={errorMessage}
        isVisible={isErrorVisible}
        onClose={hideError}
      />
      
      {/* Error message for E2E testing */}
      {isErrorVisible && (
        <div data-testid="error-message" style={{ display: 'none' }}>
          {errorMessage}
        </div>
      )}
    </div>
  );
}