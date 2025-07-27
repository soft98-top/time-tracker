import React, { useState, useEffect, useRef } from 'react';
import { useTimer } from '../contexts/TimerContext';
import { TimerConfig } from '../types';
import { t } from '../i18n';
import { notificationManager } from '../services/NotificationManager';
import { HistoryService } from '../services/HistoryService';

/**
 * 表单验证错误接口
 */
interface ValidationErrors {
  focusDuration?: string;
  restDuration?: string;
  reflectionDuration?: string;
  focusFailureTime?: string;
}

/**
 * 设置面板组件
 * 管理用户配置，包括表单验证、错误处理和实时预览
 */
export function SettingsPanel(): React.ReactElement {
  const { config, updateConfig, requestNotificationPermission, getNotificationPermissionStatus } = useTimer();
  
  // 本地表单状态
  const [formData, setFormData] = useState<TimerConfig>(config);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isModified, setIsModified] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string>('');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [isRequestingPermission, setIsRequestingPermission] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 监听外部配置变化
  useEffect(() => {
    setFormData(config);
    setIsModified(false);
  }, [config]);

  // 检查通知权限状态
  useEffect(() => {
    const checkPermission = () => {
      setNotificationPermission(getNotificationPermissionStatus());
    };
    
    checkPermission();
    
    // 监听权限变化
    const interval = setInterval(checkPermission, 1000);
    return () => clearInterval(interval);
  }, [getNotificationPermissionStatus]);

  /**
   * 验证单个字段
   */
  const validateField = (name: keyof TimerConfig, value: any): string | undefined => {
    switch (name) {
      case 'focusDuration':
        if (!value || value < 1) return t('settings.validation.focusDurationMin');
        if (value > 120) return t('settings.validation.focusDurationMax');
        return undefined;
        
      case 'restDuration':
        if (!value || value < 1) return t('settings.validation.restDurationMin');
        if (value > 60) return t('settings.validation.restDurationMax');
        return undefined;
        
      case 'reflectionDuration':
        if (!value || value < 1) return t('settings.validation.reflectionDurationMin');
        if (value > 30) return t('settings.validation.reflectionDurationMax');
        return undefined;
        
      case 'focusFailureTime':
        if (!value || value < 1) return t('settings.validation.focusFailureTimeMin');
        if (value > formData.focusDuration) return t('settings.validation.focusFailureTimeExceedsFocus');
        if (value > 10) return t('settings.validation.focusFailureTimeMax');
        return undefined;
        
      default:
        return undefined;
    }
  };

  /**
   * 验证整个表单
   */
  const validateForm = (data: TimerConfig): ValidationErrors => {
    const newErrors: ValidationErrors = {};
    
    // 验证各个字段
    Object.keys(data).forEach(key => {
      if (key === 'enableSound' || key === 'enableNotification') return;
      
      const error = validateField(key as keyof TimerConfig, data[key as keyof TimerConfig]);
      if (error) {
        newErrors[key as keyof ValidationErrors] = error;
      }
    });

    // 额外的交叉验证
    if (data.focusFailureTime >= data.focusDuration) {
      newErrors.focusFailureTime = t('settings.validation.focusFailureTimeMustBeLess');
    }

    return newErrors;
  };

  /**
   * 处理输入变化
   */
  const handleInputChange = (name: keyof TimerConfig, value: any) => {
    const newFormData = { ...formData, [name]: value };
    setFormData(newFormData);
    setIsModified(true);

    // 实时验证
    const fieldError = validateField(name, value);
    const newErrors = { ...errors };
    
    if (fieldError) {
      newErrors[name as keyof ValidationErrors] = fieldError;
    } else {
      delete newErrors[name as keyof ValidationErrors];
    }

    // 如果是专注时长变化，需要重新验证专注失败时间
    if (name === 'focusDuration') {
      const focusFailureError = validateField('focusFailureTime', newFormData.focusFailureTime);
      if (focusFailureError) {
        newErrors.focusFailureTime = focusFailureError;
      } else {
        delete newErrors.focusFailureTime;
      }
    }

    setErrors(newErrors);
    setSaveMessage(''); // 清除保存消息
  };

  /**
   * 处理数字输入
   */
  const handleNumberChange = (name: keyof TimerConfig, inputValue: string) => {
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue)) {
      handleInputChange(name, numValue);
    } else if (inputValue === '') {
      handleInputChange(name, 0);
    }
  };

  /**
   * 处理布尔值输入
   */
  const handleBooleanChange = (name: keyof TimerConfig, checked: boolean) => {
    handleInputChange(name, checked);
  };

  /**
   * 保存配置
   */
  const handleSave = async () => {
    const validationErrors = validateForm(formData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setSaveMessage(t('settings.validationError'));
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      await updateConfig(formData);
      setIsModified(false);
      setSaveMessage(t('settings.saveSuccess'));
      
      // 3秒后清除成功消息
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('保存配置失败:', error);
      setSaveMessage(t('settings.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 重置配置
   */
  const handleReset = () => {
    setFormData(config);
    setErrors({});
    setIsModified(false);
    setSaveMessage('');
  };

  /**
   * 恢复默认设置
   */
  const handleRestoreDefaults = () => {
    const defaultConfig: TimerConfig = {
      focusDuration: 25,
      restDuration: 5,
      reflectionDuration: 3,
      focusFailureTime: 2,
      enableSound: true,
      enableNotification: true
    };
    
    setFormData(defaultConfig);
    setIsModified(true);
    setErrors({});
    setSaveMessage('');
  };

  /**
   * 请求通知权限
   */
  const handleRequestNotificationPermission = async () => {
    setIsRequestingPermission(true);
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setSaveMessage(t('settings.permissionGranted'));
        setNotificationPermission('granted');
      } else {
        setSaveMessage(t('settings.permissionDenied'));
      }
    } catch (error) {
      console.error('请求通知权限失败:', error);
      setSaveMessage(t('settings.permissionRequestFailed'));
    } finally {
      setIsRequestingPermission(false);
      // 3秒后清除消息
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  /**
   * 测试声音
   */
  const handleTestSound = async () => {
    try {
      await notificationManager.playSound();
      setSaveMessage(t('settings.soundTestComplete'));
    } catch (error) {
      console.error('声音测试失败:', error);
      setSaveMessage(t('settings.soundTestFailed'));
    }
    // 3秒后清除消息
    setTimeout(() => setSaveMessage(''), 3000);
  };

  /**
   * 测试通知
   */
  const handleTestNotification = async () => {
    try {
      await notificationManager.showNotification({
        title: t('notifications.testTitle'),
        body: t('notifications.testBody'),
        tag: 'test-notification',
        requireInteraction: false
      });
      setSaveMessage(t('settings.notificationTestSent'));
    } catch (error) {
      console.error('测试通知失败:', error);
      setSaveMessage(t('settings.notificationTestFailed'));
    }
    // 3秒后清除消息
    setTimeout(() => setSaveMessage(''), 3000);
  };

  /**
   * 导出数据
   */
  const handleExportData = () => {
    try {
      const exportData = {
        config: config,
        sessions: HistoryService.getAllRecords(),
        exportedAt: new Date().toISOString(),
        version: '1.0.0'
      };
      
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `time-tracker-data-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(link.href);
      setSaveMessage(t('settings.exportSuccess'));
      
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('导出数据失败:', error);
      setSaveMessage(t('settings.exportFailed'));
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  /**
   * 导入数据
   */
  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importData = JSON.parse(content);
        
        // 验证数据格式
        if (!importData.config || !importData.sessions) {
          throw new Error('无效的数据格式');
        }
        
        // 导入配置
        if (importData.config) {
          const validationErrors = validateForm(importData.config);
          if (Object.keys(validationErrors).length === 0) {
            await updateConfig(importData.config);
            setFormData(importData.config);
          }
        }
        
        // 导入会话数据
        if (importData.sessions && Array.isArray(importData.sessions)) {
          HistoryService.importRecords(JSON.stringify({ records: importData.sessions }), false);
        }
        
        setSaveMessage(t('settings.importSuccess'));
        setTimeout(() => setSaveMessage(''), 3000);
        
      } catch (error) {
        console.error('导入数据失败:', error);
        setSaveMessage(t('settings.importFailed'));
        setTimeout(() => setSaveMessage(''), 3000);
      }
    };
    
    reader.readAsText(file);
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 获取预览文本
   */
  const getPreviewText = (): string => {
    if (Object.keys(errors).length > 0) {
      return t('settings.previewError');
    }

    return t('settings.previewText', {
      focusDuration: formData.focusDuration.toString(),
      reflectionDuration: formData.reflectionDuration.toString(),
      restDuration: formData.restDuration.toString(),
      focusFailureTime: formData.focusFailureTime.toString()
    });
  };

  return (
    <div className="settings-panel" data-testid="settings-panel">
      <div className="settings-panel__header">
        <h3 className="settings-panel__title">{t('settings.title')}</h3>
        <p className="settings-panel__description">
          {t('settings.description')}
        </p>
      </div>

      <form className="settings-panel__form" onSubmit={(e) => e.preventDefault()}>
        {/* 时长设置 */}
        <div className="settings-panel__section">
          <h4 className="settings-panel__section-title">{t('settings.durationSettings')}</h4>
          
          <div className="settings-panel__field">
            <label className="settings-panel__label" htmlFor="focusDuration">
              {t('settings.focusDuration')} ({t('common.minutes')})
            </label>
            <input
              id="focusDuration"
              type="number"
              min="1"
              max="120"
              value={formData.focusDuration}
              onChange={(e) => handleNumberChange('focusDuration', e.target.value)}
              className={`settings-panel__input ${errors.focusDuration ? 'settings-panel__input--error' : ''}`}
              data-testid="focus-duration-input"
            />
            {errors.focusDuration && (
              <div className="settings-panel__error">{errors.focusDuration}</div>
            )}
          </div>

          <div className="settings-panel__field">
            <label className="settings-panel__label" htmlFor="reflectionDuration">
              {t('settings.reflectionDuration')} ({t('common.minutes')})
            </label>
            <input
              id="reflectionDuration"
              type="number"
              min="1"
              max="30"
              value={formData.reflectionDuration}
              onChange={(e) => handleNumberChange('reflectionDuration', e.target.value)}
              className={`settings-panel__input ${errors.reflectionDuration ? 'settings-panel__input--error' : ''}`}
              data-testid="reflection-duration-input"
            />
            {errors.reflectionDuration && (
              <div className="settings-panel__error">{errors.reflectionDuration}</div>
            )}
          </div>

          <div className="settings-panel__field">
            <label className="settings-panel__label" htmlFor="restDuration">
              {t('settings.restDuration')} ({t('common.minutes')})
            </label>
            <input
              id="restDuration"
              type="number"
              min="1"
              max="60"
              value={formData.restDuration}
              onChange={(e) => handleNumberChange('restDuration', e.target.value)}
              className={`settings-panel__input ${errors.restDuration ? 'settings-panel__input--error' : ''}`}
              data-testid="rest-duration-input"
            />
            {errors.restDuration && (
              <div className="settings-panel__error">{errors.restDuration}</div>
            )}
          </div>

          <div className="settings-panel__field">
            <label className="settings-panel__label" htmlFor="focusFailureTime">
              {t('settings.focusFailureTime')} ({t('common.minutes')})
            </label>
            <input
              id="focusFailureTime"
              type="number"
              min="1"
              max="10"
              value={formData.focusFailureTime}
              onChange={(e) => handleNumberChange('focusFailureTime', e.target.value)}
              className={`settings-panel__input ${errors.focusFailureTime ? 'settings-panel__input--error' : ''}`}
              data-testid="focus-failure-time-input"
            />
            {errors.focusFailureTime && (
              <div className="settings-panel__error">{errors.focusFailureTime}</div>
            )}
            <div className="settings-panel__help">
              {t('settings.focusFailureHelp')}
            </div>
          </div>
        </div>

        {/* 通知设置 */}
        <div className="settings-panel__section">
          <h4 className="settings-panel__section-title">{t('settings.notificationSettings')}</h4>
          <p className="settings-panel__section-description">
            {t('settings.notificationDescription')}
          </p>
          
          <div className="settings-panel__field">
            <label className="settings-panel__checkbox-label">
              <input
                type="checkbox"
                checked={formData.enableSound}
                onChange={(e) => handleBooleanChange('enableSound', e.target.checked)}
                className="settings-panel__checkbox"
                data-testid="enable-sound-checkbox"
              />
              <span className="settings-panel__checkbox-text">{t('settings.enableSound')}</span>
            </label>
            <div className="settings-panel__field-actions">
              <button
                type="button"
                onClick={handleTestSound}
                className="settings-panel__test-button"
                disabled={!formData.enableSound}
              >
                {t('settings.testSound')}
              </button>
            </div>
          </div>

          <div className="settings-panel__field">
            <label className="settings-panel__checkbox-label">
              <input
                type="checkbox"
                checked={formData.enableNotification}
                onChange={(e) => handleBooleanChange('enableNotification', e.target.checked)}
                className="settings-panel__checkbox"
                data-testid="enable-notification-checkbox"
              />
              <span className="settings-panel__checkbox-text">{t('settings.enableNotification')}</span>
            </label>
            
            <div className="settings-panel__notification-status">
              <span className={`settings-panel__permission-status settings-panel__permission-status--${notificationPermission}`}>
                {t('settings.permissionStatus')}: {
                  notificationPermission === 'granted' ? t('settings.granted') :
                  notificationPermission === 'denied' ? t('settings.denied') :
                  t('settings.notRequested')
                }
              </span>
            </div>
            
            <div className="settings-panel__field-actions">
              {notificationPermission !== 'granted' && (
                <button
                  type="button"
                  onClick={handleRequestNotificationPermission}
                  className="settings-panel__permission-button"
                  disabled={isRequestingPermission || notificationPermission === 'denied'}
                >
                  {isRequestingPermission ? t('settings.requesting') : t('settings.requestPermission')}
                </button>
              )}
              
              <button
                type="button"
                onClick={handleTestNotification}
                className="settings-panel__test-button"
                disabled={!formData.enableNotification || notificationPermission !== 'granted'}
              >
                {t('settings.testNotification')}
              </button>
            </div>
            
            {notificationPermission === 'denied' && (
              <div className="settings-panel__help settings-panel__help--warning">
                {t('settings.permissionDeniedHelp')}
              </div>
            )}
          </div>
        </div>

        {/* 预览 */}
        <div className="settings-panel__section">
          <h4 className="settings-panel__section-title">{t('settings.configPreview')}</h4>
          <div className="settings-panel__preview">
            {getPreviewText()}
          </div>
        </div>

        {/* 数据管理 */}
        <div className="settings-panel__section">
          <h4 className="settings-panel__section-title">{t('settings.dataManagement')}</h4>
          <p className="settings-panel__section-description">
            {t('settings.dataManagementDescription')}
          </p>
          
          <div className="settings-panel__data-actions">
            <button
              type="button"
              onClick={handleExportData}
              className="settings-panel__button settings-panel__button--secondary"
            >
              📤 {t('settings.export')}
            </button>
            
            <label className="settings-panel__import-label">
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="settings-panel__import-input"
                ref={fileInputRef}
              />
              <span className="settings-panel__button settings-panel__button--secondary">
                📥 {t('settings.import')}
              </span>
            </label>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="settings-panel__actions">
          <button
            type="button"
            onClick={handleRestoreDefaults}
            className="settings-panel__button settings-panel__button--secondary"
          >
            {t('settings.resetToDefaults')}
          </button>
          
          <button
            type="button"
            onClick={handleReset}
            disabled={!isModified}
            className="settings-panel__button settings-panel__button--secondary"
          >
            {t('settings.resetForm')}
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={!isModified || Object.keys(errors).length > 0 || isSaving}
            className="settings-panel__button settings-panel__button--primary"
            data-testid="save-settings-btn"
          >
            {isSaving ? t('common.loading') : t('settings.save')}
          </button>
        </div>

        {/* 保存消息 */}
        {saveMessage && (
          <div className={`settings-panel__message ${
            saveMessage.includes('失败') || saveMessage.includes('错误') 
              ? 'settings-panel__message--error' 
              : 'settings-panel__message--success'
          }`} data-testid={saveMessage.includes('失败') || saveMessage.includes('错误') ? 'validation-error' : 'settings-saved-message'}>
            {saveMessage}
          </div>
        )}
      </form>
    </div>
  );
}