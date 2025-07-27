import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TimerStateMachine } from '../services/TimerStateMachine';
import { TimeManager } from '../services/TimeManager';
import { HistoryService } from '../services/HistoryService';
import { StatisticsService } from '../services/StatisticsService';
import { ConfigService } from '../services/ConfigService';
import { TimerState, defaultConfig } from '../types';

/**
 * 性能测试工具
 */
class PerformanceTestUtils {
  /**
   * 测量函数执行时间
   */
  static async measureExecutionTime<T>(fn: () => T | Promise<T>): Promise<{ result: T; duration: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, duration: end - start };
  }

  /**
   * 测量内存使用情况
   */
  static measureMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * 创建大量测试数据
   */
  static generateLargeDataset(size: number) {
    const sessions = [];
    const baseTime = Date.now() - (size * 60 * 1000); // 从size分钟前开始
    
    for (let i = 0; i < size; i++) {
      sessions.push({
        id: `session-${i}`,
        type: i % 3 === 0 ? TimerState.FOCUS : i % 3 === 1 ? TimerState.REFLECTION : TimerState.REST,
        startTime: baseTime + (i * 60 * 1000),
        endTime: baseTime + (i * 60 * 1000) + (25 * 60 * 1000),
        duration: 25 * 60 * 1000,
        isCompleted: Math.random() > 0.1, // 90% 完成率
        isFailed: Math.random() < 0.1 // 10% 失败率
      });
    }
    
    return sessions;
  }

  /**
   * 模拟长时间运行
   */
  static async simulateLongRunning(durationMs: number, intervalMs: number = 1000): Promise<void> {
    const endTime = Date.now() + durationMs;
    
    while (Date.now() < endTime) {
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
  }
}

