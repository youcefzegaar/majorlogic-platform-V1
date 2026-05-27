import { useState, useEffect } from 'react';
import './index.css';

import i18n from './i18n/index.js';
import { getDir } from './i18n/languages.js';
import { useSessionProfile } from './hooks/useSessionProfile';
import { useDecisionEngine } from './hooks/useDecisionEngine';
import { useDecisionStore } from './stores/decisionStore';

import AppSidebar from './components/shared/AppSidebar';
import SettingsModal from './components/shared/SettingsModal';
import MyDecisionsModal from './components/shared/MyDecisionsModal';
import ProgressBar from './components/shared/ProgressBar';
import IntakePhase from './components/intake/IntakePhase';
import AnalysisPhase from './components/shared/AnalysisPhase';
import CardsPhase from './components/results/CardsPhase';
import ExplanationPhase from './components/results/ExplanationPhase';
import SummaryPhase from './components/results/SummaryPhase';
import OwnershipPhase from './components/results/OwnershipPhase';

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [myDecisionsOpen, setMyDecisionsOpen] = useState(false);
  const [ownershipChoice, setOwnershipChoice] = useState(null);
  const [intakeAnswers, setIntakeAnswers] = useState({});

  const {
    phase, setPhase,
    selectedCardType, setSelectedCardType,
    explanationTab, setExplanationTab,
    cameFromExplanation, setCameFromExplanation,
  } = useDecisionStore();

  const profile = useSessionProfile();
  const engine = useDecisionEngine();

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
    const success = await engine.runDecision({ ...profile, lang, intakeAnswers });
    if (success) {
      setTimeline([{ date: new Date().toLocaleTimeString(), title: 'Initial Decision', desc: `Budget $${profile.budgetMax}` }]);
      setTimeout(() => setPhase(1), 200);
    }
  };

  const applySidebarChanges = async () => {
    setTimeline(prev => [...prev, { date: new Date().toLocaleTimeString(), title: 'Priority Adjustment', desc: 'Updated sliders to refine results.' }]);
    await engine.runDecision({ ...profile, lang, intakeAnswers });
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

  const handleFlip = async ({ priorityDelta }) => {
    const updatedPriorities = { ...profile.priorities };
    if (priorityDelta.portability) {
      updatedPriorities.portability = Math.min(100, (updatedPriorities.portability ?? 50) + priorityDelta.portability);
    }
    if (priorityDelta.battery) {
      updatedPriorities.battery = Math.min(100, (updatedPriorities.battery ?? 50) + priorityDelta.battery);
    }
    if (priorityDelta.budgetMax) {
      profile.setBudgetMax(Math.max(300, profile.budgetMax + priorityDelta.budgetMax));
    }
    if (priorityDelta.portability || priorityDelta.battery) {
      profile.setPriorities(updatedPriorities);
    }
    const newBudget = priorityDelta.budgetMax ? Math.max(300, profile.budgetMax + priorityDelta.budgetMax) : profile.budgetMax;
    await engine.runDecision({ ...profile, priorities: updatedPriorities, budgetMax: newBudget, lang, intakeAnswers });
    setPhase(2);
  };

  const selectedCard = engine.cards[selectedCardType];

  return (
    <div className="app-container">
      <AppSidebar
        phase={phase}
        onNewDecision={() => { setPhase(0); closeSidebar(); }}
        onMyDecisions={() => { setMyDecisionsOpen(true); closeSidebar(); }}
        onSettings={() => { setSettingsOpen(true); closeSidebar(); }}
        lang={lang} setLang={setLang}
        langMenuOpen={langMenuOpen} setLangMenuOpen={setLangMenuOpen}
        theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        sidebarOpen={sidebarOpen} onClose={closeSidebar}
      />

      {settingsOpen && (
        <SettingsModal
          lang={lang} setLang={setLang}
          theme={theme} toggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {myDecisionsOpen && (
        <MyDecisionsModal
          cards={engine.cards}
          selectedCardType={selectedCardType}
          onClose={() => setMyDecisionsOpen(false)}
          onNewDecision={() => { setPhase(0); setMyDecisionsOpen(false); }}
        />
      )}

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
          if ((p === 3 || p === 4 || p === 5) && !selectedCard) return;
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
            onAnswersChange={setIntakeAnswers}
          />
        )}

        {phase === 1 && (
          <AnalysisPhase
            priorities={profile.priorities}
            analysisSummary={engine.analysisSummary}
            detectedConflicts={engine.detectedConflicts}
            decisionMetadata={engine.decisionMetadata}
            budgetMin={profile.budgetMin} budgetMax={profile.budgetMax}
            onViewCards={() => setPhase(2)} onAdjustPriorities={() => setPhase(0)}
            intakeAnswers={intakeAnswers}
          />
        )}

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
            candidateCount={engine.analysisSummary.devices}
            onFinalSummary={confirmFromExplanation} onBackToCards={() => setPhase(2)}
            onFlip={handleFlip}
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
            onNewDecision={() => setPhase(0)} onBackToExplanation={() => setPhase(4)}
          />
        )}
      </main>
    </div>
  );
}
