import React, { useState, useEffect, useMemo } from 'react';
import { StatisticsService, type TimePeriod, type ExtendedStatistics, type DailyStatistics } from '../services/StatisticsService';
import './StatisticsView.css';
import { t } from '../i18n';

/**
 * 时间段选项
 */
// TIME_PERIOD_OPTIONS 将在组件内部定义以使用 t 函数

/**
 * 格式化时间（毫秒转为可读格式）
 */
const formatDuration = (milliseconds: number): string => {
  const totalMinutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours > 0) {
    return `${hours}${t('common.hours')}${minutes}${t('common.minutes')}`;
  }
  return `${minutes}${t('common.minutes')}`;
};

/**
 * 格式化百分比
 */
const formatPercentage = (value: number): string => {
  return `${Math.round(value * 100) / 100}%`;
};

/**
 * 统计卡片组件
 */
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, trend }) => (
  <div className="stat-card">
    <div className="stat-card-header">
      <h3 className="stat-card-title">{title}</h3>
      {trend && (
        <span className={`stat-trend ${trend.isPositive ? 'positive' : 'negative'}`}>
          {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value).toFixed(1)}%
        </span>
      )}
    </div>
    <div className="stat-card-value">{value}</div>
    {subtitle && <div className="stat-card-subtitle">{subtitle}</div>}
  </div>
);

/**
 * 简单条形图组件
 */
