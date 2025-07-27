import React from 'react';
import { SettingsPanel } from '../components';
import { t } from '../i18n';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  return (
    <div className="settings-page">
      <div className="settings-container">
        <div className="settings-header">
          <h2>{t('settings.title')}</h2>
          <p>{t('settings.description')}</p>
        </div>
        
        <div className="settings-content">
          <SettingsPanel />
        </div>
      </div>
    </div>
  );
};