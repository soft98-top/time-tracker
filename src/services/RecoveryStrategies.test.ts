import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StorageRecoveryStrategy,
  TimerSyncRecoveryStrategy,
  ConfigRecoveryStrategy,
  NotificationRecoveryStrategy,
  StateTransitionRecoveryStrategy,
  DataIntegrityChecker,
  initializeRecoveryStrategies,
  performStartupRecovery
} from './RecoveryStrategies';
import { TimerError, TimerException } from '../types/errors';
import { TimerState } from '../types/timer';
import { globalErrorHandler } from './ErrorHandler';

describe('RecoveryStrategies', () => {
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
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('StorageRecoveryStrategy', () => {
    let strategy: StorageRecoveryStrategy;

    beforeEach(() => {
      strategy = new StorageRecoveryStrategy();
    });

    it('should identify recoverable storage errors', () => {
      const error = new TimerException(TimerError.STORAGE_ERROR, 'Storage failed', true);
      expect(strategy.canRecover(error)).toBe(true);

      const nonRecoverableError = new TimerException(TimerError.STORAGE_ERROR, 'Storage failed', false);
      expect(strategy.canRecover(nonRecoverableError)).toBe(false);

      const differentError = new TimerException(TimerError.TIMER_SYNC_ERROR, 'Timer failed', true);
      expect(strategy.canRecover(differentError)).toBe(false);
    });

    it('should recover from storage errors by cleaning corrupted data', async () => {
      // Set up corrupted data
      mockLocalStorage['timer_config'] = 'invalid json';
      mockLocalStorage['timer_history'] = '{"valid": "data"}';

      const error = new TimerException(TimerError.STORAGE_ERROR, 'Storage failed', true);
      const result = await strategy.recover(error);

      expect(result).toBe(true);
      expect(localStorage.removeItem).toHaveBeenCalledWith('timer_config');
      expect(mockLocalStorage['timer_history']).toBe('{"valid": "data"}'); // Valid data should remain
    });

    it('should handle recovery failure gracefully', async () => {
      // Create a strategy that will fail by mocking the entire localStorage
      const failingStrategy = new StorageRecoveryStrategy();
      
      // Mock localStorage to fail completely
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: vi.fn(() => { throw new Error('Storage error'); }),
          setItem: vi.fn(() => { throw new Error('Storage error'); }),
          removeItem: vi.fn(() => { throw new Error('Storage error'); }),
          clear: vi.fn(() => { throw new Error('Storage error'); })
        },
        writable: true
      });

      const error = new TimerException(TimerError.STORAGE_ERROR, 'Storage failed', true);
      const result = await failingStrategy.recover(error);

      expect(result).toBe(false);
    });
  });

  describe('TimerSyncRecoveryStrategy', () => {
    let strategy: TimerSyncRecoveryStrategy;

    beforeEach(() => {
      strategy = new TimerSyncRecoveryStrategy();
    });

    it('should identify recoverable timer sync errors', () => {
      const error = new TimerException(TimerError.TIMER_SYNC_ERROR, 'Timer sync failed', true);
      expect(strategy.canRecover(error)).toBe(true);
    });

    it('should recover from timer sync errors by updating elapsed time', async () => {
      const startTime = Date.now() - 60000; // 1 minute ago
      mockLocalStorage['timer_state'] = JSON.stringify({
        currentState: TimerState.FOCUS,
        startTime,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: false
      });

      const error = new TimerException(TimerError.TIMER_SYNC_ERROR, 'Timer sync failed', true);
      const result = await strategy.recover(error);

      expect(result).toBe(true);
      
      const updatedState = JSON.parse(mockLocalStorage['timer_state']);
      expect(updatedState.elapsedTime).toBeGreaterThan(50000); // Should be close to 60000
      expect(updatedState.elapsedTime).toBeLessThan(70000);
    });

    it('should reset state for large time jumps', async () => {
      const startTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      mockLocalStorage['timer_state'] = JSON.stringify({
        currentState: TimerState.FOCUS,
        startTime,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: false
      });

      const error = new TimerException(TimerError.TIMER_SYNC_ERROR, 'Timer sync failed', true);
      const result = await strategy.recover(error);

      expect(result).toBe(true);
      
      const updatedState = JSON.parse(mockLocalStorage['timer_state']);
      expect(updatedState.currentState).toBe(TimerState.IDLE);
      expect(updatedState.startTime).toBeNull();
      expect(updatedState.elapsedTime).toBe(0);
    });
  });

  describe('ConfigRecoveryStrategy', () => {
    let strategy: ConfigRecoveryStrategy;

    beforeEach(() => {
      strategy = new ConfigRecoveryStrategy();
    });

    it('should identify recoverable config errors', () => {
      const error = new TimerException(TimerError.CONFIG_VALIDATION_ERROR, 'Config failed', true);
      expect(strategy.canRecover(error)).toBe(true);
    });

    it('should recover by setting default configuration', async () => {
      const error = new TimerException(TimerError.CONFIG_VALIDATION_ERROR, 'Config failed', true);
      const result = await strategy.recover(error);

      expect(result).toBe(true);
      
      const config = JSON.parse(mockLocalStorage['timer_config']);
      expect(config).toEqual({
        focusDuration: 25,
        restDuration: 5,
        reflectionDuration: 3,
        focusFailureTime: 2,
        enableSound: true,
        enableNotification: true
      });
    });
  });

  describe('NotificationRecoveryStrategy', () => {
    let strategy: NotificationRecoveryStrategy;

    beforeEach(() => {
      strategy = new NotificationRecoveryStrategy();
      
      // Mock Notification API
      Object.defineProperty(window, 'Notification', {
        value: {
          permission: 'default',
          requestPermission: vi.fn().mockResolvedValue('granted')
        },
        writable: true
      });
    });

    it('should identify recoverable notification errors', () => {
      const error = new TimerException(TimerError.NOTIFICATION_ERROR, 'Notification failed', true);
      expect(strategy.canRecover(error)).toBe(true);
    });

    it('should recover by requesting permission', async () => {
      const error = new TimerException(TimerError.NOTIFICATION_ERROR, 'Notification failed', true);
      const result = await strategy.recover(error);

      expect(result).toBe(true);
      expect(window.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should disable notifications when permission is denied', async () => {
      window.Notification.permission = 'denied';
      mockLocalStorage['timer_config'] = JSON.stringify({ enableNotification: true });

      const error = new TimerException(TimerError.NOTIFICATION_ERROR, 'Notification failed', true);
      const result = await strategy.recover(error);

      expect(result).toBe(true);
      
      const config = JSON.parse(mockLocalStorage['timer_config']);
      expect(config.enableNotification).toBe(false);
    });

    it('should disable notifications when not supported', async () => {
      // Create a new strategy instance for this test
      const testStrategy = new NotificationRecoveryStrategy();
      
      // Mock window object without Notification
      const originalWindow = global.window;
      global.window = { ...originalWindow } as any;
      delete (global.window as any).Notification;
      
      mockLocalStorage['timer_config'] = JSON.stringify({ enableNotification: true });

      const error = new TimerException(TimerError.NOTIFICATION_ERROR, 'Notification failed', true);
      const result = await testStrategy.recover(error);

      expect(result).toBe(true);
      
      const config = JSON.parse(mockLocalStorage['timer_config']);
      expect(config.enableNotification).toBe(false);
      
      // Restore original window
      global.window = originalWindow;
    });
  });

  describe('StateTransitionRecoveryStrategy', () => {
    let strategy: StateTransitionRecoveryStrategy;

    beforeEach(() => {
      strategy = new StateTransitionRecoveryStrategy();
    });

    it('should identify recoverable state transition errors', () => {
      const error = new TimerException(TimerError.INVALID_STATE_TRANSITION, 'State failed', true);
      expect(strategy.canRecover(error)).toBe(true);
    });

    it('should recover by resetting to safe state', async () => {
      const error = new TimerException(TimerError.INVALID_STATE_TRANSITION, 'State failed', true);
      const result = await strategy.recover(error);

      expect(result).toBe(true);
      
      const state = JSON.parse(mockLocalStorage['timer_state']);
      expect(state).toEqual({
        currentState: TimerState.IDLE,
        startTime: null,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: true
      });
    });
  });

  describe('DataIntegrityChecker', () => {
    it('should validate and repair corrupted config', async () => {
      mockLocalStorage['timer_config'] = JSON.stringify({
        focusDuration: -1, // Invalid
        restDuration: 'invalid', // Invalid type
        reflectionDuration: 3
      });

      const result = await DataIntegrityChecker.checkAndRepair();

      expect(result).toBe(true);
      
      const config = JSON.parse(mockLocalStorage['timer_config']);
      expect(config.focusDuration).toBe(25); // Should be reset to default
      expect(config.restDuration).toBe(5);
    });

    it('should validate and repair corrupted state', async () => {
      mockLocalStorage['timer_state'] = JSON.stringify({
        currentState: 'invalid_state',
        startTime: 'invalid',
        elapsedTime: -1
      });

      const result = await DataIntegrityChecker.checkAndRepair();

      expect(result).toBe(true);
      
      const state = JSON.parse(mockLocalStorage['timer_state']);
      expect(state.currentState).toBe(TimerState.IDLE);
      expect(state.startTime).toBeNull();
      expect(state.elapsedTime).toBe(0);
    });

    it('should validate and repair corrupted history', async () => {
      mockLocalStorage['timer_history'] = JSON.stringify([
        { id: '1', type: TimerState.FOCUS, startTime: 123, endTime: 456, duration: 333 }, // Valid
        { id: '2', type: 'invalid', startTime: 'invalid' }, // Invalid
        { id: '3', type: TimerState.REST, startTime: 789, endTime: 999, duration: 210 } // Valid
      ]);

      const result = await DataIntegrityChecker.checkAndRepair();

      expect(result).toBe(true);
      
      const history = JSON.parse(mockLocalStorage['timer_history']);
      expect(history).toHaveLength(2); // Only valid records should remain
      expect(history[0].id).toBe('1');
      expect(history[1].id).toBe('3');
    });

    it('should handle completely corrupted data', async () => {
      mockLocalStorage['timer_config'] = 'invalid json';
      mockLocalStorage['timer_state'] = 'invalid json';
      mockLocalStorage['timer_history'] = 'invalid json';

      const result = await DataIntegrityChecker.checkAndRepair();

      expect(result).toBe(true);
      
      // Should have default config
      const config = JSON.parse(mockLocalStorage['timer_config']);
      expect(config.focusDuration).toBe(25);
      
      // Should have safe state
      const state = JSON.parse(mockLocalStorage['timer_state']);
      expect(state.currentState).toBe(TimerState.IDLE);
      
      // Should have empty history
      const history = JSON.parse(mockLocalStorage['timer_history']);
      expect(history).toEqual([]);
    });
  });

  describe('initializeRecoveryStrategies', () => {
    it('should register all recovery strategies', () => {
      const registerSpy = vi.spyOn(globalErrorHandler, 'registerRecoveryStrategy');
      
      initializeRecoveryStrategies();

      expect(registerSpy).toHaveBeenCalledTimes(5);
      expect(registerSpy).toHaveBeenCalledWith(TimerError.STORAGE_ERROR, expect.any(StorageRecoveryStrategy));
      expect(registerSpy).toHaveBeenCalledWith(TimerError.TIMER_SYNC_ERROR, expect.any(TimerSyncRecoveryStrategy));
      expect(registerSpy).toHaveBeenCalledWith(TimerError.CONFIG_VALIDATION_ERROR, expect.any(ConfigRecoveryStrategy));
      expect(registerSpy).toHaveBeenCalledWith(TimerError.NOTIFICATION_ERROR, expect.any(NotificationRecoveryStrategy));
      expect(registerSpy).toHaveBeenCalledWith(TimerError.INVALID_STATE_TRANSITION, expect.any(StateTransitionRecoveryStrategy));
    });
  });

  describe('performStartupRecovery', () => {
    it('should perform complete startup recovery', async () => {
      const result = await performStartupRecovery();
      expect(result).toBe(true);
    });

    it('should recover old sessions', async () => {
      const oldStartTime = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      mockLocalStorage['timer_state'] = JSON.stringify({
        currentState: TimerState.FOCUS,
        startTime: oldStartTime,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: false
      });

      const result = await performStartupRecovery();

      expect(result).toBe(true);
      
      const state = JSON.parse(mockLocalStorage['timer_state']);
      expect(state.currentState).toBe(TimerState.IDLE); // Should be reset
    });

    it('should recover recent sessions', async () => {
      const recentStartTime = Date.now() - (30 * 60 * 1000); // 30 minutes ago
      mockLocalStorage['timer_state'] = JSON.stringify({
        currentState: TimerState.FOCUS,
        startTime: recentStartTime,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: false
      });

      const result = await performStartupRecovery();

      expect(result).toBe(true);
      
      const state = JSON.parse(mockLocalStorage['timer_state']);
      expect(state.currentState).toBe(TimerState.FOCUS); // Should remain
      expect(state.startTime).toBe(recentStartTime);
    });

    it('should handle recovery errors gracefully', async () => {
      // Mock DataIntegrityChecker.checkAndRepair to throw an error
      const originalCheckAndRepair = DataIntegrityChecker.checkAndRepair;
      vi.spyOn(DataIntegrityChecker, 'checkAndRepair').mockImplementation(() => {
        throw new Error('Integrity check failed');
      });

      const result = await performStartupRecovery();

      expect(result).toBe(false);
      
      // Restore original method
      DataIntegrityChecker.checkAndRepair = originalCheckAndRepair;
    });
  });
});