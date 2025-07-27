import React, { Component, ReactNode } from 'react';
import { TimerError, TimerException, ErrorInfo } from '../types/errors';
import { t } from '../i18n';
import './ErrorBoundary.css';

interface Props {
  children: ReactNode;
  fallback?: (error: ErrorInfo, retry: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: ErrorInfo | null;
}

/**
 * 全局错误边界组件
 * 捕获子组件中的错误并提供友好的错误界面
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 将错误转换为 ErrorInfo
    const errorInfo: ErrorInfo = {
      type: error instanceof TimerException ? error.type : TimerError.UNKNOWN_ERROR,
      message: error.message,
      recoverable: error instanceof TimerException ? error.recoverable : true,
      timestamp: Date.now(),
      stack: error.stack
    };

    return {
      hasError: true,
      error: errorInfo
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 记录错误到控制台
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // 可以在这里添加错误报告逻辑
    this.reportError(error, errorInfo);
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // 这里可以添加错误报告服务
    // 例如发送到错误监控服务
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // 暂时只记录到 localStorage 用于调试
    try {
      const existingReports = JSON.parse(localStorage.getItem('timer_error_reports') || '[]');
      existingReports.push(errorReport);
      // 只保留最近的 10 个错误报告
      if (existingReports.length > 10) {
        existingReports.splice(0, existingReports.length - 10);
      }
      localStorage.setItem('timer_error_reports', JSON.stringify(existingReports));
    } catch (e) {
      console.error('Failed to save error report:', e);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 如果提供了自定义 fallback，使用它
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // 默认错误界面
      return (
        <div className="error-boundary" data-testid="error-boundary">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">⚠️</div>
            <h2 className="error-boundary__title">{t('errorBoundary.title')}</h2>
            <p className="error-boundary__message" data-testid="error-message">
              {this.getErrorMessage(this.state.error)}
            </p>
            
            <div className="error-boundary__actions">
              {this.state.error.recoverable && (
                <button 
                  className="error-boundary__button error-boundary__button--primary"
                  onClick={this.handleRetry}
                  data-testid="error-retry-btn"
                >
                  {t('errorBoundary.retry')}
                </button>
              )}
              <button 
                className="error-boundary__button error-boundary__button--secondary"
                onClick={this.handleReload}
                data-testid="error-reload-btn"
              >
                {t('errorBoundary.reload')}
              </button>
            </div>

            <details className="error-boundary__details">
              <summary>{t('errorBoundary.technicalDetails')}</summary>
              <div className="error-boundary__technical">
                <p><strong>{t('errorBoundary.errorType')}:</strong> {this.state.error.type}</p>
                <p><strong>{t('errorBoundary.timestamp')}:</strong> {new Date(this.state.error.timestamp).toLocaleString()}</p>
                {this.state.error.stack && (
                  <div>
                    <strong>{t('errorBoundary.stackTrace')}:</strong>
                    <pre className="error-boundary__stack">{this.state.error.stack}</pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }

  private getErrorMessage(error: ErrorInfo): string {
    switch (error.type) {
      case TimerError.INVALID_STATE_TRANSITION:
        return t('errorBoundary.errors.invalidStateTransition');
      case TimerError.STORAGE_ERROR:
        return t('errorBoundary.errors.storageError');
      case TimerError.TIMER_SYNC_ERROR:
        return t('errorBoundary.errors.timerSyncError');
      case TimerError.CONFIG_VALIDATION_ERROR:
        return t('errorBoundary.errors.configValidationError');
      case TimerError.NOTIFICATION_ERROR:
        return t('errorBoundary.errors.notificationError');
      default:
        return t('errorBoundary.errors.unknownError');
    }
  }
}

export default ErrorBoundary;