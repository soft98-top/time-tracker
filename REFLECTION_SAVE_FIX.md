# 反思总结保存问题修复

## 问题描述
反思总结内容没有保存成功，用户输入的内容无法持久化。

## 问题原因
1. **缺少会话ID**：只有从专注状态切换到反思状态时才会设置 `currentSessionId`
2. **直接进入反思状态**：用户直接进入反思状态时没有对应的会话记录
3. **临时会话处理**：没有为独立的反思会话创建记录的机制

## 修复方案

### 1. 增强反思状态会话ID设置
```typescript
startReflection: () => {
  // 保存当前专注记录（如果有）
  if (state.timerState.currentState === TimerState.FOCUS && state.timerState.startTime) {
    focusSessionId = saveSessionRecord(/* ... */);
  }
  
  // 设置当前会话ID（优先使用专注会话ID）
  if (focusSessionId) {
    dispatch({ type: ActionType.SET_CURRENT_SESSION_ID, payload: focusSessionId });
  } else if (!state.currentSessionId) {
    // 创建临时会话ID
    const tempSessionId = `temp-reflection-${Date.now()}`;
    dispatch({ type: ActionType.SET_CURRENT_SESSION_ID, payload: tempSessionId });
  }
}
```

### 2. 处理临时会话ID的保存逻辑
```typescript
updateReflectionSummary: (sessionId: string, content: string) => {
  // 如果是临时会话ID，创建一个反思会话记录
  if (sessionId.startsWith('temp-reflection-')) {
    const reflectionRecord = {
      type: TimerState.REFLECTION,
      startTime: now - 1000,
      endTime: now,
      duration: 1000,
      isCompleted: false,
      reflectionSummary: {
        content,
        createdAt: now,
        updatedAt: now
      }
    };
    
    const savedRecord = HistoryService.addRecord(reflectionRecord);
    dispatch({ type: ActionType.SET_CURRENT_SESSION_ID, payload: savedRecord.id });
    return savedRecord;
  } else {
    // 正常更新现有记录
    return HistoryService.updateReflectionSummary(sessionId, content);
  }
}
```

### 3. 添加调试信息
- 在保存过程中添加 console.log 输出
- 跟踪会话ID的设置和使用
- 验证保存结果

## 修复后的行为

### ✅ 支持的场景
1. **专注→反思**：反思总结保存到专注会话记录中
2. **直接反思**：创建独立的反思会话记录
3. **重复编辑**：正确更新现有的反思总结

### ✅ 数据结构
```json
{
  "id": "1703123456789-abc123def",
  "type": "focus",
  "reflectionSummary": {
    "content": "今天的专注效果很好...",
    "createdAt": 1703125256789,
    "updatedAt": 1703125356789
  }
}
```

### ✅ 调试输出
- "开始保存反思总结: {sessionId, content}"
- "反思总结保存结果: {record}"
- "创建反思会话记录: {record}"

## 测试验证

### 手动测试步骤
1. **专注→反思场景**：
   - 开始专注 → 切换到反思 → 输入内容 → 验证保存
   
2. **直接反思场景**：
   - 直接进入反思状态 → 输入内容 → 验证保存
   
3. **内容更新场景**：
   - 修改已保存的反思内容 → 验证更新

### 预期结果
- ✅ 所有场景下反思内容都能正确保存
- ✅ 在历史记录中能看到反思总结
- ✅ 控制台输出调试信息确认保存过程

## 相关文件
- `src/contexts/TimerContext.tsx` - 修复会话ID设置和保存逻辑
- `src/pages/TimerPage.tsx` - 添加调试信息
- `src/services/HistoryService.ts` - 数据存储服务

## 结论
修复完成后，反思总结功能在所有使用场景下都能正确保存内容，用户的反思记录将被可靠地持久化到 localStorage 中。