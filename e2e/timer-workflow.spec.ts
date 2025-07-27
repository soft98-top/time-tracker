import { test, expect } from '@playwright/test';

test.describe('Flexible Pomodoro Timer - Complete Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should display initial idle state correctly', async ({ page }) => {
    // Verify initial state display
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('无状态');
    await expect(page.locator('[data-testid="timer-display"]')).toContainText('00:00');
    
    // Verify available actions in idle state
    await expect(page.locator('[data-testid="start-focus-btn"]')).toBeEnabled();
    await expect(page.locator('[data-testid="start-reflection-btn"]')).toBeDisabled();
    await expect(page.locator('[data-testid="start-rest-btn"]')).toBeDisabled();
    await expect(page.locator('[data-testid="cancel-btn"]')).toBeDisabled();
  });

  test('should handle complete focus-reflection-rest cycle', async ({ page }) => {
    // Start focus session
    await page.click('[data-testid="start-focus-btn"]');
    
    // Verify focus state
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('专注');
    await expect(page.locator('[data-testid="timer-display"]')).toMatch(/00:0[1-9]/);
    
    // Wait for focus failure time to pass (2 minutes default)
    // We'll simulate this by waiting a bit and checking button states
    await page.waitForTimeout(3000); // 3 seconds for testing
    
    // During focus failure time, only cancel should be available
    await expect(page.locator('[data-testid="cancel-btn"]')).toBeEnabled();
    await expect(page.locator('[data-testid="start-reflection-btn"]')).toBeDisabled();
    await expect(page.locator('[data-testid="start-rest-btn"]')).toBeDisabled();
    
    // Simulate passing focus failure time by updating the timer state
    // In a real scenario, we'd wait for the actual time or mock the timer
    await page.evaluate(() => {
      const event = new CustomEvent('timer-update', { 
        detail: { elapsedTime: 3 * 60 * 1000, canSwitchState: true } 
      });
      window.dispatchEvent(event);
    });
    
    // After focus failure time, reflection and rest should be available
    await page.waitForTimeout(1000);
    
    // Switch to reflection
    await page.click('[data-testid="start-reflection-btn"]');
    
    // Verify reflection state
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('反思');
    
    // Wait a bit in reflection
    await page.waitForTimeout(2000);
    
    // Switch to rest
    await page.click('[data-testid="start-rest-btn"]');
    
    // Verify rest state
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('休息');
    
    // Wait a bit in rest
    await page.waitForTimeout(2000);
    
    // Return to idle
    await page.click('[data-testid="cancel-btn"]');
    
    // Verify back to idle
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('无状态');
  });

  test('should handle focus failure scenario', async ({ page }) => {
    // Start focus session
    await page.click('[data-testid="start-focus-btn"]');
    
    // Wait a bit but not past failure time
    await page.waitForTimeout(1000);
    
    // Cancel during focus failure time
    await page.click('[data-testid="cancel-btn"]');
    
    // Should return to idle state
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('无状态');
    
    // Check that this was recorded as a failed focus (would need to check statistics)
    await page.click('[data-testid="nav-statistics"]');
    
    // Verify failed focus is recorded in statistics
    await expect(page.locator('[data-testid="failed-focus-count"]')).toContainText('1');
  });

  test('should persist state across page reloads', async ({ page }) => {
    // Start focus session
    await page.click('[data-testid="start-focus-btn"]');
    
    // Wait a bit
    await page.waitForTimeout(2000);
    
    // Reload page
    await page.reload();
    
    // Should restore focus state
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('专注');
    
    // Timer should continue from where it left off (approximately)
    await expect(page.locator('[data-testid="timer-display"]')).toMatch(/00:0[1-9]/);
  });

  test('should handle settings configuration', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="nav-settings"]');
    
    // Verify settings page loads
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Update focus duration
    await page.fill('[data-testid="focus-duration-input"]', '30');
    
    // Update rest duration
    await page.fill('[data-testid="rest-duration-input"]', '10');
    
    // Update reflection duration
    await page.fill('[data-testid="reflection-duration-input"]', '5');
    
    // Update focus failure time
    await page.fill('[data-testid="focus-failure-time-input"]', '3');
    
    // Save settings
    await page.click('[data-testid="save-settings-btn"]');
    
    // Verify settings are saved
    await expect(page.locator('[data-testid="settings-saved-message"]')).toBeVisible();
    
    // Navigate back to timer
    await page.click('[data-testid="nav-timer"]');
    
    // Start focus to verify new settings are applied
    await page.click('[data-testid="start-focus-btn"]');
    
    // The new settings should be in effect (would need to verify through behavior)
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('专注');
  });

  test('should display statistics correctly', async ({ page }) => {
    // Complete a focus session first
    await page.click('[data-testid="start-focus-btn"]');
    await page.waitForTimeout(1000);
    
    // Simulate completing focus session
    await page.evaluate(() => {
      const event = new CustomEvent('timer-update', { 
        detail: { elapsedTime: 3 * 60 * 1000, canSwitchState: true } 
      });
      window.dispatchEvent(event);
    });
    
    await page.waitForTimeout(500);
    await page.click('[data-testid="start-reflection-btn"]');
    await page.waitForTimeout(1000);
    await page.click('[data-testid="cancel-btn"]');
    
    // Navigate to statistics
    await page.click('[data-testid="nav-statistics"]');
    
    // Verify statistics page loads
    await expect(page.locator('[data-testid="statistics-view"]')).toBeVisible();
    
    // Check that statistics show the completed session
    await expect(page.locator('[data-testid="total-focus-time"]')).not.toContainText('0');
    await expect(page.locator('[data-testid="focus-session-count"]')).toContainText('1');
    
    // Test time period filters
    await page.click('[data-testid="period-today"]');
    await expect(page.locator('[data-testid="statistics-period"]')).toContainText('今日');
    
    await page.click('[data-testid="period-week"]');
    await expect(page.locator('[data-testid="statistics-period"]')).toContainText('本周');
    
    await page.click('[data-testid="period-month"]');
    await expect(page.locator('[data-testid="statistics-period"]')).toContainText('本月');
  });

  test('should handle notifications and sound settings', async ({ page }) => {
    // Navigate to settings
    await page.click('[data-testid="nav-settings"]');
    
    // Enable notifications
    await page.check('[data-testid="enable-notification-checkbox"]');
    
    // Enable sound
    await page.check('[data-testid="enable-sound-checkbox"]');
    
    // Save settings
    await page.click('[data-testid="save-settings-btn"]');
    
    // Navigate back to timer
    await page.click('[data-testid="nav-timer"]');
    
    // Start focus session
    await page.click('[data-testid="start-focus-btn"]');
    
    // Simulate reaching default focus time
    await page.evaluate(() => {
      const event = new CustomEvent('timer-notification', { 
        detail: { type: 'focus-complete' } 
      });
      window.dispatchEvent(event);
    });
    
    // Verify notification indicator appears
    await expect(page.locator('[data-testid="notification-indicator"]')).toBeVisible();
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Simulate storage error
    await page.evaluate(() => {
      // Mock localStorage to throw error
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('Storage quota exceeded');
      };
    });
    
    // Try to start focus session
    await page.click('[data-testid="start-focus-btn"]');
    
    // Should show error message but not crash
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    
    // App should still be functional
    await expect(page.locator('[data-testid="timer-state"]')).toBeVisible();
  });

  test('should handle time jumps correctly', async ({ page }) => {
    // Start focus session
    await page.click('[data-testid="start-focus-btn"]');
    
    // Wait a bit
    await page.waitForTimeout(1000);
    
    // Simulate system time jump
    await page.evaluate(() => {
      // Mock Date.now to simulate time jump
      const originalNow = Date.now;
      Date.now = () => originalNow() + 60 * 60 * 1000; // Jump 1 hour forward
    });
    
    // Wait for timer to detect and handle time jump
    await page.waitForTimeout(2000);
    
    // Timer should handle the time jump gracefully
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('专注');
    
    // Should show appropriate time or reset if jump is too large
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
  });

  test('should maintain responsive design on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="timer-display"]')).toBeVisible();
    await expect(page.locator('[data-testid="control-panel"]')).toBeVisible();
    
    // Test navigation on mobile
    await page.click('[data-testid="nav-statistics"]');
    await expect(page.locator('[data-testid="statistics-view"]')).toBeVisible();
    
    await page.click('[data-testid="nav-settings"]');
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();
    
    // Test that all controls are accessible on mobile
    await page.click('[data-testid="nav-timer"]');
    await expect(page.locator('[data-testid="start-focus-btn"]')).toBeVisible();
    
    // Verify touch interactions work
    await page.tap('[data-testid="start-focus-btn"]');
    await expect(page.locator('[data-testid="timer-state"]')).toContainText('专注');
  });
});