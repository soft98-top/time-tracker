import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryView } from './HistoryView';
import { HistoryService } from '../services/HistoryService';
import { TimerState, type SessionRecord } from '../types';

// Mock HistoryService
vi.mock('../services/HistoryService');

describe('HistoryView', () => {
  const mockRecords: SessionRecord[] = [
    {
      id: '1',
      type: TimerState.FOCUS,
      startTime: new Date('2024-01-15T09:00:00').getTime(),
      endTime: new Date('2024-01-15T09:25:00').getTime(),
      duration: 25 * 60 * 1000,
      isCompleted: true,
      isFailed: false,
      metadata: {
        targetDuration: 25 * 60 * 1000,
        wasInterrupted: false
      }
    },
    {
      id: '2',
      type: TimerState.REFLECTION,
      startTime: new Date('2024-01-15T09:25:00').getTime(),
      endTime: new Date('2024-01-15T09:28:00').getTime(),
      duration: 3 * 60 * 1000,
      isCompleted: true
    },
    {
      id: '3',
      type: TimerState.REST,
      startTime: new Date('2024-01-15T09:28:00').getTime(),
      endTime: new Date('2024-01-15T09:33:00').getTime(),
      duration: 5 * 60 * 1000,
      isCompleted: true
    },
    {
      id: '4',
      type: TimerState.FOCUS,
      startTime: new Date('2024-01-15T10:00:00').getTime(),
      endTime: new Date('2024-01-15T10:05:00').getTime(),
      duration: 5 * 60 * 1000,
      isCompleted: false,
      isFailed: true,
      metadata: {
        targetDuration: 25 * 60 * 1000,
        wasInterrupted: true
      }
    },
    {
      id: '5',
      type: TimerState.FOCUS,
      startTime: new Date('2024-01-16T14:00:00').getTime(),
      endTime: new Date('2024-01-16T14:30:00').getTime(),
      duration: 30 * 60 * 1000,
      isCompleted: true,
      isFailed: false
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 设置默认的 mock 返回值
    vi.mocked(HistoryService.getAllRecords).mockReturnValue(mockRecords);
    vi.mocked(HistoryService.getTodayRecords).mockReturnValue(mockRecords.slice(0, 4));
    vi.mocked(HistoryService.getWeekRecords).mockReturnValue(mockRecords);
    vi.mocked(HistoryService.getMonthRecords).mockReturnValue(mockRecords);
  });

  describe('基本渲染', () => {
    it('应该正确渲染历史记录视图', async () => {
      render(<HistoryView />);
      
      // 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查标题
      expect(screen.getByText('历史记录')).toBeInTheDocument();
      
      // 检查统计摘要
      expect(screen.getByText(/共 \d+ 条记录/)).toBeInTheDocument();
      expect(screen.getByText(/专注 \d+ 次/)).toBeInTheDocument();
      expect(screen.getByText(/失败 \d+ 次/)).toBeInTheDocument();
      expect(screen.getByText(/反思 \d+ 次/)).toBeInTheDocument();
      expect(screen.getByText(/休息 \d+ 次/)).toBeInTheDocument();
    });

    it('应该显示搜索框和筛选器', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查搜索框
      expect(screen.getByPlaceholderText('搜索记录...')).toBeInTheDocument();
      
      // 检查筛选器
      expect(screen.getByDisplayValue('全部时间')).toBeInTheDocument();
      expect(screen.getByDisplayValue('全部类型')).toBeInTheDocument();
      expect(screen.getByDisplayValue('最新优先')).toBeInTheDocument();
    });

    it('应该显示历史记录项', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查记录项
      expect(screen.getByText('专注')).toBeInTheDocument();
      expect(screen.getByText('反思')).toBeInTheDocument();
      expect(screen.getByText('休息')).toBeInTheDocument();
      expect(screen.getByText('专注失败')).toBeInTheDocument();
      
      // 检查时长显示
      expect(screen.getByText('25分钟')).toBeInTheDocument();
      expect(screen.getByText('3分钟')).toBeInTheDocument();
      expect(screen.getAllByText('5分钟')).toHaveLength(2); // 有两个5分钟的记录
      expect(screen.getByText('30分钟')).toBeInTheDocument();
    });
  });

  describe('筛选功能', () => {
    it('应该能够按时间段筛选', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 切换到今日筛选
      const timePeriodSelect = screen.getByDisplayValue('全部时间');
      fireEvent.change(timePeriodSelect, { target: { value: 'today' } });
      
      // 验证调用了正确的服务方法
      await waitFor(() => {
        expect(HistoryService.getTodayRecords).toHaveBeenCalled();
      });
    });

    it('应该能够按类型筛选', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 筛选专注记录
      const typeSelect = screen.getByDisplayValue('全部类型');
      fireEvent.change(typeSelect, { target: { value: 'focus' } });
      
      // 应该只显示专注相关的记录
      await waitFor(() => {
        expect(screen.getAllByText(/专注/)).toHaveLength(3); // 2个专注记录 + 专注失败
      });
    });

    it('应该能够筛选失败的专注记录', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 筛选失败记录
      const typeSelect = screen.getByDisplayValue('全部类型');
      fireEvent.change(typeSelect, { target: { value: 'failed' } });
      
      // 应该只显示失败的记录
      await waitFor(() => {
        expect(screen.getAllByText('专注失败')).toHaveLength(2); // 1个记录 + 1个选项
        // 反思和休息应该只在选项中出现，不在记录中
        const reflectionInList = document.querySelector('.history-list .state-label');
        expect(reflectionInList).not.toHaveTextContent('反思');
      });
    });

    it('应该能够搜索记录', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 搜索专注记录
      const searchInput = screen.getByPlaceholderText('搜索记录...');
      fireEvent.change(searchInput, { target: { value: '专注' } });
      
      // 应该显示包含"专注"的记录
      await waitFor(() => {
        expect(screen.getAllByText(/专注/)).toHaveLength(5); // 2个专注记录 + 专注失败记录 + 2个选项
        // 反思和休息应该只在选项中出现，不在记录中
        const historyList = document.querySelector('.history-list');
        expect(historyList).not.toHaveTextContent('反思');
        expect(historyList).not.toHaveTextContent('休息');
      });
    });
  });

  describe('排序功能', () => {
    it('应该能够按时长排序', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 按时长降序排序
      const sortSelect = screen.getByDisplayValue('最新优先');
      fireEvent.change(sortSelect, { target: { value: 'duration-desc' } });
      
      // 验证排序效果（最长的30分钟应该在前面）
      const historyItems = screen.getAllByText(/\d+分钟/);
      expect(historyItems[0]).toHaveTextContent('30分钟');
    });

    it('应该能够按时间排序', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 按最旧优先排序
      const sortSelect = screen.getByDisplayValue('最新优先');
      fireEvent.change(sortSelect, { target: { value: 'oldest' } });
      
      // 验证排序效果
      await waitFor(() => {
        // 最旧的记录应该在前面
        const historyItems = document.querySelectorAll('.history-item');
        expect(historyItems.length).toBeGreaterThan(0);
      });
    });
  });

  describe('分页功能', () => {
    it('应该显示分页控件', async () => {
      // 创建足够多的记录以触发分页
      const manyRecords = Array.from({ length: 25 }, (_, index) => ({
        ...mockRecords[0],
        id: `record-${index}`,
        startTime: Date.now() - index * 60000
      }));
      
      vi.mocked(HistoryService.getAllRecords).mockReturnValue(manyRecords);
      
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查分页控件
      expect(screen.getByText('上一页')).toBeInTheDocument();
      expect(screen.getByText('下一页')).toBeInTheDocument();
      expect(screen.getByText(/第 \d+ 页，共 \d+ 页/)).toBeInTheDocument();
    });

    it('应该能够翻页', async () => {
      const manyRecords = Array.from({ length: 25 }, (_, index) => ({
        ...mockRecords[0],
        id: `record-${index}`,
        startTime: Date.now() - index * 60000
      }));
      
      vi.mocked(HistoryService.getAllRecords).mockReturnValue(manyRecords);
      
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 点击下一页
      const nextButton = screen.getByText('下一页');
      fireEvent.click(nextButton);
      
      // 验证页码变化
      await waitFor(() => {
        expect(screen.getByText(/第 2 页/)).toBeInTheDocument();
      });
    });
  });

  describe('记录详情', () => {
    it('应该能够点击记录查看详情', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 点击第一个记录（30分钟的专注记录）
      const firstRecord = screen.getByText('30分钟').closest('.history-item');
      expect(firstRecord).toBeInTheDocument();
      fireEvent.click(firstRecord!);
      
      // 应该显示详情弹窗
      await waitFor(() => {
        expect(screen.getByText('🎯 专注详情')).toBeInTheDocument();
        expect(screen.getByText('开始时间:')).toBeInTheDocument();
        expect(screen.getByText('结束时间:')).toBeInTheDocument();
        expect(screen.getByText('持续时间:')).toBeInTheDocument();
        expect(screen.getByText('完成状态:')).toBeInTheDocument();
      });
    });

    it('应该能够关闭详情弹窗', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 打开详情
      const firstRecord = screen.getByText('30分钟').closest('.history-item');
      fireEvent.click(firstRecord!);
      
      await waitFor(() => {
        expect(screen.getByText('🎯 专注详情')).toBeInTheDocument();
      });
      
      // 点击关闭按钮
      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);
      
      // 详情弹窗应该消失
      await waitFor(() => {
        expect(screen.queryByText('🎯 专注详情')).not.toBeInTheDocument();
      });
    });

    it('应该显示专注失败记录的详细信息', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 点击失败的专注记录
      const failedRecords = screen.getAllByText('专注失败');
      const failedRecord = failedRecords.find(el => el.closest('.history-item'))?.closest('.history-item');
      expect(failedRecord).toBeInTheDocument();
      fireEvent.click(failedRecord!);
      
      // 应该显示失败相关的详情
      await waitFor(() => {
        expect(screen.getByText('❌ 专注失败详情')).toBeInTheDocument();
        expect(screen.getByText('专注结果:')).toBeInTheDocument();
        expect(screen.getByText('失败')).toBeInTheDocument();
        expect(screen.getByText('中断状态:')).toBeInTheDocument();
      });
    });
  });

  describe('空状态处理', () => {
    it('应该处理空记录列表', async () => {
      vi.mocked(HistoryService.getAllRecords).mockReturnValue([]);
      
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 应该显示空状态
      expect(screen.getByText('没有找到匹配的记录')).toBeInTheDocument();
    });

    it('应该在筛选后无结果时显示清除筛选按钮', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 搜索不存在的内容
      const searchInput = screen.getByPlaceholderText('搜索记录...');
      fireEvent.change(searchInput, { target: { value: '不存在的内容' } });
      
      // 应该显示清除筛选按钮
      await waitFor(() => {
        expect(screen.getByText('没有找到匹配的记录')).toBeInTheDocument();
        expect(screen.getByText('清除筛选条件')).toBeInTheDocument();
      });
    });

    it('应该能够清除筛选条件', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 设置筛选条件
      const searchInput = screen.getByPlaceholderText('搜索记录...');
      fireEvent.change(searchInput, { target: { value: '不存在' } });
      
      const typeSelect = screen.getByDisplayValue('全部类型');
      fireEvent.change(typeSelect, { target: { value: 'focus' } });
      
      // 点击清除筛选条件
      await waitFor(() => {
        expect(screen.getByText('清除筛选条件')).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByText('清除筛选条件'));
      
      // 筛选条件应该被重置
      await waitFor(() => {
        expect(searchInput).toHaveValue('');
        expect(screen.getByDisplayValue('全部类型')).toBeInTheDocument();
        expect(screen.getByDisplayValue('全部时间')).toBeInTheDocument();
      });
    });
  });

  describe('加载状态', () => {
    it('应该在加载完成后显示历史记录', async () => {
      render(<HistoryView />);
      
      // 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 应该显示历史记录
      expect(screen.getByText('历史记录')).toBeInTheDocument();
    });
  });

  describe('错误处理', () => {
    it('应该显示错误信息', async () => {
      const errorMessage = '加载历史记录失败';
      vi.mocked(HistoryService.getAllRecords).mockImplementation(() => {
        throw new Error(errorMessage);
      });
      
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.getByText(`加载失败: ${errorMessage}`)).toBeInTheDocument();
        expect(screen.getByText('重试')).toBeInTheDocument();
      });
    });

    it('应该能够重试加载', async () => {
      // 第一次调用失败
      vi.mocked(HistoryService.getAllRecords)
        .mockImplementationOnce(() => {
          throw new Error('网络错误');
        })
        .mockReturnValue(mockRecords);
      
      render(<HistoryView />);
      
      // 等待错误显示
      await waitFor(() => {
        expect(screen.getByText('加载失败: 网络错误')).toBeInTheDocument();
      });
      
      // 点击重试
      fireEvent.click(screen.getByText('重试'));
      
      // 等待重试成功
      await waitFor(() => {
        expect(screen.queryByText('加载失败: 网络错误')).not.toBeInTheDocument();
        expect(screen.getByText('历史记录')).toBeInTheDocument();
      });
    });
  });

  describe('数据格式化', () => {
    it('应该正确格式化时间', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查时间格式化
      expect(screen.getByText('25分钟')).toBeInTheDocument();
      expect(screen.getByText('3分钟')).toBeInTheDocument();
      expect(screen.getAllByText('5分钟')).toHaveLength(2); // 有两个5分钟的记录
      expect(screen.getByText('30分钟')).toBeInTheDocument();
    });

    it('应该正确显示状态信息', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查状态显示
      expect(screen.getAllByText('专注')).toHaveLength(3); // 2个专注记录 + 1个选项
      expect(screen.getAllByText('专注失败')).toHaveLength(2); // 1个记录 + 1个选项
      expect(screen.getAllByText('反思')).toHaveLength(2); // 1个记录 + 1个选项
      expect(screen.getAllByText('休息')).toHaveLength(2); // 1个记录 + 1个选项
    });

    it('应该正确显示完成状态', async () => {
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查完成状态
      expect(screen.getAllByText('✓ 已完成')).toHaveLength(4);
      expect(screen.getByText('○ 未完成')).toBeInTheDocument();
    });
  });

  describe('响应式行为', () => {
    it('应该在移动设备上正确显示', async () => {
      // 模拟移动设备视口
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 480,
      });
      
      render(<HistoryView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查响应式布局
      const historyView = document.querySelector('.history-view');
      expect(historyView).toBeInTheDocument();
    });
  });
});