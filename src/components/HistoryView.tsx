import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { HistoryService } from '../services/HistoryService';
import { TimerState, type SessionRecord } from '../types';
import './HistoryView.css';
import { t } from '../i18n';

/**
 * 筛选选项
 */
type FilterType = 'all' | 'focus' | 'reflection' | 'rest' | 'failed';

/**
 * 排序选项
 */
type SortType = 'newest' | 'oldest' | 'duration-desc' | 'duration-asc';

/**
 * 时间段筛选选项
 */
type TimePeriodFilter = 'all' | 'today' | 'week' | 'month';

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
 * 格式化日期时间
 */
const formatDateTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  
  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  const timeStr = date.toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  if (isToday) {
    return t('history.today', { time: timeStr });
  } else if (isYesterday) {
    return t('history.yesterday', { time: timeStr });
  } else {
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};

/**
 * 获取状态显示信息
 */
const getStateInfo = (record: SessionRecord): { 
  label: string; 
  color: string; 
  icon: string;
} => {
  switch (record.type) {
    case TimerState.FOCUS:
      if (record.isFailed) {
        return { label: `${t('states.focus')}${t('history.failed')}`, color: '#F44336', icon: '❌' };
      }
      return { label: t('states.focus'), color: '#4CAF50', icon: '🎯' };
    case TimerState.REFLECTION:
      return { label: t('states.reflection'), color: '#2196F3', icon: '💭' };
    case TimerState.REST:
      return { label: t('states.rest'), color: '#FF9800', icon: '☕' };
    default:
      return { label: t('history.unknown'), color: '#9E9E9E', icon: '❓' };
  }
};

/**
 * 历史记录项组件
 */
