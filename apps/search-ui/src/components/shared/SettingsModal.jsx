import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n/languages.js';

export default function SettingsModal({ lang, setLang, theme, toggleTheme, onClose }) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="card-header" style={{ marginBottom: 24 }}>
          <div className="card-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>
            <i className="fas fa-cog"></i>
          </div>
          <div>
            <div className="card-title">{t('nav.settings')}</div>
            <div className="card-subtitle">{t('settings.subtitle', 'Preferences for this session')}</div>
          </div>
        </div>

        {/* Language */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {t('settings.language', 'Language')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SUPPORTED_LANGUAGES.map(l => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                  border: lang === l.code ? '1px solid var(--accent-info)' : '1px solid var(--border)',
                  background: lang === l.code ? 'rgba(14,165,233,0.12)' : 'rgba(255,255,255,0.03)',
                  color: lang === l.code ? 'var(--accent-info)' : 'var(--text-secondary)',
                  fontWeight: lang === l.code ? 600 : 400,
                }}
              >
                {l.flag} {l.nativeLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            {t('settings.appearance', 'Appearance')}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={toggleTheme}
            style={{ gap: 8 }}
          >
            <i className={theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon'}></i>
            {theme === 'dark' ? t('settings.switch_light', 'Switch to Light Mode') : t('settings.switch_dark', 'Switch to Dark Mode')}
          </button>
        </div>

        {/* Account — coming soon */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)',
          borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
          marginBottom: 20,
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {t('settings.account_title', 'Save decisions across sessions')}
          </div>
          {t('settings.account_body', 'Create a free account to save your decisions and get 30-day follow-up insights. Coming soon.')}
        </div>

        <button className="btn btn-secondary" onClick={onClose} style={{ width: '100%' }}>
          {t('buttons.close', 'Close')}
        </button>
      </div>
    </div>
  );
}
