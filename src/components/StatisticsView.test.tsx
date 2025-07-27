import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StatisticsView } from './StatisticsView';
import { StatisticsService } from '../services/StatisticsService';
import type { ExtendedStatistics, DailyStatistics } from '../services/StatisticsService';

// Mock StatisticsService
vi.mock('../services/StatisticsService');

describe('StatisticsView', () => {
  const mockExtendedStats: ExtendedStatistics = {
    totalFocusTime: 150 * 60 * 1000, // 150分钟
    totalReflectionTime: 15 * 60 * 1000, // 15分钟
    totalRestTime: 30 * 60 * 1000, // 30分钟
    focusSessionCount: 6,
    failedFocusCount: 2,
    averageFocusTime: 25 * 60 * 1000, // 25分钟
    longestFocusStreak: 3,
    totalSessions: 10,
    completionRate: 80,
    averageSessionDuration: 20 * 60 * 1000, // 20分钟
    longestSession: 45 * 60 * 1000, // 45分钟
    shortestSession: 5 * 60 * 1000, // 5分钟
    focusCompletionRate: 75,
    averageReflectionTime: 3 * 60 * 1000, // 3分钟
    averageRestTime: 5 * 60 * 1000, // 5分钟
    dailyAverages: {
      focusTime: 30 * 60 * 1000, // 30分钟
      sessions: 2
    },
    periodStart: Date.now() - 7 * 24 * 60 * 60 * 1000,
    periodEnd: Date.now(),
    periodType: 'week'
  };

  const mockDailyStats: DailyStatistics[] = [
    {
      date: '2024-01-15',
      timestamp: new Date('2024-01-15').getTime(),
      focusTime: 50 * 60 * 1000,
      reflectionTime: 5 * 60 * 1000,
      restTime: 10 * 60 * 1000,
      focusSessionCount: 2,
      failedFocusCount: 0,
      completionRate: 100
    },
    {
      date: '2024-01-16',
      timestamp: new Date('2024-01-16').getTime(),
      focusTime: 75 * 60 * 1000,
      reflectionTime: 8 * 60 * 1000,
      restTime: 15 * 60 * 1000,
      focusSessionCount: 3,
      failedFocusCount: 1,
      completionRate: 75
    },
    {
      date: '2024-01-17',
      timestamp: new Date('2024-01-17').getTime(),
      focusTime: 25 * 60 * 1000,
      reflectionTime: 2 * 60 * 1000,
      restTime: 5 * 60 * 1000,
      focusSessionCount: 1,
      failedFocusCount: 1,
      completionRate: 50
    }
  ];

  const mockHourlyData = [
    { hour: 9, focusTime: 25 * 60 * 1000, sessionCount: 1 },
    { hour: 10, focusTime: 50 * 60 * 1000, sessionCount: 2 },
    { hour: 14, focusTime: 75 * 60 * 1000, sessionCount: 3 }
  ];

  const mockDurationDistribution = [
    { range: '0-10分钟', count: 1, percentage: 16.67 },
    { range: '10-20分钟', count: 2, percentage: 33.33 },
    { range: '20-30分钟', count: 3, percentage: 50 }
  ];

  const mockHeatmapData = [
    { date: '2024-01-15', value: 50 * 60 * 1000, level: 2 },
    { date: '2024-01-16', value: 75 * 60 * 1000, level: 3 },
    { date: '2024-01-17', value: 25 * 60 * 1000, level: 1 }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 设置默认的 mock 返回值
    vi.mocked(StatisticsService.calculateExtendedStatistics).mockReturnValue(mockExtendedStats);
    vi.mocked(StatisticsService.getDailyStatistics).mockReturnValue(mockDailyStats);
    vi.mocked(StatisticsService.getHourlyDistribution).mockReturnValue(mockHourlyData);
    vi.mocked(StatisticsService.getFocusDurationDistribution).mockReturnValue(mockDurationDistribution);
    vi.mocked(StatisticsService.getHeatmapData).mockReturnValue(mockHeatmapData);
  });

  describe('基本渲染', () => {
    it('应该正确渲染统计视图', async () => {
      render(<StatisticsView />);
      
      // 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查标题
      expect(screen.getByText('统计数据')).toBeInTheDocument();
      
      // 检查时间段选择器
      expect(screen.getByText('今日')).toBeInTheDocument();
      expect(screen.getByText('本周')).toBeInTheDocument();
      expect(screen.getByText('本月')).toBeInTheDocument();
      expect(screen.getByText('本年')).toBeInTheDocument();
      expect(screen.getByText('全部')).toBeInTheDocument();
    });

    it('应该显示统计卡片', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查统计卡片
      expect(screen.getByText('专注时间')).toBeInTheDocument();
      expect(screen.getByText('专注次数')).toBeInTheDocument();
      expect(screen.getByText('完成率')).toBeInTheDocument();
      expect(screen.getByText('总会话数')).toBeInTheDocument();
      
      // 检查统计值
      expect(screen.getByText('2小时30分钟')).toBeInTheDocument(); // 150分钟
      expect(screen.getByText('6')).toBeInTheDocument(); // 专注次数
      expect(screen.getByText('80%')).toBeInTheDocument(); // 完成率
      expect(screen.getByText('10')).toBeInTheDocument(); // 总会话数
    });

    it('应该显示图表区域', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查图表标题
      expect(screen.getByText('专注时间趋势')).toBeInTheDocument();
      expect(screen.getByText('时间分布')).toBeInTheDocument();
      expect(screen.getByText('专注时长分布')).toBeInTheDocument();
      expect(screen.getByText('活动热力图')).toBeInTheDocument();
    });

    it('应该显示详细统计', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查详细统计
      expect(screen.getByText('详细统计')).toBeInTheDocument();
      expect(screen.getByText('反思时间:')).toBeInTheDocument();
      expect(screen.getByText('休息时间:')).toBeInTheDocument();
      expect(screen.getByText('平均会话时长:')).toBeInTheDocument();
      expect(screen.getByText('最长会话:')).toBeInTheDocument();
      expect(screen.getByText('最短会话:')).toBeInTheDocument();
      expect(screen.getByText('最长连续专注:')).toBeInTheDocument();
    });
  });

  describe('时间段切换', () => {
    it('应该能够切换时间段', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 默认选中本周
      const weekButton = screen.getByText('本周');
      expect(weekButton).toHaveClass('active');
      
      // 点击今日
      const todayButton = screen.getByText('今日');
      fireEvent.click(todayButton);
      
      // 验证调用了正确的服务方法
      await waitFor(() => {
        expect(StatisticsService.calculateExtendedStatistics).toHaveBeenCalledWith('today');
        expect(StatisticsService.getDailyStatistics).toHaveBeenCalledWith('today');
      });
      
      // 验证按钮状态
      expect(todayButton).toHaveClass('active');
      expect(weekButton).not.toHaveClass('active');
    });

    it('应该在切换时间段时重新加载数据', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 清除之前的调用记录
      vi.clearAllMocks();
      
      // 点击本月
      fireEvent.click(screen.getByText('本月'));
      
      // 验证重新调用了服务方法
      await waitFor(() => {
        expect(StatisticsService.calculateExtendedStatistics).toHaveBeenCalledWith('month');
        expect(StatisticsService.getDailyStatistics).toHaveBeenCalledWith('month');
      });
    });
  });

  describe('加载状态', () => {
    it('应该在加载完成后显示统计数据', async () => {
      render(<StatisticsView />);
      
      // 等待加载完成
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 应该显示统计数据
      expect(screen.getByText('统计数据')).toBeInTheDocument();
    });
  });

  describe('错误处理', () => {
    it('应该显示错误信息', async () => {
      const errorMessage = '加载统计数据失败';
      vi.mocked(StatisticsService.calculateExtendedStatistics).mockImplementation(() => {
        throw new Error(errorMessage);
      });
      
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.getByText(`加载失败: ${errorMessage}`)).toBeInTheDocument();
        expect(screen.getByText('重试')).toBeInTheDocument();
      });
    });

    it('应该能够重试加载', async () => {
      // 第一次调用失败
      vi.mocked(StatisticsService.calculateExtendedStatistics)
        .mockImplementationOnce(() => {
          throw new Error('网络错误');
        })
        .mockReturnValue(mockExtendedStats);
      
      render(<StatisticsView />);
      
      // 等待错误显示
      await waitFor(() => {
        expect(screen.getByText('加载失败: 网络错误')).toBeInTheDocument();
      });
      
      // 点击重试
      fireEvent.click(screen.getByText('重试'));
      
      // 等待重试成功
      await waitFor(() => {
        expect(screen.queryByText('加载失败: 网络错误')).not.toBeInTheDocument();
        expect(screen.getByText('统计数据')).toBeInTheDocument();
      });
    });
  });

  describe('空数据处理', () => {
    it('应该处理空统计数据', async () => {
      vi.mocked(StatisticsService.calculateExtendedStatistics).mockReturnValue(null as any);
      
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.getByText('暂无统计数据')).toBeInTheDocument();
      });
    });

    it('应该处理空图表数据', async () => {
      vi.mocked(StatisticsService.getDailyStatistics).mockReturnValue([]);
      vi.mocked(StatisticsService.getHourlyDistribution).mockReturnValue([]);
      vi.mocked(StatisticsService.getFocusDurationDistribution).mockReturnValue([]);
      vi.mocked(StatisticsService.getHeatmapData).mockReturnValue([]);
      
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 图表区域应该不显示或显示空状态
      expect(screen.queryByText('专注时间趋势')).not.toBeInTheDocument();
      expect(screen.queryByText('时间分布')).not.toBeInTheDocument();
      expect(screen.queryByText('专注时长分布')).not.toBeInTheDocument();
      expect(screen.queryByText('活动热力图')).not.toBeInTheDocument();
    });
  });

  describe('数据格式化', () => {
    it('应该正确格式化时间', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查时间格式化
      expect(screen.getByText('2小时30分钟')).toBeInTheDocument(); // 150分钟
      expect(screen.getByText('15分钟')).toBeInTheDocument(); // 反思时间
      expect(screen.getByText('30分钟')).toBeInTheDocument(); // 休息时间
    });

    it('应该正确格式化百分比', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查百分比格式化
      expect(screen.getByText('80%')).toBeInTheDocument(); // 完成率
      expect(screen.getByText('专注完成率 75%')).toBeInTheDocument(); // 专注完成率
    });
  });

  describe('图表组件', () => {
    it('应该渲染条形图', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查条形图元素
      const barCharts = document.querySelectorAll('.simple-bar-chart');
      expect(barCharts.length).toBeGreaterThan(0);
      
      // 检查条形图项目
      const barItems = document.querySelectorAll('.bar-item');
      expect(barItems.length).toBeGreaterThan(0);
    });

    it('应该渲染折线图', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查折线图元素
      const lineChart = document.querySelector('.simple-line-chart');
      expect(lineChart).toBeInTheDocument();
      
      // 检查SVG元素
      const svg = document.querySelector('.chart-svg');
      expect(svg).toBeInTheDocument();
    });

    it('应该渲染热力图', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查热力图元素
      const heatmap = document.querySelector('.heatmap');
      expect(heatmap).toBeInTheDocument();
      
      // 检查热力图网格
      const heatmapGrid = document.querySelector('.heatmap-grid');
      expect(heatmapGrid).toBeInTheDocument();
      
      // 检查热力图单元格
      const heatmapCells = document.querySelectorAll('.heatmap-cell');
      expect(heatmapCells.length).toBe(mockHeatmapData.length);
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
      
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查响应式类名和布局
      const statisticsView = document.querySelector('.statistics-view');
      expect(statisticsView).toBeInTheDocument();
    });
  });

  describe('性能优化', () => {
    it('应该使用 useMemo 优化计算', async () => {
      const { rerender } = render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 记录初始调用次数
      const initialCallCount = vi.mocked(StatisticsService.getHourlyDistribution).mock.calls.length;
      
      // 重新渲染但不改变props
      rerender(<StatisticsView />);
      
      // 验证没有额外的服务调用（由于useMemo）
      expect(vi.mocked(StatisticsService.getHourlyDistribution).mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('用户交互', () => {
    it('应该支持热力图单元格的悬停', async () => {
      render(<StatisticsView />);
      
      await waitFor(() => {
        expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
      });
      
      // 检查热力图单元格的title属性
      const heatmapCells = document.querySelectorAll('.heatmap-cell');
      if (heatmapCells.length > 0) {
        const firstCell = heatmapCells[0] as HTMLElement;
        expect(firstCell.title).toContain('2024-01-15');
        expect(firstCell.title).toContain('50分钟');
      }
    });
  });
});