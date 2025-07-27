import { TimerError, TimerException } from '../types';

/**
 * 时间跳跃检测结果接口
 */
export interface TimeJumpResult {
  hasJumped: boolean;
  jumpAmount: number; // 跳跃的毫秒数，正数表示向前跳跃，负数表示向后跳跃
  adjustedElapsedTime: number; // 调整后的已用时间
}

/**
 * 时间管理器配置接口
 */
export interface TimeManagerConfig {
  updateInterval: number; // 更新间隔（毫秒）
  maxAllowedJump: number; // 允许的最大时间跳跃（毫秒）
  syncThreshold: number; // 同步阈值（毫秒）
}

/**
 * 时间管理器类
 * 负责精确计时和时间跳跃检测处理
 */
export class TimeManager {
  private startTime: number | null = null;
  private pausedTime: number = 0; // 暂停累计时间
  private lastUpdateTime: number | null = null;
  private intervalId: number | null = null;
  private config: TimeManagerConfig;
  private onTick?: (elapsedTime: number) => void;
  private onTimeJump?: (jumpResult: TimeJumpResult) => void;

  constructor(config: Partial<TimeManagerConfig> = {}) {
    this.config = {
      updateInterval: 1000, // 默认1秒更新一次
      maxAllowedJump: 5000, // 默认允许5秒的时间跳跃
      syncThreshold: 2000, // 默认2秒的同步阈值
      ...config
    };
  }

  /**
   * 开始计时
   */
  public start(onTick?: (elapsedTime: number) => void, onTimeJump?: (jumpResult: TimeJumpResult) => void): void {
    if (this.intervalId !== null) {
      throw new TimerException(
        TimerError.TIMER_SYNC_ERROR,
        '计时器已经在运行中',
        true
      );
    }

    const now = Date.now();
    this.startTime = now;
    this.lastUpdateTime = now;
    this.pausedTime = 0;
    this.onTick = onTick;
    this.onTimeJump = onTimeJump;

    this.intervalId = window.setInterval(() => {
      this.tick();
    }, this.config.updateInterval);

    // 立即执行一次tick
    this.tick();
  }

  /**
   * 恢复计时（从已有的已用时间开始）
   */
  public resume(
    elapsedTime: number,
    onTick?: (elapsedTime: number) => void,
    onTimeJump?: (jumpResult: TimeJumpResult) => void
  ): void {
    if (this.intervalId !== null) {
      throw new TimerException(
        TimerError.TIMER_SYNC_ERROR,
        '计时器已经在运行中',
        true
      );
    }

    const now = Date.now();
    this.startTime = now - elapsedTime;
    this.lastUpdateTime = now;
    this.pausedTime = 0;
    this.onTick = onTick;
    this.onTimeJump = onTimeJump;

    this.intervalId = window.setInterval(() => {
      this.tick();
    }, this.config.updateInterval);

    // 立即执行一次tick
    this.tick();
  }

  /**
   * 停止计时
   */
  public stop(): number {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    const elapsedTime = this.getElapsedTime();
    this.reset();
    return elapsedTime;
  }

  /**
   * 暂停计时
   */
  public pause(): number {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    return this.getElapsedTime();
  }

  /**
   * 重置计时器
   */
  public reset(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.startTime = null;
    this.pausedTime = 0;
    this.lastUpdateTime = null;
    this.onTick = undefined;
    this.onTimeJump = undefined;
  }

  /**
   * 获取当前已用时间
   */
  public getElapsedTime(): number {
    if (this.startTime === null) {
      return 0;
    }

    return Date.now() - this.startTime - this.pausedTime;
  }

  /**
   * 检查是否正在运行
   */
  public isRunning(): boolean {
    return this.intervalId !== null;
  }

  /**
   * 计时器tick处理
   */
  private tick(): void {
    if (this.startTime === null || this.lastUpdateTime === null) {
      return;
    }

    const now = Date.now();
    const actualElapsedTime = now - this.lastUpdateTime;
    const expectedElapsedTime = this.config.updateInterval;

    // 检测时间跳跃
    const jumpResult = this.detectTimeJump(expectedElapsedTime, actualElapsedTime, now);
    
    if (jumpResult.hasJumped) {
      this.handleTimeJump(jumpResult);
    }

    this.lastUpdateTime = now;
    const currentElapsedTime = this.getElapsedTime();

    // 调用tick回调
    if (this.onTick) {
      this.onTick(currentElapsedTime);
    }
  }

  /**
   * 检测时间跳跃
   */
  private detectTimeJump(expectedElapsed: number, actualElapsed: number, currentTime: number): TimeJumpResult {
    const timeDifference = Math.abs(actualElapsed - expectedElapsed);
    
    // 如果时间差异超过阈值，认为发生了时间跳跃
    if (timeDifference > this.config.syncThreshold) {
      const jumpAmount = actualElapsed - expectedElapsed;
      const currentElapsedTime = this.getElapsedTime();
      
      return {
        hasJumped: true,
        jumpAmount,
        adjustedElapsedTime: currentElapsedTime
      };
    }

    return {
      hasJumped: false,
      jumpAmount: 0,
      adjustedElapsedTime: this.getElapsedTime()
    };
  }

  /**
   * 处理时间跳跃
   */
  private handleTimeJump(jumpResult: TimeJumpResult): void {
    // 如果跳跃量超过最大允许值，需要调整计时器
    if (Math.abs(jumpResult.jumpAmount) > this.config.maxAllowedJump) {
      // 向前跳跃太多：可能是系统休眠后恢复，调整暂停时间
      if (jumpResult.jumpAmount > 0) {
        this.pausedTime += jumpResult.jumpAmount - this.config.updateInterval;
      }
      // 向后跳跃：可能是系统时间被调整，重新同步
      else {
        // 重新计算开始时间以保持已用时间不变
        const currentElapsed = this.getElapsedTime();
        this.startTime = Date.now() - currentElapsed;
        this.pausedTime = 0;
      }
    }

    // 调用时间跳跃回调
    if (this.onTimeJump) {
      this.onTimeJump({
        ...jumpResult,
        adjustedElapsedTime: this.getElapsedTime()
      });
    }
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<TimeManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 如果正在运行且更新间隔改变了，重启定时器
    if (this.intervalId !== null && newConfig.updateInterval !== undefined) {
      const wasRunning = true;
      const currentElapsed = this.getElapsedTime();
      
      clearInterval(this.intervalId);
      this.intervalId = window.setInterval(() => {
        this.tick();
      }, this.config.updateInterval);
    }
  }

  /**
   * 获取当前配置
   */
  public getConfig(): TimeManagerConfig {
    return { ...this.config };
  }

  /**
   * 计算精确的时间差（毫秒）
   */
  public static calculateTimeDifference(startTime: number, endTime: number): number {
    return Math.max(0, endTime - startTime);
  }

  /**
   * 格式化时间显示（MM:SS）
   */
  public static formatTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 格式化详细时间显示（HH:MM:SS）
   */
  public static formatDetailedTime(milliseconds: number): string {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * 将毫秒转换为分钟（保留小数）
   */
  public static millisecondsToMinutes(milliseconds: number): number {
    return milliseconds / (1000 * 60);
  }

  /**
   * 将分钟转换为毫秒
   */
  public static minutesToMilliseconds(minutes: number): number {
    return minutes * 60 * 1000;
  }
}