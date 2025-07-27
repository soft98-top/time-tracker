import { TimerState } from '../types/timer';
import { t } from '../i18n';

/**
 * 通知类型枚举
 */
export enum NotificationType {
  TIME_REACHED = 'TIME_REACHED',
  STATE_CHANGED = 'STATE_CHANGED',
  SESSION_COMPLETED = 'SESSION_COMPLETED'
}

/**
 * 通知选项接口
 */
export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * 声音类型枚举
 */
export enum SoundType {
  NOTIFICATION = 'notification',
  SUCCESS = 'success',
  WARNING = 'warning'
}

/**
 * 通知管理器类
 * 负责处理桌面通知和声音提醒
 */
export class NotificationManager {
  private audioContext: AudioContext | null = null;
  private soundEnabled: boolean = true;
  private notificationEnabled: boolean = true;
  private permissionGranted: boolean = false;
  private userInteracted: boolean = false;

  constructor() {
    this.initializeAudioContext();
    this.checkNotificationPermission();
    this.setupUserInteractionListener();
  }

  /**
   * 初始化音频上下文
   */
  private initializeAudioContext(): void {
    try {
      // 延迟创建 AudioContext，避免在页面加载时立即创建
      // this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
      this.audioContext = null;
    }
  }

  /**
   * 设置用户交互监听器
   */
  private setupUserInteractionListener(): void {
    const enableAudio = () => {
      this.userInteracted = true;
      const audioContext = this.getAudioContext();
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
      }
      // 移除监听器
      document.removeEventListener('click', enableAudio);
      document.removeEventListener('keydown', enableAudio);
      document.removeEventListener('touchstart', enableAudio);
    };