describe('Performance Tests', () => {
  beforeEach(() => {
    // 清理存储
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('TimerStateMachine Performance', () => {
    it('should handle rapid state transitions efficiently', async () => {
      const stateMachine = new TimerStateMachine();
      const iterations = 1000;
      
      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        for (let i = 0; i < iterations; i++) {
          const state = {
            currentState: TimerState.IDLE,
            startTime: Date.now(),
            elapsedTime: 0,
            isDefaultTimeReached: false,
            canSwitchState: false
          };
          
          stateMachine.canTransition(state, TimerState.FOCUS);
          stateMachine.validateTransition(state, TimerState.FOCUS);
        }
      });
      
      // 应该在合理时间内完成（每次操作小于1ms）
      expect(duration).toBeLessThan(iterations);

    });

    it('should maintain performance with complex state validation', async () => {
      const stateMachine = new TimerStateMachine();
      const complexStates = [
        TimerState.IDLE,
        TimerState.FOCUS,
        TimerState.REFLECTION,
        TimerState.REST
      ];
      
      const { duration } = await PerformanceTestUtils.measureExecutionTime(() => {
        for (let i = 0; i < 500; i++) {
          for (const fromState of complexStates) {
            for (const toState of complexStates) {
              const state = {
                currentState: fromState,
                startTime: Date.now() - 60000,
                elapsedTime: 60000,
                isDefaultTimeReached: true,
                canSwitchState: true
              };
              
              stateMachine.canTransition(state, toState);
            }
          }
        }
      });
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成

    });
  });

  describe('TimeManager Performance', () => {
    it('should handle frequent time updates efficiently', async () => {
      const timeManager = new TimeManager();
      const updates = 1000;
      
      timeManager.start();
      
      const { duration } = await PerformanceTestUtils.measureExecutionTime(() => {
        for (let i = 0; i < updates; i++) {
          timeManager.getElapsedTime();
          timeManager.isRunning();
        }
      });
      
      timeManager.stop();
      
      expect(duration).toBeLessThan(100); // 应该在100ms内完成

    });

    it('should detect time jumps efficiently', async () => {
      const timeManager = new TimeManager();
      const iterations = 100;
      
      const { duration } = await PerformanceTestUtils.measureExecutionTime(() => {
        for (let i = 0; i < iterations; i++) {
          // 模拟时间跳跃检测
          const result = timeManager.handleTimeJump(Date.now() + 3600000); // 1小时跳跃
          expect(result).toBeDefined();
        }
      });
      
      expect(duration).toBeLessThan(50); // 应该在50ms内完成

    });
  });

  describe('HistoryService Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset = PerformanceTestUtils.generateLargeDataset(1000);
      
      // 保存大量数据
      const { duration: saveTime } = await PerformanceTestUtils.measureExecutionTime(() => {
        largeDataset.forEach(session => {
          HistoryService.addSession(session);
        });
      });
      
      expect(saveTime).toBeLessThan(1000); // 保存1000条记录应该在1秒内完成

      
      // 读取数据
      const { duration: loadTime } = await PerformanceTestUtils.measureExecutionTime(() => {
        const sessions = HistoryService.getAllSessions();
        expect(sessions.length).toBe(1000);
      });
      
      expect(loadTime).toBeLessThan(100); // 读取应该在100ms内完成

      
      // 查询数据
      const { duration: queryTime } = await PerformanceTestUtils.measureExecutionTime(() => {
        const focusSessions = HistoryService.getSessionsByType(TimerState.FOCUS);
        expect(focusSessions.length).toBeGreaterThan(0);
      });
      
      expect(queryTime).toBeLessThan(50); // 查询应该在50ms内完成

    });

    it('should maintain performance with frequent operations', async () => {
      const operations = 500;
      
      const { duration } = await PerformanceTestUtils.measureExecutionTime(() => {
        for (let i = 0; i < operations; i++) {
          // 添加会话
          HistoryService.addSession({
            id: `perf-test-${i}`,
            type: TimerState.FOCUS,
            startTime: Date.now() - 1000,
            endTime: Date.now(),
            duration: 1000,
            isCompleted: true
          });
          
          // 读取会话
          HistoryService.getAllSessions();
          
          // 删除会话
          if (i % 10 === 0) {
            HistoryService.deleteSession(`perf-test-${i}`);
          }
        }
      });
      
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成

    });
  });

  describe('StatisticsService Performance', () => {
    it('should calculate statistics efficiently for large datasets', async () => {
      const largeDataset = PerformanceTestUtils.generateLargeDataset(2000);
      
      // 保存数据
      largeDataset.forEach(session => {
        HistoryService.addSession(session);
      });
      
      // 计算统计数据
      const { duration } = await PerformanceTestUtils.measureExecutionTime(() => {
        const stats = StatisticsService.calculateExtendedStatistics('all');
        expect(stats.totalSessions).toBe(2000);
      });
      
      expect(duration).toBeLessThan(500); // 应该在500ms内完成

    });

    it('should handle complex aggregations efficiently', async () => {
      const dataset = PerformanceTestUtils.generateLargeDataset(1000);
      
      dataset.forEach(session => {
        HistoryService.addSession(session);
      });
      
      const { duration } = await PerformanceTestUtils.measureExecutionTime(() => {
        // 多种统计计算
        StatisticsService.calculateExtendedStatistics('today');
        StatisticsService.calculateExtendedStatistics('week');
        StatisticsService.calculateExtendedStatistics('month');
        StatisticsService.getDailyStatistics('month');
        StatisticsService.getHourlyDistribution('week');
        StatisticsService.getFocusDurationDistribution('all');
      });
      
      expect(duration).toBeLessThan(1000); // 应该在1秒内完成

    });
  });

  describe('ConfigService Performance', () => {
    it('should handle frequent config updates efficiently', async () => {
      const updates = 1000;
      
      const { duration } = await PerformanceTestUtils.measureExecutionTime(async () => {
        for (let i = 0; i < updates; i++) {
          const config = {
            ...defaultConfig,
            focusDuration: 25 + (i % 10)
          };
          
          await ConfigService.saveConfig(config);
          const loaded = ConfigService.loadConfig();
          expect(loaded.focusDuration).toBe(25 + (i % 10));
        }
      });
      
      expect(duration).toBeLessThan(2000); // 应该在2秒内完成

    });
  });

  describe('Memory Usage Tests', () => {
    it('should not have memory leaks with long running operations', async () => {
      const initialMemory = PerformanceTestUtils.measureMemoryUsage();
      
      // 模拟长时间运行的操作
      const timeManager = new TimeManager();
      timeManager.start();
      
      // 执行大量操作
      for (let i = 0; i < 100; i++) {
        // 添加会话
        HistoryService.addSession({
          id: `memory-test-${i}`,
          type: TimerState.FOCUS,
          startTime: Date.now() - 1000,
          endTime: Date.now(),
          duration: 1000,
          isCompleted: true
        });
        
        // 计算统计
        StatisticsService.calculateExtendedStatistics('today');
        
        // 获取时间
        timeManager.getElapsedTime();
        
        // 清理一些数据
        if (i % 10 === 0) {
          HistoryService.deleteSession(`memory-test-${i}`);
        }
      }
      
      timeManager.stop();
      
      // 强制垃圾回收（如果可用）
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = PerformanceTestUtils.measureMemoryUsage();
      
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;

        
        // 内存增长应该在合理范围内（小于10MB）
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  describe('Long Running Stability Tests', () => {
    it('should maintain accuracy over extended periods', async () => {
      const timeManager = new TimeManager();
      const testDuration = 5000; // 5秒测试
      const checkInterval = 100; // 每100ms检查一次
      
      timeManager.start();
      const startTime = Date.now();
      
      let maxDeviation = 0;
      let checks = 0;
      
      const checkAccuracy = () => {
        const actualElapsed = Date.now() - startTime;
        const timerElapsed = timeManager.getElapsedTime();
        const deviation = Math.abs(actualElapsed - timerElapsed);
        
        maxDeviation = Math.max(maxDeviation, deviation);
        checks++;
        
        // 偏差应该小于50ms
        expect(deviation).toBeLessThan(50);
      };
      
      // 定期检查精度
      const interval = setInterval(checkAccuracy, checkInterval);
      
      // 等待测试完成
      await new Promise(resolve => setTimeout(resolve, testDuration));
      
      clearInterval(interval);
      timeManager.stop();
      

      expect(maxDeviation).toBeLessThan(50);
    });

    it('should handle system sleep/wake cycles', async () => {
      const timeManager = new TimeManager();
      timeManager.start();
      
      const beforeSleep = timeManager.getElapsedTime();
      
      // 模拟系统休眠（时间跳跃）
      const sleepDuration = 2000; // 2秒
      const mockTime = Date.now() + sleepDuration;
      
      vi.spyOn(Date, 'now').mockReturnValue(mockTime);
      
      // 处理时间跳跃
      const result = timeManager.handleTimeJump(mockTime);
      
      expect(result.detected).toBe(true);
      expect(result.jumpAmount).toBeGreaterThan(sleepDuration - 100); // 允许一些误差
      
      timeManager.stop();
      
      vi.restoreAllMocks();
    });
  });

  describe('Concurrent Operations Tests', () => {
    it('should handle concurrent timer operations safely', async () => {
      const timeManager = new TimeManager();
      const operations = [];
      
      // 并发启动多个操作
      for (let i = 0; i < 10; i++) {
        operations.push(
          new Promise<void>(resolve => {
            setTimeout(() => {
              timeManager.start();
              setTimeout(() => {
                timeManager.stop();
                resolve();
              }, 100);
            }, i * 10);
          })
        );
      }
      
      // 等待所有操作完成
      await Promise.all(operations);
      
      // 最终状态应该是一致的
      expect(timeManager.isRunning()).toBe(false);
    });

    it('should handle concurrent data operations safely', async () => {
      const operations = [];
      
      // 并发数据操作
      for (let i = 0; i < 20; i++) {
        operations.push(
          new Promise<void>(resolve => {
            setTimeout(() => {
              HistoryService.addSession({
                id: `concurrent-${i}`,
                type: TimerState.FOCUS,
                startTime: Date.now() - 1000,
                endTime: Date.now(),
                duration: 1000,
                isCompleted: true
              });
              
              // 立即读取
              const sessions = HistoryService.getAllSessions();
              expect(sessions.length).toBeGreaterThan(0);
              
              resolve();
            }, Math.random() * 100);
          })
        );
      }
      
      await Promise.all(operations);
      
      // 验证最终数据一致性
      const finalSessions = HistoryService.getAllSessions();
      expect(finalSessions.length).toBe(20);
    });
  });
});