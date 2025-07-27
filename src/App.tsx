import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TimerProvider } from './contexts/TimerContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Navigation } from './components/Navigation';
import { TimerPage } from './pages/TimerPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { HelpPage } from './pages/HelpPage';
import './App.css';

// 主题类型
type Theme = 'light' | 'dark';

function App() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem('app-theme') as Theme;
    return savedTheme || 'light';
  });

  // 应用主题到 document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ErrorBoundary>
      <TimerProvider>
        <Router>
          <div className="app">
            <Navigation theme={theme} onThemeToggle={toggleTheme} />
            <main className="app-main">
              <div className="app-main-content">
                <Routes>
                  <Route path="/" element={<Navigate to="/timer" replace />} />
                  <Route path="/timer" element={<TimerPage />} />
                  <Route path="/statistics" element={<StatisticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/help" element={<HelpPage />} />
                  <Route path="*" element={<Navigate to="/timer" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        </Router>
      </TimerProvider>
    </ErrorBoundary>
  );
}

export default App;
