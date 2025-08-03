import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimerDisplay } from './TimerDisplay';
import { TimerState, TimerStateData, TimerConfig, defaultConfig } from '../types';
import { defaultContinuousFocusStreak, ContinuousFocusStreak } from '../types/continuousFocusStreak';

// Mock the useTimer hook
const mockUseTimer = vi.fn();
vi.mock('../contexts/TimerContext', () => ({
  useTimer: () => mockUseTimer()
}));

describe('ContinuousFocusStreakDisplay', () => {
  const mockConfig: TimerConfig = {
    ...defaultConfig,
    focusDuration: 25,
    reflectionDuration: 5,
    restDuration: 10
  };

  const mockState: TimerStateData = {
    currentState: TimerState.IDLE,
    startTime: null,
    elapsedTime: 0,
    isDefaultTimeReached: false,
    canSwitchState: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该显示默认的连续专注次数（0次）', () => {
    mockUseTimer.mockReturnValue({
      state: mockState,
      config: mockConfig,
      continuousFocusStreak: defaultContinuousFocusStreak
    });

    render(<TimerDisplay />);

    expect(screen.getByTestId('continuous-focus-streak')).toBeInTheDocument();
    expect(screen.getByText('已持续专注')).toBeInTheDocument();
    expect(screen.getByTestId('streak-count')).toHaveTextContent('0');
    expect(screen.getByText('次')).toBeInTheDocument();
  });

  it('应该显示非零的连续专注次数', () => {
    const mockStreak: ContinuousFocusStreak = {
      count: 5,
      lastUpdateTime: Date.now(),
      lastSessionId: 'test-session-id'
    };

    mockUseTimer.mockReturnValue({
      state: mockState,
      config: mockConfig,
      continuousFocusStreak: mockStreak
    });

    render(<TimerDisplay />);

    expect(screen.getByTestId('continuous-focus-streak')).toBeInTheDocument();
    expect(screen.getByText('已持续专注')).toBeInTheDocument();
    expect(screen.getByTestId('streak-count')).toHaveTextContent('5');
    expect(screen.getByText('次')).toBeInTheDocument();
  });

  it('应该在不同状态下正确显示连续专注次数', () => {
    const testCases = [
      { state: TimerState.IDLE, expectedClass: 'timer-display--idle' },
      { state: TimerState.FOCUS, expectedClass: 'timer-display--focus' },
      { state: TimerState.REFLECTION, expectedClass: 'timer-display--reflection' },
      { state: TimerState.REST, expectedClass: 'timer-display--rest' }
    ];

    testCases.forEach(({ state, expectedClass }) => {
      const testState = { ...mockState, currentState: state };
      
      mockUseTimer.mockReturnValue({
        state: testState,
        config: mockConfig,
        continuousFocusStreak: { ...defaultContinuousFocusStreak, count: 3 }
      });

      const { container, rerender } = render(<TimerDisplay />);
      
      expect(container.querySelector('.timer-display')).toHaveClass(expectedClass);
      expect(screen.getByTestId('streak-count')).toHaveTextContent('3');
      
      rerender(<div />); // 清理
    });
  });

  it('应该正确处理大数值的连续专注次数', () => {
    const mockStreak: ContinuousFocusStreak = {
      count: 999,
      lastUpdateTime: Date.now()
    };

    mockUseTimer.mockReturnValue({
      state: mockState,
      config: mockConfig,
      continuousFocusStreak: mockStreak
    });

    render(<TimerDisplay />);

    expect(screen.getByTestId('streak-count')).toHaveTextContent('999');
  });
});