import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './ReflectionInput.css';
import { t } from '../i18n';

interface ReflectionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSave: (content: string) => void;
  placeholder?: string;
  autoSave?: boolean;
  autoSaveDelay?: number;
}

export const ReflectionInput: React.FC<ReflectionInputProps> = ({
  value,
  onChange,
  onSave,
  placeholder = t('reflection.placeholder'),
  autoSave = true,
  autoSaveDelay = 2000
}) => {
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [lastSavedValue, setLastSavedValue] = useState(value);
  const [isInitialized, setIsInitialized] = useState(false);

  // 自动保存逻辑
  useEffect(() => {
    if (!autoSave || !isInitialized || value === lastSavedValue || value === '') return;

    const timer = setTimeout(() => {
      onSave(value);
      setLastSavedValue(value);
    }, autoSaveDelay);

    return () => clearTimeout(timer);
  }, [value, lastSavedValue, onSave, autoSave, autoSaveDelay, isInitialized]);

  // 初始化时设置lastSavedValue
  useEffect(() => {
    setLastSavedValue(value);
    setIsInitialized(true);
  }, []);

  const handleTogglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  const handleManualSave = () => {
    onSave(value);
    setLastSavedValue(value);
  };

  const hasUnsavedChanges = value !== lastSavedValue;

  return (
    <div className="reflection-input">
      <div className="reflection-input-header">
        <h3>{t('reflection.title')}</h3>
        <div className="reflection-input-controls">
          <button
            type="button"
            className={`toggle-preview-btn ${isPreviewMode ? 'active' : ''}`}
            onClick={handleTogglePreview}
            title={isPreviewMode ? t('reflection.edit') : t('reflection.preview')}
          >
            {isPreviewMode ? t('reflection.edit') : t('reflection.preview')}
          </button>
          {!autoSave && (
            <button
              type="button"
              className={`save-btn ${hasUnsavedChanges ? 'has-changes' : ''}`}
              onClick={handleManualSave}
              disabled={!hasUnsavedChanges}
              title={t('reflection.save')}
            >
              {t('reflection.save')}
            </button>
          )}
        </div>
      </div>

      <div className="reflection-input-content">
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
            rows={8}
          />
        )}
      </div>

      <div className="reflection-input-footer">
        <div className="markdown-tips">
          支持 Markdown 格式：**粗体**、*斜体*、`代码`、[链接](url)
        </div>
        {autoSave && hasUnsavedChanges && (
          <div className="auto-save-indicator">
            {t('common.loading')}
          </div>
        )}
      </div>
    </div>
  );
};