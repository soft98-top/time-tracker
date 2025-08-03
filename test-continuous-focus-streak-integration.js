/**
 * Manual test script to verify continuous focus streak business logic integration
 * This script simulates real user interactions to test the integration
 */

// Mock localStorage for testing
const mockStorage = {};
global.localStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = value; },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(key => delete mockStorage[key]); }
};

// Import the services
const { ContinuousFocusStreakService } = require('./src/services/ContinuousFocusStreakService.ts');
const { TimerState } = require('./src/types/timer.ts');

console.log('🧪 Testing Continuous Focus Streak Business Logic Integration\n');

// Test configuration
const testConfig = {
  focusDuration: 25,
  restDuration: 5,
  reflectionDuration: 3,
  focusFailureTime: 2,
  enableSound: true,
  enableNotification: true
};

// Test 1: Successful focus session should increment streak
console.log('📝 Test 1: Successful focus session increments streak');
try {
  // Create a successful focus session
  const successfulSession = {
    id: 'test-session-1',
    type: TimerState.FOCUS,
    startTime: Date.now() - (25 * 60 * 1000), // 25 minutes ago
    endTime: Date.now(),
    duration: 25 * 60 * 1000, // 25 minutes
    isCompleted: true,
    isFailed: false,
    metadata: {
      targetDuration: 25 * 60 * 1000,
      wasInterrupted: false
    }
  };

  // Check if should increment
  const shouldIncrement = ContinuousFocusStreakService.shouldIncrementStreak(successfulSession, testConfig);
  console.log(`   Should increment: ${shouldIncrement}`);

  if (shouldIncrement) {
    const newStreak = ContinuousFocusStreakService.incrementStreak(successfulSession.id);
    console.log(`   New streak: ${newStreak.count} (Session: ${newStreak.lastSessionId})`);
    console.log(`   ✅ Test 1 PASSED\n`);
  } else {
    console.log(`   ❌ Test 1 FAILED: Should have incremented streak\n`);
  }
} catch (error) {
  console.log(`   ❌ Test 1 ERROR: ${error.message}\n`);
}

// Test 2: Failed focus session should reset streak
console.log('📝 Test 2: Failed focus session resets streak');
try {
  // Create a failed focus session
  const failedSession = {
    id: 'test-session-2',
    type: TimerState.FOCUS,
    startTime: Date.now() - (1 * 60 * 1000), // 1 minute ago
    endTime: Date.now(),
    duration: 1 * 60 * 1000, // 1 minute (less than target)
    isCompleted: false,
    isFailed: true,
    metadata: {
      targetDuration: 25 * 60 * 1000,
      wasInterrupted: true
    }
  };

  // Check if should reset
  const shouldReset = ContinuousFocusStreakService.shouldResetStreak(failedSession, testConfig);
  console.log(`   Should reset: ${shouldReset}`);

  if (shouldReset) {
    const resetStreak = ContinuousFocusStreakService.resetStreak();
    console.log(`   Reset streak: ${resetStreak.count}`);
    console.log(`   ✅ Test 2 PASSED\n`);
  } else {
    console.log(`   ❌ Test 2 FAILED: Should have reset streak\n`);
  }
} catch (error) {
  console.log(`   ❌ Test 2 ERROR: ${error.message}\n`);
}

// Test 3: Multiple successful sessions should accumulate streak
console.log('📝 Test 3: Multiple successful sessions accumulate streak');
try {
  // Reset streak first
  ContinuousFocusStreakService.resetStreak();
  
  // Simulate 3 successful sessions
  for (let i = 1; i <= 3; i++) {
    const session = {
      id: `test-session-${i}`,
      type: TimerState.FOCUS,
      startTime: Date.now() - (25 * 60 * 1000),
      endTime: Date.now(),
      duration: 25 * 60 * 1000,
      isCompleted: true,
      isFailed: false,
      metadata: {
        targetDuration: 25 * 60 * 1000,
        wasInterrupted: false
      }
    };

    if (ContinuousFocusStreakService.shouldIncrementStreak(session, testConfig)) {
      const streak = ContinuousFocusStreakService.incrementStreak(session.id);
      console.log(`   Session ${i}: Streak = ${streak.count}`);
    }
  }

  const finalStreak = ContinuousFocusStreakService.loadStreak();
  if (finalStreak.count === 3) {
    console.log(`   ✅ Test 3 PASSED: Final streak = ${finalStreak.count}\n`);
  } else {
    console.log(`   ❌ Test 3 FAILED: Expected 3, got ${finalStreak.count}\n`);
  }
} catch (error) {
  console.log(`   ❌ Test 3 ERROR: ${error.message}\n`);
}

// Test 4: Non-focus sessions should not affect streak
console.log('📝 Test 4: Non-focus sessions do not affect streak');
try {
  const currentStreak = ContinuousFocusStreakService.loadStreak();
  console.log(`   Current streak: ${currentStreak.count}`);

  // Create a reflection session
  const reflectionSession = {
    id: 'test-reflection-1',
    type: TimerState.REFLECTION,
    startTime: Date.now() - (3 * 60 * 1000),
    endTime: Date.now(),
    duration: 3 * 60 * 1000,
    isCompleted: true,
    isFailed: false,
    metadata: {
      targetDuration: 3 * 60 * 1000,
      wasInterrupted: false
    }
  };

  const shouldIncrement = ContinuousFocusStreakService.shouldIncrementStreak(reflectionSession, testConfig);
  const shouldReset = ContinuousFocusStreakService.shouldResetStreak(reflectionSession, testConfig);

  if (!shouldIncrement && !shouldReset) {
    const afterStreak = ContinuousFocusStreakService.loadStreak();
    if (afterStreak.count === currentStreak.count) {
      console.log(`   ✅ Test 4 PASSED: Streak unchanged = ${afterStreak.count}\n`);
    } else {
      console.log(`   ❌ Test 4 FAILED: Streak changed from ${currentStreak.count} to ${afterStreak.count}\n`);
    }
  } else {
    console.log(`   ❌ Test 4 FAILED: Non-focus session affected streak logic\n`);
  }
} catch (error) {
  console.log(`   ❌ Test 4 ERROR: ${error.message}\n`);
}

// Test 5: State persistence and recovery
console.log('📝 Test 5: State persistence and recovery');
try {
  // Save a streak
  const testStreak = {
    count: 5,
    lastUpdateTime: Date.now(),
    lastSessionId: 'persistent-session'
  };
  
  ContinuousFocusStreakService.saveStreak(testStreak);
  console.log(`   Saved streak: ${testStreak.count}`);

  // Load it back
  const loadedStreak = ContinuousFocusStreakService.loadStreak();
  console.log(`   Loaded streak: ${loadedStreak.count}`);

  if (loadedStreak.count === testStreak.count && loadedStreak.lastSessionId === testStreak.lastSessionId) {
    console.log(`   ✅ Test 5 PASSED: Persistence working correctly\n`);
  } else {
    console.log(`   ❌ Test 5 FAILED: Persistence not working correctly\n`);
  }
} catch (error) {
  console.log(`   ❌ Test 5 ERROR: ${error.message}\n`);
}

console.log('🎉 Continuous Focus Streak Business Logic Integration Tests Complete!');
console.log('\nStorage contents:');
console.log(JSON.stringify(mockStorage, null, 2));