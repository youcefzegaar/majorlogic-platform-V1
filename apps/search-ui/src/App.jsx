import React, { useState, useEffect } from 'react';
import {
  BrainCircuit,
  Zap,
  ShieldAlert,
  Compass,
  Info,
  Monitor,
  GraduationCap,
  SlidersHorizontal,
  CheckCircle2,
  AlertTriangle,
  Trophy,
  Wallet,
  Sparkles,
  Scale as ScaleIcon,
  Share2,
  Copy,
  Moon,
  Sun,
  Languages,
  Cpu,
  Layers,
  HardDrive,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const TRANSLATIONS = {
  EN: {
    title: "Find Your Future.",
    subtitle: "The 30-Second Cognitive Matchmaker.",
    searchPlaceholder: "Explain your needs... (e.g. 'coding and machine learning')",
    analyzeBtn: "Analyze with AI 🧠",
    analyzing: "Analyzing Specs...",
    majorBudget: "Major & Budget",
    preferences: "Personal Preferences",
    portability: "Portability",
    battery: "Battery",
    power: "Power",
    policy: "Specs-First Policy: Independent logic over marketing noise.",
    saveTitle: "Don't lose these results!",
    saveSubtitle: "Send your custom shortlist to your inbox.",
    saveBtn: "Save Path 📨",
    shareTitle: "🔥 Share Your Custom Results",
    shareSubtitle: "Help your classmates find their perfect match.",
    copyBtn: "Copy Link",
    copied: "Copied!",
    social: "Social",
    bestFor: "Best for",
    cognitiveInsight: "Cognitive Insight",
    whyThis: "Why this?",
    badNews: "Bad News",
    selectPath: "Select Path 🛒",
    affiliate: "🤝 Affiliate Disclosed",
    pure: "💎 Pure Recommendation",
    modalTitle: "One last thing...",
    modalSubtitle: "Get our 5-Step Inspection Checklist for the {item} to ensure you receive a flawless unit.",
    modalBtn: "Send Checklist & Go 🛒",
    modalSkip: "No thanks, skip to destination",
    keySpecs: "Key Specifications",
    majors: {
      cs: "Computer Science",
      eng: "Engineering",
      design: "Design / Arts",
      business: "Business"
    }
  },
  AR: {
    title: "اكتشف مستقبلك.",
    subtitle: "مستشارك الإدراكي في 30 ثانية.",
    searchPlaceholder: "اشرح احتياجاتك... (مثلاً: 'برمجة وتعلم آلة')",
    analyzeBtn: "حلل بالذكاء الاصطناعي 🧠",
    analyzing: "جاري تحليل المواصفات...",
    majorBudget: "التخصص والميزانية",
    preferences: "التفضيلات الشخصية",
    portability: "خفة الوزن",
    battery: "عمر البطارية",
    power: "قوة الأداء",
    policy: "سياسة الأرقام أولاً: منطق مستقل بعيداً عن ضجيج التسويق.",
    saveTitle: "لا تفقد هذه النتائج!",
    saveSubtitle: "أرسل قائمتك المختصرة إلى بريدك الإلكتروني.",
    saveBtn: "حفظ المسار 📨",
    shareTitle: "🔥 شارك نتائجك المخصصة",
    shareSubtitle: "ساعد زملائك في العثور على الجهاز المثالي.",
    copyBtn: "نسخ الرابط",
    copied: "تم النسخ!",
    social: "نشر",
    bestFor: "الأنسب لـ",
    cognitiveInsight: "التبصر الإدراكي",
    whyThis: "لماذا هذا؟",
    badNews: "الخبر السيئ",
    selectPath: "اختر المسار 🛒",
    affiliate: "🤝 إفصاح: يتضمن عمولة",
    pure: "💎 توصية نقية (بدون عمولة)",
    modalTitle: "شيء أخير...",
    modalSubtitle: "احصل على 'دليل الفحص المكون من 5 خطوات' لجهاز {item} لضمان استلام نسخة سليمة.",
    modalBtn: "أرسل الدليل واذهب للمتجر 🛒",
    modalSkip: "شكراً، تخطى إلى الوجهة",
    keySpecs: "المواصفات الأساسية",
    majors: {
      cs: "علوم الحاسوب",
      eng: "الهندسة",
      design: "التصميم والفنون",
      business: "الأعمال"
    }
  }
};

const MAJORS = [
  { id: 'cs', icon: '💻' },
  { id: 'eng', icon: '⚙️' },
  { id: 'design', icon: '🎨' },
  { id: 'business', icon: '📈' }
];

const App = () => {
  const [activeMajor, setActiveMajor] = useState('cs');
  const [budget, setBudget] = useState(1200);
  const [prefs, setPrefs] = useState({ portability: 50, battery: 50, power: 50 });
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState(null);
  const [showLeadModal, setShowLeadModal] = useState(false);
  const [email, setEmail] = useState('');
  const [targetEntity, setTargetEntity] = useState(null);
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [lang, setLang] = useState('EN');

  const t = TRANSLATIONS[lang];

  const handleSearch = (e) => {
    e.preventDefault();
    setIsSearching(true);
    
    // Simulate real API response from the new Decision Engine
    setTimeout(() => {
      setResults({
        status: "ok",
        stabilityScore: 0.88,
        relaxationScore: 0,
        conflicts: [
          { id: 'c1', gravity: 0.85, description: lang === 'AR' ? "تعارض: الأداء العالي يرفع السعر فوق الميزانية." : "Conflict: High performance is pushing price over budget." }
        ],
        cards: [
          {
            id: 1, type: 'HERO', icon: <Trophy size={18} />, title: "ProFlow 14 Elite", match: 98, price: 1899,
            sacrificeVector: { performance: 0.9, price: -0.4, portability: 0.1 },
            why: lang === 'EN' ? "Dominates in logic-heavy workloads." : "يهيمن في أعباء العمل المنطقية الثقيلة.",
            badNews: lang === 'EN' ? "Severe thermal throttling under 4K export." : "اختناق حراري شديد عند تصدير 4K.",
            specs: [
              { icon: <Cpu size={14} />, label: "M3 Pro" },
              { icon: <Layers size={14} />, label: "18GB" },
              { icon: <HardDrive size={14} />, label: "512GB" }
            ]
          },
          {
            id: 2, type: 'SMART BUDGET', icon: <Wallet size={18} />, title: "Nomad Air 13", match: 89, price: 899,
            sacrificeVector: { performance: 0.4, price: 0.8, portability: 0.9 },
            why: lang === 'EN' ? "Best value for mobility-first users." : "أفضل قيمة للمستخدمين المهتمين بخفة الوزن.",
            badNews: lang === 'EN' ? "Screen brightness is weak outdoors." : "سطوع الشاشة ضعيف في الخارج.",
            specs: [
              { icon: <Cpu size={14} />, label: "Ryzen 7" },
              { icon: <Layers size={14} />, label: "16GB" },
              { icon: <HardDrive size={14} />, label: "512GB" }
            ]
          }
        ]
      });
      setIsSearching(false);
    }, 1200);
  };

  const copyLink = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(window.location.href)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error("Failed to copy!", err));
    }
  };

  return (
    <div className={`app-container ${!isDarkMode ? 'light-mode' : ''} ${lang === 'AR' ? 'rtl' : ''}`} style={{ '--accent-primary': '#6366f1', direction: lang === 'AR' ? 'rtl' : 'ltr' }}>

      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 0', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', background: 'var(--accent-primary)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BrainCircuit size={20} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-1px' }}>MajorLogic <span style={{ color: 'var(--text-tertiary)', fontWeight: 400, fontSize: '0.9rem' }}>Matchmaker</span></span>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => setLang(lang === 'EN' ? 'AR' : 'EN')} className="btn btn-outline" style={{ padding: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            <Languages size={18} /> {lang}
          </button>
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="btn btn-outline" style={{ padding: '10px' }}>
            {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </nav>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '48px' }}>
        <aside>
          <div className="card" style={{ padding: '28px', position: 'sticky', top: '24px' }}>
            <section style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GraduationCap size={16} /> {t.majorBudget}
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
                {MAJORS.map(m => (
                  <button key={m.id} onClick={() => setActiveMajor(m.id)} style={{ padding: '12px 8px', borderRadius: '10px', border: '1px solid', fontSize: '0.75rem', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s', background: activeMajor === m.id ? 'var(--accent-primary)' : 'transparent', borderColor: activeMajor === m.id ? 'var(--accent-primary)' : 'var(--border-subtle)', color: activeMajor === m.id ? 'white' : 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{m.icon}</div>
                    {t.majors[m.id]}
                  </button>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-primary)' }}>${budget}</span>
              </div>
              <input type="range" min="500" max="3500" step="50" value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ width: '100%', accentColor: 'var(--accent-primary)' }} />
            </section>

            <section style={{ marginBottom: '32px', padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ fontSize: '0.75rem', color: 'white', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>{t.preferences}</h3>
              {[
                { label: t.portability, key: 'portability' },
                { label: t.battery, key: 'battery' },
                { label: t.power, key: 'power' }
              ].map(p => (
                <div key={p.key} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>
                    <span>{p.label}</span>
                    <span>{prefs[p.key]}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={prefs[p.key]} onChange={(e) => setPrefs({ ...prefs, [p.key]: Number(e.target.value) })} style={{ width: '100%', height: '4px', accentColor: 'var(--accent-primary)' }} />
                </div>
              ))}
            </section>
          </div>
        </aside>

        <main>
          <div style={{ marginBottom: '48px' }}>
            <h1 style={{ fontSize: '3.5rem', letterSpacing: '-3px', lineHeight: '1', marginBottom: '16px' }}>
              {t.title.split(' ')[0]} <span className="text-gradient">{t.title.split(' ')[1]}</span> {t.title.split(' ').slice(2).join(' ')}
            </h1>
          </div>

          <form onSubmit={handleSearch} style={{ position: 'relative', marginBottom: '64px' }}>
            <input className="search-input" placeholder={t.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} style={{ padding: '24px 32px', borderRadius: '20px', fontSize: '1.1rem', background: 'rgba(255,255,255,0.03)' }} />
            <button type="submit" className="btn-decision" style={{ position: 'absolute', [lang === 'AR' ? 'left' : 'right']: '12px', top: '50%', transform: 'translateY(-50%)', padding: '14px 28px', borderRadius: '14px' }}>
              {isSearching ? t.analyzing : t.analyzeBtn}
            </button>
          </form>

          {results && results.status === "COGNITIVE_COLLAPSE" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '64px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
               <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '24px' }} />
               <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Cognitive Collapse Detected</h2>
               <p style={{ color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 32px' }}>
                 Your constraints require relaxing more than 30% of the logical rules. A rational decision is no longer possible. 
                 Please increase budget or lower performance expectations to restore integrity.
               </p>
               <button onClick={() => setResults(null)} className="btn-decision" style={{ background: '#ef4444' }}>Restore System Logic</button>
            </motion.div>
          )}

          {results && results.status !== "COGNITIVE_COLLAPSE" && (
            <>
              {results.conflicts.map(c => (
                <motion.div key={c.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ padding: '16px 24px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '12px', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '32px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <ScaleIcon color="#f59e0b" size={20} />
                  <span style={{ fontSize: '0.9rem', color: '#f59e0b' }}>{c.description}</span>
                </motion.div>
              ))}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '32px' }}>
                {results.cards.map(card => (
                  <motion.div 
                    key={card.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card" 
                    style={{ 
                      padding: '32px',
                      position: 'relative',
                      border: `1px solid ${card.type === 'HERO' ? 'var(--accent-primary)' : 'var(--border-subtle)'}`,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '24px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ 
                        fontSize: '0.7rem', 
                        fontWeight: 800, 
                        color: card.type === 'HERO' ? 'var(--accent-primary)' : '#10b981',
                        background: 'rgba(255,255,255,0.03)',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {card.icon} {card.type}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>{card.match}%</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>STABILITY: {(results.stabilityScore * 100).toFixed(0)}%</div>
                      </div>
                    </div>

                    <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '8px' }}>{card.title}</h2>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.bestFor} {t.majors[activeMajor]}</div>
                    </div>

                    {/* Sacrifice Vector Visualizer */}
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                       <div style={{ fontSize: '0.7rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-tertiary)' }}>SACRIFICE VECTOR</div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {Object.entries(card.sacrificeVector).map(([key, val]) => (
                            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                               <span style={{ width: '80px', fontSize: '0.65rem', textTransform: 'uppercase' }}>{key}</span>
                               <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative', overflow: 'hidden' }}>
                                  <motion.div 
                                    initial={{ width: 0 }} 
                                    animate={{ width: `${Math.abs(val) * 100}%`, left: val < 0 ? 'auto' : '50%', right: val < 0 ? '50%' : 'auto' }} 
                                    style={{ height: '100%', background: val < 0 ? '#ef4444' : '#10b981', position: 'absolute' }} 
                                  />
                                  <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'rgba(255,255,255,0.2)' }} />
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#10b981', marginBottom: '4px' }}>{t.whyThis}</div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{card.why}</p>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f87171', marginBottom: '4px' }}>{t.badNews}</div>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>{card.badNews}</p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                      {card.specs.map((spec, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <span style={{ color: 'var(--accent-primary)' }}>{spec.icon}</span>
                          <span>{spec.label}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                         <div style={{ fontSize: '0.65rem', color: 'var(--text-tertiary)' }}>PRICE</div>
                         <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>${card.price}</div>
                      </div>
                      <button onClick={() => { setTargetEntity(card); setShowLeadModal(true); }} className="btn-decision">
                        {lang === 'AR' ? 'اختر المسار' : 'Select Path'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>

      <AnimatePresence>
        {showLeadModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card" style={{ maxWidth: '480px', width: '100%', padding: '48px', textAlign: 'center' }}>
              <div style={{ width: '64px', height: '64px', background: '#16a34a', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}><ShieldAlert color="white" size={32} /></div>
              <h2 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{t.modalTitle}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: '1.6' }}>{t.modalSubtitle.replace('{item}', targetEntity?.title)}</p>
              <input className="search-input" placeholder="your@university.edu" value={email} onChange={(e) => setEmail(e.target.value)} style={{ padding: '16px', borderRadius: '12px', fontSize: '1.1rem', marginBottom: '24px', textAlign: 'center' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button onClick={() => setShowLeadModal(false)} className="btn-decision" style={{ background: '#16a34a', width: '100%', padding: '16px', borderRadius: '12px' }}>{t.modalBtn}</button>
                <button onClick={() => setShowLeadModal(false)} className="btn btn-outline" style={{ border: 'none', color: 'var(--text-tertiary)' }}>{t.modalSkip}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;
