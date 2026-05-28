import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n/languages.js';

export default function AppSidebar({ phase, onNewDecision, lang, setLang, langMenuOpen, setLangMenuOpen, theme, toggleTheme, sidebarOpen, onClose }) {
  const { t } = useTranslation();
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === lang) ?? SUPPORTED_LANGUAGES[0];

  return (
    <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
      <div className="sidebar-header">
        <div className="logo"><div className="logo-icon">🧠</div><span>MajorLogic</span></div>
        <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
          <Icon name="times" />
        </button>
      </div>
      <nav>
        <div className={`nav-item ${phase === 0 ? 'active' : ''}`} onClick={onNewDecision}><Icon name="plus-circle" /><span>{t('nav.new_decision')}</span></div>
        {/* WIRED IN M3 — requires user accounts */}
        <div className="nav-item"><Icon name="history" /><span>{t('nav.my_decisions')}</span></div>
        <div className="nav-item"><Icon name="bookmark" /><span>{t('nav.saved')}</span></div>
        {/* WIRED IN M10 — requires settings page */}
        <div className="nav-item"><Icon name="cog" /><span>{t('nav.settings')}</span></div>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-tools">
          <div className="lang-dropdown" style={{ flex: 1, position: 'relative' }}>
            <button className="tool-btn" onClick={() => setLangMenuOpen(!langMenuOpen)}>
              <span>{currentLang.flag}</span>
              <span id="current-lang" style={{ marginLeft: 4 }}>{currentLang.nativeLabel}</span>
            </button>
            {langMenuOpen && (
              <div className="lang-menu show" style={{ maxHeight: 280, overflowY: 'auto' }}>
                {SUPPORTED_LANGUAGES.map(l => (
                  <div
                    key={l.code}
                    className={`lang-option ${lang === l.code ? 'active' : ''}`}
                    onClick={() => { setLang(l.code); setLangMenuOpen(false); }}
                  >
                    <span className="lang-flag">{l.flag}</span>
                    <span>{l.nativeLabel}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="tool-btn" onClick={toggleTheme} style={{ flex: 1 }}>
            <Icon name={theme === 'dark'  ? 'sun' : 'moon'} />
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
