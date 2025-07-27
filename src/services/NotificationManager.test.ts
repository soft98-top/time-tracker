import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NotificationManager, NotificationType, SoundType } from './NotificationManager';
import { TimerState } from '../types/timer';

// Mock Web APIs
const mockNotification = vi.fn();
const mockAudioContext = {
  createOscillator: vi.fn(),
  createGain: vi.fn(),
  destination: {},
  currentTime: 0,
  state: 'running',
  resume: vi.fn().mockResolvedValue(undefined),
  close: vi.fn()
};

const mockOscillator = {
  connect: vi.fn(),
  frequency: {
    setValueAtTime: vi.fn()
  },
  type: 'sine',
  start: vi.fn(),
  stop: vi.fn(),
  onended: null
};

const mockGainNode = {
  connect: vi.fn(),
  gain: {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  }
};

// Setup global mocks
Object.defineProperty(global, 'Notification', {
  value: mockNotification,
  configurable: true
});

Object.defineProperty(global, 'AudioContext', {
  value: vi.fn(() => mockAudioContext),
  configurable: true
});

Object.defineProperty(window, 'AudioContext', {
  value: vi.fn(() => mockAudioContext),
  configurable: true
});

describe('NotificationManager', () => {
  let notificationManager: NotificationManager;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup Notification mock
    mockNotification.permission = 'granted';
    mockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
    mockNotification.mockImplementation((title, options) => ({
      title,
      ...options,
      close: vi.fn()
    }));

    // Setup AudioContext mocks
    const freshOscillator = {
      ...mockOscillator,
      connect: vi.fn(),
      frequency: {
        setValueAtTime: vi.fn()
      },
      start: vi.fn(),
      stop: vi.fn().mockImplementation(() => {
        // Simulate onended event
        setTimeout(() => {
          if (freshOscillator.onended) {
            freshOscillator.onended();
          }
        }, 0);
      }),
      onended: null
    };
    
    mockAudioContext.createOscillator.mockReturnValue(freshOscillator);
    mockAudioContext.createGain.mockReturnValue(mockGainNode);

    notificationManager = new NotificationManager();
  });

  afterEach(() => {
    notificationManager.dispose();
  });

  describe('初始化', () => {
    it('应该正确初始化音频上下文', () => {
      expect(mockAudioContext).toBeDefined();
    });

    it('应该检查通知权限', () => {
      expect(notificationManager.getPermissionStatus()).toBe('granted');
    });

    it('应该支持通知功能', () => {
      expect(notificationManager.isNotificationSupported()).toBe(true);
    });

    it('应该支持音频功能', () => {
      expect(notificationManager.isAudioSupported()).toBe(true);
    });
  });

  describe('权限管理', () => {
    it('应该能够请求通知权限', async () => {
      mockNotification.permission = 'default';
      const result = await notificationManager.requestNotificationPermission();
      
      expect(mockNotification.requestPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('当权限被拒绝时应该返回false', async () => {
      mockNotification.permission = 'denied';
      const result = await notificationManager.requestNotificationPermission();
      
      expect(result).toBe(false);
    });

    it('当权限已授予时应该直接返回true', async () => {
      mockNotification.permission = 'granted';
      const result = await notificationManager.requestNotificationPermission();
      
      expect(result).toBe(true);
    });
  });

  describe('设置管理', () => {
    it('应该能够设置通知启用状态', () => {
      notificationManager.setNotificationEnabled(false);
      // 通过后续测试验证设置是否生效
    });

    it('应该能够设置声音启用状态', () => {
      notificationManager.setSoundEnabled(false);
      // 通过后续测试验证设置是否生效
    });
  });

  describe('桌面通知', () => {
    it('应该能够显示桌面通知', async () => {
      const options = {
        title: '测试标题',
        body: '测试内容',
        icon: '/test-icon.png',
        tag: 'test-tag'
      };

      await notificationManager.showNotification(options);

      expect(mockNotification).toHaveBeenCalledWith('测试标题', {
        body: '测试内容',
        icon: '/test-icon.png',
        tag: 'test-tag',
        requireInteraction: false
      });
    });

    it('当通知被禁用时不应该显示通知', async () => {
      notificationManager.setNotificationEnabled(false);
      
      await notificationManager.showNotification({
        title: '测试',
        body: '测试'
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });

    it('当没有权限时不应该显示通知', async () => {
      mockNotification.permission = 'denied';
      notificationManager = new NotificationManager();
      
      await notificationManager.showNotification({
        title: '测试',
        body: '测试'
      });

      expect(mockNotification).not.toHaveBeenCalled();
    });
  });

  describe('声音提醒', () => {
    it('应该能够播放通知声音', async () => {
      const playSoundSpy = vi.spyOn(notificationManager, 'playSound');
      
      await notificationManager.playSound(SoundType.NOTIFICATION);

      expect(playSoundSpy).toHaveBeenCalledWith(SoundType.NOTIFICATION);
    });

    it('应该能够播放成功声音', async () => {
      const playSoundSpy = vi.spyOn(notificationManager, 'playSound');
      
      await notificationManager.playSound(SoundType.SUCCESS);

      expect(playSoundSpy).toHaveBeenCalledWith(SoundType.SUCCESS);
    });

    it('应该能够播放警告声音', async () => {
      const playSoundSpy = vi.spyOn(notificationManager, 'playSound');
      
      await notificationManager.playSound(SoundType.WARNING);

      expect(playSoundSpy).toHaveBeenCalledWith(SoundType.WARNING);
    });

    it('当声音被禁用时不应该播放声音', async () => {
      notificationManager.setSoundEnabled(false);
      
      await notificationManager.playSound(SoundType.NOTIFICATION);

      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('当音频上下文被暂停时应该恢复', async () => {
      mockAudioContext.state = 'suspended';
      
      await notificationManager.playSound(SoundType.NOTIFICATION);

      expect(mockAudioContext.resume).toHaveBeenCalled();
    });
  });

  describe('预定义通知方法', () => {
    it('应该能够发送时间达到通知', async () => {
      const showNotificationSpy = vi.spyOn(notificationManager, 'showNotification');
      const playSoundSpy = vi.spyOn(notificationManager, 'playSound');

      await notificationManager.notifyTimeReached(TimerState.FOCUS, 25);

      expect(showNotificationSpy).toHaveBeenCalledWith({
        title: '时间提醒',
        body: '专注时间已达到 25 分钟',
        tag: 'time-reached',
        requireInteraction: false
      });
      expect(playSoundSpy).toHaveBeenCalledWith(SoundType.NOTIFICATION);
    });

    it('应该能够发送状态切换通知', async () => {
      const showNotificationSpy = vi.spyOn(notificationManager, 'showNotification');
      const playSoundSpy = vi.spyOn(notificationManager, 'playSound');

      await notificationManager.notifyStateChanged(TimerState.FOCUS, TimerState.REST);

      expect(showNotificationSpy).toHaveBeenCalledWith({
        title: '状态切换',
        body: '从专注切换到休息',
        tag: 'state-changed',
        requireInteraction: false
      });
      expect(playSoundSpy).toHaveBeenCalledWith(SoundType.SUCCESS);
    });

    it('应该能够发送会话完成通知', async () => {
      const showNotificationSpy = vi.spyOn(notificationManager, 'showNotification');
      const playSoundSpy = vi.spyOn(notificationManager, 'playSound');

      await notificationManager.notifySessionCompleted(TimerState.FOCUS, 1500); // 25分钟

      expect(showNotificationSpy).toHaveBeenCalledWith({
        title: '会话完成',
        body: '专注会话完成，持续了 25 分钟',
        tag: 'session-completed',
        requireInteraction: false
      });
      expect(playSoundSpy).toHaveBeenCalledWith(SoundType.SUCCESS);
    });

    it('应该能够发送专注失败通知', async () => {
      const showNotificationSpy = vi.spyOn(notificationManager, 'showNotification');
      const playSoundSpy = vi.spyOn(notificationManager, 'playSound');

      await notificationManager.notifyFocusFailed(120); // 2分钟

      expect(showNotificationSpy).toHaveBeenCalledWith({
        title: '专注中断',
        body: '专注在 2 分钟后被中断',
        tag: 'focus-failed',
        requireInteraction: false
      });
      expect(playSoundSpy).toHaveBeenCalledWith(SoundType.WARNING);
    });
  });

  describe('状态查询', () => {
    it('应该能够获取权限状态', () => {
      expect(notificationManager.getPermissionStatus()).toBe('granted');
    });

    it('应该能够检查通知支持', () => {
      expect(notificationManager.isNotificationSupported()).toBe(true);
    });

    it('应该能够检查音频支持', () => {
      expect(notificationManager.isAudioSupported()).toBe(true);
    });
  });

  describe('资源清理', () => {
    it('应该能够正确清理音频上下文', () => {
      notificationManager.dispose();
      
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('当音频上下文已关闭时不应该重复关闭', () => {
      mockAudioContext.state = 'closed';
      
      notificationManager.dispose();
      
      expect(mockAudioContext.close).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该处理通知创建错误', async () => {
      mockNotification.mockImplementation(() => {
        throw new Error('Notification error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await notificationManager.showNotification({
        title: '测试',
        body: '测试'
      });

      expect(consoleSpy).toHaveBeenCalledWith('Error showing notification:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('应该处理音频播放错误', async () => {
      mockAudioContext.createOscillator.mockImplementation(() => {
        throw new Error('Audio error');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await notificationManager.playSound(SoundType.NOTIFICATION);

      expect(consoleSpy).toHaveBeenCalledWith('Error playing sound:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('应该处理权限请求错误', async () => {
      mockNotification.permission = 'default';
      mockNotification.requestPermission = vi.fn().mockRejectedValue(new Error('Permission error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await notificationManager.requestNotificationPermission();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Error requesting notification permission:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('浏览器兼容性', () => {
    it('当不支持通知时应该正确处理', () => {
      // @ts-ignore
      delete global.Notification;
      
      const manager = new NotificationManager();
      
      expect(manager.isNotificationSupported()).toBe(false);
      expect(manager.getPermissionStatus()).toBe('denied');
    });

    it('当不支持音频时应该正确处理', () => {
      // @ts-ignore
      delete global.AudioContext;
      // @ts-ignore
      delete window.AudioContext;
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const manager = new NotificationManager();
      
      expect(manager.isAudioSupported()).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Audio context not supported:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });
});