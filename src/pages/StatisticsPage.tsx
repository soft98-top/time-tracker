import React from 'react';
import { StatisticsView, HistoryView } from '../components';
import { t } from '../i18n';
import './StatisticsPage.css';

export const StatisticsPage: React.FC = () => {
  return (
    <div className="statistics-page">
      <div className="statistics-container">
        <div className="statistics-section">
          <StatisticsView />
        </div>
        
        <div className="history-section">
          <h2>{t('history.title')}</h2>
          <HistoryView />
        </div>
      </div>
    </div>
  );
};