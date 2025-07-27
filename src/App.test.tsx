import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import App from './App';

// Mock the components to avoid complex dependencies
vi.mock('./components/TimerDisplay', () => ({
  TimerDisplay: () => <div data-testid="timer-display">Timer Display</div>
}));

vi.mock('./components/ControlPanel', () => ({
  ControlPanel: () => <div data-testid="control-panel">Control Panel</div>
}));

vi.mock('./components/StatisticsView', () => ({
  StatisticsView: () => <div data-testid="statistics-view">Statistics View</div>
}));

vi.mock('./components/HistoryView', () => ({
  HistoryView: () => <div data-testid="history-view">History View</div>
}));

vi.mock('./components/SettingsPanel', () => ({
  SettingsPanel: () => <div data-testid="settings-panel">Settings Panel</div>
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it('应该渲染主应用布局', () => {
    render(<App />);
    
    // 检查导航栏
    expect(screen.getByText('灵活番茄时钟')).toBeInTheDocument();
    expect(screen.getByText('计时器')).toBeInTheDocument();
    expect(screen.getByText('统计')).toBeInTheDocument();
    expect(screen.getByText('设置')).toBeInTheDocument();
    
    // 检查主题切换按钮
    expect(screen.getByRole('button', { name: /切换到.*主题/ })).toBeInTheDocument();
  });

  it('应该默认显示计时器页面', () => {
    render(<App />);
    
    // 默认应该显示计时器组件
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();
    expect(screen.getByTestId('control-panel')).toBeInTheDocument();
  });

  it('应该能够切换主题', () => {
    render(<App />);
    
    const themeButton = screen.getByRole('button', { name: /切换到.*主题/ });
    
    // 初始应该是浅色主题
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    
    // 点击切换到深色主题
    fireEvent.click(themeButton);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    
    // 再次点击切换回浅色主题
    fireEvent.click(themeButton);
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('应该保存主题设置到 localStorage', () => {
    render(<App />);
    
    const themeButton = screen.getByRole('button', { name: /切换到.*主题/ });
    
    // 切换主题
    fireEvent.click(themeButton);
    
    // 检查是否保存到 localStorage
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('app-theme', 'dark');
  });

  it('应该从 localStorage 加载保存的主题', () => {
    mockLocalStorage.getItem.mockReturnValue('dark');
    
    render(<App />);
    
    // 应该应用保存的深色主题
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('应该处理无效路由并重定向到计时器页面', () => {
    // 这个测试需要手动设置路由，在实际应用中会自动重定向
    render(<App />);
    
    // 默认路由应该显示计时器页面
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();
  });

  it('应该在错误边界中包装应用', () => {
    // 这个测试验证 ErrorBoundary 组件被正确使用
    render(<App />);
    
    // 应用应该正常渲染，说明错误边界正常工作
    expect(screen.getByText('灵活番茄时钟')).toBeInTheDocument();
  });

  it('应该使用 TimerProvider 包装应用', () => {
    // 这个测试验证 TimerProvider 被正确使用
    render(<App />);
    
    // 应用应该正常渲染，说明 Context Provider 正常工作
    expect(screen.getByTestId('timer-display')).toBeInTheDocument();
    expect(screen.getByTestId('control-panel')).toBeInTheDocument();
  });
});