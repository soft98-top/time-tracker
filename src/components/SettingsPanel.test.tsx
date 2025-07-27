import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsPanel } from './SettingsPanel';
import { TimerConfig, defaultConfig } from '../types';

// Mock the useTimer hook
const mockUseTimer = vi.fn();
const mockUpdateConfig = vi.fn();

vi.mock('../contexts/TimerContext', () => ({
  useTimer: () => mockUseTimer()
}));

describe('SettingsPanel', () => {
  const mockConfig: TimerConfig = {
    ...defaultConfig,
    focusDuration: 25,
    reflectionDuration: 5,
    restDuration: 10,
    focusFailureTime: 2,
    enableSound: true,
    enableNotification: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseTimer.mockReturnValue({
      config: mockConfig,
      updateConfig: mockUpdateConfig
    });
  });

  describe('组件渲染', () => {
    it('应该渲染设置面板的基本结构', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('设置')).toBeInTheDocument();
      expect(screen.getByText('自定义您的番茄时钟配置，所有更改将在保存后生效。')).toBeInTheDocument();
      expect(screen.getByText('时长设置')).toBeInTheDocument();
      expect(screen.getByText('通知设置')).toBeInTheDocument();
      expect(screen.getByText('配置预览')).toBeInTheDocument();
    });

    it('应该显示所有配置字段', () => {
      render(<SettingsPanel />);

      expect(screen.getByLabelText('专注时长（分钟）')).toBeInTheDocument();
      expect(screen.getByLabelText('反思时长（分钟）')).toBeInTheDocument();
      expect(screen.getByLabelText('休息时长（分钟）')).toBeInTheDocument();
      expect(screen.getByLabelText('专注失败时间（分钟）')).toBeInTheDocument();
      expect(screen.getByLabelText('启用声音提醒')).toBeInTheDocument();
      expect(screen.getByLabelText('启用桌面通知')).toBeInTheDocument();
    });

    it('应该显示当前配置值', () => {
      render(<SettingsPanel />);

      expect(screen.getByDisplayValue('25')).toBeInTheDocument(); // focusDuration
      expect(screen.getByDisplayValue('5')).toBeInTheDocument(); // reflectionDuration
      expect(screen.getByDisplayValue('10')).toBeInTheDocument(); // restDuration
      expect(screen.getByDisplayValue('2')).toBeInTheDocument(); // focusFailureTime
      
      const soundCheckbox = screen.getByLabelText('启用声音提醒') as HTMLInputElement;
      const notificationCheckbox = screen.getByLabelText('启用桌面通知') as HTMLInputElement;
      expect(soundCheckbox.checked).toBe(true);
      expect(notificationCheckbox.checked).toBe(true);
    });
  });

  describe('表单交互', () => {
    it('应该在输入变化时更新表单状态', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）') as HTMLInputElement;
      fireEvent.change(focusInput, { target: { value: '30' } });

      expect(focusInput.value).toBe('30');
    });

    it('应该在复选框变化时更新状态', () => {
      render(<SettingsPanel />);

      const soundCheckbox = screen.getByLabelText('启用声音提醒') as HTMLInputElement;
      fireEvent.click(soundCheckbox);

      expect(soundCheckbox.checked).toBe(false);
    });

    it('应该在修改后启用保存按钮', () => {
      render(<SettingsPanel />);

      const saveButton = screen.getByText('保存设置');
      expect(saveButton).toBeDisabled();

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '30' } });

      expect(saveButton).not.toBeDisabled();
    });

    it('应该在修改后启用重置按钮', () => {
      render(<SettingsPanel />);

      const resetButton = screen.getByText('重置');
      expect(resetButton).toBeDisabled();

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '30' } });

      expect(resetButton).not.toBeDisabled();
    });
  });

  describe('表单验证', () => {
    it('应该验证专注时长的有效范围', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      
      // 测试小于1的值
      fireEvent.change(focusInput, { target: { value: '0' } });
      expect(screen.getByText('专注时长必须大于0分钟')).toBeInTheDocument();

      // 测试大于120的值
      fireEvent.change(focusInput, { target: { value: '150' } });
      expect(screen.getByText('专注时长不能超过120分钟')).toBeInTheDocument();

      // 测试有效值
      fireEvent.change(focusInput, { target: { value: '25' } });
      expect(screen.queryByText('专注时长必须大于0分钟')).not.toBeInTheDocument();
      expect(screen.queryByText('专注时长不能超过120分钟')).not.toBeInTheDocument();
    });

    it('应该验证休息时长的有效范围', () => {
      render(<SettingsPanel />);

      const restInput = screen.getByLabelText('休息时长（分钟）');
      
      fireEvent.change(restInput, { target: { value: '0' } });
      expect(screen.getByText('休息时长必须大于0分钟')).toBeInTheDocument();

      fireEvent.change(restInput, { target: { value: '70' } });
      expect(screen.getByText('休息时长不能超过60分钟')).toBeInTheDocument();
    });

    it('应该验证反思时长的有效范围', () => {
      render(<SettingsPanel />);

      const reflectionInput = screen.getByLabelText('反思时长（分钟）');
      
      fireEvent.change(reflectionInput, { target: { value: '0' } });
      expect(screen.getByText('反思时长必须大于0分钟')).toBeInTheDocument();

      fireEvent.change(reflectionInput, { target: { value: '35' } });
      expect(screen.getByText('反思时长不能超过30分钟')).toBeInTheDocument();
    });

    it('应该验证专注失败时间不能超过专注时长', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      const failureInput = screen.getByLabelText('专注失败时间（分钟）');
      
      // 设置专注时长为10分钟
      fireEvent.change(focusInput, { target: { value: '10' } });
      
      // 设置专注失败时间为15分钟（超过专注时长）
      fireEvent.change(failureInput, { target: { value: '15' } });
      
      expect(screen.getByText('专注失败时间不能超过专注时长')).toBeInTheDocument();
    });

    it('应该在有验证错误时禁用保存按钮', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      const saveButton = screen.getByText('保存设置');
      
      fireEvent.change(focusInput, { target: { value: '0' } });
      
      expect(saveButton).toBeDisabled();
    });
  });

  describe('配置预览', () => {
    it('应该显示正确的配置预览', () => {
      render(<SettingsPanel />);

      expect(screen.getByText('专注 25 分钟，反思 5 分钟，休息 10 分钟。专注失败时间为 2 分钟。')).toBeInTheDocument();
    });

    it('应该在有错误时显示错误预览', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '0' } });

      expect(screen.getByText('请修正错误后查看预览')).toBeInTheDocument();
    });

    it('应该在配置变化时更新预览', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '30' } });

      expect(screen.getByText('专注 30 分钟，反思 5 分钟，休息 10 分钟。专注失败时间为 2 分钟。')).toBeInTheDocument();
    });
  });

  describe('保存功能', () => {
    it('应该在点击保存时调用updateConfig', async () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '30' } });

      const saveButton = screen.getByText('保存设置');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateConfig).toHaveBeenCalledWith({
          ...mockConfig,
          focusDuration: 30
        });
      });
    });

    it('应该在保存成功后显示成功消息', async () => {
      mockUpdateConfig.mockResolvedValue(undefined);
      
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '30' } });

      const saveButton = screen.getByText('保存设置');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('设置已保存')).toBeInTheDocument();
      });
    });

    it('应该在保存失败后显示错误消息', async () => {
      mockUpdateConfig.mockRejectedValue(new Error('保存失败'));
      
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '30' } });

      const saveButton = screen.getByText('保存设置');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('保存失败，请重试')).toBeInTheDocument();
      });
    });

    it('应该在保存过程中显示加载状态', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockUpdateConfig.mockReturnValue(promise);
      
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '30' } });

      const saveButton = screen.getByText('保存设置');
      fireEvent.click(saveButton);

      expect(screen.getByText('保存中...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();

      resolvePromise!();
      await waitFor(() => {
        expect(screen.queryByText('保存中...')).not.toBeInTheDocument();
      });
    });
  });

  describe('重置功能', () => {
    it('应该在点击重置时恢复原始值', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）') as HTMLInputElement;
      fireEvent.change(focusInput, { target: { value: '30' } });
      expect(focusInput.value).toBe('30');

      const resetButton = screen.getByText('重置');
      fireEvent.click(resetButton);

      expect(focusInput.value).toBe('25');
    });

    it('应该在重置后禁用保存和重置按钮', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '30' } });

      const resetButton = screen.getByText('重置');
      const saveButton = screen.getByText('保存设置');
      
      fireEvent.click(resetButton);

      expect(resetButton).toBeDisabled();
      expect(saveButton).toBeDisabled();
    });
  });

  describe('恢复默认功能', () => {
    it('应该在点击恢复默认时设置默认值', () => {
      // 先修改配置
      const customConfig: TimerConfig = {
        focusDuration: 50,
        reflectionDuration: 10,
        restDuration: 20,
        focusFailureTime: 5,
        enableSound: false,
        enableNotification: false
      };

      mockUseTimer.mockReturnValue({
        config: customConfig,
        updateConfig: mockUpdateConfig
      });

      render(<SettingsPanel />);

      const restoreButton = screen.getByText('恢复默认');
      fireEvent.click(restoreButton);

      const focusInput = screen.getByLabelText('专注时长（分钟）') as HTMLInputElement;
      const reflectionInput = screen.getByLabelText('反思时长（分钟）') as HTMLInputElement;
      const restInput = screen.getByLabelText('休息时长（分钟）') as HTMLInputElement;
      const failureInput = screen.getByLabelText('专注失败时间（分钟）') as HTMLInputElement;

      expect(focusInput.value).toBe('25');
      expect(reflectionInput.value).toBe('3');
      expect(restInput.value).toBe('5');
      expect(failureInput.value).toBe('2');
    });

    it('应该在恢复默认后启用保存按钮', () => {
      const customConfig: TimerConfig = {
        ...mockConfig,
        focusDuration: 50
      };

      mockUseTimer.mockReturnValue({
        config: customConfig,
        updateConfig: mockUpdateConfig
      });

      render(<SettingsPanel />);

      const restoreButton = screen.getByText('恢复默认');
      fireEvent.click(restoreButton);

      const saveButton = screen.getByText('保存设置');
      expect(saveButton).not.toBeDisabled();
    });
  });

  describe('输入处理', () => {
    it('应该正确处理数字输入', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）') as HTMLInputElement;
      
      fireEvent.change(focusInput, { target: { value: '35' } });
      expect(focusInput.value).toBe('35');
    });

    it('应该处理空输入', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）') as HTMLInputElement;
      
      fireEvent.change(focusInput, { target: { value: '' } });
      expect(focusInput.value).toBe('0');
    });

    it('应该将非数字输入转换为0', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）') as HTMLInputElement;
      
      fireEvent.change(focusInput, { target: { value: 'abc' } });
      expect(focusInput.value).toBe('0');
    });
  });

  describe('错误显示', () => {
    it('应该为错误字段添加错误样式', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '0' } });

      expect(focusInput).toHaveClass('settings-panel__input--error');
    });

    it('应该显示字段特定的错误消息', () => {
      render(<SettingsPanel />);

      const focusInput = screen.getByLabelText('专注时长（分钟）');
      fireEvent.change(focusInput, { target: { value: '150' } });

      expect(screen.getByText('专注时长不能超过120分钟')).toBeInTheDocument();
    });
  });
});