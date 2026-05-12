import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Zap,
  ShieldAlert,
  Compass,
  Monitor,
  SlidersHorizontal,
  AlertTriangle,
  Trophy,
  Wallet,
  Scale as ScaleIcon,
  Share2,
  Cpu,
  Shield,
  User,
  ArrowRight,
  History,
  Settings,
  LogOut,
  Target,
  Activity,
  Award,
  ShoppingCart,
  Mail,
  X,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  MessageSquare,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LayoutGrid = ({size}) => <Monitor size={size} />; // Fallback icon

const STAGES = [
  { id: 'goal', icon: <Compass size={18} />, label: 'Discovery' },
  { id: 'analysis', icon: <Activity size={18} />, label: 'Cognitive Load' },
  { id: 'result', icon: <LayoutGrid size={18} />, label: 'Strategic Trio' },
  { id: 'tradeoffs', icon: <ScaleIcon size={18} />, label: 'Transparency' },
  { id: 'refinement', icon: <Zap size={18} />, label: 'Refinement' },
  { id: 'summary', icon: <Shield size={18} />, label: 'Final Evolution' }
];

const App = () => {
  const [stage, setStage] = useState(0);
  const [query, setQuery] = useState('');
  const [budget, setBudget] = useState(1500);
  const [specialization, setSpecialization] = useState('Software Engineering');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);
  const [activeTab, setActiveTab] = useState('sacrifices'); // 'analysis', 'sacrifices', 'excluded'
  const [email, setEmail] = useState('');
  const [showLeadModal, setShowLeadModal] = useState(false);
  
  // Refinement Weights
  const [weights, setWeights] = useState({
    portability: 50,
    performance: 80,
    battery: 60,
    budget: 70
  });
  const [isRecalculating, setIsRecalculating] = useState(false);

  const nextStage = () => {
    if (stage === 0) triggerSearch();
    setStage(prev => Math.min(prev + 1, 5));
  };

  const prevStage = () => setStage(prev => Math.max(prev - 1, 0));

  const handleCardSelection = (card) => {
    setSelectedCard(card);
    setStage(3); 
  };

  const handleWeightChange = (key, val) => {
    setWeights(prev => ({ ...prev, [key]: parseInt(val) }));
    setIsRecalculating(true);
    setTimeout(() => setIsRecalculating(false), 800);
  };

  const triggerSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      const trioData = [
        {
          id: 'hero',
          type: 'HERO',
          badge: 'MOST STABLE',
          icon: <Trophy size={20} />,
          color: '#3B82F6',
          title: "MacBook Pro 14",
          sub: "M3 Pro / 18GB / 512GB",
          price: 1999,
          match: 94,
          scores: { performance: 95, battery: 90, portability: 85 },
          why: "The highest stability score for Computer Science. Perfectly balances Unix-native tools with sustained thermals.",
          sacrifices: ["Budget (-15%)", "Weight (+0.5lb)", "Limited Legacy Ports"],
          badNews: "Aggressive fan noise under heavy rendering loops.",
          img: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=400",
          exclusions: [
            { name: "Dell XPS 15", reason: "Thermal Throttling detected in high-load compiles." },
            { name: "Surface Laptop", reason: "Insufficient RAM for containerization." }
          ]
        },
        {
          id: 'value',
          type: 'VALUE',
          badge: 'SMART BUDGET',
          icon: <Wallet size={20} />,
          color: '#10B981',
          title: "ThinkPad T14 Gen 4",
          sub: "Ryzen 7 / 32GB / 1TB",
          price: 1249,
          match: 88,
          scores: { performance: 85, battery: 92, portability: 80 },
          why: "Maximizes local resources (RAM/SSD) while staying under your ideal budget limit.",
          sacrifices: ["Display (-20% Color Accuracy)", "Chassis (Premium Plastic)", "Webcam Quality"],
          badNews: "Speakers are mediocre for media consumption.",
          img: "https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&q=80&w=400",
          exclusions: [
            { name: "HP Pavilion", reason: "Build quality concerns under heavy daily carry." },
            { name: "Acer Swift", reason: "Keyboard flex noticed by users." }
          ]
        },
        {
          id: 'future',
          type: 'FUTURE',
          badge: 'POWER HOUSE',
          icon: <Award size={20} />,
          color: '#8B5CF6',
          title: "ASUS ROG Zephyrus G16",
          sub: "Core Ultra 9 / RTX 4070 / 32GB",
          price: 2199,
          match: 82,
          scores: { performance: 98, battery: 65, portability: 70 },
          why: "Best future-proofing for Machine Learning and 3D work.",
          sacrifices: ["Portability (Large Power Brick)", "Battery Life", "Aggressive Aesthetics"],
          badNews: "Gets extremely hot during sustained ML training sessions.",
          img: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&q=80&w=400",
          exclusions: [
            { name: "Razer Blade 16", reason: "Overpriced for the performance gain." },
            { name: "MSI Raider", reason: "Too heavy for campus daily carry." }
          ]
        }
      ];
      setResults({
        status: "ok",
        conflicts: [
          { id: 'c1', label: "Weight vs Power", val: 85, desc: "Ultra-portable chassis limits thermal dissipation for high-end GPUs." },
          { id: 'c2', label: "Budget vs Life", val: 60, desc: "Your $1500 limit makes 'Tier 1' battery cells difficult to secure." }
        ],
        trio: trioData,
        evolution: [
          { label: 'Initial Intent', val: 78 },
          { label: 'Constraint Shift', val: 86 },
          { label: 'Stabilized Result', val: 94 }
        ]
      });
      setIsSearching(false);
    }, 1500);
  };

  const navigateToStore = () => {
    window.open('https://amazon.com', '_blank');
    setShowLeadModal(false);
  };

  return (
    <div className="app-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      
      {/* 🌑 Deep Sidebar Navigation */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <BrainCircuit size={32} color="var(--accent-primary)" />
        </div>
        <div className="sidebar-nav">
          <div className="nav-item active" onClick={() => setStage(0)}><Compass size={22} /></div>
          <div className="nav-item"><History size={22} /></div>
          <div className="nav-item"><Target size={22} /></div>
          <div className="nav-item"><User size={22} /></div>
        </div>
        <div className="sidebar-footer">
          <div className="nav-item"><Settings size={22} /></div>
          <div className="nav-item"><LogOut size={22} /></div>
        </div>
      </aside>

      <div className="main-viewport">
        {/* 🧭 Top Stage Navigator */}
        <header className="wizard-nav-top">
          <div className="stage-progress">
            {STAGES.map((s, i) => (
              <React.Fragment key={s.id}>
                <div className={`stage-step ${i <= stage ? 'active' : ''} ${i === stage ? 'current' : ''}`} onClick={() => i < stage && setStage(i)}>
                  <div className="step-icon">{s.icon}</div>
                  <span className="step-label">{s.label}</span>
                </div>
                {i < STAGES.length - 1 && <div className={`step-line ${i < stage ? 'active' : ''}`} />}
              </React.Fragment>
            ))}
          </div>
        </header>

        {/* 🏗️ Dynamic Content Area */}
        <div className="content-scroll">
          <AnimatePresence mode="wait">
            
            {/* STAGE 0: DISCOVERY */}
            {stage === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="stage-panel centered">
                <div className="stage-header centered">
                  <div className="os-tag">PHASE 1: INTENT DISCOVERY</div>
                  <h1>What are we building today?</h1>
                  <p>Describe your goal in plain language. We'll map the hardware logic.</p>
                </div>
                
                <div className="discovery-grid">
                  <div className="input-container-glass">
                    <textarea 
                      className="goal-input-premium" 
                      placeholder="I need a laptop for..."
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <div className="input-footer">
                      <span><MessageSquare size={14} /> Cognitive Parser Active</span>
                    </div>
                  </div>

                  <div className="config-side-panel">
                    <div className="config-group">
                      <label>Target Specialization</label>
                      <select value={specialization} onChange={(e) => setSpecialization(e.target.value)} className="select-premium">
                        <option>Software Engineering</option>
                        <option>AI & Data Science</option>
                        <option>3D Rendering</option>
                        <option>Business Efficiency</option>
                      </select>
                    </div>
                    <div className="config-group">
                      <label>Budget Range: ${budget}</label>
                      <input type="range" min="800" max="4000" step="100" value={budget} onChange={(e) => setBudget(e.target.value)} className="weight-slider-input" />
                      <div className="flex-row j-between" style={{marginTop: '10px'}}>
                        <span className="text-small">Economy</span>
                        <span className="text-small">Flagship</span>
                      </div>
                      <label className="checkbox-container">
                        <input type="checkbox" defaultChecked />
                        <span className="checkmark"></span>
                        <span className="text-small">I'm flexible for "Perfect Match"</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="stage-footer-actions j-center">
                  <button onClick={nextStage} className="btn-primary-action large">Initialize Analysis <ArrowRight size={18} /></button>
                </div>
              </motion.div>
            )}

            {/* STAGE 1: COGNITIVE LOAD */}
            {stage === 1 && (
              <motion.div key="s1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="stage-panel">
                <div className="stage-header">
                  <div className="os-tag">PHASE 2: DIMENSIONAL TENSION</div>
                  <h1>Analyzing Your Needs...</h1>
                  <p>Resolving hardware conflicts based on your {specialization} profile.</p>
                </div>
                <div className="tension-grid">
                  {results?.conflicts.map((c, i) => (
                    <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.1 }} key={c.id} className="tension-card">
                      <div className="tension-header">
                        <span className="t-label">{c.label}</span>
                        <span className="t-gravity">{c.val}% Intensity</span>
                      </div>
                      <div className="t-bar"><motion.div initial={{ width: 0 }} animate={{ width: `${c.val}%` }} className="t-fill" /></div>
                      <p className="t-desc">{c.desc}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="stage-footer-actions">
                  <button onClick={prevStage} className="btn-ghost">Back</button>
                  <button onClick={nextStage} className="btn-primary-action">Resolve Logic & Show Trio</button>
                </div>
              </motion.div>
            )}

            {/* STAGE 2: STRATEGIC TRIO */}
            {stage === 2 && results && (
              <motion.div key="s2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stage-panel large">
                <div className="stage-header centered">
                  <h1>Best Choice for You</h1>
                  <p>Stabilized paths for your {specialization} needs.</p>
                </div>
                <div className="trio-grid">
                  {results.trio.map((card, i) => (
                    <motion.div 
                      key={card.id} 
                      initial={{ y: 50, opacity: 0 }} 
                      animate={{ y: 0, opacity: 1 }} 
                      transition={{ delay: i * 0.2 }}
                      className={`trio-card ${selectedCard?.id === card.id ? 'highlighted' : ''}`}
                    >
                      <div className="card-header-flex">
                        <div className="card-badge" style={{ background: card.color }}>{card.badge}</div>
                        <div className="overall-score">
                          <span className="score-val">{card.match}</span>
                          <span className="score-label">/100</span>
                        </div>
                      </div>

                      <div className="card-visual-compact">
                        <img src={card.img} alt={card.title} />
                      </div>

                      <div className="card-main-info">
                        <h3>{card.title}</h3>
                        <div className="price-tag">${card.price}</div>
                        <div className="card-tags">
                          <span>14" Mini-LED</span>
                          <span>{card.sub.split('/')[0]}</span>
                          <span>{card.sub.split('/')[1]}</span>
                        </div>
                      </div>

                      <div className="spec-radar">
                        <div className="radar-item">
                          <span>Performance</span>
                          <div className="radar-bar"><div style={{ width: `${card.scores.performance}%`, background: card.color }}></div></div>
                        </div>
                        <div className="radar-item">
                          <span>Battery</span>
                          <div className="radar-bar"><div style={{ width: `${card.scores.battery}%`, background: card.color }}></div></div>
                        </div>
                        <div className="radar-item">
                          <span>Portability</span>
                          <div className="radar-bar"><div style={{ width: `${card.scores.portability}%`, background: card.color }}></div></div>
                        </div>
                      </div>

                      <div className="card-summary">
                        <label>Why this choice?</label>
                        <p>{card.why}</p>
                      </div>

                      <button className="btn-card-select" style={{ background: card.color }} onClick={() => handleCardSelection(card)}>View Full Logic</button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STAGE 3: TRANSPARENCY (TABBED) */}
            {stage === 3 && selectedCard && (
              <motion.div key="s3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stage-panel">
                <div className="transparency-container-boxed">
                  <div className="transparency-tabs">
                    <button className={activeTab === 'analysis' ? 'active' : ''} onClick={() => setActiveTab('analysis')}>Detailed Analysis</button>
                    <button className={activeTab === 'sacrifices' ? 'active' : ''} onClick={() => setActiveTab('sacrifices')}>The Sacrifices</button>
                    <button className={activeTab === 'excluded' ? 'active' : ''} onClick={() => setActiveTab('excluded')}>Excluded Alternatives</button>
                  </div>

                  <div className="tab-content">
                    {activeTab === 'analysis' && (
                      <div className="analysis-view">
                        <div className="analysis-hero">
                          <img src={selectedCard.img} />
                          <div className="analysis-text">
                            <h2>{selectedCard.title}</h2>
                            <p>{selectedCard.why}</p>
                            <div className="affiliate-badge"><Info size={14}/> This is an affiliate link. Selection logic remains objective.</div>
                          </div>
                        </div>
                        <table className="spec-table-premium">
                          <thead><tr><th>Hardware Component</th><th>Logic Grade</th></tr></thead>
                          <tbody>
                            <tr><td>SoC / Processor</td><td>Grade A+ ({selectedCard.sub.split('/')[0]})</td></tr>
                            <tr><td>Memory (RAM)</td><td>{selectedCard.sub.split('/')[1]} - High Stability</td></tr>
                            <tr><td>Thermal Management</td><td>{selectedCard.badNews.includes('hot') ? 'Poor' : 'Excellent'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                    {activeTab === 'sacrifices' && (
                      <div className="sacrifices-view">
                        <h3>What will you give up?</h3>
                        <div className="sac-grid">
                          {selectedCard.sacrifices.map((s, i) => (
                            <div key={i} className="sac-card-mini">
                              <AlertTriangle color="var(--danger)" />
                              <div className="sac-info">
                                <strong>{s.split('(')[0]}</strong>
                                <span>{s.includes('(') ? s.split('(')[1].replace(')', '') : 'Impact on Experience'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="defect-box">
                          <div className="label">Critical Review Signal:</div>
                          <p>"{selectedCard.badNews}"</p>
                        </div>
                      </div>
                    )}
                    {activeTab === 'excluded' && (
                      <div className="excluded-view">
                        <h3>Why we rejected these:</h3>
                        <div className="excluded-list-vertical">
                          {selectedCard.exclusions.map((ex, i) => (
                            <div key={i} className="ex-item-box">
                              <div className="ex-title">
                                <strong>{ex.name}</strong>
                                <X size={18} color="var(--danger)" />
                              </div>
                              <p>{ex.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="stage-footer-actions">
                  <button onClick={() => setStage(2)} className="btn-ghost">Back to Trio</button>
                  <button onClick={nextStage} className="btn-primary-action">Refine Decision Weights</button>
                </div>
              </motion.div>
            )}

            {/* STAGE 4: REFINEMENT */}
            {stage === 4 && selectedCard && (
              <motion.div key="s4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stage-panel">
                <div className="stage-header">
                  <h1>Predictive Refinement</h1>
                  <p>Fine-tune the weights to see how the {selectedCard.title} adapts.</p>
                </div>
                
                <div className="refinement-layout-split">
                  <div className="refinement-controls">
                    {['performance', 'battery', 'portability', 'budget'].map(key => (
                      <div key={key} className="weight-group">
                        <label>{key.toUpperCase()}: {weights[key]}%</label>
                        <input type="range" value={weights[key]} onChange={(e) => handleWeightChange(key, e.target.value)} className="weight-slider-input" />
                      </div>
                    ))}
                  </div>
                  
                  <div className="prediction-panel">
                    {isRecalculating ? (
                      <div className="recalculating"><RefreshCw className="spin" /> Updating Model...</div>
                    ) : (
                      <div className="prediction-results">
                        <div className="prediction-item">
                          <span>Predicted Portability</span>
                          <span className={weights.portability > 50 ? 'pos' : 'neg'}>
                            {weights.portability > 50 ? <ArrowUpRight /> : <ArrowDownRight />}
                            {Math.abs(weights.portability - 50)}%
                          </span>
                        </div>
                        <div className="prediction-item">
                          <span>Battery Life Impact</span>
                          <span className={weights.battery > 60 ? 'pos' : 'neg'}>
                            {weights.battery > 60 ? <ArrowUpRight /> : <ArrowDownRight />}
                            {Math.abs(weights.battery - 60)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="stage-footer-actions">
                  <button onClick={() => setStage(3)} className="btn-ghost">Back</button>
                  <button onClick={nextStage} className="btn-primary-action">Confirm Evolution</button>
                </div>
              </motion.div>
            )}

            {/* STAGE 5: SUMMARY & EVOLUTION */}
            {stage === 5 && selectedCard && (
              <motion.div key="s5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="stage-panel">
                <div className="evolution-summary-container">
                  <div className="evolution-timeline-header">
                    <h2>Decision Evolution</h2>
                    <p>How your requirements matured into this choice.</p>
                    <div className="timeline-visual">
                      <div className="line"></div>
                      <div className="dots">
                        <div className="dot active">1</div>
                        <div className="dot active">2</div>
                        <div className="dot active">3</div>
                      </div>
                    </div>
                  </div>

                  <div className="delta-comparison-table">
                    <h3>What changed in your decision?</h3>
                    <div className="delta-row">
                      <span>Requirement Weighting</span>
                      <div className="delta-vals">
                        <span className="old">80% Perf</span>
                        <ArrowRight size={14} />
                        <span className="new">{weights.performance}% Perf</span>
                      </div>
                    </div>
                    <div className="delta-row">
                      <span>Expected Battery Life</span>
                      <div className="delta-vals">
                        <span className="old">10hrs</span>
                        <ArrowRight size={14} />
                        <span className="new">{10 + (weights.battery - 60)/10}hrs</span>
                      </div>
                    </div>
                  </div>

                  <div className="final-checkout-card">
                    <img src={selectedCard.img} />
                    <div className="details">
                      <h3>{selectedCard.title}</h3>
                      <div className="final-score">Match: {selectedCard.match}%</div>
                      <button className="btn-primary-action large" onClick={() => setShowLeadModal(true)}>Go to Store</button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* LEAD MODAL (Same as before but improved styling) */}
      <AnimatePresence>
        {showLeadModal && (
          <div className="modal-overlay" onClick={() => setShowLeadModal(false)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="modal-card">
               <h2>One Last Step...</h2>
               <p>We've generated a <strong>Hardware Checklist</strong> specifically for the {selectedCard?.title}. Want us to send it to you?</p>
               <input 
                 className="email-input-premium" 
                 placeholder="Enter email (or leave blank to skip)" 
                 value={email} 
                 onChange={e => setEmail(e.target.value)} 
               />
               <button onClick={navigateToStore} className="btn-primary-action">
                 {email ? 'Send & Continue' : 'Skip & Continue'}
               </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
