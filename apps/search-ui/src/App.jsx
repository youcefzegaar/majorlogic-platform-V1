import { useState, useEffect } from 'react';
import './index.css';

import i18n from './i18n/index.js';
import { getDir } from './i18n/languages.js';
import { useSessionProfile } from './hooks/useSessionProfile';
import { useDecisionEngine } from './hooks/useDecisionEngine';
import { useDecisionStore } from './stores/decisionStore';
import { useAuthStore } from './stores/authStore';
import { useDecisionHistory } from './hooks/useDecisionHistory';
import { AppContext } from './contexts/AppContext';

import { API_URL } from './lib/apiUrl.js';
import AppSidebar from './components/shared/AppSidebar';
import ProgressBar from './components/shared/ProgressBar';
import IntakePhase from './components/intake/IntakePhase';
import AnalysisPhase from './components/shared/AnalysisPhase';
import CardsPhase from './components/results/CardsPhase';
import ExplanationPhase from './components/results/ExplanationPhase';
import SummaryPhase from './components/results/SummaryPhase';
import OwnershipPhase from './components/results/OwnershipPhase';
import AuthModal from './components/auth/AuthModal';
import MyDecisions from './components/account/MyDecisions';
import ConstitutionPage from './components/shared/ConstitutionPage';
import SettingsModal from './components/account/SettingsModal';
import Icon from './components/shared/Icon';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ownershipChoice, setOwnershipChoice] = useState(null);
  const [showMyDecisions, setShowMyDecisions] = useState(false);
  const [showConstitution, setShowConstitution] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const {
    phase, setPhase,
    selectedCardType, setSelectedCardType,
    explanationTab, setExplanationTab,
    cameFromExplanation, setCameFromExplanation,
    setDecisionRunId,
  } = useDecisionStore();

  const { checkSession } = useAuthStore();

  const profile = useSessionProfile();
  const engine = useDecisionEngine();
  const { lastDecision, saveDecision, clearHistory } = useDecisionHistory();

  useEffect(() => { checkSession(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Regret-check landing: email links contain ?regret_check=1&ref=<runId>&answer=happy|surprised|regret
  // Post the answer to the API then strip the params from the URL (clean history).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('regret_check') !== '1') return;
    const ref    = params.get('ref');
    const answer = params.get('answer');
    if (!ref || !['happy', 'surprised', 'regret'].includes(answer)) return;
    const domain = import.meta.env.VITE_DEFAULT_DOMAIN || 'laptop-student-us';
    fetch(`${API_URL}/api/v1/${domain}/feedback/regret`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decisionRunId: ref, answer }),
    }).catch(() => {}); // fire-and-forget — never block the user
    window.history.replaceState({}, '', window.location.pathname);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.body.setAttribute('data-theme', theme); }, [theme]);

  useEffect(() => {
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = getDir(lang);
  }, [lang]);

  useEffect(() => {
    // If language switches while results are open, automatically re-run
    // decision engine to pull localized explanations and warnings.
    if (phase > 0) {
      engine.runDecision({ ...profile, lang });
    }
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeSidebar = () => setSidebarOpen(false);

  const handleAnalyze = async () => {
    const snapshot = await engine.runDecision({ ...profile, lang });
    if (snapshot) {
      setTimeline([{ date: new Date().toLocaleTimeString(), title: 'Initial Decision', desc: `Budget $${profile.budgetMax}` }]);
      saveDecision({
        ...snapshot,
        profile: { goal: profile.goal, major: profile.major, priorities: profile.priorities, budgetMin: profile.budgetMin, budgetMax: profile.budgetMax },
      });
      setTimeout(() => setPhase(1), 200);
    }
  };

  const handleResume = () => {
    if (!lastDecision) return;
    engine.restoreDecision(lastDecision);
    setTimeline([{ date: new Date().toLocaleTimeString(), title: 'Resumed Session', desc: `Budget $${lastDecision.profile?.budgetMax ?? '—'}` }]);
    setPhase(2);
  };

  // Mirror decisionRunId from engine state into the store so all feedback components can read it
  useEffect(() => {
    if (engine.decisionRunId) setDecisionRunId(engine.decisionRunId);
  }, [engine.decisionRunId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applySidebarChanges = async () => {
    setTimeline(prev => [...prev, { date: new Date().toLocaleTimeString(), title: 'Priority Adjustment', desc: 'Updated sliders to refine results.' }]);
    await engine.runDecision({ ...profile, lang });
  };

  const confirmCard = (type) => {
    setSelectedCardType(type);
    setCameFromExplanation(false);
    setTimeline(prev => [...prev, { date: new Date().toLocaleTimeString(), title: 'Final Decision', desc: `${engine.cards[type].name} - ${engine.cards[type].badge}` }]);
    setPhase(4);
  };

  const confirmFromExplanation = () => {
    setCameFromExplanation(true);
    setPhase(4);
  };

  const selectedCard = engine.cards[selectedCardType];

  const ctxValue = {
    // profile
    profile,
    // engine
    engine,
    // navigation
    phase, setPhase,
    selectedCardType, setSelectedCardType,
    selectedCard,
    explanationTab, setExplanationTab,
    cameFromExplanation, setCameFromExplanation,
    // handlers
    handleAnalyze,
    handleResume,
    confirmCard,
    confirmFromExplanation,
    applySidebarChanges,
    // history
    lastDecision, saveDecision, clearHistory,
    // ui
    lang,
  };

  return (
    <AppContext.Provider value={ctxValue}>
    <div className="app-container">
      <AppSidebar
        phase={phase}
        onNewDecision={() => { setPhase(0); closeSidebar(); }}
        onMyDecisions={() => setShowMyDecisions(true)}
        onConstitution={() => setShowConstitution(true)}
        onSettings={() => setShowSettings(true)}
        lang={lang} setLang={setLang}
        langMenuOpen={langMenuOpen} setLangMenuOpen={setLangMenuOpen}
        theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        sidebarOpen={sidebarOpen} onClose={closeSidebar}
      />

      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <main className="main-content">
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Icon name="bars" />
          </button>
          <div className="mobile-logo">
            <div className="logo-icon">🧠</div>
            <span>MajorLogic</span>
          </div>
        </div>

        <ProgressBar phase={phase} onStepClick={(p) => {
          if ((p === 3 || p === 4 || p === 5) && !selectedCard) return;
          setPhase(p);
        }} />

        {engine.error && (
          <div style={{ padding: 20, background: 'rgba(244,63,94,0.1)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', borderRadius: 12, marginBottom: 20 }}>
            {engine.error}
          </div>
        )}

        {phase === 0 && lastDecision && (
          <div style={{ margin: '0 0 16px', padding: '12px 16px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Continue from your last analysis <span style={{ color: 'var(--text-tertiary)', fontSize: 12 }}>({new Date(lastDecision.savedAt).toLocaleDateString()})</span>
            </span>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={handleResume} style={{ fontSize: 13, padding: '5px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.35)', color: '#a5b4fc', cursor: 'pointer', fontWeight: 600 }}>
                Resume
              </button>
              <button onClick={clearHistory} style={{ fontSize: 13, padding: '5px 10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                Dismiss
              </button>
            </div>
          </div>
        )}

        {phase === 0 && <IntakePhase />}

        {phase === 1 && <AnalysisPhase />}

        {phase === 2 && (
          <CardsPhase
            cards={engine.cards} noResults={engine.noResults}
            decisionMetadata={engine.decisionMetadata} analysisSummary={engine.analysisSummary}
            selectedCardType={selectedCardType} onSelectCard={setSelectedCardType}
            onConfirmCard={confirmCard}
            onCardDetails={(t) => { setSelectedCardType(t); setExplanationTab('decision'); setPhase(3); }}
            onEditRequirements={() => setPhase(0)}
            priorities={profile.priorities} setPriorities={profile.setPriorities}
            budgetMin={profile.budgetMin} setBudgetMin={profile.setBudgetMin}
            budgetMax={profile.budgetMax} setBudgetMax={profile.setBudgetMax}
            isAnalyzing={engine.isAnalyzing}
            onUpdateResults={applySidebarChanges} onResetPriorities={profile.resetPriorities}
          />
        )}

        {phase === 3 && selectedCard && (
          <ExplanationPhase
            selectedCard={selectedCard}
            explanationTab={explanationTab} setExplanationTab={setExplanationTab}
            onFinalSummary={confirmFromExplanation} onBackToCards={() => setPhase(2)}
          />
        )}

        {phase === 4 && selectedCard && (
          <OwnershipPhase
            selectedCard={selectedCard}
            budgetMax={profile.budgetMax}
            cameFromExplanation={cameFromExplanation}
            onChoiceMade={setOwnershipChoice}
            onNext={() => setPhase(5)}
            onBack={() => setPhase(3)}
          />
        )}

        {phase === 5 && selectedCard && (
          <SummaryPhase
            selectedCard={selectedCard} timeline={timeline}
            ownershipChoice={ownershipChoice}
            profile={profile}
            onNewDecision={() => setPhase(0)} onBackToExplanation={() => setPhase(4)}
          />
        )}
      </main>

      {/* M3: Auth modal — always rendered, controlled by store */}
      <AuthModal />

      {/* M3: My Decisions overlay */}
      {showMyDecisions && (
        <MyDecisions
          onLoad={(decision) => {
            if (decision?.decisionSnapshot) {
              engine.restoreDecision({ cards: { [decision.decisionSnapshot.cardType ?? 'hero']: decision.decisionSnapshot } });
              setSelectedCardType(decision.decisionSnapshot.cardType ?? 'hero');
              setShowMyDecisions(false);
              setPhase(2);
            }
          }}
          onClose={() => setShowMyDecisions(false)}
        />
      )}

      {/* M12: Constitution page overlay */}
      {showConstitution && (
        <ConstitutionPage onClose={() => setShowConstitution(false)} />
      )}

      {/* M10: Settings modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </div>
    </AppContext.Provider>
  );
}
