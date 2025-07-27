import React, { useState } from 'react';
import { getCurrentLanguage, setLanguage, Language, t } from '../i18n';

/**
 * 语言切换组件
 */
export function LanguageSwitcher(): React.ReactElement {
  const [currentLang, setCurrentLang] = useState<Language>(getCurrentLanguage());

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCurrentLang(lang);
    // 刷新页面以应用新语言
    window.location.reload();
  };

  return (
    <div className="language-switcher">
      <button
        className={`language-switcher__button ${currentLang === 'zh' ? 'language-switcher__button--active' : ''}`}
        onClick={() => handleLanguageChange('zh')}
        title="中文"
      >
        中
      </button>
      <button
        className={`language-switcher__button ${currentLang === 'en' ? 'language-switcher__button--active' : ''}`}
        onClick={() => handleLanguageChange('en')}
        title="English"
      >
        EN
      </button>
    </div>
  );
}