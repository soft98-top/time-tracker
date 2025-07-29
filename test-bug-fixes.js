/**
 * Test script to verify the timer bug fixes
 * Run this in the browser console to test the fixes
 */

console.log('Testing Timer Bug Fixes...');

// Test 1: Verify timer doesn't reset on normal time progression
console.log('\n=== Test 1: Timer Accuracy ===');
console.log('Start a focus session and let it run for a few minutes.');
console.log('The timer should NOT reset automatically.');
console.log('Check console for any "检测到极端异常时间" warnings - there should be none during normal use.');

// Test 2: Verify cancel button properly changes state
console.log('\n=== Test 2: Cancel State Transition ===');
console.log('1. Start a focus session');
console.log('2. Click cancel button');
console.log('3. Check that:');
console.log('   - A session record is created (check localStorage or history)');
console.log('   - Timer state changes to IDLE');
console.log('   - UI reflects the state change');
console.log('   - Console shows "Cancel operation started" and "Cancel operation completed" logs');

// Test 3: Verify time jump detection is less aggressive
console.log('\n=== Test 3: Time Jump Detection ===');
console.log('The timer should now only reset in extreme cases:');
console.log('- Time > 48 hours (instead of 24)');
console.log('- Time < -5 minutes (instead of -1 second)');
console.log('Normal system sleep/wake should NOT cause resets.');

// Helper function to check current timer state
window.checkTimerState = function() {
  const timerContext = document.querySelector('[data-testid="timer-display"]');
  if (timerContext) {
    console.log('Current timer state visible in UI');
  }
  
  // Check localStorage for saved state
  const savedState = localStorage.getItem('flexible-pomodoro-state');
  if (savedState) {
    const parsed = JSON.parse(savedState);
    console.log('Saved timer state:', {
      currentState: parsed.timerState?.currentState,
      elapsedTime: parsed.timerState?.elapsedTime,
      startTime: parsed.timerState?.startTime
    });
  }
  
  // Check session history
  const history = localStorage.getItem('flexible-pomodoro-history');
  if (history) {
    const parsed = JSON.parse(history);
    console.log('Session records count:', parsed.records?.length || 0);
    if (parsed.records?.length > 0) {
      console.log('Latest record:', parsed.records[parsed.records.length - 1]);
    }
  }
};

console.log('\n=== Helper Functions ===');
console.log('Run checkTimerState() to inspect current state');
console.log('window.checkTimerState()');

console.log('\n=== Bug Fix Summary ===');
console.log('BUG1 FIX: Removed aggressive time jump detection (5s threshold)');
console.log('BUG2 FIX: Removed state transition validation from CANCEL action');
console.log('DEBUGGING: Added console logs for cancel operations and extreme time resets');