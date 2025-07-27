import { test, expect } from '@playwright/test';

test.describe('Flexible Pomodoro Timer - Edge Cases and Boundary Conditions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should handle invalid configuration values', async ({ page }) => {
    await page.click('[data-testid="nav-settings"]');
    
    // Test negative values
    await page.fill('[data-testid="focus-duration-input"]', '-5');
    await page.click('[data-testid="save-settings-btn"]');
    
    // Should show validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Test zero values
    await page.fill('[data-testid="focus-duration-input"]', '0');
    await page.click('[data-testid="save-settings-btn"]');
    
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Test extremely large values
    await page.fill('[data-testid="focus-duration-input"]', '99999');
    await page.click('[data-testid="save-settings-btn"]');
    
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    
    // Test non-numeric values
    await page.fill('[data-testid="focus-duration-input"]', 'abc');
    await page.click('[data-testid="save-settings-btn"]');
    
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
  });

  test('should handle corrupted localStorage data', async ({ page }) => {
    // Inject corrupted data into localStorage
    await page.evaluate(() => {
      localStorage.setItem('timer-config', 'invalid-json');
      localStorage.setItem('timer-history', '{"invalid": json}');
    });
    
    await page.reload();
    
    // App should still load with default values
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('无状态');
    
    // Should show recovery message
    await expect(page.locator('[data-testid="data-recovery-message"]')).toBeVisible();
    
    // Settings should show default values
    await page.click('[data-testid="nav-settings"]');
    await expect(page.locator('[data-testid="focus-duration-input"]')).toHaveValue('25');
  });

  test('should handle localStorage quota exceeded', async ({ page }) => {
    // Mock localStorage to simulate quota exceeded
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      let callCount = 0;
      localStorage.setItem = function(key, value) {
        callCount++;
        if (callCount > 2) {
          const error = new Error('QuotaExceededError');
          error.name = 'QuotaExceededError';
          throw error;
        }
        return originalSetItem.call(this, key, value);
      };
    });
    
    // Start multiple sessions to trigger storage
    await page.click('[data-testid="start-focus-btn"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="cancel-btn"]');
    
    await page.click('[data-testid="start-focus-btn"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="cancel-btn"]');
    
    // Should show storage error but continue working
    await expect(page.locator('[data-testid="storage-error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('无状态');
  });

  test('should handle rapid state transitions', async ({ page }) => {
    // Rapidly click buttons to test race conditions
    await page.click('[data-testid="start-focus-btn"]');
    await page.click('[data-testid="cancel-btn"]');
    await page.click('[data-testid="start-focus-btn"]');
    await page.click('[data-testid="cancel-btn"]');
    await page.click('[data-testid="start-focus-btn"]');
    
    // Should end up in a consistent state
    await page.waitForTimeout(1000);
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('专注');
  });

  test('should handle browser tab visibility changes', async ({ page }) => {
    // Start focus session
    await page.click('[data-testid="start-focus-btn"]');
    await page.waitForTimeout(1000);
    
    // Simulate tab becoming hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(2000);
    
    // Simulate tab becoming visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    // Timer should continue correctly
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('专注');
    await expect(page.locator('[data-testid="timer-display"]')).toMatch(/00:0[1-9]/);
  });

  test('should handle network connectivity issues', async ({ page }) => {
    // Start focus session
    await page.click('[data-testid="start-focus-btn"]');
    
    // Simulate offline
    await page.context().setOffline(true);
    
    await page.waitForTimeout(2000);
    
    // App should continue working offline
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('专注');
    
    // Simulate back online
    await page.context().setOffline(false);
    
    // Should continue normally
    await page.click('[data-testid="cancel-btn"]');
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('无状态');
  });

  test('should handle very long running sessions', async ({ page }) => {
    // Start focus session
    await page.click('[data-testid="start-focus-btn"]');
    
    // Simulate very long elapsed time
    await page.evaluate(() => {
      const event = new CustomEvent('timer-update', { 
        detail: { 
          elapsedTime: 24 * 60 * 60 * 1000, // 24 hours
          canSwitchState: true 
        } 
      });
      window.dispatchEvent(event);
    });
    
    await page.waitForTimeout(1000);
    
    // Should display time correctly (or show appropriate message)
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
    
    // Should still allow state transitions
    await expect(page.locator('[data-testid="start-reflection-btn"]')).toBeEnabled();
  });

  test('should handle system sleep/wake cycles', async ({ page }) => {
    // Start focus session
    await page.click('[data-testid="start-focus-btn"]');
    await page.waitForTimeout(1000);
    
    // Simulate system sleep by creating large time gap
    await page.evaluate(() => {
      const originalNow = Date.now;
      const sleepTime = 2 * 60 * 60 * 1000; // 2 hours
      Date.now = () => originalNow() + sleepTime;
      
      // Trigger timer update
      const event = new CustomEvent('timer-wake', { 
        detail: { timeJump: sleepTime } 
      });
      window.dispatchEvent(event);
    });
    
    await page.waitForTimeout(2000);
    
    // Should handle wake gracefully
    await expect(page.locator('[data-testid="timer-state"]')).toBeVisible();
    
    // Should show appropriate message about time jump
    await expect(page.locator('[data-testid="time-jump-message"]')).toBeVisible();
  });

  test('should handle concurrent browser windows', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    await page1.goto('/');
    await page2.goto('/');
    
    // Start focus in first window
    await page1.click('[data-testid="start-focus-btn"]');
    await page1.waitForTimeout(1000);
    
    // Second window should reflect the state change
    await page2.reload();
    await expect(page2.locator('[data-testid="timer-state"]')).toContainText('专注');
    
    // Actions in second window should work
    await page2.click('[data-testid="cancel-btn"]');
    
    // First window should reflect the change
    await page1.reload();
    await expect(page1.locator('[data-testid="timer-state"]')).toContainText('无状态');
    
    await context1.close();
    await context2.close();
  });

  test('should handle memory pressure scenarios', async ({ page }) => {
    // Simulate memory pressure by creating many sessions
    for (let i = 0; i < 100; i++) {
      await page.click('[data-testid="start-focus-btn"]');
      await page.waitForTimeout(50);
      await page.click('[data-testid="cancel-btn"]');
      await page.waitForTimeout(50);
    }
    
    // App should still be responsive
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('无状态');
    
    // Statistics should handle large dataset
    await page.click('[data-testid="nav-statistics"]');
    await expect(page.locator('[data-testid="statistics-view"]')).toBeVisible();
    
    // Should show appropriate count
    await expect(page.locator('[data-testid="failed-focus-count"]')).toContainText('100');
  });

  test('should handle invalid date/time scenarios', async ({ page }) => {
    // Inject invalid timestamps into history
    await page.evaluate(() => {
      const invalidHistory = [
        {
          id: '1',
          type: 'focus',
          startTime: NaN,
          endTime: Date.now(),
          duration: 1000,
          isCompleted: true
        },
        {
          id: '2',
          type: 'focus',
          startTime: Date.now(),
          endTime: -1,
          duration: 1000,
          isCompleted: true
        }
      ];
      localStorage.setItem('timer-history', JSON.stringify(invalidHistory));
    });
    
    await page.reload();
    
    // Should handle invalid data gracefully
    await page.click('[data-testid="nav-statistics"]');
    await expect(page.locator('[data-testid="statistics-view"]')).toBeVisible();
    
    // Should show data recovery message
    await expect(page.locator('[data-testid="data-recovery-message"]')).toBeVisible();
  });

  test('should handle extreme viewport sizes', async ({ page }) => {
    // Test very small viewport
    await page.setViewportSize({ width: 200, height: 300 });
    
    // Should still be usable
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="start-focus-btn"]')).toBeVisible();
    
    // Test very large viewport
    await page.setViewportSize({ width: 3000, height: 2000 });
    
    // Should scale appropriately
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="control-panel"]')).toBeVisible();
  });
});