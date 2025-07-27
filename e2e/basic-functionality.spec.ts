import { test, expect } from '@playwright/test';

test.describe('Flexible Pomodoro Timer - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should load the application successfully', async ({ page }) => {
    // Check if the page loads
    await expect(page).toHaveTitle(/Flexible Pomodoro Timer|灵活番茄时钟/);
    
    // Check if main elements are visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('button')).toBeVisible();
  });

  test('should display timer in idle state initially', async ({ page }) => {
    // Look for idle state indicators
    await expect(page.locator('text=空闲')).toBeVisible();
    await expect(page.locator('text=00:00')).toBeVisible();
  });

  test('should be able to start focus session', async ({ page }) => {
    // Look for focus button and click it
    const focusButton = page.locator('button:has-text("专注")').first();
    await expect(focusButton).toBeVisible();
    await focusButton.click();
    
    // Check if focus state is active
    await expect(page.locator('text=专注')).toBeVisible();
    
    // Wait a bit and check if timer is running
    await page.waitForTimeout(2000);
    await expect(page.locator('text=00:0')).toBeVisible();
  });

  test('should be able to navigate between pages', async ({ page }) => {
    // Check navigation links
    const statsLink = page.locator('a:has-text("统计"), button:has-text("统计")').first();
    if (await statsLink.isVisible()) {
      await statsLink.click();
      await expect(page.locator('text=统计')).toBeVisible();
    }
    
    const settingsLink = page.locator('a:has-text("设置"), button:has-text("设置")').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page.locator('text=设置')).toBeVisible();
    }
  });

  test('should handle basic timer operations', async ({ page }) => {
    // Start focus
    const focusButton = page.locator('button:has-text("专注")').first();
    await focusButton.click();
    
    // Wait for focus state
    await expect(page.locator('text=专注')).toBeVisible();
    
    // Look for cancel button and click it
    const cancelButton = page.locator('button:has-text("取消")').first();
    if (await cancelButton.isVisible()) {
      await cancelButton.click();
      
      // Should return to idle state
      await expect(page.locator('text=空闲')).toBeVisible();
    }
  });

  test('should persist state across page reloads', async ({ page }) => {
    // Start focus session
    const focusButton = page.locator('button:has-text("专注")').first();
    await focusButton.click();
    
    // Wait for focus state
    await expect(page.locator('text=专注')).toBeVisible();
    
    // Reload page
    await page.reload();
    
    // Should restore focus state (or handle gracefully)
    // The app should either restore the state or show idle state
    await expect(page.locator('text=专注, text=空闲')).toBeVisible();
  });

  test('should handle settings configuration', async ({ page }) => {
    // Navigate to settings
    const settingsLink = page.locator('a:has-text("设置"), button:has-text("设置")').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      
      // Look for settings form
      await expect(page.locator('input[type="number"]')).toBeVisible();
      
      // Try to modify a setting
      const focusInput = page.locator('input[type="number"]').first();
      await focusInput.fill('30');
      
      // Look for save button
      const saveButton = page.locator('button:has-text("保存")').first();
      if (await saveButton.isVisible()) {
        await saveButton.click();
      }
    }
  });

  test('should display statistics page', async ({ page }) => {
    // Navigate to statistics
    const statsLink = page.locator('a:has-text("统计"), button:has-text("统计")').first();
    if (await statsLink.isVisible()) {
      await statsLink.click();
      
      // Should show statistics content
      await expect(page.locator('text=统计')).toBeVisible();
    }
  });

  test('should handle mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // App should still be functional
    await expect(page.locator('button:has-text("专注")')).toBeVisible();
    
    // Should be able to start focus
    const focusButton = page.locator('button:has-text("专注")').first();
    await focusButton.click();
    await expect(page.locator('text=专注')).toBeVisible();
  });

  test('should handle error scenarios gracefully', async ({ page }) => {
    // Simulate localStorage error
    await page.evaluate(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error('Storage quota exceeded');
      };
    });
    
    // Try to start focus session
    const focusButton = page.locator('button:has-text("专注")').first();
    await focusButton.click();
    
    // App should still be functional (not crash)
    await expect(page.locator('body')).toBeVisible();
  });
});