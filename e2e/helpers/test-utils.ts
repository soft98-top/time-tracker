import { Page, expect } from '@playwright/test';

/**
 * E2E测试工具函数
 */
export class TestUtils {
  constructor(private page: Page) {}

  /**
   * 清除所有本地存储数据
   */
  async clearStorage(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * 设置模拟的localStorage数据
   */
  async setStorageData(key: string, data: any): Promise<void> {
    await this.page.evaluate(
      ({ key, data }) => {
        localStorage.setItem(key, JSON.stringify(data));
      },
      { key, data }
    );
  }

  /**
   * 获取localStorage数据
   */
  async getStorageData(key: string): Promise<any> {
    return await this.page.evaluate(
      (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      },
      key
    );
  }

  /**
   * 模拟时间跳跃
   */
  async simulateTimeJump(milliseconds: number): Promise<void> {
    await this.page.evaluate(
      (ms) => {
        const originalNow = Date.now;
        Date.now = () => originalNow() + ms;
        
        // 触发时间跳跃事件
        const event = new CustomEvent('timer-time-jump', { 
          detail: { timeJump: ms } 
        });
        window.dispatchEvent(event);
      },
      milliseconds
    );
  }

  /**
   * 等待计时器状态变化
   */
  async waitForTimerState(expectedState: string, timeout = 5000): Promise<void> {
    await expect(this.page.locator('[data-testid="timer-state"]')).toContainText(expectedState, { timeout });
  }

  /**
   * 等待计时器显示特定时间
   */
  async waitForTimerDisplay(pattern: RegExp, timeout = 5000): Promise<void> {
    await expect(this.page.locator('[data-testid="timer-display"]')).toMatch(pattern, { timeout });
  }

  /**
   * 模拟网络离线
   */
  async goOffline(): Promise<void> {
    await this.page.context().setOffline(true);
  }

  /**
   * 模拟网络在线
   */
  async goOnline(): Promise<void> {
    await this.page.context().setOffline(false);
  }

  /**
   * 模拟浏览器标签页隐藏
   */
  async hideTab(): Promise<void> {
    await this.page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }

  /**
   * 模拟浏览器标签页显示
   */
  async showTab(): Promise<void> {
    await this.page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
  }

  /**
   * 模拟localStorage配额超出错误
   */
  async simulateStorageQuotaError(): Promise<void> {
    await this.page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function() {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      };
    });
  }

  /**
   * 恢复localStorage正常功能
   */
  async restoreStorage(): Promise<void> {
    await this.page.evaluate(() => {
      // 重新加载页面来恢复原始的localStorage
      window.location.reload();
    });
  }

  /**
   * 注入损坏的数据到localStorage
   */
  async injectCorruptedData(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.setItem('timer-config', 'invalid-json');
      localStorage.setItem('timer-history', '{"invalid": json}');
      localStorage.setItem('timer-state', 'corrupted-state');
    });
  }

  /**
   * 模拟通知权限状态
   */
  async setNotificationPermission(permission: 'granted' | 'denied' | 'default'): Promise<void> {
    await this.page.evaluate(
      (perm) => {
        Object.defineProperty(Notification, 'permission', {
          value: perm,
          writable: true
        });
      },
      permission
    );
  }

  /**
   * 检查是否显示错误消息
   */
  async expectErrorMessage(message?: string): Promise<void> {
    const errorElement = this.page.locator('[data-testid="error-message"]');
    await expect(errorElement).toBeVisible();
    
    if (message) {
      await expect(errorElement).toContainText(message);
    }
  }

  /**
   * 检查是否显示数据恢复消息
   */
  async expectDataRecoveryMessage(): Promise<void> {
    await expect(this.page.locator('[data-testid="data-recovery-message"]')).toBeVisible();
  }

  /**
   * 检查是否显示存储错误消息
   */
  async expectStorageErrorMessage(): Promise<void> {
    await expect(this.page.locator('[data-testid="storage-error-message"]')).toBeVisible();
  }

  /**
   * 检查是否显示时间跳跃消息
   */
  async expectTimeJumpMessage(): Promise<void> {
    await expect(this.page.locator('[data-testid="time-jump-message"]')).toBeVisible();
  }

  /**
   * 完成一个完整的专注会话
   */
  async completeFullFocusSession(): Promise<void> {
    // 开始专注
    await this.page.click('[data-testid="start-focus-btn"]');
    await this.waitForTimerState('专注');
    
    // 等待超过专注失败时间
    await this.page.waitForTimeout(3000);
    
    // 模拟达到可切换状态
    await this.page.evaluate(() => {
      const event = new CustomEvent('timer-update', { 
        detail: { elapsedTime: 3 * 60 * 1000, canSwitchState: true } 
      });
      window.dispatchEvent(event);
    });
    
    await this.page.waitForTimeout(500);
    
    // 切换到反思
    await this.page.click('[data-testid="start-reflection-btn"]');
    await this.waitForTimerState('反思');
    
    // 等待一段时间后结束
    await this.page.waitForTimeout(1000);
    await this.page.click('[data-testid="cancel-btn"]');
    await this.waitForTimerState('无状态');
  }

  /**
   * 设置自定义配置
   */
  async setCustomConfig(config: {
    focusDuration?: number;
    restDuration?: number;
    reflectionDuration?: number;
    focusFailureTime?: number;
    enableSound?: boolean;
    enableNotification?: boolean;
  }): Promise<void> {
    await this.page.click('[data-testid="nav-settings"]');
    
    if (config.focusDuration !== undefined) {
      await this.page.fill('[data-testid="focus-duration-input"]', config.focusDuration.toString());
    }
    
    if (config.restDuration !== undefined) {
      await this.page.fill('[data-testid="rest-duration-input"]', config.restDuration.toString());
    }
    
    if (config.reflectionDuration !== undefined) {
      await this.page.fill('[data-testid="reflection-duration-input"]', config.reflectionDuration.toString());
    }
    
    if (config.focusFailureTime !== undefined) {
      await this.page.fill('[data-testid="focus-failure-time-input"]', config.focusFailureTime.toString());
    }
    
    if (config.enableSound !== undefined) {
      if (config.enableSound) {
        await this.page.check('[data-testid="enable-sound-checkbox"]');
      } else {
        await this.page.uncheck('[data-testid="enable-sound-checkbox"]');
      }
    }
    
    if (config.enableNotification !== undefined) {
      if (config.enableNotification) {
        await this.page.check('[data-testid="enable-notification-checkbox"]');
      } else {
        await this.page.uncheck('[data-testid="enable-notification-checkbox"]');
      }
    }
    
    await this.page.click('[data-testid="save-settings-btn"]');
    await expect(this.page.locator('[data-testid="settings-saved-message"]')).toBeVisible();
    
    // 返回到计时器页面
    await this.page.click('[data-testid="nav-timer"]');
  }

  /**
   * 验证统计数据
   */
  async verifyStatistics(expected: {
    focusTime?: string;
    focusCount?: string;
    failedCount?: string;
  }): Promise<void> {
    await this.page.click('[data-testid="nav-statistics"]');
    
    if (expected.focusTime) {
      await expect(this.page.locator('[data-testid="total-focus-time"]')).toContainText(expected.focusTime);
    }
    
    if (expected.focusCount) {
      await expect(this.page.locator('[data-testid="focus-session-count"]')).toContainText(expected.focusCount);
    }
    
    if (expected.failedCount) {
      await expect(this.page.locator('[data-testid="failed-focus-count"]')).toContainText(expected.failedCount);
    }
  }
}