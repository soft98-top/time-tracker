import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimeManager, TimeJumpResult } from './TimeManager';
import { TimerError } from '../types';

// Mock window.setInterval and clearInterval
const mockSetInterval = vi.fn();
const mockClearInterval = vi.fn();

Object.defineProperty(window, 'setInterval', {
  value: mockSetInterval,
  writable: true
});

Object.defineProperty(window, 'clearInterval', {
  value: mockClearInterval,
  writable: true
});

describe('TimeManager', () => {
  let timeManager: TimeManager;
  let mockDateNow: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    timeManager = new TimeManager();
    mockDateNow = vi.spyOn(Date, 'now');
    mockSetInterval.mockClear();
    mockClearInterval.mockClear();
  });

  afterEach(() => {
    timeManager.reset();
    mockDateNow.mockRestore();
  });

  describe('constructor', () => {
    it('应该使用默认配置创建实例', () => {
      const config = timeManager.getConfig();
      
      expect(config.updateInterval).toBe(1000);
      expect(config.maxAllowedJump).toBe(5000);
      expect(config.syncThreshold).toBe(2000);
    });

    it('应该使用自定义配置创建实例', () => {
      const customTimeManager = new TimeManager({
        updateInterval: 500,
        maxAllowedJump: 3000
      });
      
      const config = customTimeManager.getConfig();
      expect(config.updateInterval).toBe(500);
      expect(config.maxAllowedJump).toBe(3000);
      expect(config.syncThreshold).toBe(2000); // 默认值
    });
  });

  describe('start', () => {
    it('应该正确开始计时', () => {
      const startTime = 1000000;
      mockDateNow.mockReturnValue(startTime);
      
      const onTick = vi.fn();
      timeManager.start(onTick);
      
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 1000);
      expect(timeManager.isRunning()).toBe(true);
      expect(onTick).toHaveBeenCalledWith(0);
    });

    it('应该在已经运行时抛出异常', () => {
      mockDateNow.mockReturnValue(1000000);
      timeManager.start();
      
      expect(() => timeManager.start()).toThrow();
    });
  });

  describe('resume', () => {
    it('应该从指定的已用时间恢复计时', () => {
      const currentTime = 1000000;
      const elapsedTime = 30000; // 30秒
      mockDateNow.mockReturnValue(currentTime);
      
      const onTick = vi.fn();
      timeManager.resume(elapsedTime, onTick);
      
      expect(timeManager.isRunning()).toBe(true);
      expect(timeManager.getElapsedTime()).toBe(elapsedTime);
      expect(onTick).toHaveBeenCalledWith(elapsedTime);
    });
  });

  describe('stop', () => {
    it('应该停止计时并返回已用时间', () => {
      const startTime = 1000000;
      const endTime = 1030000; // 30秒后
      
      mockDateNow.mockReturnValue(startTime);
      timeManager.start();
      
      mockDateNow.mockReturnValue(endTime);
      const elapsedTime = timeManager.stop();
      
      expect(mockClearInterval).toHaveBeenCalled();
      expect(timeManager.isRunning()).toBe(false);
      expect(elapsedTime).toBe(30000);
    });
  });

  describe('pause', () => {
    it('应该暂停计时并返回当前已用时间', () => {
      const startTime = 1000000;
      const pauseTime = 1020000; // 20秒后
      
      mockDateNow.mockReturnValue(startTime);
      timeManager.start();
      
      mockDateNow.mockReturnValue(pauseTime);
      const elapsedTime = timeManager.pause();
      
      expect(mockClearInterval).toHaveBeenCalled();
      expect(timeManager.isRunning()).toBe(false);
      expect(elapsedTime).toBe(20000);
    });
  });

  describe('reset', () => {
    it('应该重置计时器状态', () => {
      mockDateNow.mockReturnValue(1000000);
      timeManager.start();
      
      timeManager.reset();
      
      expect(mockClearInterval).toHaveBeenCalled();
      expect(timeManager.isRunning()).toBe(false);
      expect(timeManager.getElapsedTime()).toBe(0);
    });
  });

  describe('getElapsedTime', () => {
    it('应该在未开始时返回0', () => {
      expect(timeManager.getElapsedTime()).toBe(0);
    });

    it('应该返回正确的已用时间', () => {
      const startTime = 1000000;
      const currentTime = 1025000; // 25秒后
      
      mockDateNow.mockReturnValue(startTime);
      timeManager.start();
      
      mockDateNow.mockReturnValue(currentTime);
      expect(timeManager.getElapsedTime()).toBe(25000);
    });
  });

  describe('isRunning', () => {
    it('应该正确返回运行状态', () => {
      expect(timeManager.isRunning()).toBe(false);
      
      mockDateNow.mockReturnValue(1000000);
      timeManager.start();
      expect(timeManager.isRunning()).toBe(true);
      
      timeManager.stop();
      expect(timeManager.isRunning()).toBe(false);
    });
  });

  describe('updateConfig', () => {
    it('应该更新配置', () => {
      timeManager.updateConfig({
        updateInterval: 2000,
        maxAllowedJump: 10000
      });
      
      const config = timeManager.getConfig();
      expect(config.updateInterval).toBe(2000);
      expect(config.maxAllowedJump).toBe(10000);
    });

    it('应该在运行时重启定时器（如果更新间隔改变）', () => {
      mockDateNow.mockReturnValue(1000000);
      timeManager.start();
      
      mockSetInterval.mockClear();
      mockClearInterval.mockClear();
      
      timeManager.updateConfig({ updateInterval: 500 });
      
      expect(mockClearInterval).toHaveBeenCalled();
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 500);
    });
  });

  describe('静态方法', () => {
    describe('calculateTimeDifference', () => {
      it('应该计算正确的时间差', () => {
        const startTime = 1000000;
        const endTime = 1025000;
        
        const diff = TimeManager.calculateTimeDifference(startTime, endTime);
        expect(diff).toBe(25000);
      });

      it('应该在结束时间早于开始时间时返回0', () => {
        const startTime = 1025000;
        const endTime = 1000000;
        
        const diff = TimeManager.calculateTimeDifference(startTime, endTime);
        expect(diff).toBe(0);
      });
    });

    describe('formatTime', () => {
      it('应该正确格式化时间（MM:SS）', () => {
        expect(TimeManager.formatTime(0)).toBe('00:00');
        expect(TimeManager.formatTime(30000)).toBe('00:30');
        expect(TimeManager.formatTime(90000)).toBe('01:30');
        expect(TimeManager.formatTime(3661000)).toBe('61:01');
      });
    });

    describe('formatDetailedTime', () => {
      it('应该正确格式化详细时间', () => {
        expect(TimeManager.formatDetailedTime(0)).toBe('00:00');
        expect(TimeManager.formatDetailedTime(30000)).toBe('00:30');
        expect(TimeManager.formatDetailedTime(90000)).toBe('01:30');
        expect(TimeManager.formatDetailedTime(3661000)).toBe('01:01:01');
        expect(TimeManager.formatDetailedTime(7323000)).toBe('02:02:03');
      });
    });

    describe('millisecondsToMinutes', () => {
      it('应该正确转换毫秒到分钟', () => {
        expect(TimeManager.millisecondsToMinutes(60000)).toBe(1);
        expect(TimeManager.millisecondsToMinutes(90000)).toBe(1.5);
        expect(TimeManager.millisecondsToMinutes(30000)).toBe(0.5);
      });
    });

    describe('minutesToMilliseconds', () => {
      it('应该正确转换分钟到毫秒', () => {
        expect(TimeManager.minutesToMilliseconds(1)).toBe(60000);
        expect(TimeManager.minutesToMilliseconds(1.5)).toBe(90000);
        expect(TimeManager.minutesToMilliseconds(0.5)).toBe(30000);
      });
    });
  });

  describe('时间跳跃检测', () => {
    it('应该检测到向前的时间跳跃', () => {
      const startTime = 1000000;
      mockDateNow.mockReturnValue(startTime);
      
      const onTimeJump = vi.fn();
      timeManager.start(undefined, onTimeJump);
      
      // 模拟系统休眠后恢复，时间跳跃了10秒
      mockDateNow.mockReturnValue(startTime + 11000); // 11秒后（超过阈值）
      
      // 手动触发tick来模拟定时器执行
      const intervalCallback = mockSetInterval.mock.calls[0][0];
      intervalCallback();
      
      expect(onTimeJump).toHaveBeenCalled();
      const jumpResult: TimeJumpResult = onTimeJump.mock.calls[0][0];
      expect(jumpResult.hasJumped).toBe(true);
      expect(jumpResult.jumpAmount).toBeGreaterThan(0);
    });

    it('应该在小幅时间差异时不触发跳跃检测', () => {
      const startTime = 1000000;
      mockDateNow.mockReturnValue(startTime);
      
      const onTimeJump = vi.fn();
      timeManager.start(undefined, onTimeJump);
      
      // 模拟正常的时间流逝（1秒）
      mockDateNow.mockReturnValue(startTime + 1000);
      
      const intervalCallback = mockSetInterval.mock.calls[0][0];
      intervalCallback();
      
      expect(onTimeJump).not.toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('应该处理多次start/stop循环', () => {
      for (let i = 0; i < 3; i++) {
        mockDateNow.mockReturnValue(1000000 + i * 1000);
        timeManager.start();
        
        mockDateNow.mockReturnValue(1000000 + i * 1000 + 500);
        timeManager.stop();
        
        expect(timeManager.isRunning()).toBe(false);
      }
    });

    it('应该在暂停后正确恢复', () => {
      const startTime = 1000000;
      mockDateNow.mockReturnValue(startTime);
      timeManager.start();
      
      // 运行10秒后暂停
      mockDateNow.mockReturnValue(startTime + 10000);
      const pausedElapsed = timeManager.pause();
      expect(pausedElapsed).toBe(10000);
      
      // 再运行5秒
      mockDateNow.mockReturnValue(startTime + 15000);
      timeManager.resume(pausedElapsed);
      
      mockDateNow.mockReturnValue(startTime + 20000);
      expect(timeManager.getElapsedTime()).toBe(15000); // 10 + 5秒
    });
  });
});