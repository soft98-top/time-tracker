import React from 'react';
import { t } from '../i18n';
import './HelpPage.css';

export const HelpPage: React.FC = () => {
  return (
    <div className="help-page">
      <div className="help-container">
        <header className="help-header">
          <h1>{t('help.title')}</h1>
          <p className="help-subtitle">{t('help.subtitle')}</p>
        </header>

        <div className="help-content">
          <section className="help-section">
            <h2>{t('help.gettingStarted.title')}</h2>
            <div className="help-steps">
              <div className="help-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h3>{t('help.gettingStarted.step1.title')}</h3>
                  <p>{t('help.gettingStarted.step1.description')}</p>
                </div>
              </div>
              <div className="help-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h3>{t('help.gettingStarted.step2.title')}</h3>
                  <p>{t('help.gettingStarted.step2.description')}</p>
                </div>
              </div>
              <div className="help-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h3>{t('help.gettingStarted.step3.title')}</h3>
                  <p>{t('help.gettingStarted.step3.description')}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h2>{t('help.features.title')}</h2>
            <div className="feature-grid">
              <div className="feature-card">
                <div className="feature-icon">⏱️</div>
                <h3>{t('help.features.flexibleTimer.title')}</h3>
                <p>{t('help.features.flexibleTimer.description')}</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🧠</div>
                <h3>{t('help.features.reflection.title')}</h3>
                <p>{t('help.features.reflection.description')}</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>{t('help.features.statistics.title')}</h3>
                <p>{t('help.features.statistics.description')}</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">⚙️</div>
                <h3>{t('help.features.customization.title')}</h3>
                <p>{t('help.features.customization.description')}</p>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h2>{t('help.states.title')}</h2>
            <div className="states-list">
              <div className="state-item">
                <div className="state-badge focus">{t('states.focus')}</div>
                <p>{t('help.states.focus')}</p>
              </div>
              <div className="state-item">
                <div className="state-badge reflection">{t('states.reflection')}</div>
                <p>{t('help.states.reflection')}</p>
              </div>
              <div className="state-item">
                <div className="state-badge rest">{t('states.rest')}</div>
                <p>{t('help.states.rest')}</p>
              </div>
              <div className="state-item">
                <div className="state-badge idle">{t('states.idle')}</div>
                <p>{t('help.states.idle')}</p>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h2>{t('help.tips.title')}</h2>
            <div className="tips-list">
              <div className="tip-item">
                <div className="tip-icon">💡</div>
                <p>{t('help.tips.tip1')}</p>
              </div>
              <div className="tip-item">
                <div className="tip-icon">🔔</div>
                <p>{t('help.tips.tip2')}</p>
              </div>
              <div className="tip-item">
                <div className="tip-icon">📝</div>
                <p>{t('help.tips.tip3')}</p>
              </div>
              <div className="tip-item">
                <div className="tip-icon">📈</div>
                <p>{t('help.tips.tip4')}</p>
              </div>
            </div>
          </section>

          <section className="help-section">
            <h2>{t('help.faq.title')}</h2>
            <div className="faq-list">
              <details className="faq-item">
                <summary>{t('help.faq.q1.question')}</summary>
                <p>{t('help.faq.q1.answer')}</p>
              </details>
              <details className="faq-item">
                <summary>{t('help.faq.q2.question')}</summary>
                <p>{t('help.faq.q2.answer')}</p>
              </details>
              <details className="faq-item">
                <summary>{t('help.faq.q3.question')}</summary>
                <p>{t('help.faq.q3.answer')}</p>
              </details>
              <details className="faq-item">
                <summary>{t('help.faq.q4.question')}</summary>
                <p>{t('help.faq.q4.answer')}</p>
              </details>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};