export default function AppSidebar({ phase, onNewDecision, lang, setLang, langMenuOpen, setLangMenuOpen, theme, toggleTheme }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo"><div className="logo-icon">🧠</div><span>MajorLogic</span></div>
      </div>
      <nav>
        <div className={`nav-item ${phase === 0 ? 'active' : ''}`} onClick={onNewDecision}><i className="fas fa-plus-circle"></i><span>New Decision</span></div>
        <div className="nav-item"><i className="fas fa-history"></i><span>My Decisions</span></div>
        <div className="nav-item"><i className="fas fa-bookmark"></i><span>Saved</span></div>
        <div className="nav-item"><i className="fas fa-cog"></i><span>Settings</span></div>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-tools">
          <div className="lang-dropdown" style={{ flex: 1 }}>
            <button className="tool-btn" onClick={() => setLangMenuOpen(!langMenuOpen)}>
              <i className="fas fa-globe"></i><span id="current-lang">{lang.toUpperCase()}</span>
            </button>
            {langMenuOpen && (
              <div className="lang-menu show">
                <div className={`lang-option ${lang === 'en' ? 'active' : ''}`} onClick={() => { setLang('en'); setLangMenuOpen(false); }}><span className="lang-flag">🇺🇸</span><span>English</span></div>
                <div className={`lang-option ${lang === 'ar' ? 'active' : ''}`} onClick={() => { setLang('ar'); setLangMenuOpen(false); }}><span className="lang-flag">🇸🇦</span><span>العربية</span></div>
              </div>
            )}
          </div>
          <button className="tool-btn" onClick={toggleTheme} style={{ flex: 1 }}>
            <i className={theme === 'dark' ? "fas fa-sun" : "fas fa-moon"}></i>
            <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
