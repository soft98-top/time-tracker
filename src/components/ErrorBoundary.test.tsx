import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { TimerError, TimerException } from '../types/errors';

// 创建一个会抛出错误的测试组件
const ThrowError = ({ shouldThrow, errorType }: { shouldThrow: boolean; errorType?: TimerError }) => {
  if (shouldThrow) {
    if (errorType) {
      throw new TimerException(errorType, `Test ${errorType} error`, true);
    }
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('ErrorBoundary', () => {
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockLocalStorage[key];
        }),
        clear: vi.fn(() => {
          mockLocalStorage = {};
        })
      },
      writable: true
    });

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock window.location.reload
    Object.defineProperty(window, 'location', {
      value: {
        reload: vi.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should catch and display error when child component throws', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('出现了一些问题')).toBeInTheDocument();
    expect(screen.getByText('应用出现未知错误，请尝试刷新页面。如果问题持续存在，请联系支持。')).toBeInTheDocument();
  });

  it('should display specific error messages for different error types', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType={TimerError.STORAGE_ERROR} />
      </ErrorBoundary>
    );

    expect(screen.getByText('数据保存出现问题，您的设置可能无法保存。请检查浏览器存储权限。')).toBeInTheDocument();
  });

  it('should show retry button for recoverable errors', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType={TimerError.TIMER_SYNC_ERROR} />
      </ErrorBoundary>
    );

    expect(screen.getByText('重试')).toBeInTheDocument();
    expect(screen.getByText('刷新页面')).toBeInTheDocument();
  });

  it('should handle retry button click', () => {
    let shouldThrow = true;
    const TestComponent = () => <ThrowError shouldThrow={shouldThrow} />;
    
    const { rerender } = render(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('出现了一些问题')).toBeInTheDocument();

    // Change the error condition and click retry
    shouldThrow = false;
    fireEvent.click(screen.getByText('重试'));

    // Re-render with no error
    rerender(
      <ErrorBoundary>
        <TestComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();
  });

  it('should handle reload button click', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('刷新页面'));

    expect(window.location.reload).toHaveBeenCalled();
  });

  it('should save error report to localStorage', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reports = JSON.parse(localStorage.getItem('timer_error_reports') || '[]');
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({
      message: 'Test error',
      timestamp: expect.any(String),
      userAgent: expect.any(String)
    });
    expect(reports[0]).toHaveProperty('componentStack');
  });

  it('should show technical details when expanded', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorType={TimerError.CONFIG_VALIDATION_ERROR} />
      </ErrorBoundary>
    );

    // Technical details should be in a collapsed details element
    const detailsElement = screen.getByText('技术详情').closest('details');
    expect(detailsElement).toBeInTheDocument();
    expect(detailsElement).not.toHaveAttribute('open');

    // Click to expand details
    fireEvent.click(screen.getByText('技术详情'));

    // Now technical details should be visible
    expect(screen.getByText('错误类型:')).toBeInTheDocument();
    expect(screen.getByText('CONFIG_VALIDATION_ERROR')).toBeInTheDocument();
    expect(screen.getByText('时间:')).toBeInTheDocument();
  });

  it('should use custom fallback when provided', () => {
    const customFallback = (error: any, retry: () => void) => (
      <div>
        <div>Custom error: {error.message}</div>
        <button onClick={retry}>Custom retry</button>
      </div>
    );

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error: Test error')).toBeInTheDocument();
    expect(screen.getByText('Custom retry')).toBeInTheDocument();
  });

  it('should handle different TimerError types with appropriate messages', () => {
    const errorTypes = [
      {
        type: TimerError.INVALID_STATE_TRANSITION,
        message: '计时器状态切换出现问题，请重试或刷新页面。'
      },
      {
        type: TimerError.STORAGE_ERROR,
        message: '数据保存出现问题，您的设置可能无法保存。请检查浏览器存储权限。'
      },
      {
        type: TimerError.TIMER_SYNC_ERROR,
        message: '计时器同步出现问题，时间显示可能不准确。'
      },
      {
        type: TimerError.CONFIG_VALIDATION_ERROR,
        message: '配置验证失败，将使用默认设置。'
      },
      {
        type: TimerError.NOTIFICATION_ERROR,
        message: '通知功能出现问题，您可能无法收到提醒。'
      }
    ];

    errorTypes.forEach(({ type, message }) => {
      const { unmount } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorType={type} />
        </ErrorBoundary>
      );

      expect(screen.getByText(message)).toBeInTheDocument();
      unmount();
    });
  });

  it('should limit error reports to 10 entries', () => {
    // Add 15 error reports
    for (let i = 0; i < 15; i++) {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    }

    const reports = JSON.parse(localStorage.getItem('timer_error_reports') || '[]');
    expect(reports).toHaveLength(10);
  });

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw an error
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });

    // Should not throw an error even if localStorage fails
    expect(() => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
    }).not.toThrow();

    expect(screen.getByText('出现了一些问题')).toBeInTheDocument();
  });
});