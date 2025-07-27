import { describe, it, expect } from 'vitest';
import { 
  TimerState, 
  TimerError, 
  TimerException, 
  defaultConfig,
  type TimerConfig,
  type TimerStateData,
  type SessionRecord,
  type Statistics
} from './timer';

describe('Timer Types', () => {
  it('should have correct TimerState enum values', () => {
    expect(TimerState.IDLE).toBe('idle');
    expect(TimerState.FOCUS).toBe('focus');
    expect(TimerState.REFLECTION).toBe('reflection');
    expect(TimerState.REST).toBe('rest');
  });

  it('should have correct TimerError enum values', () => {
    expect(TimerError.INVALID_STATE_TRANSITION).toBe('INVALID_STATE_TRANSITION');
    expect(TimerError.STORAGE_ERROR).toBe('STORAGE_ERROR');
    expect(TimerError.TIMER_SYNC_ERROR).toBe('TIMER_SYNC_ERROR');
    expect(TimerError.CONFIG_VALIDATION_ERROR).toBe('CONFIG_VALIDATION_ERROR');
  });

  it('should create TimerException correctly', () => {
    const error = new TimerException(TimerError.STORAGE_ERROR, 'Test error', false);
    expect(error.type).toBe(TimerError.STORAGE_ERROR);
    expect(error.message).toBe('Test error');
    expect(error.recoverable).toBe(false);
    expect(error.name).toBe('TimerException');
  });

  it('should have correct default config values', () => {
    expect(defaultConfig.focusDuration).toBe(25);
    expect(defaultConfig.restDuration).toBe(5);
    expect(defaultConfig.reflectionDuration).toBe(3);
    expect(defaultConfig.focusFailureTime).toBe(2);
    expect(defaultConfig.enableSound).toBe(true);
    expect(defaultConfig.enableNotification).toBe(true);
  });

  it('should validate TimerConfig interface', () => {
    const config: TimerConfig = {
      focusDuration: 30,
      restDuration: 10,
      reflectionDuration: 5,
      focusFailureTime: 3,
      enableSound: false,
      enableNotification: true
    };
    
    expect(typeof config.focusDuration).toBe('number');
    expect(typeof config.restDuration).toBe('number');
    expect(typeof config.reflectionDuration).toBe('number');
    expect(typeof config.focusFailureTime).toBe('number');
    expect(typeof config.enableSound).toBe('boolean');
    expect(typeof config.enableNotification).toBe('boolean');
  });

  it('should validate TimerStateData interface', () => {
    const stateData: TimerStateData = {
      currentState: TimerState.FOCUS,
      startTime: Date.now(),
      elapsedTime: 300000, // 5 minutes in ms
      isDefaultTimeReached: false,
      canSwitchState: false
    };
    
    expect(Object.values(TimerState)).toContain(stateData.currentState);
    expect(typeof stateData.startTime).toBe('number');
    expect(typeof stateData.elapsedTime).toBe('number');
    expect(typeof stateData.isDefaultTimeReached).toBe('boolean');
    expect(typeof stateData.canSwitchState).toBe('boolean');
  });

  it('should validate SessionRecord interface', () => {
    const record: SessionRecord = {
      id: 'test-id',
      type: TimerState.FOCUS,
      startTime: Date.now() - 1500000, // 25 minutes ago
      endTime: Date.now(),
      duration: 1500000, // 25 minutes
      isCompleted: true,
      isFailed: false,
      metadata: {
        targetDuration: 1500000,
        wasInterrupted: false
      }
    };
    
    expect(typeof record.id).toBe('string');
    expect(Object.values(TimerState)).toContain(record.type);
    expect(typeof record.startTime).toBe('number');
    expect(typeof record.endTime).toBe('number');
    expect(typeof record.duration).toBe('number');
    expect(typeof record.isCompleted).toBe('boolean');
    expect(typeof record.isFailed).toBe('boolean');
    expect(record.metadata).toBeDefined();
    expect(typeof record.metadata!.targetDuration).toBe('number');
    expect(typeof record.metadata!.wasInterrupted).toBe('boolean');
  });

  it('should validate Statistics interface', () => {
    const stats: Statistics = {
      totalFocusTime: 7200000, // 2 hours
      totalReflectionTime: 600000, // 10 minutes
      totalRestTime: 1200000, // 20 minutes
      focusSessionCount: 5,
      failedFocusCount: 1,
      averageFocusTime: 1440000, // 24 minutes
      longestFocusStreak: 3
    };
    
    expect(typeof stats.totalFocusTime).toBe('number');
    expect(typeof stats.totalReflectionTime).toBe('number');
    expect(typeof stats.totalRestTime).toBe('number');
    expect(typeof stats.focusSessionCount).toBe('number');
    expect(typeof stats.failedFocusCount).toBe('number');
    expect(typeof stats.averageFocusTime).toBe('number');
    expect(typeof stats.longestFocusStreak).toBe('number');
  });
});