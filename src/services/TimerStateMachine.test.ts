import { describe, it, expect, beforeEach } from 'vitest';
import { TimerStateMachine } from './TimerStateMachine';
import { TimerState, TimerStateData, TimerConfig, TimerError, defaultConfig } from '../types';

describe('TimerStateMachine', () => {
  let stateMachine: TimerStateMachine;
  let mockConfig: TimerConfig;
  let mockStateData: TimerStateData;

  beforeEach(() => {
    stateMachine = new TimerStateMachine();
    mockConfig = { ...defaultConfig };
    mockStateData = {
      currentState: TimerState.IDLE,
      startTime: Date.now(),
      elapsedTime: 0,
      isDefaultTimeReached: false,
      canSwitchState: false
    };
  });

  describe('validateTransition', () => {
    it('应该允许从 IDLE 转换到 FOCUS', () => {
      const result = stateMachine.validateTransition(
        TimerState.IDLE,
        TimerState.FOCUS,
        mockStateData,
        mockConfig
      );

      expect(result.success).toBe(true);
      expect(result.newState).toBe(TimerState.FOCUS);
      expect(result.error).toBeUndefined();
    });

    it('应该拒绝无效的状态转换', () => {
      const result = stateMachine.validateTransition(
        TimerState.IDLE,
        TimerState.REFLECTION,
        mockStateData,
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe(TimerError.INVALID_STATE_TRANSITION);
    });

    it('应该允许在专注失败时间内从 FOCUS 取消到 IDLE', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 1 * 60 * 1000; // 1分钟，小于失败时间(2分钟)

      const result = stateMachine.validateTransition(
        TimerState.FOCUS,
        TimerState.IDLE,
        mockStateData,
        mockConfig
      );

      expect(result.success).toBe(true);
    });

    it('应该拒绝在专注失败时间后从 FOCUS 取消到 IDLE', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 3 * 60 * 1000; // 3分钟，超过失败时间(2分钟)

      const result = stateMachine.validateTransition(
        TimerState.FOCUS,
        TimerState.IDLE,
        mockStateData,
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('专注时间已超过失败时间限制');
    });

    it('应该允许在专注失败时间后从 FOCUS 转换到 REFLECTION', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 3 * 60 * 1000; // 3分钟，超过失败时间(2分钟)

      const result = stateMachine.validateTransition(
        TimerState.FOCUS,
        TimerState.REFLECTION,
        mockStateData,
        mockConfig
      );

      expect(result.success).toBe(true);
    });

    it('应该拒绝在专注失败时间内从 FOCUS 转换到 REFLECTION', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 1 * 60 * 1000; // 1分钟，小于失败时间(2分钟)

      const result = stateMachine.validateTransition(
        TimerState.FOCUS,
        TimerState.REFLECTION,
        mockStateData,
        mockConfig
      );

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('专注时间未达到最小要求');
    });

    it('应该允许从 REFLECTION 转换到 REST', () => {
      mockStateData.currentState = TimerState.REFLECTION;

      const result = stateMachine.validateTransition(
        TimerState.REFLECTION,
        TimerState.REST,
        mockStateData,
        mockConfig
      );

      expect(result.success).toBe(true);
    });

    it('应该允许从 REST 转换到 FOCUS', () => {
      mockStateData.currentState = TimerState.REST;

      const result = stateMachine.validateTransition(
        TimerState.REST,
        TimerState.FOCUS,
        mockStateData,
        mockConfig
      );

      expect(result.success).toBe(true);
    });
  });

  describe('getAvailableTransitions', () => {
    it('应该返回 IDLE 状态下的可用转换', () => {
      mockStateData.currentState = TimerState.IDLE;

      const transitions = stateMachine.getAvailableTransitions(
        TimerState.IDLE,
        mockStateData,
        mockConfig
      );

      expect(transitions).toEqual([TimerState.FOCUS]);
    });

    it('应该返回专注失败时间内 FOCUS 状态的可用转换', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 1 * 60 * 1000; // 1分钟

      const transitions = stateMachine.getAvailableTransitions(
        TimerState.FOCUS,
        mockStateData,
        mockConfig
      );

      expect(transitions).toEqual([TimerState.IDLE]);
    });

    it('应该返回专注失败时间后 FOCUS 状态的可用转换', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 3 * 60 * 1000; // 3分钟

      const transitions = stateMachine.getAvailableTransitions(
        TimerState.FOCUS,
        mockStateData,
        mockConfig
      );

      expect(transitions).toContain(TimerState.REFLECTION);
      expect(transitions).toContain(TimerState.REST);
      expect(transitions).not.toContain(TimerState.IDLE);
    });

    it('应该返回 REFLECTION 状态的可用转换', () => {
      mockStateData.currentState = TimerState.REFLECTION;

      const transitions = stateMachine.getAvailableTransitions(
        TimerState.REFLECTION,
        mockStateData,
        mockConfig
      );

      expect(transitions).toContain(TimerState.IDLE);
      expect(transitions).toContain(TimerState.REST);
    });

    it('应该返回 REST 状态的可用转换', () => {
      mockStateData.currentState = TimerState.REST;

      const transitions = stateMachine.getAvailableTransitions(
        TimerState.REST,
        mockStateData,
        mockConfig
      );

      expect(transitions).toContain(TimerState.IDLE);
      expect(transitions).toContain(TimerState.FOCUS);
    });
  });

  describe('canTransition', () => {
    it('应该正确检查转换可用性', () => {
      expect(stateMachine.canTransition(
        TimerState.IDLE,
        TimerState.FOCUS,
        mockStateData,
        mockConfig
      )).toBe(true);

      expect(stateMachine.canTransition(
        TimerState.IDLE,
        TimerState.REFLECTION,
        mockStateData,
        mockConfig
      )).toBe(false);
    });
  });

  describe('updateCanSwitchState', () => {
    it('应该在 IDLE 状态返回 false（只能开始专注）', () => {
      mockStateData.currentState = TimerState.IDLE;

      const canSwitch = stateMachine.updateCanSwitchState(mockStateData, mockConfig);

      expect(canSwitch).toBe(false);
    });

    it('应该在专注失败时间内的 FOCUS 状态返回 false', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 1 * 60 * 1000; // 1分钟

      const canSwitch = stateMachine.updateCanSwitchState(mockStateData, mockConfig);

      expect(canSwitch).toBe(false);
    });

    it('应该在专注失败时间后的 FOCUS 状态返回 true', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 3 * 60 * 1000; // 3分钟

      const canSwitch = stateMachine.updateCanSwitchState(mockStateData, mockConfig);

      expect(canSwitch).toBe(true);
    });

    it('应该在 REFLECTION 状态返回 true', () => {
      mockStateData.currentState = TimerState.REFLECTION;

      const canSwitch = stateMachine.updateCanSwitchState(mockStateData, mockConfig);

      expect(canSwitch).toBe(true);
    });

    it('应该在 REST 状态返回 true', () => {
      mockStateData.currentState = TimerState.REST;

      const canSwitch = stateMachine.updateCanSwitchState(mockStateData, mockConfig);

      expect(canSwitch).toBe(true);
    });
  });

  describe('checkDefaultTimeReached', () => {
    it('应该正确检查 FOCUS 状态的默认时间', () => {
      const elapsedTime = 25 * 60 * 1000; // 25分钟

      const reached = stateMachine.checkDefaultTimeReached(
        TimerState.FOCUS,
        elapsedTime,
        mockConfig
      );

      expect(reached).toBe(true);
    });

    it('应该正确检查 REFLECTION 状态的默认时间', () => {
      const elapsedTime = 3 * 60 * 1000; // 3分钟

      const reached = stateMachine.checkDefaultTimeReached(
        TimerState.REFLECTION,
        elapsedTime,
        mockConfig
      );

      expect(reached).toBe(true);
    });

    it('应该正确检查 REST 状态的默认时间', () => {
      const elapsedTime = 5 * 60 * 1000; // 5分钟

      const reached = stateMachine.checkDefaultTimeReached(
        TimerState.REST,
        elapsedTime,
        mockConfig
      );

      expect(reached).toBe(true);
    });

    it('应该在时间未达到时返回 false', () => {
      const elapsedTime = 20 * 60 * 1000; // 20分钟，小于默认专注时间25分钟

      const reached = stateMachine.checkDefaultTimeReached(
        TimerState.FOCUS,
        elapsedTime,
        mockConfig
      );

      expect(reached).toBe(false);
    });

    it('应该在 IDLE 状态返回 false', () => {
      const elapsedTime = 10 * 60 * 1000; // 10分钟

      const reached = stateMachine.checkDefaultTimeReached(
        TimerState.IDLE,
        elapsedTime,
        mockConfig
      );

      expect(reached).toBe(false);
    });
  });

  describe('isFocusFailed', () => {
    it('应该在专注失败时间内取消时返回 true', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 1 * 60 * 1000; // 1分钟

      const failed = stateMachine.isFocusFailed(mockStateData, mockConfig);

      expect(failed).toBe(true);
    });

    it('应该在专注失败时间后返回 false', () => {
      mockStateData.currentState = TimerState.FOCUS;
      mockStateData.elapsedTime = 3 * 60 * 1000; // 3分钟

      const failed = stateMachine.isFocusFailed(mockStateData, mockConfig);

      expect(failed).toBe(false);
    });

    it('应该在非 FOCUS 状态返回 false', () => {
      mockStateData.currentState = TimerState.REST;
      mockStateData.elapsedTime = 1 * 60 * 1000; // 1分钟

      const failed = stateMachine.isFocusFailed(mockStateData, mockConfig);

      expect(failed).toBe(false);
    });
  });

  describe('getTargetDuration', () => {
    it('应该返回正确的目标持续时间', () => {
      expect(stateMachine.getTargetDuration(TimerState.FOCUS, mockConfig))
        .toBe(mockConfig.focusDuration);
      
      expect(stateMachine.getTargetDuration(TimerState.REFLECTION, mockConfig))
        .toBe(mockConfig.reflectionDuration);
      
      expect(stateMachine.getTargetDuration(TimerState.REST, mockConfig))
        .toBe(mockConfig.restDuration);
      
      expect(stateMachine.getTargetDuration(TimerState.IDLE, mockConfig))
        .toBe(0);
    });
  });

  describe('calculateAvailableActions', () => {
    it('should return correct actions for IDLE state', () => {
      const stateData: TimerStateData = {
        currentState: TimerState.IDLE,
        startTime: null,
        elapsedTime: 0,
        isDefaultTimeReached: false,
        canSwitchState: false,
        availableActions: { canStartFocus: true, canCancel: false, canSwitchToReflection: false, canSwitchToRest: false }
      };

      const actions = stateMachine.calculateAvailableActions(stateData, mockConfig);

      expect(actions.canStartFocus).toBe(true);
      expect(actions.canCancel).toBe(false);
      expect(actions.canSwitchToReflection).toBe(false);
      expect(actions.canSwitchToRest).toBe(false);
    });

    it('should return correct actions for FOCUS state within failure time', () => {
      const stateData: TimerStateData = {
        currentState: TimerState.FOCUS,
        startTime: Date.now(),
        elapsedTime: 60000, // 1 minute
        isDefaultTimeReached: false,
        canSwitchState: false,
        availableActions: { canStartFocus: false, canCancel: true, canSwitchToReflection: false, canSwitchToRest: false }
      };

      const actions = stateMachine.calculateAvailableActions(stateData, mockConfig);

      expect(actions.canStartFocus).toBe(false);
      expect(actions.canCancel).toBe(true);
      expect(actions.canSwitchToReflection).toBe(false);
      expect(actions.canSwitchToRest).toBe(false);
    });

    it('should return correct actions for FOCUS state beyond failure time', () => {
      const stateData: TimerStateData = {
        currentState: TimerState.FOCUS,
        startTime: Date.now(),
        elapsedTime: 180000, // 3 minutes
        isDefaultTimeReached: false,
        canSwitchState: true,
        availableActions: { canStartFocus: false, canCancel: true, canSwitchToReflection: true, canSwitchToRest: true }
      };

      const actions = stateMachine.calculateAvailableActions(stateData, mockConfig);

      expect(actions.canStartFocus).toBe(false);
      expect(actions.canCancel).toBe(true); // Can still cancel, just won't be marked as failed
      expect(actions.canSwitchToReflection).toBe(true);
      expect(actions.canSwitchToRest).toBe(true);
    });

    it('should return correct actions for REFLECTION state', () => {
      const stateData: TimerStateData = {
        currentState: TimerState.REFLECTION,
        startTime: Date.now(),
        elapsedTime: 60000,
        isDefaultTimeReached: false,
        canSwitchState: true,
        availableActions: { canStartFocus: true, canCancel: true, canSwitchToReflection: false, canSwitchToRest: true }
      };

      const actions = stateMachine.calculateAvailableActions(stateData, mockConfig);

      expect(actions.canStartFocus).toBe(true);
      expect(actions.canCancel).toBe(true);
      expect(actions.canSwitchToReflection).toBe(false);
      expect(actions.canSwitchToRest).toBe(true);
    });

    it('should return correct actions for REST state', () => {
      const stateData: TimerStateData = {
        currentState: TimerState.REST,
        startTime: Date.now(),
        elapsedTime: 60000,
        isDefaultTimeReached: false,
        canSwitchState: true,
        availableActions: { canStartFocus: true, canCancel: true, canSwitchToReflection: false, canSwitchToRest: false }
      };

      const actions = stateMachine.calculateAvailableActions(stateData, mockConfig);

      expect(actions.canStartFocus).toBe(true);
      expect(actions.canCancel).toBe(true);
      expect(actions.canSwitchToReflection).toBe(false);
      expect(actions.canSwitchToRest).toBe(false);
    });
  });
});