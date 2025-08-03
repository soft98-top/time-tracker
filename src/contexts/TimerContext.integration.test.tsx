import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerProvider, useTimer } from './TimerContext';
import { TimerState } from '../types';
import { ContinuousFocusStreakService } from '../services/ContinuousFocusStreakService';
import { HistoryService } from '../services/HistoryService';
import { ConfigService } from '../services/ConfigService';

// Mock services
vi.mock('../services/ConfigService');
vi.mock('../services/HistoryService');
vi.mock('../services/NotificationManager');
vi.mock('../services/ContinuousFocusStreakService');

const mockContinuousFocusStreakService = vi.mocked(ContinuousFocusStreakService);
const mockHistoryService = vi.mocked(HistoryService);
const mockConfigService = vi.mocked(ConfigService);

describe('TimerContext - Business Logic Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });

    // Setup default mocks
    mockConfigService.loadConfig.mockReturnValue({
      focusDuration: 25,
      restDuration: 5,
      reflectionDuration: 3,
      focusFailureTime: 2,
      enableSound: true,
      enableNotification: true
    });

    mockContinuousFocusStreakService.loadStreak.mockReturnValue({
      count: 0,
      lastUpdateTime: Date.now()
    });
    
    mockContinuousFocusStreakService.shouldIncrementStreak.mockReturnValue(false);
    mockContinuousFocusStreakService.shouldResetStreak.mockReturnValue(false);
    
    // Mock HistoryService
    mockHistoryService.addRecord.mockImplementation((record) => ({
      id: `session-${Date.now()}`,
      ...record,
      type: record.type,
      startTime: record.startTime,
      endTime: record.endTime,
      duration: record.duration,
      isCompleted: record.isCompleted,
      isFailed: record.isFailed
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TimerProvider>{children}</TimerProvider>
  );

  describe('Successful Focus Session Integration', () => {
    it('should increment continuous focus streak when focus session completes successfully', async () => {
      const mockNewStreak = {
        count: 1,
        lastUpdateTime: Date.now(),
        lastSessionId: 'session-1'
      };

      mockContinuousFocusStreakService.shouldIncrementStreak.mockReturnValue(true);
      mockContinuousFocusStreakService.incrementStreak.mockReturnValue(mockNewStreak);

      const { result } = renderHook(() => useTimer(), { wrapper });

      // Start focus session
      act(() => {
        result.current.startFocus();
      });

      expect(result.current.state.currentState).toBe(TimerState.FOCUS);

      // Simulate reaching the target focus time (25 minutes)
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });

      expect(result.current.state.isDefaultTimeReached).toBe(true);

      // Switch to reflection (successful completion)
      act(() => {
        result.current.startReflection();
      });

      // Verify session was recorded and streak was incremented
      expect(mockHistoryService.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimerState.FOCUS,
          isCompleted: true,
          isFailed: false,
          duration: 25 * 60 * 1000
        })
      );

      expect(mockContinuousFocusStreakService.shouldIncrementStreak).toHaveBeenCalled();
      expect(mockContinuousFocusStreakService.incrementStreak).toHaveBeenCalled();
      expect(result.current.continuousFocusStreak).toEqual(mockNewStreak);
    });

    it('should maintain streak synchronization with session records', async () => {
      let focusSessionCounter = 0;
      let streakCount = 0;
      
      mockHistoryService.addRecord.mockImplementation((record) => {
        // Only increment counter for focus sessions
        if (record.type === TimerState.FOCUS) {
          focusSessionCounter++;
        }
        return {
          id: `session-${Date.now()}-${record.type}`,
          ...record,
          type: record.type,
          startTime: record.startTime,
          endTime: record.endTime,
          duration: record.duration,
          isCompleted: record.isCompleted,
          isFailed: record.isFailed
        };
      });

      mockContinuousFocusStreakService.shouldIncrementStreak.mockImplementation((session) => {
        return session.type === TimerState.FOCUS && session.isCompleted && !session.isFailed;
      });
      
      mockContinuousFocusStreakService.incrementStreak.mockImplementation((sessionId) => ({
        count: ++streakCount,
        lastUpdateTime: Date.now(),
        lastSessionId: sessionId
      }));

      const { result } = renderHook(() => useTimer(), { wrapper });

      // Complete 2 successful focus sessions
      for (let i = 0; i < 2; i++) {
        // Start focus
        act(() => {
          result.current.startFocus();
        });

        // Complete focus time
        act(() => {
          vi.advanceTimersByTime(25 * 60 * 1000);
        });

        // Switch to reflection (this triggers focus session recording)
        act(() => {
          result.current.startReflection();
        });

        // Verify streak is synchronized with focus sessions only
        expect(result.current.continuousFocusStreak.count).toBe(i + 1);
      }
    });
  });

  describe('Failed Focus Session Integration', () => {
    it('should reset continuous focus streak when focus session fails', async () => {
      const mockResetStreak = {
        count: 0,
        lastUpdateTime: Date.now()
      };

      // Start with some existing streak
      mockContinuousFocusStreakService.loadStreak.mockReturnValue({
        count: 5,
        lastUpdateTime: Date.now() - 1000,
        lastSessionId: 'previous-session'
      });

      mockContinuousFocusStreakService.shouldResetStreak.mockReturnValue(true);
      mockContinuousFocusStreakService.resetStreak.mockReturnValue(mockResetStreak);

      const { result } = renderHook(() => useTimer(), { wrapper });

      // Start focus session
      act(() => {
        result.current.startFocus();
      });

      // Cancel early (before reaching minimum time)
      act(() => {
        vi.advanceTimersByTime(1 * 60 * 1000); // Only 1 minute
      });

      act(() => {
        result.current.cancel();
      });

      // Verify session was recorded as failed and streak was reset
      expect(mockHistoryService.addRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TimerState.FOCUS,
          isCompleted: false,
          isFailed: true,
          duration: 1 * 60 * 1000
        })
      );

      expect(mockContinuousFocusStreakService.shouldResetStreak).toHaveBeenCalled();
      expect(mockContinuousFocusStreakService.resetStreak).toHaveBeenCalled();
      expect(result.current.continuousFocusStreak).toEqual(mockResetStreak);
    });

    it('should handle mixed success and failure scenarios correctly', async () => {
      let streakCount = 0;
      
      mockContinuousFocusStreakService.shouldIncrementStreak.mockImplementation((session) => {
        return session.isCompleted && !session.isFailed && session.type === TimerState.FOCUS;
      });
      
      mockContinuousFocusStreakService.shouldResetStreak.mockImplementation((session) => {
        return session.type === TimerState.FOCUS && (session.isFailed || !session.isCompleted);
      });

      mockContinuousFocusStreakService.incrementStreak.mockImplementation(() => ({
        count: ++streakCount,
        lastUpdateTime: Date.now(),
        lastSessionId: `session-${Date.now()}`
      }));

      mockContinuousFocusStreakService.resetStreak.mockImplementation(() => {
        streakCount = 0;
        return {
          count: 0,
          lastUpdateTime: Date.now()
        };
      });

      const { result } = renderHook(() => useTimer(), { wrapper });

      // Successful session 1
      act(() => {
        result.current.startFocus();
      });
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      act(() => {
        result.current.startReflection();
      });
      expect(result.current.continuousFocusStreak.count).toBe(1);

      // Successful session 2
      act(() => {
        result.current.startFocus();
      });
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      act(() => {
        result.current.startReflection();
      });
      expect(result.current.continuousFocusStreak.count).toBe(2);

      // Failed session (should reset)
      act(() => {
        result.current.startFocus();
      });
      act(() => {
        vi.advanceTimersByTime(1 * 60 * 1000); // Only 1 minute
      });
      act(() => {
        result.current.cancel();
      });
      expect(result.current.continuousFocusStreak.count).toBe(0);
    });
  });

  describe('State Persistence and Recovery', () => {
    it('should persist continuous focus streak state across app restarts', async () => {
      const persistedStreak = {
        count: 3,
        lastUpdateTime: Date.now() - 1000,
        lastSessionId: 'persisted-session'
      };

      mockContinuousFocusStreakService.loadStreak.mockReturnValue(persistedStreak);

      const { result } = renderHook(() => useTimer(), { wrapper });

      // Verify streak is loaded on initialization
      expect(mockContinuousFocusStreakService.loadStreak).toHaveBeenCalled();
      expect(result.current.continuousFocusStreak).toEqual(persistedStreak);
    });

    it('should handle streak loading errors gracefully without affecting timer functionality', async () => {
      mockContinuousFocusStreakService.loadStreak.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const { result } = renderHook(() => useTimer(), { wrapper });

      // Should still initialize with default streak
      expect(result.current.continuousFocusStreak.count).toBe(0);

      // Timer functionality should still work
      act(() => {
        result.current.startFocus();
      });

      expect(result.current.state.currentState).toBe(TimerState.FOCUS);
    });

    it('should handle streak update errors without affecting session recording', async () => {
      mockContinuousFocusStreakService.shouldIncrementStreak.mockReturnValue(true);
      mockContinuousFocusStreakService.incrementStreak.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const { result } = renderHook(() => useTimer(), { wrapper });

      // Start and complete a focus session
      act(() => {
        result.current.startFocus();
      });
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      act(() => {
        result.current.startReflection();
      });

      // Session should still be recorded despite streak update failure
      expect(mockHistoryService.addRecord).toHaveBeenCalled();
      
      // Streak should remain unchanged
      expect(result.current.continuousFocusStreak.count).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid state transitions correctly', async () => {
      mockContinuousFocusStreakService.shouldIncrementStreak.mockReturnValue(true);
      mockContinuousFocusStreakService.incrementStreak.mockReturnValue({
        count: 1,
        lastUpdateTime: Date.now(),
        lastSessionId: 'rapid-session'
      });

      const { result } = renderHook(() => useTimer(), { wrapper });

      // Rapid transitions
      act(() => {
        result.current.startFocus();
      });
      act(() => {
        vi.advanceTimersByTime(25 * 60 * 1000);
      });
      act(() => {
        result.current.startReflection();
      });
      act(() => {
        result.current.startRest();
      });
      act(() => {
        result.current.startFocus();
      });

      // Should handle all transitions correctly
      expect(result.current.state.currentState).toBe(TimerState.FOCUS);
      // Focus -> Reflection -> Rest transitions create 3 session records
      expect(mockHistoryService.addRecord).toHaveBeenCalledTimes(3);
    });

    it('should maintain data consistency during sequential operations', async () => {
      let focusOperationCount = 0;
      
      mockContinuousFocusStreakService.shouldIncrementStreak.mockImplementation((session) => {
        return session.type === TimerState.FOCUS && session.isCompleted && !session.isFailed;
      });
      
      mockContinuousFocusStreakService.incrementStreak.mockImplementation(() => {
        focusOperationCount++;
        return {
          count: focusOperationCount,
          lastUpdateTime: Date.now(),
          lastSessionId: `sequential-${focusOperationCount}`
        };
      });

      const { result } = renderHook(() => useTimer(), { wrapper });

      // Sequential session completions
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.startFocus();
        });
        act(() => {
          vi.advanceTimersByTime(25 * 60 * 1000);
        });
        act(() => {
          result.current.startReflection();
        });
      }

      // Should maintain consistency - only focus sessions increment streak
      expect(mockContinuousFocusStreakService.incrementStreak).toHaveBeenCalledTimes(3);
      expect(result.current.continuousFocusStreak.count).toBe(3);
    });
  });
});