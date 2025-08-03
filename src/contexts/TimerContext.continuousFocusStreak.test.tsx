import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerProvider, useTimer } from './TimerContext';
import { TimerState } from '../types';
import { ContinuousFocusStreakService } from '../services/ContinuousFocusStreakService';
import { HistoryService } from '../services/HistoryService';

// Mock services
vi.mock('../services/ConfigService');
vi.mock('../services/HistoryService');
vi.mock('../services/NotificationManager');
vi.mock('../services/ContinuousFocusStreakService');

const mockContinuousFocusStreakService = vi.mocked(ContinuousFocusStreakService);
const mockHistoryService = vi.mocked(HistoryService);

describe('TimerContext - Continuous Focus Streak Integration', () => {
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
    mockContinuousFocusStreakService.loadStreak.mockReturnValue({
      count: 0,
      lastUpdateTime: Date.now()
    });
    
    mockContinuousFocusStreakService.shouldIncrementStreak.mockReturnValue(false);
    mockContinuousFocusStreakService.shouldResetStreak.mockReturnValue(false);
    
    // Mock HistoryService
    mockHistoryService.addRecord.mockReturnValue({
      id: 'test-session-id',
      type: TimerState.FOCUS,
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
      isCompleted: false,
      isFailed: false
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <TimerProvider>{children}</TimerProvider>
  );

  it('should initialize with continuous focus streak from service', () => {
    const mockStreak = {
      count: 5,
      lastUpdateTime: Date.now(),
      lastSessionId: 'test-session'
    };
    
    mockContinuousFocusStreakService.loadStreak.mockReturnValue(mockStreak);

    const { result } = renderHook(() => useTimer(), { wrapper });

    expect(mockContinuousFocusStreakService.loadStreak).toHaveBeenCalled();
    expect(result.current.continuousFocusStreak).toEqual(mockStreak);
  });

  it('should handle continuous focus streak loading errors gracefully', () => {
    mockContinuousFocusStreakService.loadStreak.mockImplementation(() => {
      throw new Error('Loading failed');
    });

    const { result } = renderHook(() => useTimer(), { wrapper });

    // Should still initialize with default value
    expect(result.current.continuousFocusStreak).toEqual({
      count: 0,
      lastUpdateTime: expect.any(Number)
    });
  });

  it('should increment continuous focus streak on successful focus session', async () => {
    const mockNewStreak = {
      count: 1,
      lastUpdateTime: Date.now(),
      lastSessionId: 'session-1'
    };

    mockContinuousFocusStreakService.shouldIncrementStreak.mockReturnValue(true);
    mockContinuousFocusStreakService.incrementStreak.mockReturnValue(mockNewStreak);

    const { result } = renderHook(() => useTimer(), { wrapper });

    // Start focus
    act(() => {
      result.current.startFocus();
    });

    // Simulate time passing and reaching default time
    act(() => {
      // Fast forward time to reach default focus time
      vi.advanceTimersByTime(25 * 60 * 1000); // 25 minutes
    });

    // Cancel to trigger session recording
    act(() => {
      result.current.cancel();
    });

    expect(mockContinuousFocusStreakService.shouldIncrementStreak).toHaveBeenCalled();
    expect(result.current.continuousFocusStreak).toEqual(mockNewStreak);
  });

  it('should reset continuous focus streak on failed focus session', async () => {
    const mockResetStreak = {
      count: 0,
      lastUpdateTime: Date.now()
    };

    mockContinuousFocusStreakService.shouldResetStreak.mockReturnValue(true);
    mockContinuousFocusStreakService.resetStreak.mockReturnValue(mockResetStreak);

    const { result } = renderHook(() => useTimer(), { wrapper });

    // Start focus
    act(() => {
      result.current.startFocus();
    });

    // Cancel early (before reaching default time)
    act(() => {
      result.current.cancel();
    });

    expect(mockContinuousFocusStreakService.shouldResetStreak).toHaveBeenCalled();
    expect(result.current.continuousFocusStreak).toEqual(mockResetStreak);
  });

  it('should handle continuous focus streak update errors gracefully', async () => {
    mockContinuousFocusStreakService.shouldIncrementStreak.mockReturnValue(true);
    mockContinuousFocusStreakService.incrementStreak.mockImplementation(() => {
      throw new Error('Update failed');
    });

    const { result } = renderHook(() => useTimer(), { wrapper });

    // Start focus
    act(() => {
      result.current.startFocus();
    });

    // Cancel to trigger session recording
    act(() => {
      result.current.cancel();
    });

    // Should not crash and should maintain original streak
    expect(result.current.continuousFocusStreak).toEqual({
      count: 0,
      lastUpdateTime: expect.any(Number)
    });
  });
});