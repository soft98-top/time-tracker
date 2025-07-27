import { TimerState, TimerStateData, TimerConfig, TimerError, TimerException } from '../types';

/**
 * 状态转换结果接口
 */
export interface StateTransitionResult {
  success: boolean;
  newState?: TimerState;
  error?: TimerException;
}

/**
 * 状态转换规则接口
 */
interface StateTransitionRule {
  from: TimerState;
  to: TimerState;
  validator: (stateData: TimerStateData, config: TimerConfig) => boolean;
  errorMessage?: string;
}

/**
 * 计时器状态机类
 * 负责管理状态转换逻辑和验证规则
 */
export class TimerStateMachine {
  private transitionRules: StateTransitionRule[] = [
    // 从 IDLE 状态的转换
    {
      from: TimerState.IDLE,
      to: TimerState.FOCUS,
      validator: () => true // 总是可以从空闲开始专注
    },

    // 从 FOCUS 状态的转换
    {
      from: TimerState.FOCUS,
      to: TimerState.IDLE,
      validator: (stateData, config) => {
        // 只有在专注失败时间内才能取消到空闲状态
        const elapsedMinutes = stateData.elapsedTime / (1000 * 60);
        return elapsedMinutes <= config.focusFailureTime;
      },
      errorMessage: '专注时间已超过失败时间限制，无法直接取消'
    },
    {
      from: TimerState.FOCUS,
      to: TimerState.REFLECTION,
      validator: (stateData, config) => {
        // 超过专注失败时间后才能切换到反思
        const elapsedMinutes = stateData.elapsedTime / (1000 * 60);
        return elapsedMinutes > config.focusFailureTime;
      },
      errorMessage: '专注时间未达到最小要求，无法进入反思状态'
    },
    {
      from: TimerState.FOCUS,
      to: TimerState.REST,
      validator: (stateData, config) => {
        // 超过专注失败时间后才能切换到休息
        const elapsedMinutes = stateData.elapsedTime / (1000 * 60);
        return elapsedMinutes > config.focusFailureTime;
      },
      errorMessage: '专注时间未达到最小要求，无法进入休息状态'
    },

    // 从 REFLECTION 状态的转换
    {
      from: TimerState.REFLECTION,
      to: TimerState.IDLE,
      validator: () => true // 总是可以从反思取消到空闲
    },
    {
      from: TimerState.REFLECTION,
      to: TimerState.REST,
      validator: () => true // 总是可以从反思切换到休息
    },

    // 从 REST 状态的转换
    {
      from: TimerState.REST,
      to: TimerState.IDLE,
      validator: () => true // 总是可以从休息取消到空闲
    },
    {
      from: TimerState.REST,
      to: TimerState.FOCUS,
      validator: () => true // 总是可以从休息开始新的专注
    }
  ];

  /**
   * 验证状态转换是否有效
   */
  public validateTransition(
    from: TimerState,
    to: TimerState,
    stateData: TimerStateData,
    config: TimerConfig
  ): StateTransitionResult {
    // 查找匹配的转换规则
    const rule = this.transitionRules.find(r => r.from === from && r.to === to);
    
    if (!rule) {
      return {
        success: false,
        error: new TimerException(
          TimerError.INVALID_STATE_TRANSITION,
          `不允许从 ${from} 状态转换到 ${to} 状态`,
          true
        )
      };
    }

    // 执行验证逻辑
    const isValid = rule.validator(stateData, config);
    
    if (!isValid) {
      return {
        success: false,
        error: new TimerException(
          TimerError.INVALID_STATE_TRANSITION,
          rule.errorMessage || `状态转换验证失败：${from} -> ${to}`,
          true
        )
      };
    }

    return {
      success: true,
      newState: to
    };
  }

  /**
   * 获取当前状态下可用的转换选项
   */
  public getAvailableTransitions(
    currentState: TimerState,
    stateData: TimerStateData,
    config: TimerConfig
  ): TimerState[] {
    return this.transitionRules
      .filter(rule => rule.from === currentState)
      .filter(rule => rule.validator(stateData, config))
      .map(rule => rule.to);
  }

  /**
   * 检查特定转换是否可用
   */
  public canTransition(
    from: TimerState,
    to: TimerState,
    stateData: TimerStateData,
    config: TimerConfig
  ): boolean {
    const result = this.validateTransition(from, to, stateData, config);
    return result.success;
  }

  /**
   * 更新状态数据中的 canSwitchState 标志
   */
  public updateCanSwitchState(
    stateData: TimerStateData,
    config: TimerConfig
  ): boolean {
    const availableTransitions = this.getAvailableTransitions(
      stateData.currentState,
      stateData,
      config
    );
    
    // 在 IDLE 状态下，只能开始专注，不算作状态切换
    if (stateData.currentState === TimerState.IDLE) {
      return false;
    }
    
    // 如果有多个转换选项，或者有除了取消到 IDLE 之外的其他转换选项，则可以切换状态
    return availableTransitions.length > 1 || 
           (availableTransitions.length === 1 && !availableTransitions.includes(TimerState.IDLE));
  }

  /**
   * 计算操作可用性
   */
  public calculateAvailableActions(
    stateData: TimerStateData,
    config: TimerConfig
  ): TimerStateData['availableActions'] {
    const availableTransitions = this.getAvailableTransitions(
      stateData.currentState,
      stateData,
      config
    );

    return {
      canStartFocus: stateData.currentState !== TimerState.FOCUS,
      canCancel: stateData.currentState !== TimerState.IDLE,
      canSwitchToReflection: availableTransitions.includes(TimerState.REFLECTION),
      canSwitchToRest: availableTransitions.includes(TimerState.REST)
    };
  }

  /**
   * 检查是否达到默认时间
   */
  public checkDefaultTimeReached(
    state: TimerState,
    elapsedTime: number,
    config: TimerConfig
  ): boolean {
    const elapsedMinutes = elapsedTime / (1000 * 60);
    
    switch (state) {
      case TimerState.FOCUS:
        return elapsedMinutes >= config.focusDuration;
      case TimerState.REFLECTION:
        return elapsedMinutes >= config.reflectionDuration;
      case TimerState.REST:
        return elapsedMinutes >= config.restDuration;
      case TimerState.IDLE:
      default:
        return false;
    }
  }

  /**
   * 检查专注是否失败（在专注失败时间内取消）
   */
  public isFocusFailed(
    stateData: TimerStateData,
    config: TimerConfig
  ): boolean {
    if (stateData.currentState !== TimerState.FOCUS) {
      return false;
    }
    
    const elapsedMinutes = stateData.elapsedTime / (1000 * 60);
    return elapsedMinutes <= config.focusFailureTime;
  }

  /**
   * 获取状态的目标持续时间（分钟）
   */
  public getTargetDuration(state: TimerState, config: TimerConfig): number {
    switch (state) {
      case TimerState.FOCUS:
        return config.focusDuration;
      case TimerState.REFLECTION:
        return config.reflectionDuration;
      case TimerState.REST:
        return config.restDuration;
      case TimerState.IDLE:
      default:
        return 0;
    }
  }
}