import React, { useState, useEffect } from 'react';
import './index.css';

const RadarChart = ({ data }) => {
  const cx = 120;
  const cy = 120;
  const r = 80;
  
  const getPoint = (val, angle) => {
    const rad = (angle - 90) * Math.PI / 180;
    const distance = (val / 100) * r;
    return `${cx + distance * Math.cos(rad)},${cy + distance * Math.sin(rad)}`;
  };

  const points = [
    getPoint(data.performance, 0),
    getPoint(data.battery, 90),
    getPoint(data.portability, 180),
    getPoint(data.build, 270)
  ].join(' ');

  return (
    <svg width="240" height="240" viewBox="0 0 240 240" style={{ overflow: 'visible' }}>
      <polygon points={`${cx},${cy-r} ${cx+r},${cy} ${cx},${cy+r} ${cx-r},${cy}`} fill="rgba(255,255,255,0.02)" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
      <polygon points={`${cx},${cy-r*0.5} ${cx+r*0.5},${cy} ${cx},${cy+r*0.5} ${cx-r*0.5},${cy}`} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
      <line x1={cx} y1={cy-r} x2={cx} y2={cy+r} stroke="var(--border)" strokeWidth="1" />
      <line x1={cx-r} y1={cy} x2={cx+r} y2={cy} stroke="var(--border)" strokeWidth="1" />
      
      <text x={cx} y={cy-r-10} textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="600">Performance</text>
      <text x={cx+r+10} y={cy+4} textAnchor="start" fill="var(--text-secondary)" fontSize="12" fontWeight="600">Battery</text>
      <text x={cx} y={cy+r+20} textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="600">Portability</text>
      <text x={cx-r-10} y={cy+4} textAnchor="end" fill="var(--text-secondary)" fontSize="12" fontWeight="600">Build</text>

      <polygon points={points} fill="rgba(233, 69, 96, 0.2)" stroke="var(--accent)" strokeWidth="2" style={{ transition: 'all 0.4s ease-out' }} />
      
      <circle cx={getPoint(data.performance, 0).split(',')[0]} cy={getPoint(data.performance, 0).split(',')[1]} r="4" fill="var(--accent)" style={{ transition: 'all 0.4s ease-out' }} />
      <circle cx={getPoint(data.battery, 90).split(',')[0]} cy={getPoint(data.battery, 90).split(',')[1]} r="4" fill="var(--accent)" style={{ transition: 'all 0.4s ease-out' }} />
      <circle cx={getPoint(data.portability, 180).split(',')[0]} cy={getPoint(data.portability, 180).split(',')[1]} r="4" fill="var(--accent)" style={{ transition: 'all 0.4s ease-out' }} />
      <circle cx={getPoint(data.build, 270).split(',')[0]} cy={getPoint(data.build, 270).split(',')[1]} r="4" fill="var(--accent)" style={{ transition: 'all 0.4s ease-out' }} />
    </svg>
  );
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [lang, setLang] = useState('en');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [phase, setPhase] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState(null);

  // User Inputs
  const [goal, setGoal] = useState('');
  const [major, setMajor] = useState('cs');
  const [priorities, setPriorities] = useState({
    performance: 90,
    battery: 60,
    portability: 50,
    build: 30
  });
  const [budgetMin, setBudgetMin] = useState(1200);
  const [budgetMax, setBudgetMax] = useState(2500);
  const [analysisSummary, setAnalysisSummary] = useState({
    conflicts: 0,
    devices: 0,
    paths: 3,
    confidence: 0
  });
  const [detectedConflicts, setDetectedConflicts] = useState([]);

  // Results State
  const [cards, setCards] = useState({});
  const [selectedCardType, setSelectedCardType] = useState('hero');
  const [selectedPurchase, setSelectedPurchase] = useState('amazon');
  const [explanationTab, setExplanationTab] = useState('why-chosen');
  const [noResults, setNoResults] = useState(null);
  const [decisionMetadata, setDecisionMetadata] = useState({ relaxedConstraint: null, integrityScore: 1.0 });

  // Timeline (Simulated)
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const profile = {
        major,
        locale: lang,
        budgetUsd: budgetMax,
        preferences: {
          performance: Number(priorities.performance),
          portability: Number(priorities.portability),
          battery: Number(priorities.battery),
          display: 50,
          resale: 50
        },
        sliders: {
          performance: Number(priorities.performance),
          virtual_machines: priorities.performance > 70 ? 80 : 30,
          video_4k: priorities.performance > 80 ? 80 : 20,
          gaming: priorities.performance > 60 ? 70 : 20,
          portability: Number(priorities.portability)
        },
        context: {
          acceptsOpenBox: false,
          acceptsRefurbished: false,
          financingAllowed: true
        },
        productIntent: {
          performancePreference: "safe_balanced",
          osPreference: "windows_preferred",
          screenSize: "14_16",
          naturalLanguageIntent: goal || "I need a laptop for programming and daily use."
        }
      };

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010';
      const response = await fetch(`${apiUrl}/api/v1/laptop-student-us/decision/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (!response.ok) throw new Error('API Error');
      const result = await response.json();
      
      if (result.error) throw new Error(result.message);

      // Map API result to exact UI structure
      const newCards = {};

      const typeDetails = {
        hero: { badge: 'Hero Pick', badgeClass: 'badge-balance', icon: '💻', scoreLabel: 'High Match' },
        future_proof: { badge: 'Future Proof', badgeClass: 'badge-performance', icon: '🚀', scoreLabel: 'Exceptional Longevity' },
        smart_budget: { badge: 'Smart Budget', badgeClass: 'badge-value', icon: '💎', scoreLabel: 'Excellent Value' }
      };

      if (result.decision?.cards) {
        result.decision.cards.forEach(card => {
          const type = card.cardType || 'hero';
          const details = typeDetails[type] || typeDetails.hero;
          
          const stabilityScore = Math.round((result.decision.stabilityScore || 0.88) * 100);
          const stabilityStatus = stabilityScore >= 80 ? 'high' : stabilityScore >= 60 ? 'medium' : 'low';
          
          newCards[type] = {
            name: card.title,
            price: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
            originalPrice: (card.priceUsd && card.priceUsd < budgetMax) ? `$${budgetMax.toLocaleString()}` : null,
            badge: details.badge,
            badgeClass: details.badgeClass,
            score: Math.round(card.score || card.confidenceScore * 100 || 85),
            scoreClass: (card.score || card.confidenceScore * 100 || 85) >= 80 ? 'high' : 'medium',
            scoreLabel: details.scoreLabel,
            icon: details.icon,
            image: (() => {
              // Image Registry: maps catalog entityId → local studio image
              const IMAGE_REGISTRY = {
                'thinkpad-p1': '/laptops/thinkpad-p1-gen-6.png',
                'zephyrus-g14': '/laptops/asus-zephyrus-g14.png',
                'macbook-air': '/laptops/macbook-air-15.png',
                'macbook-pro': '/laptops/macbook-pro-14.png',
                'dell-inspiron': '/laptops/dell-inspiron-14.png',
                'acer-nitro': '/laptops/acer-nitro-v-15.png',
                'thinkpad-t14': '/laptops/lenovo-thinkpad-t14.png',
                'lenovo-loq': '/laptops/lenovo-loq-15.png',
                'proart': '/laptops/asus-proart-p16.png',
                'omnibook': '/laptops/hp-omnibook-x.png',
                'swift-go': '/laptops/acer-swift-go-14.png',
                'surface': '/laptops/surface-laptop-7.png',
                'msi-pulse': '/laptops/msi-pulse-16.png',
              };
              const id = card.entityId.toLowerCase();
              const match = Object.keys(IMAGE_REGISTRY).find(k => id.includes(k));
              return match ? IMAGE_REGISTRY[match] : '/laptops/dell-inspiron-14.png';
            })(),
            whyChosen: typeof card.whyThis === 'string' && card.whyThis.trim() !== '' ? card.whyThis : 'This device perfectly balances your priorities based on our analysis.',
            flaws: typeof card.badNews === 'string' && card.badNews.trim() !== '' ? [card.badNews] : ['Minor compromises based on budget constraints.'],
            tradeOffs: {
              gained: Array.isArray(card.topPros) && card.topPros.length > 0 ? card.topPros : ['Performance above average'],
              lost: typeof card.secondaryBadNews === 'string' && card.secondaryBadNews.trim() !== '' ? [card.secondaryBadNews] : ['Slightly heavier than average']
            },
            excluded: card.excluded && card.excluded.length > 0 ? card.excluded : [
              { name: 'Generic High-End Option', reason: 'Exceeds budget constraints' }
            ], 
            stability: {
              score: stabilityScore,
              status: stabilityStatus,
              label: stabilityScore >= 80 ? 'Stable' : 'Needs Review',
              description: 'This decision is stable because sacrifices align with your priority hierarchy. No "Gate" (core constraint) was broken.'
            },
            priorities: card.specs || { 
              performance: priorities.performance, 
              battery: priorities.battery, 
              portability: priorities.portability, 
              build: 90 
            },
            purchaseLinks: {
              amazon: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
              bestbuy: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
              direct: `$${((card.priceUsd || budgetMax) + 50).toLocaleString()}`
            }
          };
        });
      }

      if (result.decision?.status === 'no_viable_option') {
        setNoResults({
          message: result.decision.message || 'No suitable device found for your specific constraints.',
          suggestions: result.decision.suggestions || []
        });
        setCards({});
      } else {
        setNoResults(null);
        // Provide fallbacks if API missing some card types but NOT if it was explicitly a no_viable_option
        if (!newCards.hero) newCards.hero = { ...fallbackCard('Hero'), badge: 'Hero Pick', badgeClass: 'badge-balance', icon: '💻' };
        if (!newCards.future_proof) newCards.future_proof = { ...fallbackCard('Future Proof'), badge: 'Future Proof', badgeClass: 'badge-performance', icon: '🚀' };
        if (!newCards.smart_budget) newCards.smart_budget = { ...fallbackCard('Smart Budget'), badge: 'Smart Budget', badgeClass: 'badge-value', icon: '💎' };
        setCards(newCards);
      }
      
      setAnalysisSummary({
        conflicts: result.decision?.conflicts?.length ?? 0,
        devices: result.trust?.trace?.candidateCount ?? 0,
        paths: result.decision?.cards?.length ?? 0,
        confidence: Math.round((result.trust?.decisionConfidenceScore ?? 0.78) * 100)
      });
      setDecisionMetadata({
        relaxedConstraint: result.decision?.relaxedConstraint || null,
        integrityScore: result.decision?.integrityScore || 1.0
      });
      setDetectedConflicts(result.decision.conflicts || []);

      setTimeline([
        { date: new Date().toLocaleTimeString(), title: 'Initial Decision', desc: `Budget $${budgetMax}` }
      ]);

      setTimeout(() => {
        setIsAnalyzing(false);
        setPhase(1);
      }, 200);

    } catch (err) {
      console.error(err);
      setError('Could not connect to the Decision Engine.');
      setIsAnalyzing(false);
    }
  };

  const fallbackCard = (type) => ({
    name: `Standard ${type} Laptop`,
    price: '$1,000',
    originalPrice: null,
    score: 80,
    scoreClass: 'medium',
    scoreLabel: 'Good Match',
    whyChosen: 'Meets minimum specs.',
    flaws: ['Generic fallback data'],
    tradeOffs: { gained: ['Available'], lost: ['Generic'] },
    excluded: [],
    stability: { score: 70, status: 'medium', label: 'Average', description: 'Fallback logic used.' },
    priorities: { performance: 80, battery: 80, portability: 80, price: 80 },
    purchaseLinks: { amazon: '$1,000', bestbuy: '$1,000', direct: '$1,050' }
  });

  const goToPhase = (p) => setPhase(p);

  const resetSidebarChanges = () => {
    setPriorities({
      performance: 90,
      battery: 60,
      portability: 50,
      build: 30
    });
    setBudgetMax(2500);
  };

  const applySidebarChanges = async () => {
    // Add timeline event
    setTimeline(prev => [...prev, {
      date: new Date().toLocaleTimeString(),
      title: 'Priority Adjustment',
      desc: 'Updated sliders to refine results.'
    }]);
    
    const currentPhase = phase; // Remember current phase
    setIsAnalyzing(true);
    
    try {
      const profile = {
        major,
        locale: lang,
        budgetUsd: budgetMax,
        preferences: {
          performance: Number(priorities.performance),
          portability: Number(priorities.portability),
          battery: Number(priorities.battery),
          display: 50,
          resale: 50
        },
        sliders: {
          performance: Number(priorities.performance),
          virtual_machines: priorities.performance > 70 ? 80 : 30,
          video_4k: priorities.performance > 80 ? 80 : 20,
          gaming: priorities.performance > 60 ? 70 : 20,
          portability: Number(priorities.portability)
        },
        context: { acceptsOpenBox: false, acceptsRefurbished: false, financingAllowed: true },
        productIntent: {
          performancePreference: "safe_balanced",
          osPreference: "windows_preferred",
          screenSize: "14_16",
          naturalLanguageIntent: goal || "I need a laptop for programming and daily use."
        }
      };

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3010';
      const response = await fetch(`${apiUrl}/api/v1/laptop-student-us/decision/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });

      if (!response.ok) throw new Error('API Error');
      const result = await response.json();
      if (result.error) throw new Error(result.message);

      const newCards = {};
      const typeDetails = {
        hero: { badge: 'Hero Pick', badgeClass: 'badge-balance', icon: '💻', scoreLabel: 'High Match' },
        future_proof: { badge: 'Future Proof', badgeClass: 'badge-performance', icon: '🚀', scoreLabel: 'Exceptional Longevity' },
        smart_budget: { badge: 'Smart Budget', badgeClass: 'badge-value', icon: '💎', scoreLabel: 'Excellent Value' }
      };

      const IMAGE_REGISTRY = {
        'thinkpad-p1': '/laptops/thinkpad-p1-gen-6.png',
        'zephyrus-g14': '/laptops/asus-zephyrus-g14.png',
        'macbook-air': '/laptops/macbook-air-15.png',
        'macbook-pro': '/laptops/macbook-pro-14.png',
        'dell-inspiron': '/laptops/dell-inspiron-14.png',
        'acer-nitro': '/laptops/acer-nitro-v-15.png',
        'thinkpad-t14': '/laptops/lenovo-thinkpad-t14.png',
        'lenovo-loq': '/laptops/lenovo-loq-15.png',
        'proart': '/laptops/asus-proart-p16.png',
        'omnibook': '/laptops/hp-omnibook-x.png',
        'swift-go': '/laptops/acer-swift-go-14.png',
        'surface': '/laptops/surface-laptop-7.png',
        'msi-pulse': '/laptops/msi-pulse-16.png',
      };

      if (result.decision?.cards) {
        result.decision.cards.forEach(card => {
          const type = card.cardType || 'hero';
          const details = typeDetails[type] || typeDetails.hero;
          const stabilityScore = Math.round((result.decision.stabilityScore || 0.88) * 100);
          const stabilityStatus = stabilityScore >= 80 ? 'high' : stabilityScore >= 60 ? 'medium' : 'low';
          const id = card.entityId.toLowerCase();
          const imgMatch = Object.keys(IMAGE_REGISTRY).find(k => id.includes(k));

          newCards[type] = {
            name: card.title,
            price: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
            originalPrice: (card.priceUsd && card.priceUsd < budgetMax) ? `$${budgetMax.toLocaleString()}` : null,
            badge: details.badge, badgeClass: details.badgeClass,
            score: Math.round(card.score || card.confidenceScore * 100 || 85),
            scoreClass: (card.score || card.confidenceScore * 100 || 85) >= 80 ? 'high' : 'medium',
            scoreLabel: details.scoreLabel, icon: details.icon,
            image: imgMatch ? IMAGE_REGISTRY[imgMatch] : '/laptops/dell-inspiron-14.png',
            whyChosen: typeof card.whyThis === 'string' && card.whyThis.trim() !== '' ? card.whyThis : 'This device perfectly balances your priorities based on our analysis.',
            flaws: typeof card.badNews === 'string' && card.badNews.trim() !== '' ? [card.badNews] : ['Minor compromises based on budget constraints.'],
            tradeOffs: {
              gained: Array.isArray(card.topPros) && card.topPros.length > 0 ? card.topPros : ['Performance above average'],
              lost: typeof card.secondaryBadNews === 'string' && card.secondaryBadNews.trim() !== '' ? [card.secondaryBadNews] : ['Slightly heavier than average']
            },
            excluded: card.excluded && card.excluded.length > 0 ? card.excluded : [
              { name: 'Generic High-End Option', reason: 'Exceeds budget constraints' }
            ],
            stability: { score: stabilityScore, status: stabilityStatus, label: stabilityScore >= 80 ? 'Stable' : 'Needs Review', description: 'This decision is stable because sacrifices align with your priority hierarchy.' },
            priorities: card.specs || { performance: priorities.performance, battery: priorities.battery, portability: priorities.portability, build: 90 },
            purchaseLinks: {
              amazon: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
              bestbuy: `$${(card.priceUsd || budgetMax).toLocaleString()}`,
              direct: `$${((card.priceUsd || budgetMax) + 50).toLocaleString()}`
            }
          };
        });
      }

      if (result.decision?.status === 'no_viable_option') {
        setNoResults({
          message: result.decision.message || 'No suitable device found for your specific constraints.',
          suggestions: result.decision.suggestions || []
        });
        setCards({});
      } else {
        setNoResults(null);
        if (!newCards.hero) newCards.hero = { ...fallbackCard('Hero'), badge: 'Hero Pick', badgeClass: 'badge-balance', icon: '💻' };
        if (!newCards.future_proof) newCards.future_proof = { ...fallbackCard('Future Proof'), badge: 'Future Proof', badgeClass: 'badge-performance', icon: '🚀' };
        if (!newCards.smart_budget) newCards.smart_budget = { ...fallbackCard('Smart Budget'), badge: 'Smart Budget', badgeClass: 'badge-value', icon: '💎' };
        setCards(newCards);
      }
      setAnalysisSummary({
        conflicts: result.decision?.conflicts?.length ?? 0,
        devices: result.trust?.trace?.candidateCount ?? 0,
        paths: result.decision?.cards?.length ?? 0,
        confidence: Math.round((result.trust?.decisionConfidenceScore ?? 0.78) * 100)
      });
      setDecisionMetadata({
        relaxedConstraint: result.decision?.relaxedConstraint || null,
        integrityScore: result.decision?.integrityScore || 1.0
      });
      setDetectedConflicts(result.decision.conflicts || []);
      setIsAnalyzing(false);
      setPhase(currentPhase); // Stay on current phase!
    } catch (err) {
      console.error(err);
      setIsAnalyzing(false);
    }
  };

  const confirmCard = (type) => {
    setSelectedCardType(type);
    
    setTimeline(prev => [...prev, {
      date: new Date().toLocaleTimeString(),
      title: 'Final Decision',
      desc: `${cards[type].name} - ${cards[type].badge}`
    }]);

    goToPhase(4);
  };

  const selectedCard = cards[selectedCardType];

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🧠</div>
            <span>MajorLogic</span>
          </div>
        </div>
        <nav>
          <div className={`nav-item ${phase === 0 ? 'active' : ''}`} onClick={() => goToPhase(0)}>
            <i className="fas fa-plus-circle"></i>
            <span>New Decision</span>
          </div>
          <div className="nav-item">
            <i className="fas fa-history"></i>
            <span>My Decisions</span>
          </div>
          <div className="nav-item">
            <i className="fas fa-bookmark"></i>
            <span>Saved</span>
          </div>
          <div className="nav-item">
            <i className="fas fa-cog"></i>
            <span>Settings</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-tools">
            <div className="lang-dropdown" style={{ flex: 1 }}>
              <button className="tool-btn" onClick={() => setLangMenuOpen(!langMenuOpen)}>
                <i className="fas fa-globe"></i>
                <span id="current-lang">{lang.toUpperCase()}</span>
              </button>
              {langMenuOpen && (
                <div className="lang-menu show">
                  <div className={`lang-option ${lang === 'en' ? 'active' : ''}`} onClick={() => { setLang('en'); setLangMenuOpen(false); }}>
                    <span className="lang-flag">🇺🇸</span><span>English</span>
                  </div>
                  <div className={`lang-option ${lang === 'ar' ? 'active' : ''}`} onClick={() => { setLang('ar'); setLangMenuOpen(false); }}>
                    <span className="lang-flag">🇸🇦</span><span>العربية</span>
                  </div>
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

      {/* Main Content */}
      <main className="main-content">
        {/* Progress Bar */}
        <div className="progress-bar">
          {['Goal', 'Analysis', 'Cards', 'Explanation', 'Summary'].map((step, idx) => (
            <React.Fragment key={step}>
              <div 
                className={`step ${phase === idx ? 'active' : phase > idx ? 'completed' : 'pending'}`} 
                onClick={() => goToPhase(idx)}
              >
                <span className="step-number">{idx + 1}</span>
                <span>{step}</span>
              </div>
              {idx < 4 && <div className={`step-connector ${phase > idx ? 'completed' : ''}`}></div>}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div style={{ padding: 20, background: 'rgba(244,63,94,0.1)', color: 'var(--accent-danger)', border: '1px solid var(--accent-danger)', borderRadius: 12, marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Phase 0: Intake */}
        {phase === 0 && (
          <div className="phase-container active">
            <div className="intake-grid">
              <div className="intake-card full-width">
                <div className="card-header">
                  <div className="card-icon" style={{ background: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)' }}>🎯</div>
                  <div>
                    <div className="card-title">What are you trying to achieve?</div>
                    <div className="card-subtitle">Describe your goal briefly and your needs in detail</div>
                  </div>
                </div>
                <textarea 
                  className="form-input" 
                  rows="3" 
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="I need a laptop for heavy programming and working on large projects... My budget is between $1,500 and $2,500."
                ></textarea>
              </div>

              <div className="intake-card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-info)' }}>💻</div>
                  <div>
                    <div className="card-title">Your Field</div>
                    <div className="card-subtitle">Choose your primary work area</div>
                  </div>
                </div>
                <div className="specialization-grid">
                  {[
                    { id: 'cs', icon: '💻', label: 'CS / IT' },
                    { id: 'engineering', icon: '⚙️', label: 'Engineering' },
                    { id: 'design', icon: '🎨', label: 'Design' },
                    { id: 'medical', icon: '🧬', label: 'Medical' },
                    { id: 'general', icon: '📚', label: 'General' },
                    { id: 'ai', icon: '🤖', label: 'AI' }
                  ].map(spec => (
                    <div 
                      key={spec.id}
                      className={`spec-chip ${major === spec.id ? 'selected' : ''}`} 
                      onClick={() => setMajor(spec.id)}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>{spec.icon}</div>
                      {spec.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="intake-card">
                <div className="card-header">
                  <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)' }}>⚡</div>
                  <div>
                    <div className="card-title">Your Priorities</div>
                    <div className="card-subtitle">Adjust priorities by dragging</div>
                  </div>
                </div>
                <div className="priority-list">
                  {Object.entries(priorities).map(([key, val]) => (
                    <div key={key} className="priority-item">
                      <div className="priority-icon" style={{ background: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)' }}>
                        {key === 'performance' ? '⚡' : key === 'battery' ? '🔋' : key === 'portability' ? '🎒' : '🔇'}
                      </div>
                      <div className="priority-info">
                        <div className="priority-name" style={{textTransform: 'capitalize'}}>{key}</div>
                        <div className="priority-desc">{val > 80 ? 'Very high' : val > 50 ? 'Medium' : 'Low'} priority</div>
                      </div>
                      <div className="priority-slider-container">
                        <input type="range" className="priority-slider" value={val} onChange={(e) => setPriorities({...priorities, [key]: Number(e.target.value)})} />
                        <span className="priority-value">{val}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="intake-card full-width">
                <div className="card-header">
                  <div className="card-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)' }}>💰</div>
                  <div>
                    <div className="card-title">Budget</div>
                    <div className="card-subtitle">Set your available budget range</div>
                  </div>
                </div>
                <div className="budget-container">
                  <div className="budget-range">
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>$</span>
                      <input type="number" className="budget-input" style={{ paddingLeft: 24, textAlign: 'left' }} value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))} />
                    </div>
                    <input type="range" className="budget-slider" min="500" max="5000" step="50" value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} />
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>$</span>
                      <input type="number" className="budget-input" style={{ paddingLeft: 24, textAlign: 'left' }} value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                    <span>Min: $500</span>
                    <span>Selected: ${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()}</span>
                    <span>Max: $5,000</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleAnalyze} disabled={isAnalyzing}>
                <i className="fas fa-brain"></i>
                {isAnalyzing ? 'Analyzing...' : 'Analyze Decision'}
              </button>
              <button className="btn btn-secondary">
                <i className="fas fa-save"></i> Save Draft
              </button>
            </div>

            {isAnalyzing && (
              <div className="thinking-state">
                <div className="thinking-dots">
                  <div className="thinking-dot"></div><div className="thinking-dot"></div><div className="thinking-dot"></div>
                </div>
                <span style={{ color: 'var(--text-secondary)' }}>Analyzing your conflicts...</span>
              </div>
            )}
          </div>
        )}

        {/* Phase 1: Conflict Analysis */}
        {phase === 1 && (
          <div className="phase-container active">
            <div className="card">
              <div className="card-header">
                <div className="card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)' }}>⚠️</div>
                <div>
                  <div className="card-title">Analyzing Your Needs & Conflicts</div>
                  <div class="card-subtitle">4 main constraints identified that affect your decision</div>
                </div>
              </div>

              <div className="conflict-alert">
                <i className="fas fa-exclamation-triangle"></i>
                <div className="conflict-alert-text">
                  <strong>Alert:</strong> Clear conflict detected between <strong>High Performance</strong> and <strong>Battery Life</strong> with <strong>Limited Budget</strong>
                </div>
              </div>

              <div className="constraint-list">
                <div className="constraint-item">
                  <div className="constraint-status ok"><i className="fas fa-check"></i></div>
                  <div className="constraint-info">
                    <div className="constraint-name">Budget (${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()})</div>
                    <div className="constraint-detail">{analysisSummary.devices} devices available within budget</div>
                  </div>
                  <div className="constraint-tension">
                    <div className="tension-bar-bg"><div className="tension-bar-fill low" style={{width: '20%'}}></div></div>
                    <div className="tension-label">Low tension</div>
                  </div>
                </div>

                {detectedConflicts.map(insight => {
                  const isHarmony = insight.type === 'harmony';
                  const isRisk = insight.type === 'risk';
                  
                  const icon = isHarmony ? 'fa-check-circle' : isRisk ? 'fa-info-circle' : 'fa-bolt';
                  const colorClass = isHarmony ? 'ok' : isRisk ? 'info' : 'warning';
                  const barColorClass = isHarmony ? 'low' : isRisk ? 'medium' : 'high';
                  
                  return (
                    <div key={insight.id} className="constraint-item" style={{ border: isHarmony ? '1px solid rgba(16, 185, 129, 0.3)' : isRisk ? '1px solid rgba(14, 165, 233, 0.3)' : '1px solid var(--border)', background: isHarmony ? 'rgba(16, 185, 129, 0.02)' : 'var(--surface-elevated)' }}>
                      <div className={`constraint-status ${colorClass}`}><i className={`fas ${icon}`}></i></div>
                      <div className="constraint-info">
                        <div className="constraint-name">{insight.title}</div>
                        <div className="constraint-detail" style={{ lineHeight: 1.5 }}>{insight.description}</div>
                      </div>
                      <div className="constraint-tension">
                        <div className="tension-bar-bg"><div className={`tension-bar-fill ${barColorClass}`} style={{width: `${Math.round(insight.gravity * 100)}%`}}></div></div>
                        <div className="tension-label">{isHarmony ? 'Alignment' : isRisk ? 'Risk' : 'Tension'} ({Math.round(insight.gravity * 100)}%)</div>
                      </div>
                    </div>
                  );
                })}

                {detectedConflicts.length === 0 && (
                  <div className="constraint-item">
                    <div className="constraint-status ok"><i className="fas fa-check-double"></i></div>
                    <div className="constraint-info">
                      <div className="constraint-name">Excellent Harmony</div>
                      <div className="constraint-detail">Your priorities and budget are perfectly aligned. No significant compromises required.</div>
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 24 }}>
                <div style={{ padding: 16, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, width: '100%', textAlign: 'left', color: 'var(--text-primary)' }}>
                    <i className="fas fa-bullseye" style={{ color: 'var(--accent-info)', marginRight: 8 }}></i> Dimensional Profile
                  </div>
                  <RadarChart data={priorities} />
                </div>

                <div style={{ padding: 16, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-primary)' }}>
                    <i className="fas fa-chart-pie" style={{ color: 'var(--accent-warning)', marginRight: 8 }}></i> Analysis Summary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, flex: 1 }}>
                    <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>⚠️</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-warning)', lineHeight: 1 }}>{analysisSummary.conflicts}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>Conflicts</div>
                    </div>
                    <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>💻</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-success)', lineHeight: 1 }}>{analysisSummary.devices}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>Viable Devices</div>
                    </div>
                    <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>🧭</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent-info)', lineHeight: 1 }}>{analysisSummary.paths}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>Resolution Paths</div>
                    </div>
                    <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 8 }}>🎯</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: analysisSummary.confidence >= 80 ? 'var(--accent-success)' : analysisSummary.confidence >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)', lineHeight: 1 }}>{analysisSummary.confidence}%</div>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, fontWeight: 500 }}>Confidence</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="btn-group">
              <button className="btn btn-primary" onClick={() => goToPhase(2)}>
                <i className="fas fa-magic"></i> View Cards
              </button>
              <button className="btn btn-secondary" onClick={() => goToPhase(0)}>
                <i className="fas fa-arrow-left"></i> Adjust Priorities
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Decision Cards */}
        {phase === 2 && (
          <div className="phase-container active">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800 }}>Best Options for You</h2>
                <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>Adjust priorities from the sidebar to update results live</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'var(--surface)', borderRadius: 24, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Confidence Level</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--accent-success)' }}>{analysisSummary.confidence >= 80 ? 'High' : analysisSummary.confidence >= 60 ? 'Medium' : 'Low'}</span>
                <div style={{ width: 24, height: 24, borderRadius: '50%', border: `3px solid ${analysisSummary.confidence >= 80 ? 'var(--accent-success)' : analysisSummary.confidence >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: `${analysisSummary.confidence >= 80 ? 'var(--accent-success)' : analysisSummary.confidence >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)'}` }}></div>
                </div>
              </div>
            </div>

            <div className="cards-layout">
              <div className="cards-main">
                {decisionMetadata.relaxedConstraint === 'within_budget' && (
                  <div className="recovery-warning" style={{ 
                    background: 'rgba(245, 158, 11, 0.1)', 
                    color: 'var(--accent-warning)', 
                    border: '1px solid var(--accent-warning)', 
                    padding: '16px 20px', 
                    borderRadius: 12, 
                    marginBottom: 24, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 16,
                    fontSize: '14px'
                  }}>
                    <i className="fas fa-exclamation-triangle" style={{ fontSize: '20px' }}></i>
                    <div>
                      <strong style={{ display: 'block', marginBottom: 4 }}>Budget Constraint Relaxed</strong>
                      We couldn't find a device matching your exact budget and priorities. These options slightly exceed your limit but are the closest matches available.
                    </div>
                  </div>
                )}
                {noResults ? (
                  <div className="no-results-container" style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--surface)', borderRadius: 16, border: '2px dashed var(--border)' }}>
                    <div style={{ fontSize: 64, marginBottom: 20 }}>🤷‍♂️</div>
                    <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{noResults.message}</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
                      Your current requirements are too strict for our existing catalog. We couldn't find a device that satisfies all your mandatory "Gates".
                    </p>
                    {noResults.suggestions && noResults.suggestions.length > 0 && (
                      <div className="suggestions-box" style={{ background: 'rgba(245, 158, 11, 0.05)', padding: 20, borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.2)', maxWidth: 400, margin: '0 auto' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent-warning)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Optimization Suggestions</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                          {noResults.suggestions.map(s => (
                            <span key={s} className="suggestion-chip" style={{ background: 'var(--surface-elevated)', padding: '6px 12px', borderRadius: 20, fontSize: 12, border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                              Relax <strong>{s.replace('_', ' ')}</strong>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <button className="btn btn-secondary" onClick={() => goToPhase(0)} style={{ marginTop: 32 }}>
                      <i className="fas fa-edit"></i> Edit Requirements
                    </button>
                  </div>
                ) : (
                  <div className="decision-cards-grid">
                    {Object.entries(cards).map(([type, card]) => (
                    <div key={type} className={`decision-card ${selectedCardType === type ? 'recommended' : ''}`} onClick={() => setSelectedCardType(type)}>
                      {/* CSS Studio Layer */}
                      <div className="decision-card-image" style={{ 
                        padding: 0, 
                        background: 'linear-gradient(145deg, #0d1b2a 0%, #1b2838 40%, #0a1628 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minHeight: '220px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {/* Spotlight glow */}
                        <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '70%', height: '60%', background: 'radial-gradient(ellipse, rgba(100,160,255,0.08) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
                        {card.image ? (
                          <img src={card.image} alt={card.name} style={{ 
                            width: '85%', 
                            maxHeight: '180px', 
                            objectFit: 'contain', 
                            filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.6))',
                            position: 'relative',
                            zIndex: 1
                          }} />
                        ) : (
                          <span style={{ fontSize: 64 }}>{card.icon}</span>
                        )}
                        {/* Bottom reflection */}
                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(to top, rgba(13,27,42,0.95), transparent)', pointerEvents: 'none', zIndex: 2 }}></div>
                      </div>
                      <div className="decision-card-body">
                        <div className="decision-card-header">
                          <span className={`decision-card-badge ${card.badgeClass}`}>{card.badge}</span>
                        </div>
                        <div className="decision-card-name">{card.name}</div>
                        <div className="decision-card-price">{card.price} {card.originalPrice && <span className="original">{card.originalPrice}</span>}</div>

                        <div className="judgment-rating">
                          <div className={`judgment-score ${card.scoreClass}`}>{card.score}%</div>
                          <div className="judgment-label">
                            <strong>Judgment Score</strong><br/>{card.scoreLabel}
                          </div>
                        </div>

                        <div className="card-section" style={{ marginBottom: 12 }}>
                          <div className="card-section-title">Why this choice?</div>
                          <div className="card-section-text">{card.whyChosen}</div>
                        </div>
                        
                        <div className="card-section" style={{ background: 'rgba(244, 63, 94, 0.05)', border: '1px solid rgba(244, 63, 94, 0.2)', padding: '12px', borderRadius: '8px' }}>
                          <div className="card-section-title" style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="fas fa-bullhorn"></i> Real Review Consensus (The Catch)
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Aggregated from expert and user reviews across platforms</div>
                          <div className="card-section-text" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
                            {card.flaws && card.flaws[0] ? card.flaws[0] : 'No critical compromises detected in reviews.'}
                          </div>
                        </div>

                        <div className="card-actions">
                          <button className="card-action-btn select" onClick={(e) => { e.stopPropagation(); confirmCard(type); }}>
                            <i className="fas fa-check-circle"></i> Choose This Decision
                          </button>
                          <button className="card-action-btn details" onClick={(e) => { e.stopPropagation(); setSelectedCardType(type); goToPhase(3); }}>
                            <i className="fas fa-info-circle"></i> Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sidebar */}
              <div className="cards-sidebar">
                <div className="sidebar-panel">
                  <div className="sidebar-panel-title"><i className="fas fa-sliders-h"></i> Adjust Priorities</div>
                  {Object.entries(priorities).map(([key, val]) => (
                    <div key={key} className="sidebar-slider-item">
                      <div className="sidebar-slider-label">
                        <span style={{textTransform: 'capitalize'}}>{key}</span>
                        <span>{val}%</span>
                      </div>
                      <input type="range" className="sidebar-slider" value={val} onChange={(e) => setPriorities({...priorities, [key]: Number(e.target.value)})} />
                    </div>
                  ))}
                </div>
                <div className="sidebar-panel">
                  <div className="sidebar-panel-title"><i className="fas fa-wallet"></i> Budget Range</div>
                  <div className="sidebar-budget" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-muted)' }}>$</span>
                        <input type="number" className="budget-input" style={{ width: '100%', paddingLeft: 20, padding: 8, fontSize: 13 }} value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))} />
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <span style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-muted)' }}>$</span>
                        <input type="number" className="budget-input" style={{ width: '100%', paddingLeft: 20, padding: 8, fontSize: 13 }} value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="sidebar-panel">
                  <button className="sidebar-action-btn primary" onClick={applySidebarChanges} disabled={isAnalyzing} style={{ marginBottom: 8 }}>
                    <i className="fas fa-sync-alt"></i> {isAnalyzing ? 'Updating...' : 'Update Results'}
                  </button>
                  <button className="sidebar-action-btn secondary" onClick={resetSidebarChanges}>
                    <i className="fas fa-undo"></i> Reset
                  </button>
                </div>
                <div className="live-update-indicator">
                  <div className="live-dot"></div>
                  <span>Changes affect cards instantly</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 3: Explainability */}
        {phase === 3 && selectedCard && (
          <div className="phase-container active">
            <div className="selected-card-banner" style={{ display: 'flex', alignItems: 'center', gap: 24, padding: 0, overflow: 'hidden' }}>
              {/* Product Image - Studio Layer */}
              <div style={{
                width: 200, minHeight: 140,
                background: 'linear-gradient(145deg, #0d1b2a 0%, #1b2838 40%, #0a1628 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', overflow: 'hidden', borderRadius: '12px 0 0 12px', flexShrink: 0
              }}>
                <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '60%', background: 'radial-gradient(ellipse, rgba(100,160,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
                {selectedCard.image ? (
                  <img src={selectedCard.image} alt={selectedCard.name} style={{ width: '80%', maxHeight: '110px', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))', position: 'relative', zIndex: 1 }} />
                ) : (
                  <i className="fas fa-check-circle" style={{ fontSize: 48, color: 'var(--accent-success)' }}></i>
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to top, rgba(13,27,42,0.9), transparent)', pointerEvents: 'none', zIndex: 2 }}></div>
              </div>
              {/* Device Info */}
              <div style={{ flex: 1, padding: '16px 20px 16px 0' }}>
                <div className="selected-card-name" style={{ fontSize: 18 }}>{selectedCard.name}</div>
                <div className="selected-card-type" style={{ marginTop: 4 }}>{selectedCard.badge} — Judgment Score: {selectedCard.score}%</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`selected-card-badge ${selectedCard.badgeClass}`}>{selectedCard.badge}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedCard.price}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header">
                <div className="card-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-info)' }}>🔍</div>
                <div>
                  <div className="card-title">Decision Explanation in Detail</div>
                  <div className="card-subtitle">Full transparency in reasons, trade-offs, and excluded alternatives</div>
                </div>
              </div>

              <div className="explanation-tabs">
                <button className={`explanation-tab ${explanationTab === 'why-chosen' ? 'active' : ''}`} onClick={() => setExplanationTab('why-chosen')}>Why Chosen?</button>
                <button className={`explanation-tab ${explanationTab === 'excluded' ? 'active' : ''}`} onClick={() => setExplanationTab('excluded')}>Excluded Alternatives</button>
                <button className={`explanation-tab ${explanationTab === 'trade-offs' ? 'active' : ''}`} onClick={() => setExplanationTab('trade-offs')}>Trade-offs</button>
                <button className={`explanation-tab ${explanationTab === 'stability' ? 'active' : ''}`} onClick={() => setExplanationTab('stability')}>Decision Stability</button>
              </div>

              {explanationTab === 'why-chosen' && (
                <div className="explanation-content active">
                  <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20 }}>
                    {/* Product mini-studio */}
                    <div style={{
                      background: 'linear-gradient(145deg, #0d1b2a 0%, #1b2838 40%, #0a1628 100%)',
                      borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: 20, position: 'relative', overflow: 'hidden', minHeight: 160
                    }}>
                      <div style={{ position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)', width: '80%', height: '60%', background: 'radial-gradient(ellipse, rgba(100,160,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
                      {selectedCard.image ? (
                        <img src={selectedCard.image} alt={selectedCard.name} style={{ width: '90%', maxHeight: '130px', objectFit: 'contain', filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.5))', position: 'relative', zIndex: 1 }} />
                      ) : (
                        <span style={{ fontSize: 64 }}>💻</span>
                      )}
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to top, rgba(13,27,42,0.9), transparent)', pointerEvents: 'none', zIndex: 2 }}></div>
                    </div>
                    {/* Analysis */}
                    <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{selectedCard.name}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                        <strong style={{ color: 'var(--accent-success)' }}>✓</strong> {selectedCard.whyChosen}<br/>
                        {selectedCard.flaws.map(f => <div key={f}><strong style={{ color: 'var(--accent-danger)' }}>✗</strong> {f}</div>)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {explanationTab === 'trade-offs' && (
                <div className="explanation-content active">
                  <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div style={{ padding: 16, background: 'rgba(16, 185, 129, 0.05)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 700, marginBottom: 8 }}>✓ What You Gained</div>
                        {selectedCard.tradeOffs.gained.map(g => <div key={g} style={{ fontSize: 13 }}>• {g}</div>)}
                      </div>
                      <div style={{ padding: 16, background: 'rgba(244, 63, 94, 0.05)', borderRadius: 10, border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                        <div style={{ fontSize: 12, color: 'var(--accent-danger)', fontWeight: 700, marginBottom: 8 }}>✗ What You Lost</div>
                        {selectedCard.tradeOffs.lost.map(l => <div key={l} style={{ fontSize: 13 }}>• {l}</div>)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {explanationTab === 'stability' && (
                <div className="explanation-content active">
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <div className={`stability-circle ${selectedCard.stability.status}`}>
                      <div className={`stability-score ${selectedCard.stability.status}`}>{selectedCard.stability.score}%</div>
                      <div className="stability-label">{selectedCard.stability.label}</div>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
                      {selectedCard.stability.description}
                    </div>
                  </div>
                </div>
              )}

              {explanationTab === 'excluded' && (
                <div className="explanation-content active">
                  {selectedCard.excluded.map((item, idx) => (
                    <div key={idx} className="excluded-item">
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      <span className="excluded-reason">{item.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="btn-group">
              <button className="btn btn-primary" onClick={() => goToPhase(4)}><i className="fas fa-arrow-right"></i> Final Summary</button>
              <button className="btn btn-secondary" onClick={() => goToPhase(2)}><i className="fas fa-arrow-left"></i> Back to Cards</button>
            </div>
          </div>
        )}

        {/* Phase 4: Summary */}
        {phase === 4 && selectedCard && (
          <div className="phase-container active">
            <div className="final-summary-layout">
              <div>
                <div className="final-card-hero">
                  <div className="final-card-hero-header">
                    <span className={`final-card-hero-badge ${selectedCard.badgeClass}`}>{selectedCard.badge}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Final Decision</span>
                  </div>
                  <div className="final-card-hero-image" style={{
                    background: 'linear-gradient(145deg, #0d1b2a 0%, #1b2838 40%, #0a1628 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden', minHeight: 200, borderRadius: 12
                  }}>
                    <div style={{ position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '70%', height: '60%', background: 'radial-gradient(ellipse, rgba(100,160,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
                    {selectedCard.image ? (
                      <img src={selectedCard.image} alt={selectedCard.name} style={{ width: '80%', maxHeight: '170px', objectFit: 'contain', filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.6))', position: 'relative', zIndex: 1 }} />
                    ) : (
                      <span style={{ fontSize: 72 }}>{selectedCard.icon}</span>
                    )}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '35%', background: 'linear-gradient(to top, rgba(13,27,42,0.9), transparent)', pointerEvents: 'none', zIndex: 2 }}></div>
                  </div>
                  <div className="final-card-hero-body">
                    <div className="final-card-hero-name">{selectedCard.name}</div>
                    <div className="final-card-hero-price">
                      {selectedCard.price} {selectedCard.originalPrice && <span className="original">{selectedCard.originalPrice}</span>}
                    </div>

                    <div className="final-judgment">
                      <div className={`final-judgment-score ${selectedCard.scoreClass}`}>{selectedCard.score}%</div>
                      <div className="final-judgment-info">
                        <div className="final-judgment-title">Judgment Score - {selectedCard.scoreLabel}</div>
                        <div className="final-judgment-desc">Achieves core priorities</div>
                      </div>
                    </div>

                    <div className="final-section">
                      <div className="final-section-title">Why This Decision?</div>
                      <div className="final-section-text">{selectedCard.whyChosen}</div>
                    </div>

                    <div className="final-section">
                      <div className="final-section-title">Real Flaws</div>
                      <div className="final-section-text" style={{ color: 'var(--accent-danger)' }}>
                        {selectedCard.flaws.map(f => <div key={f}>• {f}</div>)}
                      </div>
                    </div>

                    <div className="final-section">
                      <div className="final-section-title">Key Trade-offs</div>
                      <div>
                        {selectedCard.tradeOffs.gained.map(g => (
                          <div key={g} className="final-trade-off">
                            <i className="fas fa-arrow-up trade-off-positive"></i>
                            <span>{g}</span>
                          </div>
                        ))}
                        {selectedCard.tradeOffs.lost.map(l => (
                          <div key={l} className="final-trade-off">
                            <i className="fas fa-arrow-down trade-off-negative"></i>
                            <span>{l}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="final-section">
                      <div className="final-section-title">Decision Stability</div>
                      <div style={{ textAlign: 'center', padding: 16 }}>
                        <div className={`stability-circle ${selectedCard.stability.status}`}>
                          <div className={`stability-score ${selectedCard.stability.status}`}>{selectedCard.stability.score}%</div>
                          <div className="stability-label">{selectedCard.stability.label}</div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                          {selectedCard.stability.description}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card" style={{ marginTop: 24 }}>
                  <div className="card-header">
                    <div className="card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)' }}>📈</div>
                    <div>
                      <div className="card-title">Decision Evolution</div>
                    </div>
                  </div>
                  <div className="evolution-timeline">
                    {timeline.map((item, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="timeline-dot" style={{ background: idx === timeline.length -1 ? 'var(--accent-success)' : 'var(--accent)' }}></div>
                        <div className="timeline-content">
                          <div className="timeline-date">{item.date}</div>
                          <div className="timeline-title">{item.title}</div>
                          <div className="timeline-desc">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <div className="purchase-section">
                  <div className="purchase-section-title"><i className="fas fa-shopping-cart"></i> Purchase Links</div>
                  
                  {['amazon', 'bestbuy', 'direct'].map(store => (
                    <div key={store} className={`purchase-option ${selectedPurchase === store ? 'selected' : ''}`} onClick={() => setSelectedPurchase(store)}>
                      <input type="radio" className="purchase-option-radio" checked={selectedPurchase === store} readOnly />
                      <div className="purchase-option-info">
                        <div className="purchase-option-name" style={{textTransform: 'capitalize'}}>
                          <i className={store === 'amazon' ? "fab fa-amazon" : store === 'bestbuy' ? "fas fa-store" : "fas fa-globe"}></i> {store}
                        </div>
                        <div className="purchase-option-price">{selectedCard.purchaseLinks[store]}</div>
                      </div>
                      <span className={`purchase-option-tag ${store !== 'direct' ? 'tag-affiliate' : 'tag-direct'}`}>
                        {store !== 'direct' ? 'Affiliate' : 'No Affiliate'}
                      </span>
                    </div>
                  ))}

                  <div className="purchase-disclosure" style={{ marginTop: 16, padding: 14, background: 'rgba(100, 116, 139, 0.08)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <i className="fas fa-info-circle" style={{ color: 'var(--accent-warning)', marginRight: 4 }}></i>
                    <strong>Affiliate Disclosure:</strong> Amazon and BestBuy links are affiliate links. We earn a small commission if you purchase through them. This <strong>does not affect</strong> the decision ranking or the price you pay. The official store has no commission.
                  </div>

                  <button className={`purchase-action-btn ${selectedPurchase}`} onClick={() => alert(`Redirecting to ${selectedPurchase} for ${selectedCard.purchaseLinks[selectedPurchase]}`)} style={{ marginTop: 16 }}>
                    <i className={selectedPurchase === 'amazon' ? "fab fa-amazon" : selectedPurchase === 'bestbuy' ? "fas fa-store" : "fas fa-globe"}></i>
                    Buy from {selectedPurchase} - {selectedCard.purchaseLinks[selectedPurchase]}
                  </button>
                </div>

                <div className="purchase-section" style={{ marginTop: 16 }}>
                  <div className="purchase-section-title">
                    <i className="fas fa-bell"></i> Future Alerts
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ padding: 12, background: 'var(--surface-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>💰</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Price Drop</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>If price drops below $1,000</div>
                      </div>
                    </div>
                    <div style={{ padding: 12, background: 'var(--surface-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>🆕</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>New Device</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>If a better device appears in your budget</div>
                      </div>
                    </div>
                    <div style={{ padding: 12, background: 'var(--surface-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 24 }}>⚡</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Spec Update</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>If your chosen device specs improve</div>
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>📧 Save Decision for Tracking</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="email" className="form-input" placeholder="Your email address" style={{ flex: 1 }} />
                      <button className="btn btn-primary" style={{ padding: '12px 20px' }} onClick={() => alert('Saved!')}>
                        <i className="fas fa-bell"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="btn-group" style={{ marginTop: 32 }}>
              <button className="btn btn-primary" onClick={() => goToPhase(0)}>
                <i className="fas fa-plus"></i> New Decision
              </button>
              <button className="btn btn-secondary" onClick={() => goToPhase(3)}>
                <i className="fas fa-arrow-left"></i> Back to Explanation
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