interface HistoryItemProps {
  record: SessionRecord;
  onSelect: (record: SessionRecord) => void;
  isSelected: boolean;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ record, onSelect, isSelected }) => {
  const stateInfo = getStateInfo(record);
  
  return (
    <div 
      className={`history-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(record)}
    >
      <div className="history-item-header">
        <div className="state-info">
          <span className="state-icon">{stateInfo.icon}</span>
          <span 
            className="state-label"
            style={{ color: stateInfo.color }}
          >
            {stateInfo.label}
          </span>
        </div>
        <div className="duration">
          {formatDuration(record.duration)}
        </div>
      </div>
      
      <div className="history-item-details">
        <div className="time-info">
          <span className="start-time">
            {formatDateTime(record.startTime)}
          </span>
          <span className="separator">-</span>
          <span className="end-time">
            {formatDateTime(record.endTime)}
          </span>
        </div>
        
        {record.metadata && (
          <div className="metadata">
            {record.metadata.targetDuration && (
              <span className="target-duration">
                {t('history.target')}: {formatDuration(record.metadata.targetDuration)}
              </span>
            )}
            {record.metadata.wasInterrupted && (
              <span className="interrupted">{t('history.wasInterrupted')}</span>
            )}
          </div>
        )}
      </div>
      
      <div className="completion-status">
        {record.isCompleted ? (
          <span className="completed">✓ {t('history.completed')}</span>
        ) : (
          <span className="incomplete">○ {t('history.interrupted')}</span>
        )}
        {record.reflectionSummary && record.reflectionSummary.content.trim() && (
          <span className="has-reflection" title={t('history.hasReflection')}>
            📝
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * 记录详情组件
 */
interface RecordDetailsProps {
  record: SessionRecord;
  onClose: () => void;
}

const RecordDetails: React.FC<RecordDetailsProps> = ({ record, onClose }) => {
  const stateInfo = getStateInfo(record);
  
  return (
    <div className="record-details-overlay" onClick={onClose}>
      <div className="record-details" onClick={(e) => e.stopPropagation()}>
        <div className="details-header">
          <h3>
            {stateInfo.icon} {t('history.details', { type: stateInfo.label })}
          </h3>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="details-content">
          <div className="detail-item">
            <label>{t('history.startTime')}:</label>
            <span>{new Date(record.startTime).toLocaleString('zh-CN')}</span>
          </div>
          
          <div className="detail-item">
            <label>{t('history.endTime')}:</label>
            <span>{new Date(record.endTime).toLocaleString('zh-CN')}</span>
          </div>
          
          <div className="detail-item">
            <label>{t('history.duration')}:</label>
            <span>{formatDuration(record.duration)}</span>
          </div>
          
          <div className="detail-item">
            <label>{t('history.completionStatus')}:</label>
            <span className={record.isCompleted ? 'completed' : 'incomplete'}>
              {record.isCompleted ? t('history.completed') : t('history.incomplete')}
            </span>
          </div>
          
          {record.type === TimerState.FOCUS && (
            <div className="detail-item">
              <label>{t('history.focusResult')}:</label>
              <span className={record.isFailed ? 'failed' : 'success'}>
                {record.isFailed ? t('history.failed') : t('history.success')}
              </span>
            </div>
          )}
          
          {record.metadata && (
            <>
              {record.metadata.targetDuration && (
                <div className="detail-item">
                  <label>{t('history.targetDuration')}:</label>
                  <span>{formatDuration(record.metadata.targetDuration)}</span>
                </div>
              )}
              
              {record.metadata.wasInterrupted && (
                <div className="detail-item">
                  <label>{t('history.interruptedStatus')}:</label>
                  <span className="interrupted">{t('history.yes')}</span>
                </div>
              )}
            </>
          )}
          
          <div className="detail-item">
            <label>{t('history.recordId')}:</label>
            <span className="record-id">{record.id}</span>
          </div>
          
          {record.reflectionSummary && (
            <div className="detail-item reflection-summary-section">
              <label>{t('history.reflectionSummary')}:</label>
              <div className="reflection-summary-content">
                <div className="reflection-summary-meta">
                  <span className="created-time">
                    {t('history.createdAt')}: {new Date(record.reflectionSummary.createdAt).toLocaleString()}
                  </span>
                  {record.reflectionSummary.updatedAt !== record.reflectionSummary.createdAt && (
                    <span className="updated-time">
                      {t('history.updatedAt')}: {new Date(record.reflectionSummary.updatedAt).toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="reflection-summary-text">
                  {record.reflectionSummary.content.trim() ? (
                    <ReactMarkdown>{record.reflectionSummary.content}</ReactMarkdown>
                  ) : (
                    <span className="empty-reflection">{t('history.noContent')}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 历史记录视图组件
 */
export const HistoryView: React.FC = () => {
  const [records, setRecords] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortType, setSortType] = useState<SortType>('newest');
  const [timePeriodFilter, setTimePeriodFilter] = useState<TimePeriodFilter>('all');
  const [selectedRecord, setSelectedRecord] = useState<SessionRecord | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // 加载历史记录
  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let allRecords: SessionRecord[];
      
      switch (timePeriodFilter) {
        case 'today':
          allRecords = HistoryService.getTodayRecords();
          break;
        case 'week':
          allRecords = HistoryService.getWeekRecords();
          break;
        case 'month':
          allRecords = HistoryService.getMonthRecords();
          break;
        default:
          allRecords = HistoryService.getAllRecords();
      }
      
      setRecords(allRecords);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('history.loadFailed'));
      console.error('加载历史记录失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载和筛选条件变化时重新加载
  useEffect(() => {
    loadHistory();
  }, [timePeriodFilter]);

  // 筛选和排序记录
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = records;
    
    // 按类型筛选
    if (filterType !== 'all') {
      if (filterType === 'failed') {
        filtered = filtered.filter(record => 
          record.type === TimerState.FOCUS && record.isFailed
        );
      } else {
        filtered = filtered.filter(record => record.type === filterType);
      }
    }
    
    // 搜索筛选
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record => {
        const stateInfo = getStateInfo(record);
        return (
          stateInfo.label.toLowerCase().includes(term) ||
          formatDateTime(record.startTime).toLowerCase().includes(term) ||
          formatDuration(record.duration).toLowerCase().includes(term)
        );
      });
    }
    
    // 排序
    const sorted = [...filtered].sort((a, b) => {
      switch (sortType) {
        case 'newest':
          return b.startTime - a.startTime;
        case 'oldest':
          return a.startTime - b.startTime;
        case 'duration-desc':
          return b.duration - a.duration;
        case 'duration-asc':
          return a.duration - b.duration;
        default:
          return b.startTime - a.startTime;
      }
    });
    
    return sorted;
  }, [records, filterType, searchTerm, sortType]);

  // 分页
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredAndSortedRecords.slice(startIndex, endIndex);
  }, [filteredAndSortedRecords, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedRecords.length / itemsPerPage);

  // 统计信息
  const stats = useMemo(() => {
    const total = filteredAndSortedRecords.length;
    const focusCount = filteredAndSortedRecords.filter(r => r.type === TimerState.FOCUS && !r.isFailed).length;
    const failedCount = filteredAndSortedRecords.filter(r => r.type === TimerState.FOCUS && r.isFailed).length;
    const reflectionCount = filteredAndSortedRecords.filter(r => r.type === TimerState.REFLECTION).length;
    const restCount = filteredAndSortedRecords.filter(r => r.type === TimerState.REST).length;
    
    return {
      total,
      focusCount,
      failedCount,
      reflectionCount,
      restCount
    };
  }, [filteredAndSortedRecords]);

  if (loading) {
    return (
      <div className="history-view">
        <div className="loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="history-view">
        <div className="error">
          <p>{t('history.loadError')}: {error}</p>
          <button onClick={loadHistory}>{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="history-view">
      {/* 头部 */}
      <div className="history-header">
        <h2>{t('history.title')}</h2>
        <div className="stats-summary">
          <span>{t('history.totalRecords', { count: stats.total.toString() })}</span>
          <span>{t('history.focusCount', { count: stats.focusCount.toString() })}</span>
          <span>{t('history.failedCount', { count: stats.failedCount.toString() })}</span>
          <span>{t('history.reflectionCount', { count: stats.reflectionCount.toString() })}</span>
          <span>{t('history.restCount', { count: stats.restCount.toString() })}</span>
        </div>
      </div>

      {/* 筛选和搜索 */}
      <div className="history-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder={t('history.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filters">
          <select
            value={timePeriodFilter}
            onChange={(e) => setTimePeriodFilter(e.target.value as TimePeriodFilter)}
            className="filter-select"
          >
            <option value="all">{t('history.allTime')}</option>
            <option value="today">{t('history.todayFilter')}</option>
            <option value="week">{t('history.thisWeek')}</option>
            <option value="month">{t('history.thisMonth')}</option>
          </select>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FilterType)}
            className="filter-select"
          >
            <option value="all">{t('history.allTypes')}</option>
            <option value="focus">{t('states.focus')}</option>
            <option value="failed">{t('history.focusFailed')}</option>
            <option value="reflection">{t('states.reflection')}</option>
            <option value="rest">{t('states.rest')}</option>
          </select>
          
          <select
            value={sortType}
            onChange={(e) => setSortType(e.target.value as SortType)}
            className="filter-select"
          >
            <option value="newest">{t('history.sortNewest')}</option>
            <option value="oldest">{t('history.sortOldest')}</option>
            <option value="duration-desc">{t('history.sortDurationDesc')}</option>
            <option value="duration-asc">{t('history.sortDurationAsc')}</option>
          </select>
        </div>
      </div>

      {/* 记录列表 */}
      <div className="history-list">
        {paginatedRecords.length === 0 ? (
          <div className="empty-state">
            <p>{t('history.noMatchingRecords')}</p>
            {(filterType !== 'all' || searchTerm || timePeriodFilter !== 'all') && (
              <button 
                onClick={() => {
                  setFilterType('all');
                  setSearchTerm('');
                  setTimePeriodFilter('all');
                }}
                className="clear-filters"
              >
                {t('history.clearFilters')}条件
              </button>
            )}
          </div>
        ) : (
          paginatedRecords.map((record) => (
            <HistoryItem
              key={record.id}
              record={record}
              onSelect={setSelectedRecord}
              isSelected={selectedRecord?.id === record.id}
            />
          ))
        )}
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            {t('history.previousPage')}
          </button>
          
          <span className="pagination-info">
            {t('history.pageInfo', { current: currentPage.toString(), total: totalPages.toString() })}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            {t('history.nextPage')}
          </button>
        </div>
      )}

      {/* 记录详情弹窗 */}
      {selectedRecord && (
        <RecordDetails
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
        />
      )}
    </div>
  );
};