interface SimpleBarChartProps {
  data: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  maxValue?: number;
}

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({ data, maxValue }) => {
  const max = maxValue || Math.max(...data.map(d => d.value));
  
  return (
    <div className="simple-bar-chart">
      {data.map((item, index) => (
        <div key={index} className="bar-item">
          <div className="bar-label">{item.label}</div>
          <div className="bar-container">
            <div 
              className="bar-fill"
              style={{ 
                width: max > 0 ? `${(item.value / max) * 100}%` : '0%',
                backgroundColor: item.color || '#4CAF50'
              }}
            />
            <span className="bar-value">{item.value}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * 简单折线图组件
 */
interface SimpleLineChartProps {
  data: Array<{
    label: string;
    value: number;
  }>;
  color?: string;
}

const SimpleLineChart: React.FC<SimpleLineChartProps> = ({ data, color = '#2196F3' }) => {
  if (data.length === 0) {
    return <div className="chart-empty">{t('statistics.noData')}</div>;
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  return (
    <div className="simple-line-chart">
      <div className="chart-container">
        <svg viewBox="0 0 400 200" className="chart-svg">
          {/* 网格线 */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e0e0e0" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* 数据线 */}
          {data.length > 1 && (
            <polyline
              fill="none"
              stroke={color}
              strokeWidth="2"
              points={data.map((point, index) => {
                const x = (index / (data.length - 1)) * 380 + 10;
                const y = 190 - ((point.value - minValue) / range) * 180;
                return `${x},${y}`;
              }).join(' ')}
            />
          )}
          
          {/* 数据点 */}
          {data.map((point, index) => {
            const x = (index / Math.max(data.length - 1, 1)) * 380 + 10;
            const y = 190 - ((point.value - minValue) / range) * 180;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill={color}
              />
            );
          })}
        </svg>
      </div>
      
      {/* X轴标签 */}
      <div className="chart-labels">
        {data.map((point, index) => (
          <span key={index} className="chart-label">
            {point.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * 热力图组件
 */
interface HeatmapProps {
  data: Array<{
    date: string;
    value: number;
    level: number;
  }>;
}

const Heatmap: React.FC<HeatmapProps> = ({ data }) => {
  const getLevelColor = (level: number): string => {
    const colors = ['#ebedf0', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
    return colors[level] || colors[0];
  };

  return (
    <div className="heatmap">
      <div className="heatmap-grid">
        {data.map((day, index) => (
          <div
            key={index}
            className="heatmap-cell"
            style={{ backgroundColor: getLevelColor(day.level) }}
            title={`${day.date}: ${formatDuration(day.value)}`}
          />
        ))}
      </div>
      <div className="heatmap-legend">
        <span>{t('statistics.less')}</span>
        {[0, 1, 2, 3, 4].map(level => (
          <div
            key={level}
            className="legend-cell"
            style={{ backgroundColor: getLevelColor(level) }}
          />
        ))}
        <span>{t('statistics.more')}</span>
      </div>
    </div>
  );
};

/**
 * 统计视图组件
 */
export const StatisticsView: React.FC = () => {
  // 在组件内部定义以使用 t 函数
  const TIME_PERIOD_OPTIONS: Array<{ value: TimePeriod; label: string }> = [
    { value: 'today', label: t('statistics.today') },
    { value: 'week', label: t('statistics.week') },
    { value: 'month', label: t('statistics.month') },
    { value: 'year', label: t('statistics.year') },
    { value: 'all', label: t('statistics.all') }
  ];
  
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('week');
  const [statistics, setStatistics] = useState<ExtendedStatistics | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStatistics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载统计数据
  const loadStatistics = async (period: TimePeriod) => {
    try {
      setLoading(true);
      setError(null);
      
      const stats = StatisticsService.calculateExtendedStatistics(period);
      const daily = StatisticsService.getDailyStatistics(period);
      
      setStatistics(stats);
      setDailyStats(daily);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('statistics.loadFailed'));
      console.error('加载统计数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和周期变化时重新加载
  useEffect(() => {
    loadStatistics(selectedPeriod);
  }, [selectedPeriod]);

  // 计算趋势数据
  const trendData = useMemo(() => {
    if (!dailyStats.length) return [];
    
    return dailyStats.map(day => ({
      label: day.date.split('-').slice(1).join('/'), // MM/DD 格式
      value: Math.round(day.focusTime / (1000 * 60)) // 转换为分钟
    }));
  }, [dailyStats]);

  // 计算小时分布数据
  const hourlyData = useMemo(() => {
    if (!statistics) return [];
    
    try {
      const hourlyDist = StatisticsService.getHourlyDistribution(selectedPeriod);
      return hourlyDist
        .filter(hour => hour.sessionCount > 0)
        .map(hour => ({
          label: `${hour.hour}:00`,
          value: hour.sessionCount,
          color: '#FF9800'
        }));
    } catch {
      return [];
    }
  }, [statistics, selectedPeriod]);

  // 计算专注时长分布数据
  const durationDistribution = useMemo(() => {
    if (!statistics) return [];
    
    try {
      const distribution = StatisticsService.getFocusDurationDistribution(selectedPeriod);
      return distribution.map(range => ({
        label: range.range,
        value: range.count,
        color: '#9C27B0'
      }));
    } catch {
      return [];
    }
  }, [statistics, selectedPeriod]);

  // 计算热力图数据
  const heatmapData = useMemo(() => {
    if (!statistics) return [];
    
    try {
      return StatisticsService.getHeatmapData(selectedPeriod);
    } catch {
      return [];
    }
  }, [statistics, selectedPeriod]);

  if (loading) {
    return (
      <div className="statistics-view">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="statistics-view">
        <div className="error">
          <p>{t('statistics.loadError')}: {error}</p>
          <button onClick={() => loadStatistics(selectedPeriod)}>{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="statistics-view">
        <div className="empty">{t('statistics.noStatistics')}</div>
      </div>
    );
  }

  return (
    <div className="statistics-view" data-testid="statistics-view">
      {/* 头部控制区 */}
      <div className="statistics-header">
        <h2>{t('statistics.title')}</h2>
        <div className="period-selector">
          {TIME_PERIOD_OPTIONS.map(option => (
            <button
              key={option.value}
              className={`period-button ${selectedPeriod === option.value ? 'active' : ''}`}
              onClick={() => setSelectedPeriod(option.value)}
              data-testid={`period-${option.value}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div data-testid="statistics-period" style={{ display: 'none' }}>
          {TIME_PERIOD_OPTIONS.find(opt => opt.value === selectedPeriod)?.label}
        </div>
      </div>

      {/* 统计卡片区 */}
      <div className="stats-cards">
        <div data-testid="total-focus-time" style={{ display: 'none' }}>
          {formatDuration(statistics.totalFocusTime)}
        </div>
        <div data-testid="focus-session-count" style={{ display: 'none' }}>
          {statistics.focusSessionCount}
        </div>
        <div data-testid="failed-focus-count" style={{ display: 'none' }}>
          {statistics.failedFocusCount}
        </div>
        <StatCard
          title={t('statistics.totalFocusTime')}
          value={formatDuration(statistics.totalFocusTime)}
          subtitle={t('statistics.average', { value: formatDuration(statistics.averageFocusTime) })}
        />
        <StatCard
          title={t('statistics.focusSessionCount')}
          value={statistics.focusSessionCount}
          subtitle={t('statistics.failedCount', { count: statistics.failedFocusCount.toString() })}
        />
        <StatCard
          title={t('statistics.completionRate')}
          value={formatPercentage(statistics.completionRate)}
          subtitle={t('statistics.focusCompletionRate', { rate: formatPercentage(statistics.focusCompletionRate) })}
        />
        <StatCard
          title={t('statistics.totalSessions')}
          value={statistics.totalSessions}
          subtitle={t('statistics.dailyAverage', { value: (Math.round((statistics.dailyAverages?.sessions || 0) * 100) / 100).toString() })}
        />
      </div>

      {/* 图表区域 */}
      <div className="charts-section">
        {/* 趋势图 */}
        <div className="chart-container">
          <h3>{t('statistics.focusTrend')}</h3>
          {loading ? (
            <div className="chart-loading">{t('common.loading')}</div>
          ) : trendData.length > 0 ? (
            <SimpleLineChart data={trendData} color="#4CAF50" />
          ) : (
            <div className="chart-empty">{t('statistics.noTrendData')}</div>
          )}
        </div>

        {/* 时间分布 */}
        <div className="chart-container">
          <h3>{t('statistics.timeDistribution')}</h3>
          {loading ? (
            <div className="chart-loading">{t('common.loading')}</div>
          ) : hourlyData.length > 0 ? (
            <SimpleBarChart data={hourlyData} />
          ) : (
            <div className="chart-empty">{t('statistics.noTimeData')}</div>
          )}
        </div>

        {/* 专注时长分布 */}
        <div className="chart-container">
          <h3>{t('statistics.durationDistribution')}</h3>
          {loading ? (
            <div className="chart-loading">{t('common.loading')}</div>
          ) : durationDistribution.length > 0 ? (
            <SimpleBarChart data={durationDistribution} />
          ) : (
            <div className="chart-empty">{t('statistics.noDurationData')}</div>
          )}
        </div>

        {/* 活动热力图 */}
        {selectedPeriod !== 'today' && (
          <div className="chart-container">
            <h3>{t('statistics.activityHeatmap')}</h3>
            {loading ? (
              <div className="chart-loading">{t('common.loading')}</div>
            ) : heatmapData.length > 0 ? (
              <Heatmap data={heatmapData} />
            ) : (
              <div className="chart-empty">{t('statistics.noActivityData')}</div>
            )}
          </div>
        )}
      </div>

      {/* 详细统计 */}
      <div className="detailed-stats">
        <h3>{t('statistics.detailedStats')}</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">{t('statistics.totalReflectionTime')}:</span>
            <span className="stat-value">{formatDuration(statistics.totalReflectionTime)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t('statistics.totalRestTime')}:</span>
            <span className="stat-value">{formatDuration(statistics.totalRestTime)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t('statistics.averageSessionDuration')}:</span>
            <span className="stat-value">{formatDuration(statistics.averageSessionDuration)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t('statistics.longestSession')}:</span>
            <span className="stat-value">{formatDuration(statistics.longestSession)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t('statistics.shortestSession')}:</span>
            <span className="stat-value">{formatDuration(statistics.shortestSession)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">{t('statistics.longestFocusStreak')}:</span>
            <span className="stat-value">{t('statistics.streakCount', { count: statistics.longestFocusStreak.toString() })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};