import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TimerDisplay } from './TimerDisplay';
import { TimerState, TimerStateData, TimerConfig, defaultConfig } from '../types';
import { defaultContinuousFocusStreak } from '../types/continuousFocusStreak';

// Mock the useTimer hook
const mockUseTimer = vi.fn();
vi.mock('../contexts/TimerContext', () => ({
  useTimer: () => mockUseTimer()
}));

describe('TimerDisplay', () => {
  const mockConfig: TimerConfig = {
    ...defaultConfig,
    focusDuration: 25,
    reflectionDuration: 5,
    restDuration: 10
  };

  const createMockTimerContext = (state: TimerStateData, config: TimerConfig = mockConfig) => ({
    state,
    config,
    continuousFocusStreak: defaultContinuousFocusStreak
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('空闲状态显示', () => {
    it('应该显示空闲状态和提示信息', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.IDLE,
        startTime: null,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: false
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      render(<TimerDisplay />);

      expect(screen.getByText('空闲')).toBeInTheDocument();
      expect(screen.getByText('00:00')).toBeInTheDocument();
      expect(screen.getByText('点击开始专注按钮开始新的番茄时钟')).toBeInTheDocument();
    });

    it('应该应用正确的CSS类名', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.IDLE,
        startTime: null,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: false
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      const { container } = render(<TimerDisplay />);
      const timerDisplay = container.querySelector('.timer-display');
      
      expect(timerDisplay).toHaveClass('timer-display--idle');
    });
  });

  describe('专注状态显示', () => {
    it('应该显示专注状态和已用时间', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.FOCUS,
        startTime: Date.now() - 300000, // 5分钟前
        elapsedTime: 300000, // 5分钟
        isDefaultTimeReached: false,
        canSwitchState: false
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      render(<TimerDisplay />);

      expect(screen.getByText('专注中')).toBeInTheDocument();
      expect(screen.getByText('05:00')).toBeInTheDocument();
      expect(screen.getByText('专注进行中，请继续保持专注')).toBeInTheDocument();
    });

    it('应该显示进度条和目标时间', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.FOCUS,
        startTime: Date.now() - 600000, // 10分钟前
        elapsedTime: 600000, // 10分钟
        isDefaultTimeReached: false,
        canSwitchState: false
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      render(<TimerDisplay />);

      expect(screen.getByText('目标: 25:00')).toBeInTheDocument();
      
      const progressFill = document.querySelector('.timer-display__progress-fill');
      expect(progressFill).toBeInTheDocument();
      // 10分钟 / 25分钟 = 40%
      expect(progressFill).toHaveStyle('width: 40%');
    });

    it('应该在专注锁定时显示锁定提示', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.FOCUS,
        startTime: Date.now() - 60000, // 1分钟前
        elapsedTime: 60000, // 1分钟
        isDefaultTimeReached: false,
        canSwitchState: false
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      render(<TimerDisplay />);

      expect(screen.getByText('专注锁定中 - 需要达到最小专注时间才能切换状态')).toBeInTheDocument();
    });

    it('应该在可以切换状态时显示相应提示', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.FOCUS,
        startTime: Date.now() - 180000, // 3分钟前
        elapsedTime: 180000, // 3分钟
        isDefaultTimeReached: false,
        canSwitchState: true
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      render(<TimerDisplay />);

      expect(screen.getByText('专注进行中，可以切换到反思或休息状态')).toBeInTheDocument();
    });
  });

  describe('反思状态显示', () => {
    it('应该显示反思状态和相关信息', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.REFLECTION,
        startTime: Date.now() - 180000, // 3分钟前
        elapsedTime: 180000, // 3分钟
        isDefaultTimeReached: false,
        canSwitchState: true
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      render(<TimerDisplay />);

      expect(screen.getByText('反思中')).toBeInTheDocument();
      expect(screen.getByText('03:00')).toBeInTheDocument();
      expect(screen.getByText('反思进行中，总结刚才的专注成果')).toBeInTheDocument();
      expect(screen.getByText('目标: 05:00')).toBeInTheDocument();
    });

    it('应该应用正确的CSS类名', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.REFLECTION,
        startTime: Date.now(),
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: true
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      const { container } = render(<TimerDisplay />);
      const timerDisplay = container.querySelector('.timer-display');
      
      expect(timerDisplay).toHaveClass('timer-display--reflection');
    });
  });

  describe('休息状态显示', () => {
    it('应该显示休息状态和相关信息', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.REST,
        startTime: Date.now() - 420000, // 7分钟前
        elapsedTime: 420000, // 7分钟
        isDefaultTimeReached: false,
        canSwitchState: true
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      render(<TimerDisplay />);

      expect(screen.getByText('休息中')).toBeInTheDocument();
      expect(screen.getByText('07:00')).toBeInTheDocument();
      expect(screen.getByText('休息进行中，放松一下为下次专注做准备')).toBeInTheDocument();
      expect(screen.getByText('目标: 10:00')).toBeInTheDocument();
    });

    it('应该应用正确的CSS类名', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.REST,
        startTime: Date.now(),
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: true
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      const { container } = render(<TimerDisplay />);
      const timerDisplay = container.querySelector('.timer-display');
      
      expect(timerDisplay).toHaveClass('timer-display--rest');
    });
  });

  describe('默认时间到达提示', () => {
    it('应该在达到默认时间时显示通知徽章', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.FOCUS,
        startTime: Date.now() - 1500000, // 25分钟前
        elapsedTime: 1500000, // 25分钟
        isDefaultTimeReached: true,
        canSwitchState: true
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      render(<TimerDisplay />);

      expect(screen.getByText('时间到！')).toBeInTheDocument();
      expect(screen.getByText('已达到预设时间，您可以继续当前状态或切换到其他状态')).toBeInTheDocument();
    });

    it('应该在进度条达到100%时正确显示', () => {
      const mockState: TimerStateData = {
        currentState: TimerState.FOCUS,
        startTime: Date.now() - 1800000, // 30分钟前
        elapsedTime: 1800000, // 30分钟
        isDefaultTimeReached: true,
        canSwitchState: true
      };

      mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

      render(<TimerDisplay />);

      const progressFill = document.querySelector('.timer-display__progress-fill');
      expect(progressFill).toHaveStyle('width: 100%');
    });
  });

  describe('时间格式化', () => {
    it('应该正确格式化不同的时间值', () => {
      const testCases = [
        { elapsedTime: 0, expected: '00:00' },
        { elapsedTime: 30000, expected: '00:30' }, // 30秒
        { elapsedTime: 60000, expected: '01:00' }, // 1分钟
        { elapsedTime: 90000, expected: '01:30' }, // 1分30秒
        { elapsedTime: 3600000, expected: '60:00' }, // 60分钟
        { elapsedTime: 3661000, expected: '61:01' } // 61分1秒
      ];

      testCases.forEach(({ elapsedTime, expected }) => {
        const mockState: TimerStateData = {
          currentState: TimerState.FOCUS,
          startTime: Date.now() - elapsedTime,
          elapsedTime,
          isDefaultTimeReached: false,
          canSwitchState: false
        };

        mockUseTimer.mockReturnValue(createMockTimerContext(mockState));

        const { rerender } = render(<TimerDisplay />);
        expect(screen.getByText(expected)).toBeInTheDocument();
        rerender(<div />); // 清理
      });
    });
  });

  describe('进度计算', () => {
    it('应该正确计算不同状态的进度百分比', () => {
      const testCases = [
        {
          state: TimerState.FOCUS,
          elapsedTime: 750000, // 12.5分钟
          targetDuration: 25, // 25分钟
          expectedProgress: 50 // 50%
        },
        {
          state: TimerState.REFLECTION,
          elapsedTime: 150000, // 2.5分钟
          targetDuration: 5, // 5分钟
          expectedProgress: 50 // 50%
        },
        {
          state: TimerState.REST,
          elapsedTime: 300000, // 5分钟
          targetDuration: 10, // 10分钟
          expectedProgress: 50 // 50%
        }
      ];

      testCases.forEach(({ state, elapsedTime, targetDuration, expectedProgress }) => {
        const mockState: TimerStateData = {
          currentState: state,
          startTime: Date.now() - elapsedTime,
          elapsedTime,
          isDefaultTimeReached: false,
          canSwitchState: true
        };

        const config = {
          ...mockConfig,
          focusDuration: state === TimerState.FOCUS ? targetDuration : mockConfig.focusDuration,
          reflectionDuration: state === TimerState.REFLECTION ? targetDuration : mockConfig.reflectionDuration,
          restDuration: state === TimerState.REST ? targetDuration : mockConfig.restDuration
        };

        mockUseTimer.mockReturnValue(createMockTimerContext(mockState, config));

        const { rerender } = render(<TimerDisplay />);
        const progressFill = document.querySelector('.timer-display__progress-fill');
        expect(progressFill).toHaveStyle(`width: ${expectedProgress}%`);
        rerender(<div />); // 清理
      });
    });
  });
});