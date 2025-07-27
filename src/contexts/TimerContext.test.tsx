import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, renderHook, act, waitFor } from '@testing-library/react';
import { TimerProvider, useTimer } from './TimerContext';
import { TimerState } from '../types';
import { ConfigService } from '../services/ConfigService';
import { HistoryService } from '../services/HistoryService';
import { notificationManager } from '../services/NotificationManager';

// Mock services
vi.mock('../services/ConfigService');
vi.mock('../services/HistoryService');
vi.mock('../services/TimeManager');
vi.mock('../services/NotificationManager');

const mockConfigService = vi.mocked(ConfigService);
const mockHistoryService = vi.mocked(HistoryService);
const mockNotificationManager = vi.mocked(notificationManager);

describe('TimerContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock ConfigService
    mockConfigService.loadConfig.mockReturnValue({
      focusDuration: 25,
      restDuration: 5,
      reflectionDuration: 3,
      focusFailureTime: 2,
      enableSound: true,
      enableNotification: true
    });
    
    // Mock HistoryService
    mockHistoryService.addRecord.mockImplementation((record) => ({
      ...record,
      id: 'test-id'
    }));
    mockHistoryService.getAllRecords.mockReturnValue([]);
    mockHistoryService.getTodayStatistics.mockReturnValue({
      totalFocusTime: 0,
      totalReflectionTime: 0,
      totalRestTime: 0,
      focusSessionCount: 0,
      failedFocusCount: 0,
      averageFocusTime: 0,
      longestFocusStreak: 0
    });
    
    // Mock NotificationManager
    mockNotificationManager.setNotificationEnabled.mockImplementation(() => {});
    mockNotificationManager.setSoundEnabled.mockImplementation(() => {});
    mockNotificationManager.requestNotificationPermission.mockResolvedValue(true);
    mockNotificationManager.getPermissionStatus.mockReturnValue('granted');
    mockNotificationManager.notifyTimeReached.mockResolvedValue();
    mockNotificationManager.notifyStateChanged.mockResolvedValue();
    mockNotificationManager.notifySessionCompleted.mockResolvedValue();
    mockNotificationManager.notifyFocusFailed.mockResolvedValue();
    mockNotificationManager.dispose.mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const renderWithProvider = (children: React.ReactNode) => {
    return render(<TimerProvider>{children}</TimerProvider>);
  };

  const renderHookWithProvider = <T,>(hook: () => T) => {
    return renderHook(hook, {
      wrapper: ({ children }) => <TimerProvider>{children}</TimerProvider>
    });
  };

  describe('Provider initialization', () => {
    it('should provide initial state', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      expect(result.current.state.currentState).toBe(TimerState.IDLE);
      expect(result.current.state.startTime).toBeNull();
      expect(result.current.state.elapsedTime).toBe(0);
      expect(result.current.state.isDefaultTimeReached).toBe(false);
      expect(result.current.state.canSwitchState).toBe(false);
    });

    it('should load configuration on initialization', () => {
      renderHookWithProvider(() => useTimer());
      
      expect(mockConfigService.loadConfig).toHaveBeenCalled();
    });

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useTimer());
      }).toThrow('useTimer must be used within a TimerProvider');
    });
  });

  describe('Focus state management', () => {
    it('should start focus state', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      expect(result.current.state.currentState).toBe(TimerState.FOCUS);
      expect(result.current.state.startTime).toBeTruthy();
      expect(result.current.state.elapsedTime).toBe(0);
    });

    it('should update elapsed time during focus', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time by 5 seconds
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.elapsedTime).toBeGreaterThan(0);
    });

    it('should detect when default focus time is reached', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time by 25 minutes (default focus duration)
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.isDefaultTimeReached).toBe(true);
    });

    it('should allow cancellation within focus failure time', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time by 1 minute (less than 2 minute failure time)
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });
      
      act(() => {
        result.current.cancel();
      });
      
      expect(result.current.state.currentState).toBe(TimerState.IDLE);
      expect(mockHistoryService.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimerState.FOCUS,
          isCompleted: false,
          isFailed: true
        })
      );
    });

    it('should prevent cancellation after focus failure time', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time by 3 minutes (more than 2 minute failure time)
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.canSwitchState).toBe(true);
      
      // Should not be able to cancel directly to IDLE after failure time
      act(() => {
        result.current.cancel();
      });
      
      // State should remain FOCUS because transition is not allowed
      expect(result.current.state.currentState).toBe(TimerState.FOCUS);
    });
  });

  describe('State transitions', () => {
    it('should transition from focus to reflection', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time beyond failure time
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.canSwitchState).toBe(true);
      
      act(() => {
        result.current.startReflection();
      });
      
      expect(result.current.state.currentState).toBe(TimerState.REFLECTION);
      expect(mockHistoryService.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimerState.FOCUS,
          isCompleted: false,
          isFailed: false
        })
      );
    });

    it('should transition from focus to rest', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time beyond failure time
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.canSwitchState).toBe(true);
      
      act(() => {
        result.current.startRest();
      });
      
      expect(result.current.state.currentState).toBe(TimerState.REST);
      expect(mockHistoryService.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimerState.FOCUS,
          isCompleted: false,
          isFailed: false
        })
      );
    });

    it('should transition from reflection to rest', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      // Start with reflection state
      act(() => {
        result.current.startFocus();
      });
      
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });
      
      act(() => {
        result.current.startReflection();
      });
      
      act(() => {
        result.current.startRest();
      });
      
      expect(result.current.state.currentState).toBe(TimerState.REST);
    });

    it('should transition from rest to focus', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      // Start with rest state
      act(() => {
        result.current.startFocus();
      });
      
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });
      
      act(() => {
        result.current.startRest();
      });
      
      act(() => {
        result.current.startFocus();
      });
      
      expect(result.current.state.currentState).toBe(TimerState.FOCUS);
    });
  });

  describe('Configuration management', () => {
    it('should update configuration', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      const newConfig = { focusDuration: 30 };
      
      act(() => {
        result.current.updateConfig(newConfig);
      });
      
      expect(mockConfigService.saveConfig).toHaveBeenCalledWith(newConfig);
      expect(result.current.config.focusDuration).toBe(30);
    });

    it('should handle configuration update errors', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      const error = new Error('Save failed');
      mockConfigService.saveConfig.mockImplementation(() => {
        throw error;
      });
      
      expect(() => {
        act(() => {
          result.current.updateConfig({ focusDuration: 30 });
        });
      }).toThrow('Save failed');
    });
  });

  describe('History and statistics', () => {
    it('should get session history', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      const mockHistory = [
        {
          id: '1',
          type: TimerState.FOCUS,
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          duration: 1000,
          isCompleted: true
        }
      ];
      
      mockHistoryService.getAllRecords.mockReturnValue(mockHistory);
      
      const history = result.current.getSessionHistory();
      
      expect(history).toEqual(mockHistory);
      expect(mockHistoryService.getAllRecords).toHaveBeenCalled();
    });

    it('should get today statistics', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      const mockStats = {
        totalFocusTime: 1500000,
        totalReflectionTime: 180000,
        totalRestTime: 300000,
        focusSessionCount: 1,
        failedFocusCount: 0,
        averageFocusTime: 1500000,
        longestFocusStreak: 1
      };
      
      mockHistoryService.getTodayStatistics.mockReturnValue(mockStats);
      
      const stats = result.current.getStatistics('today');
      
      expect(stats).toEqual(mockStats);
      expect(mockHistoryService.getTodayStatistics).toHaveBeenCalled();
    });

    it('should get week statistics', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      mockHistoryService.getWeekStatistics.mockReturnValue({
        totalFocusTime: 0,
        totalReflectionTime: 0,
        totalRestTime: 0,
        focusSessionCount: 0,
        failedFocusCount: 0,
        averageFocusTime: 0,
        longestFocusStreak: 0
      });
      
      result.current.getStatistics('week');
      
      expect(mockHistoryService.getWeekStatistics).toHaveBeenCalled();
    });

    it('should get month statistics', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      mockHistoryService.getMonthStatistics.mockReturnValue({
        totalFocusTime: 0,
        totalReflectionTime: 0,
        totalRestTime: 0,
        focusSessionCount: 0,
        failedFocusCount: 0,
        averageFocusTime: 0,
        longestFocusStreak: 0
      });
      
      result.current.getStatistics('month');
      
      expect(mockHistoryService.getMonthStatistics).toHaveBeenCalled();
    });

    it('should handle history errors gracefully', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      mockHistoryService.getAllRecords.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const history = result.current.getSessionHistory();
      
      expect(history).toEqual([]);
    });

    it('should handle statistics errors gracefully', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      mockHistoryService.getTodayStatistics.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const stats = result.current.getStatistics('today');
      
      expect(stats).toEqual({
        totalFocusTime: 0,
        totalReflectionTime: 0,
        totalRestTime: 0,
        focusSessionCount: 0,
        failedFocusCount: 0,
        averageFocusTime: 0,
        longestFocusStreak: 0
      });
    });
  });

  describe('Session recording', () => {
    it('should record completed focus session', async () => {
      // Clear localStorage to ensure clean state
      localStorage.clear();
      
      const { result } = renderHookWithProvider(() => useTimer());
      
      // Wait for initialization to complete
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time to complete focus (25 minutes + a bit more to ensure it's reached)
      act(() => {
        vi.advanceTimersByTime(26 * 60 * 1000);
      });
      
      // Wait for multiple timer ticks to ensure state is updated
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      // The state should show default time is reached
      expect(result.current.state.isDefaultTimeReached).toBe(true);
      
      act(() => {
        result.current.startReflection();
      });
      
      expect(mockHistoryService.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimerState.FOCUS,
          isCompleted: true,
          isFailed: false,
          metadata: expect.objectContaining({
            targetDuration: 25 * 60 * 1000,
            wasInterrupted: false
          })
        })
      );
    });

    it('should record failed focus session', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Cancel within failure time
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });
      
      act(() => {
        result.current.cancel();
      });
      
      expect(mockHistoryService.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimerState.FOCUS,
          isCompleted: false,
          isFailed: true
        })
      );
    });

    it('should record reflection session', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      // Start focus and transition to reflection
      act(() => {
        result.current.startFocus();
      });
      
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });
      
      act(() => {
        result.current.startReflection();
      });
      
      // Cancel reflection
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });
      
      act(() => {
        result.current.cancel();
      });
      
      expect(mockHistoryService.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimerState.REFLECTION,
          isCompleted: false,
          isFailed: false
        })
      );
    });

    it('should handle recording errors gracefully', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      mockHistoryService.addRecord.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      act(() => {
        result.current.startFocus();
      });
      
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });
      
      // Should not throw error
      expect(() => {
        act(() => {
          result.current.cancel();
        });
      }).not.toThrow();
    });
  });

  describe('State persistence and recovery', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear();
    });

    it('should save state to localStorage when active', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Check if state is saved to localStorage
      const saved = localStorage.getItem('flexible-pomodoro-state');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved!);
      expect(parsed.timerState.currentState).toBe(TimerState.FOCUS);
    });

    it('should clear saved state when returning to idle', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // State should be saved
      expect(localStorage.getItem('flexible-pomodoro-state')).toBeTruthy();
      
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });
      
      act(() => {
        result.current.cancel();
      });
      
      // State should be cleared when idle
      expect(localStorage.getItem('flexible-pomodoro-state')).toBeNull();
    });

    it('should restore state on initialization', () => {
      // Pre-populate localStorage with a saved state
      const savedState = {
        timerState: {
          currentState: TimerState.FOCUS,
          startTime: Date.now() - 60000, // 1 minute ago
          elapsedTime: 60000,
          isDefaultTimeReached: false,
          canSwitchState: false
        },
        config: {
          focusDuration: 25,
          restDuration: 5,
          reflectionDuration: 3,
          focusFailureTime: 2,
          enableSound: true,
          enableNotification: true
        },
        timestamp: Date.now() - 5000 // 5 seconds ago
      };
      
      localStorage.setItem('flexible-pomodoro-state', JSON.stringify(savedState));
      
      const { result } = renderHookWithProvider(() => useTimer());
      
      // Should restore the focus state
      expect(result.current.state.currentState).toBe(TimerState.FOCUS);
      expect(result.current.state.elapsedTime).toBeGreaterThan(60000); // Should be updated
    });

    it('should ignore old saved states', () => {
      // Pre-populate localStorage with an old saved state (25 hours ago)
      const oldSavedState = {
        timerState: {
          currentState: TimerState.FOCUS,
          startTime: Date.now() - 25 * 60 * 60 * 1000,
          elapsedTime: 60000,
          isDefaultTimeReached: false,
          canSwitchState: false
        },
        config: {
          focusDuration: 25,
          restDuration: 5,
          reflectionDuration: 3,
          focusFailureTime: 2,
          enableSound: true,
          enableNotification: true
        },
        timestamp: Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago
      };
      
      localStorage.setItem('flexible-pomodoro-state', JSON.stringify(oldSavedState));
      
      const { result } = renderHookWithProvider(() => useTimer());
      
      // Should not restore old state, should be idle
      expect(result.current.state.currentState).toBe(TimerState.IDLE);
      
      // Old state should be removed from localStorage
      expect(localStorage.getItem('flexible-pomodoro-state')).toBeNull();
    });

    it('should handle corrupted saved state gracefully', () => {
      // Pre-populate localStorage with corrupted data
      localStorage.setItem('flexible-pomodoro-state', 'invalid json');
      
      const { result } = renderHookWithProvider(() => useTimer());
      
      // Should fall back to default state
      expect(result.current.state.currentState).toBe(TimerState.IDLE);
      
      // Corrupted state should be removed
      expect(localStorage.getItem('flexible-pomodoro-state')).toBeNull();
    });
  });

  describe('Notification side effects', () => {
    beforeEach(() => {
      // Mock Notification API
      global.Notification = vi.fn() as any;
      global.Notification.permission = 'granted';
      global.Notification.requestPermission = vi.fn().mockResolvedValue('granted');
      
      // Mock AudioContext
      global.AudioContext = vi.fn().mockImplementation(() => ({
        createOscillator: vi.fn().mockReturnValue({
          connect: vi.fn(),
          frequency: {
            setValueAtTime: vi.fn()
          },
          start: vi.fn(),
          stop: vi.fn()
        }),
        createGain: vi.fn().mockReturnValue({
          connect: vi.fn(),
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn()
          }
        }),
        destination: {},
        currentTime: 0
      }));
    });

    it('should send notification when default time is reached', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time to reach default focus duration
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.isDefaultTimeReached).toBe(true);
      expect(global.Notification).toHaveBeenCalledWith(
        '专注时间到！',
        expect.objectContaining({
          body: expect.stringContaining('您已经专注了预设的时间')
        })
      );
    });

    it('should not send notification when notifications are disabled', async () => {
      // Mock saveConfig to not throw error for this test
      mockConfigService.saveConfig.mockImplementation(() => {});
      
      const { result } = renderHookWithProvider(() => useTimer());
      
      // Disable notifications
      act(() => {
        result.current.updateConfig({ enableNotification: false });
      });
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time to reach default focus duration
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.isDefaultTimeReached).toBe(true);
      expect(global.Notification).not.toHaveBeenCalled();
    });

    it('should play sound when default time is reached', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time to reach default focus duration
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.isDefaultTimeReached).toBe(true);
      expect(global.AudioContext).toHaveBeenCalled();
    });

    it('should not play sound when sound is disabled', async () => {
      // Mock saveConfig to not throw error for this test
      mockConfigService.saveConfig.mockImplementation(() => {});
      
      const { result } = renderHookWithProvider(() => useTimer());
      
      // Disable sound
      act(() => {
        result.current.updateConfig({ enableSound: false });
      });
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time to reach default focus duration
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.isDefaultTimeReached).toBe(true);
      expect(global.AudioContext).not.toHaveBeenCalled();
    });
  });

  describe('Timer cleanup', () => {
    it('should stop timer when transitioning to idle', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      expect(result.current.state.currentState).toBe(TimerState.FOCUS);
      
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });
      
      act(() => {
        result.current.cancel();
      });
      
      expect(result.current.state.currentState).toBe(TimerState.IDLE);
      
      // Timer should be stopped, so elapsed time should not increase
      const elapsedBefore = result.current.state.elapsedTime;
      
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      
      expect(result.current.state.elapsedTime).toBe(elapsedBefore);
    });
  });

  describe('Notification integration', () => {
    it('should initialize notification manager on startup', () => {
      renderHookWithProvider(() => useTimer());
      
      expect(mockNotificationManager.setNotificationEnabled).toHaveBeenCalledWith(true);
      expect(mockNotificationManager.setSoundEnabled).toHaveBeenCalledWith(true);
      expect(mockNotificationManager.requestNotificationPermission).toHaveBeenCalled();
    });

    it('should update notification manager settings when config changes', () => {
      mockConfigService.saveConfig.mockImplementation(() => {});
      
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.updateConfig({ enableNotification: false, enableSound: false });
      });
      
      expect(mockNotificationManager.setNotificationEnabled).toHaveBeenCalledWith(false);
      expect(mockNotificationManager.setSoundEnabled).toHaveBeenCalledWith(false);
    });

    it('should send time reached notification when default time is reached', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time to reach default focus duration
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      
      // Wait for the timer to tick
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      expect(result.current.state.isDefaultTimeReached).toBe(true);
      expect(mockNotificationManager.notifyTimeReached).toHaveBeenCalledWith(TimerState.FOCUS, 25);
    });

    it('should send state change notification when starting focus', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      expect(mockNotificationManager.notifyStateChanged).toHaveBeenCalledWith(TimerState.IDLE, TimerState.FOCUS);
    });

    it('should send state change notification when transitioning to reflection', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Advance time beyond failure time
      act(() => {
        vi.advanceTimersByTime(3 * 60 * 1000);
      });
      
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      act(() => {
        result.current.startReflection();
      });
      
      expect(mockNotificationManager.notifyStateChanged).toHaveBeenCalledWith(TimerState.FOCUS, TimerState.REFLECTION);
      expect(mockNotificationManager.notifySessionCompleted).toHaveBeenCalledWith(TimerState.FOCUS, expect.any(Number));
    });

    it('should send focus failed notification when canceling early', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Cancel within failure time
      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });
      
      act(() => {
        result.current.cancel();
      });
      
      expect(mockNotificationManager.notifyFocusFailed).toHaveBeenCalledWith(60);
      expect(mockNotificationManager.notifyStateChanged).toHaveBeenCalledWith(TimerState.FOCUS, TimerState.IDLE);
    });

    it('should send session completed notification when completing a session', async () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      act(() => {
        result.current.startFocus();
      });
      
      // Complete focus session
      act(() => {
        vi.advanceTimersByTime(26 * 60 * 1000);
      });
      
      await act(async () => {
        await vi.runOnlyPendingTimersAsync();
      });
      
      act(() => {
        result.current.startRest();
      });
      
      expect(mockNotificationManager.notifySessionCompleted).toHaveBeenCalledWith(TimerState.FOCUS, expect.any(Number));
    });

    it('should provide notification permission methods', () => {
      const { result } = renderHookWithProvider(() => useTimer());
      
      expect(typeof result.current.requestNotificationPermission).toBe('function');
      expect(typeof result.current.getNotificationPermissionStatus).toBe('function');
      
      result.current.requestNotificationPermission();
      expect(mockNotificationManager.requestNotificationPermission).toHaveBeenCalled();
      
      result.current.getNotificationPermissionStatus();
      expect(mockNotificationManager.getPermissionStatus).toHaveBeenCalled();
    });

    it('should dispose notification manager on unmount', () => {
      const { unmount } = renderHookWithProvider(() => useTimer());
      
      unmount();
      
      expect(mockNotificationManager.dispose).toHaveBeenCalled();
    });
  });
});