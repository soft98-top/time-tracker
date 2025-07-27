import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import './ReflectionModal.css';
import { t } from '../i18n';

interface ReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onSave: (content: string) => void;
  placeholder?: string;
}

export const ReflectionModal: React.FC<ReflectionModalProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  onSave,
  placeholder = t('reflection.placeholder')
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lastSavedValue, setLastSavedValue] = useState(value);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化时设置lastSavedValue
  useEffect(() => {
    if (isOpen && !isInitialized) {
      setLastSavedValue(value);
      setIsPreviewMode(false);
      setIsInitialized(true);
    } else if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, isInitialized, value]);



  const handleTogglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  const handleManualSave = () => {
    onSave(value);
    setLastSavedValue(value);
  };

  const handleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleClose = () => {
    // 保存当前内容
    if (value !== lastSavedValue) {
      onSave(value);
    }
    onClose();
  };

  const hasUnsavedChanges = value !== lastSavedValue;

  if (!isOpen) return null;

  return (
    <div className="reflection-modal-overlay">
      <div className={`reflection-modal ${isMinimized ? 'minimized' : ''}`}>
        <div className="reflection-modal-header">
          <div className="reflection-modal-title">
            <span className="reflection-icon">💭</span>
            <h3>{t('reflection.title')}</h3>
          </div>
          <div className="reflection-modal-controls">
            <button
              type="button"
              className={`toggle-preview-btn ${isPreviewMode ? 'active' : ''}`}
              onClick={handleTogglePreview}
              title={isPreviewMode ? t('reflection.edit') : t('reflection.preview')}
              disabled={isMinimized}
            >
              {isPreviewMode ? t('reflection.edit') : t('reflection.preview')}
            </button>
            <button
              type="button"
              className={`save-btn ${hasUnsavedChanges ? 'has-changes' : ''}`}
              onClick={handleManualSave}
              disabled={!hasUnsavedChanges || isMinimized}
              title={t('reflection.save')}
            >
              {t('reflection.save')}
            </button>
            <button
              type="button"
              className="minimize-btn"
              onClick={handleMinimize}
              title={isMinimized ? '展开' : '最小化'}
            >
              {isMinimized ? '📖' : '➖'}
            </button>
            <button
              type="button"
              className="close-btn"
              onClick={handleClose}
              title={t('common.close')}
            >
              ✕
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="reflection-modal-content">
              {isPreviewMode ? (
                <div className="reflection-preview">
                  {value.trim() ? (
                    <ReactMarkdown>{value}</ReactMarkdown>
                  ) : (
                    <div className="empty-preview">暂无内容</div>
                  )}
                </div>
              ) : (
                <textarea
                  className="reflection-textarea"
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  rows={12}
                  autoFocus
                />
              )}
            </div>

            <div className="reflection-modal-footer">
              <div className="markdown-tips">
                支持 Markdown 格式：**粗体**、*斜体*、`代码`、[链接](url)
              </div>
              <div className="status-indicators">
                {!hasUnsavedChanges && value.trim() && (
                  <div className="saved-indicator">
                    ✓ 已保存
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};