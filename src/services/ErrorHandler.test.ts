import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GlobalErrorHandler, { globalErrorHandler, createTimerError, handleError } from './ErrorHandler';
import { TimerError, TimerException } from '../types/errors';

describe('ErrorHandler', () => {
  let errorHandler: GlobalErrorHandler;
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    errorHandler = new GlobalErrorHandler();
    
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
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    errorHandler.destroy();
    vi.restoreAllMocks();
  });

  describe('handleError', () => {
    it('should handle TimerException correctly', () => {
      const error = new TimerException(
        TimerError.STORAGE_ERROR,
        'Storage failed',
        true
      );

      errorHandler.handleError(error);

      const lastError = errorHandler.getLastError();
      expect(lastError).toBeTruthy();
      expect(lastError?.type).toBe(TimerError.STORAGE_ERROR);
      expect(lastError?.message).toBe('Storage failed');
      expect(lastError?.recoverable).toBe(true);
    });

    it('should convert regular Error to TimerException', () => {
      const error = new Error('localStorage is not available');

      errorHandler.handleError(error);

      const lastError = errorHandler.getLastError();
      expect(lastError).toBeTruthy();
      expect(lastError?.type).toBe(TimerError.STORAGE_ERROR);
      expect(lastError?.message).toBe('localStorage is not available');
    });

    it('should log error to localStorage', () => {
      const error = new TimerException(
        TimerError.TIMER_SYNC_ERROR,
        'Timer sync failed',
        true
      );

      errorHandler.handleError(error);

      const logs = JSON.parse(localStorage.getItem('timer_error_logs') || '[]');
      expect(logs).toHaveLength(1);
      expect(logs[0].type).toBe(TimerError.TIMER_SYNC_ERROR);
      expect(logs[0].message).toBe('Timer sync failed');
    });

    it('should notify error listeners', () => {
      const listener = vi.fn();
      errorHandler.addErrorListener(listener);

      const error = new TimerException(
        TimerError.CONFIG_VALIDATION_ERROR,
        'Config invalid',
        true
      );

      errorHandler.handleError(error);

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimerError.CONFIG_VALIDATION_ERROR,
          message: 'Config invalid'
        })
      );
    });
  });

  describe('error listeners', () => {
    it('should add and remove error listeners', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      errorHandler.addErrorListener(listener1);
      errorHandler.addErrorListener(listener2);

      const error = new TimerException(TimerError.UNKNOWN_ERROR, 'Test error');
      errorHandler.handleError(error);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();

      errorHandler.removeErrorListener(listener1);
      errorHandler.clearError();
      
      errorHandler.handleError(error);
      expect(listener1).toHaveBeenCalledTimes(1); // Not called again
      expect(listener2).toHaveBeenCalledTimes(2); // Called again
    });
  });

  describe('recovery strategies', () => {
    it('should register and use recovery strategies', async () => {
      const mockStrategy = {
        canRecover: vi.fn().mockReturnValue(true),
        recover: vi.fn().mockResolvedValue(true)
      };

      errorHandler.registerRecoveryStrategy(TimerError.STORAGE_ERROR, mockStrategy);

      const error = new TimerException(
        TimerError.STORAGE_ERROR,
        'Storage failed',
        true
      );

      errorHandler.handleError(error);

      // Wait for async recovery
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockStrategy.canRecover).toHaveBeenCalledWith(error);
      expect(mockStrategy.recover).toHaveBeenCalledWith(error);
      expect(errorHandler.getLastError()).toBeNull(); // Error should be cleared after recovery
    });

    it('should not clear error if recovery fails', async () => {
      const mockStrategy = {
        canRecover: vi.fn().mockReturnValue(true),
        recover: vi.fn().mockResolvedValue(false)
      };

      errorHandler.registerRecoveryStrategy(TimerError.STORAGE_ERROR, mockStrategy);

      const error = new TimerException(
        TimerError.STORAGE_ERROR,
        'Storage failed',
        true
      );

      errorHandler.handleError(error);

      // Wait for async recovery
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(errorHandler.getLastError()).toBeTruthy(); // Error should still be there
    });
  });

  describe('error type detection', () => {
    it('should detect storage errors', () => {
      const error = new Error('localStorage quota exceeded');
      errorHandler.handleError(error);

      const lastError = errorHandler.getLastError();
      expect(lastError?.type).toBe(TimerError.STORAGE_ERROR);
    });

    it('should detect notification errors', () => {
      const error = new Error('Notification permission denied');
      errorHandler.handleError(error);

      const lastError = errorHandler.getLastError();
      expect(lastError?.type).toBe(TimerError.NOTIFICATION_ERROR);
    });

    it('should detect state transition errors', () => {
      const error = new Error('Invalid state transition from focus to idle');
      errorHandler.handleError(error);

      const lastError = errorHandler.getLastError();
      expect(lastError?.type).toBe(TimerError.INVALID_STATE_TRANSITION);
    });

    it('should detect config validation errors', () => {
      const error = new Error('Config validation failed for focusDuration');
      errorHandler.handleError(error);

      const lastError = errorHandler.getLastError();
      expect(lastError?.type).toBe(TimerError.CONFIG_VALIDATION_ERROR);
    });

    it('should detect timer sync errors', () => {
      const error = new Error('Timer synchronization failed');
      errorHandler.handleError(error);

      const lastError = errorHandler.getLastError();
      expect(lastError?.type).toBe(TimerError.TIMER_SYNC_ERROR);
    });

    it('should default to unknown error', () => {
      const error = new Error('Some random error');
      errorHandler.handleError(error);

      const lastError = errorHandler.getLastError();
      expect(lastError?.type).toBe(TimerError.UNKNOWN_ERROR);
    });
  });

  describe('clearError', () => {
    it('should clear the last error', () => {
      const error = new TimerException(TimerError.UNKNOWN_ERROR, 'Test error');
      errorHandler.handleError(error);

      expect(errorHandler.getLastError()).toBeTruthy();

      errorHandler.clearError();
      expect(errorHandler.getLastError()).toBeNull();
    });
  });

  describe('utility functions', () => {
    it('should create TimerError correctly', () => {
      const error = createTimerError(
        TimerError.STORAGE_ERROR,
        'Storage failed',
        false
      );

      expect(error).toBeInstanceOf(TimerException);
      expect(error.type).toBe(TimerError.STORAGE_ERROR);
      expect(error.message).toBe('Storage failed');
      expect(error.recoverable).toBe(false);
    });

    it('should handle error using global handler', () => {
      const error = new Error('Test error');
      handleError(error);

      const lastError = globalErrorHandler.getLastError();
      expect(lastError).toBeTruthy();
      expect(lastError?.message).toBe('Test error');
    });
  });

  describe('error log management', () => {
    it('should limit error logs to 50 entries', () => {
      // Add 60 errors
      for (let i = 0; i < 60; i++) {
        const error = new TimerException(
          TimerError.UNKNOWN_ERROR,
          `Error ${i}`,
          true
        );
        errorHandler.handleError(error);
      }

      const logs = JSON.parse(localStorage.getItem('timer_error_logs') || '[]');
      expect(logs).toHaveLength(50);
      expect(logs[0].message).toBe('Error 10'); // First 10 should be removed
      expect(logs[49].message).toBe('Error 59'); // Last one should be there
    });
  });
});