    document.addEventListener('click', enableAudio);
    document.addEventListener('keydown', enableAudio);
    document.addEventListener('touchstart', enableAudio);
  }

  /**
   * 获取或创建音频上下文
   */
  private getAudioContext(): AudioContext | null {
    try {
      // 如果上下文不存在或已关闭，创建新的
      if (!this.audioContext || this.audioContext.state === 'closed') {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return this.audioContext;
    } catch (error) {
      console.warn('Failed to create audio context:', error);
      return null;
    }
  }

  /**
   * 检查通知权限
   */
  private checkNotificationPermission(): void {
    if ('Notification' in window) {
      this.permissionGranted = Notification.permission === 'granted';
    }
  }

  /**
   * 请求通知权限
   */
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === 'granted';
      return this.permissionGranted;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  /**
   * 设置通知启用状态
   */
  public setNotificationEnabled(enabled: boolean): void {
    this.notificationEnabled = enabled;
  }

  /**
   * 设置声音启用状态
   */
  public setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
  }

  /**
   * 显示桌面通知
   */
  public async showNotification(options: NotificationOptions): Promise<void> {
    if (!this.notificationEnabled) {
      return;
    }

    // 如果没有权限，尝试请求权限
    if (!this.permissionGranted) {
      const granted = await this.requestNotificationPermission();
      if (!granted) {
        console.warn('Notification permission not granted');
        return;
      }
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/vite.svg',
        tag: options.tag,
        requireInteraction: options.requireInteraction || true, // 默认需要用户交互
        badge: '/vite.svg',
        silent: false, // 确保有声音
        // timestamp: Date.now(), // 不是标准的 NotificationOptions 属性
        // renotify: true // 不是标准的 NotificationOptions 属性
      });

      // 点击通知时聚焦窗口
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // 自动关闭通知（延长时间以确保用户看到）
      setTimeout(() => {
        notification.close();
      }, 8000);
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * 播放声音提醒
   */
  public async playSound(soundType: SoundType = SoundType.NOTIFICATION): Promise<void> {
    if (!this.soundEnabled) {
      return;
    }

    // 如果用户还没有交互，静默返回
    if (!this.userInteracted) {
      return;
    }

    try {
      // 尝试使用 Web Audio API
      const audioContext = this.getAudioContext();
      if (audioContext) {
        await this.playWebAudioSound(soundType);
      } else {
        // 降级到 HTML5 Audio
        await this.playHtmlAudioSound(soundType);
      }
    } catch (error) {
      // 静默失败，不显示错误日志
      // 浏览器的自动播放策略会阻止声音播放
    }
  }

  /**
   * 使用 Web Audio API 播放声音
   */
  private async playWebAudioSound(soundType: SoundType): Promise<void> {
    const audioContext = this.getAudioContext();
    if (!audioContext) {
      throw new Error('AudioContext not available');
    }

    // 确保音频上下文处于运行状态
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    const frequency = this.getSoundFrequency(soundType);
    const duration = this.getSoundDuration(soundType);

    await this.generateBeep(frequency, duration, audioContext);
  }

  /**
   * 使用 HTML5 Audio 播放声音（降级方案）
   */
  private async playHtmlAudioSound(soundType: SoundType): Promise<void> {
    return new Promise((resolve, reject) => {
      // 创建音频数据 URL
      const audioUrl = this.createAudioDataUrl(soundType);
      const audio = new Audio(audioUrl);
      
      audio.volume = 0.3;
      
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error('HTML5 Audio playback failed'));
      
      // 尝试播放
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(reject);
      }
    });
  }

  /**
   * 创建音频数据 URL
   */
  private createAudioDataUrl(soundType: SoundType): string {
    const frequency = this.getSoundFrequency(soundType);
    const duration = this.getSoundDuration(soundType);
    const sampleRate = 44100;
    const samples = Math.floor(sampleRate * duration);
    
    // 创建 WAV 文件数据
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    
    // WAV 文件头
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    
    // 生成音频数据
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      const amplitude = Math.sin(2 * Math.PI * frequency * t) * 0.3;
      const sample = Math.floor(amplitude * 32767);
      view.setInt16(44 + i * 2, sample, true);
    }
    
    const blob = new Blob([buffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }

  /**
   * 获取声音频率
   */
  private getSoundFrequency(soundType: SoundType): number {
    switch (soundType) {
      case SoundType.SUCCESS:
        return 800;
      case SoundType.WARNING:
        return 400;
      case SoundType.NOTIFICATION:
      default:
        return 600;
    }
  }

  /**
   * 获取声音持续时间
   */
  private getSoundDuration(soundType: SoundType): number {
    switch (soundType) {
      case SoundType.SUCCESS:
        return 0.3;
      case SoundType.WARNING:
        return 0.5;
      case SoundType.NOTIFICATION:
      default:
        return 0.2;
    }
  }

  /**
   * 生成蜂鸣声
   */
  private async generateBeep(frequency: number, duration: number, audioContext: AudioContext): Promise<void> {
    try {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);

      return new Promise((resolve, reject) => {
        oscillator.onended = () => resolve();
        // oscillator.onerror = () => reject(new Error('Oscillator error')); // OscillatorNode 没有 onerror 属性
        
        // 添加超时保护
        setTimeout(() => {
          try {
            oscillator.disconnect();
            gainNode.disconnect();
          } catch (e) {
            // 忽略断开连接的错误
          }
          resolve();
        }, (duration + 0.1) * 1000);
      });
    } catch (error) {
      console.error('Error generating beep:', error);
      throw error;
    }
  }

  /**
   * 发送状态达到默认时间的通知
   */
  public async notifyTimeReached(state: TimerState, elapsedMinutes: number): Promise<void> {
    const emoji = {
      [TimerState.FOCUS]: '🍅',
      [TimerState.REFLECTION]: '💭',
      [TimerState.REST]: '☕',
      [TimerState.IDLE]: '⏸️'
    };
    
    const stateName = t(`states.${state}`);
    
    await this.playSound(SoundType.NOTIFICATION);
    
    await this.showNotification({
      title: t('notifications.timeReached.title', { emoji: emoji[state] }),
      body: t('notifications.timeReached.body', { stateName, minutes: elapsedMinutes.toString() }),
      tag: 'time-reached',
      requireInteraction: true
    });
  }

  /**
   * 发送状态切换通知
   */
  public async notifyStateChanged(fromState: TimerState, toState: TimerState): Promise<void> {
    const emoji = {
      [TimerState.FOCUS]: '🍅',
      [TimerState.REFLECTION]: '💭',
      [TimerState.REST]: '☕',
      [TimerState.IDLE]: '⏸️'
    };

    const fromStateName = t(`states.${fromState}`);
    const toStateName = t(`states.${toState}`);
    
    await this.playSound(SoundType.SUCCESS);
    
    await this.showNotification({
      title: t('notifications.stateChanged.title', { emoji: emoji[toState] }),
      body: t('notifications.stateChanged.body', { fromState: fromStateName, toState: toStateName }),
      tag: 'state-changed',
      requireInteraction: false
    });
  }

  /**
   * 发送会话完成通知
   */
  public async notifySessionCompleted(state: TimerState, duration: number): Promise<void> {
    const emoji = {
      [TimerState.FOCUS]: '✅',
      [TimerState.REFLECTION]: '💡',
      [TimerState.REST]: '🎉',
      [TimerState.IDLE]: '⏸️'
    };

    const stateName = t(`states.${state}`);
    const minutes = Math.floor(duration / 60);
    
    await this.playSound(SoundType.SUCCESS);
    
    await this.showNotification({
      title: t('notifications.sessionCompleted.title', { emoji: emoji[state] }),
      body: t('notifications.sessionCompleted.body', { stateName, minutes: minutes.toString() }),
      tag: 'session-completed',
      requireInteraction: true
    });
  }

  /**
   * 发送专注失败通知
   */
  public async notifyFocusFailed(duration: number): Promise<void> {
    const minutes = Math.floor(duration / 60);
    
    await this.playSound(SoundType.WARNING);
    
    await this.showNotification({
      title: t('notifications.focusFailed.title'),
      body: t('notifications.focusFailed.body', { minutes: minutes.toString() }),
      tag: 'focus-failed',
      requireInteraction: true
    });
  }

  /**
   * 获取通知权限状态
   */
  public getPermissionStatus(): NotificationPermission {
    if (!('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  /**
   * 检查是否支持通知
   */
  public isNotificationSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * 检查是否支持音频
   */
  public isAudioSupported(): boolean {
    try {
      return !!(window.AudioContext || (window as any).webkitAudioContext);
    } catch {
      return false;
    }
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch (error) {
        console.warn('Error closing audio context:', error);
      }
    }
    this.audioContext = null;
  }
}

// 导出单例实例
export const notificationManager = new NotificationManager();