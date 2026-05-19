import { useState, useEffect } from 'react';
import './index.css';

import { useSessionProfile } from './hooks/useSessionProfile';
import { useDecisionEngine } from './hooks/useDecisionEngine';
import { useDecisionStore } from './stores/decisionStore';

import AppSidebar from './components/shared/AppSidebar';
import ProgressBar from './components/shared/ProgressBar';
import IntakePhase from './components/intake/IntakePhase';
import AnalysisPhase from './components/shared/AnalysisPhase';
import CardsPhase from './components/results/CardsPhase';
import ExplanationPhase from './components/results/ExplanationPhase';
import SummaryPhase from './components/results/SummaryPhase';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    phase, setPhase,
    selectedCardType, setSelectedCardType,
    explanationTab, setExplanationTab,
    selectedPurchase, setSelectedPurchase
  } = useDecisionStore();

  const profile = useSessionProfile();
  const engine = useDecisionEngine();

  useEffect(() => { document.body.setAttribute('data-theme', theme); }, [theme]);

  const closeSidebar = () => setSidebarOpen(false);

  const handleAnalyze = async () => {
    const success = await engine.runDecision({ ...profile, lang });
    if (success) {
      setTimeline([{ date: new Date().toLocaleTimeString(), title: 'Initial Decision', desc: `Budget $${profile.budgetMax}` }]);
      setTimeout(() => setPhase(1), 200);
    }
  };

  const applySidebarChanges = async () => {
    setTimeline(prev => [...prev, { date: new Date().toLocaleTimeString(), title: 'Priority Adjustment', desc: 'Updated sliders to refine results.' }]);
    await engine.runDecision({ ...profile, lang });
  };

  const confirmCard = (type) => {
    setSelectedCardType(type);
    setTimeline(prev => [...prev, { date: new Date().toLocaleTimeString(), title: 'Final Decision', desc: `${engine.cards[type].name} - ${engine.cards[type].badge}` }]);
    setPhase(4);
  };

  const selectedCard = engine.cards[selectedCardType];

  return (
    <div className="app-container">
      <AppSidebar
        phase={phase}
        onNewDecision={() => { setPhase(0); closeSidebar(); }}
        lang={lang} setLang={setLang}
        langMenuOpen={langMenuOpen} setLangMenuOpen={setLangMenuOpen}
        theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        sidebarOpen={sidebarOpen} onClose={closeSidebar}
      />

      {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}

      <main className="main-content">
        <div className="mobile-header">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <i className="fas fa-bars"></i>
          </button>
          <div className="mobile-logo">
            <div className="logo-icon">🧠</div>
            <span>MajorLogic</span>
          </div>
        </div>

        <ProgressBar phase={phase} onStepClick={(p) => {
          if ((p === 3 || p === 4) && !selectedCard) return;
          setPhase(p);
        }} />

        {engine.error && (
          <div style={{ padding: 20, background: 'rgba(244,63,94,0.1)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', borderRadius: 12, marginBottom: 20 }}>
            {engine.error}
          </div>
        )}

        {phase === 0 && (
          <IntakePhase
            goal={profile.goal} setGoal={profile.setGoal}
            major={profile.major} setMajor={profile.setMajor}
            priorities={profile.priorities} setPriorities={profile.setPriorities}
            budgetMin={profile.budgetMin} setBudgetMin={profile.setBudgetMin}
            budgetMax={profile.budgetMax} setBudgetMax={profile.setBudgetMax}
            isAnalyzing={engine.isAnalyzing} onAnalyze={handleAnalyze}
          />
        )}

        {phase === 1 && (
          <AnalysisPhase
            priorities={profile.priorities}
            analysisSummary={engine.analysisSummary}
            detectedConflicts={engine.detectedConflicts}
            budgetMin={profile.budgetMin} budgetMax={profile.budgetMax}
            onViewCards={() => setPhase(2)} onAdjustPriorities={() => setPhase(0)}
          />
        )}

        {phase === 2 && (
          <CardsPhase
            cards={engine.cards} noResults={engine.noResults}
            decisionMetadata={engine.decisionMetadata} analysisSummary={engine.analysisSummary}
            selectedCardType={selectedCardType} onSelectCard={setSelectedCardType}
            onConfirmCard={confirmCard}
            onCardDetails={(t) => { setSelectedCardType(t); setPhase(3); }}
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
            onFinalSummary={() => setPhase(4)} onBackToCards={() => setPhase(2)}
          />
        )}

        {phase === 4 && selectedCard && (
          <SummaryPhase
            selectedCard={selectedCard} timeline={timeline}
            selectedPurchase={selectedPurchase} setSelectedPurchase={setSelectedPurchase}
            onNewDecision={() => setPhase(0)} onBackToExplanation={() => setPhase(3)}
          />
        )}
      </main>
    </div>
  );
}
