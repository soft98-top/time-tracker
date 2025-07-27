# 反思总结自动保存功能修复

## 问题描述

反思总结的自动保存功能导致用户无法正常输入内容，用户输入后内容会自动消失。

## 问题原因

1. **初始化触发保存**：组件初始化时，`useEffect` 会立即触发自动保存逻辑
2. **内容重复加载**：TimerPage 中的 `useEffect` 依赖 `getSessionHistory()`，每次调用都会重新加载内容，覆盖用户正在输入的内容
3. **状态同步问题**：`lastSavedValue` 的初始化逻辑不正确

## 修复方案

### 1. 添加初始化标记

在 `ReflectionInput` 和 `ReflectionModal` 组件中添加 `isInitialized` 状态：

```typescript
const [isInitialized, setIsInitialized] = useState(false);
```

### 2. 修复自动保存逻辑

只在组件完全初始化后才允许自动保存：

```typescript
// 自动保存逻辑
useEffect(() => {
  if (!autoSave || !isInitialized || value === lastSavedValue || value === '') return;

  const timer = setTimeout(() => {
    onSave(value);
    setLastSavedValue(value);
  }, autoSaveDelay);

  return () => clearTimeout(timer);
}, [value, lastSavedValue, onSave, autoSave, autoSaveDelay, isInitialized]);
```

### 3. 修复内容加载逻辑

在 TimerPage 中修复内容加载逻辑，避免覆盖用户输入：

```typescript
// 只在进入反思状态时加载内容，避免覆盖用户输入
useEffect(() => {
  if (state.currentState === TimerState.REFLECTION) {
    const sessionId = getCurrentSessionId();
    if (sessionId) {
      const history = getSessionHistory();
      const focusSession = history.find(record => record.id === sessionId);
      const content = focusSession?.reflectionSummary?.content || '';
      // 只在内容为空时设置，避免覆盖用户正在编辑的内容
      if (reflectionContent === '') {
        setReflectionContent(content);
      }
    }
  } else {
    // 离开反思状态时清空内容
    setReflectionContent('');
  }
}, [state.currentState, getCurrentSessionId]); // 移除 getSessionHistory 依赖
```

## 修复后的行为

### ✅ 正常行为
- 用户输入内容正常保留
- 只在用户停止输入2秒后自动保存
- 初始化时不会触发保存操作
- 已保存的内容正确加载，不会被覆盖

### ✅ 自动保存流程
1. 用户开始输入内容
2. 系统检测到内容变化
3. 等待2秒延迟（可配置）
4. 如果用户停止输入，触发自动保存
5. 显示"正在自动保存..."指示器
6. 保存完成后显示"✓ 已保存"状态

## 测试验证

### 手动测试步骤
1. 进入反思状态
2. 在反思输入框中输入内容
3. 验证内容不会自动消失
4. 等待2秒后验证自动保存指示器
5. 关闭并重新打开验证内容保持

### 预期结果
- ✅ 输入内容保持稳定
- ✅ 自动保存正常工作
- ✅ 内容正确持久化
- ✅ 用户体验流畅

## 相关文件

- `src/components/ReflectionInput.tsx` - 反思输入组件
- `src/components/ReflectionModal.tsx` - 反思模态框组件
- `src/pages/TimerPage.tsx` - 计时器页面

## 技术细节

### 关键修改点
1. **初始化控制**：使用 `isInitialized` 标记控制自动保存时机
2. **依赖优化**：移除不必要的 `useEffect` 依赖，避免重复触发
3. **状态保护**：保护用户正在编辑的内容不被覆盖

### 性能优化
- 减少不必要的重新渲染
- 优化 `useEffect` 依赖数组
- 避免重复的数据加载

## 结论

修复完成后，反思总结功能的自动保存机制工作正常，用户可以流畅地输入和编辑反思内容，不会出现内容丢失的问题。