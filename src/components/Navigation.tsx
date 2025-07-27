import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navigation.css';
import { LanguageSwitcher } from './LanguageSwitcher';
import './LanguageSwitcher.css';
import { t } from '../i18n';

interface NavigationProps {
  theme: 'light' | 'dark';
  onThemeToggle: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ theme, onThemeToggle }) => {
  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h1>{t('appName')}</h1>
      </div>
      
      <div className="nav-links">
        <NavLink 
          to="/timer" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          data-testid="nav-timer"
        >
          <span className="nav-icon">⏱️</span>
          {t('navigation.timer')}
        </NavLink>
        
        <NavLink 
          to="/statistics" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          data-testid="nav-statistics"
        >
          <span className="nav-icon">📊</span>
          {t('statistics.title')}
        </NavLink>
        
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          data-testid="nav-settings"
        >
          <span className="nav-icon">⚙️</span>
          {t('settings.title')}
        </NavLink>
        
        <NavLink 
          to="/help" 
          className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          data-testid="nav-help"
        >
          <span className="nav-icon">❓</span>
          {t('navigation.help')}
        </NavLink>
      </div>
      
      <div className="nav-actions">
        <LanguageSwitcher />
        <button 
          className="theme-toggle"
          onClick={onThemeToggle}
          aria-label={t('navigation.toggleTheme', { theme: theme === 'light' ? t('navigation.darkTheme') : t('navigation.lightTheme') })}
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </nav>
  );
};