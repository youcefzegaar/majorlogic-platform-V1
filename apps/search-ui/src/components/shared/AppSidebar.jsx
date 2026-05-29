import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../i18n/languages.js';
import { useAuthStore } from '../../stores/authStore';

export default function AppSidebar({ phase, onNewDecision, onMyDecisions, onConstitution, lang, setLang, langMenuOpen, setLangMenuOpen, theme, toggleTheme, sidebarOpen, onClose }) {
  const { t } = useTranslation();
  const currentLang = SUPPORTED_LANGUAGES.find(l => l.code === lang) ?? SUPPORTED_LANGUAGES[0];
  const { user, setShowAuthModal, setAuthModalMode, logout } = useAuthStore();

  const handleMyDecisionsClick = () => {
    if (onMyDecisions) onMyDecisions();
    if (onClose) onClose();
  };

  const handleSignInClick = () => {
    setAuthModalMode('login');
    setShowAuthModal(true);
    if (onClose) onClose();
  };

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
        <div className="nav-item" onClick={handleMyDecisionsClick}><Icon name="history" /><span>{t('nav.my_decisions')}</span></div>
        <div className="nav-item" onClick={handleMyDecisionsClick}><Icon name="bookmark" /><span>{t('nav.saved')}</span></div>
        <div className="nav-item" onClick={() => { onConstitution?.(); onClose?.(); }}>
          <Icon name="shield-alt" /><span>{t('nav.constitution', 'Our Constitution')}</span>
        </div>
        {/* WIRED IN M10 — requires settings page */}
        <div className="nav-item"><Icon name="cog" /><span>{t('nav.settings')}</span></div>
      </nav>
      <div className="sidebar-footer">
        {/* User account row */}
        <div style={{
          padding: '10px 12px',
          marginBottom: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderTop: '1px solid var(--border)',
          paddingTop: 12,
        }}>
          {user ? (
            <>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {(user.displayName || user.email || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName || user.email}
                </div>
                {user.displayName && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                )}
              </div>
              <button
                onClick={logout}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: 11,
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: 4,
                  flexShrink: 0,
                }}
                title="Sign out"
              >
                <Icon name="sign-out-alt" />
              </button>
            </>
          ) : (
            <button
              onClick={handleSignInClick}
              style={{
                background: 'none',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontSize: 13,
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: 6,
                width: '100%',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon name="user" />
              <span>Sign in</span>
            </button>
          )}
        </div>

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
