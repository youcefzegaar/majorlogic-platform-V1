import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FlipModal from './FlipModal';

// ── Dimension helpers ─────────────────────────────────────────────────────
const DIMENSION_MAP = {
  performance_score: { key: 'performance_score', label: 'Performance', labelAr: 'الأداء',     priorityKey: 'performance', lifeKey: 'perf',        icon: '⚡' },
  battery_score:     { key: 'battery_score',     label: 'Battery',     labelAr: 'البطارية',   priorityKey: 'battery',     lifeKey: 'battery',     icon: '🔋' },
  portability_score: { key: 'portability_score', label: 'Portability', labelAr: 'الحمولية',   priorityKey: 'portability', lifeKey: 'portability', icon: '🎒' },
  display_score:     { key: 'display_score',     label: 'Display',     labelAr: 'الشاشة',     priorityKey: 'display',     lifeKey: 'display',     icon: '🖥' },
  value_score:       { key: 'value_score',       label: 'Value',       labelAr: 'القيمة',     priorityKey: 'resale',      lifeKey: 'value',       icon: '💎' },
};

function computeDims(traceScores = {}, priorities = {}) {
  return Object.values(DIMENSION_MAP)
    .map(meta => {
      const score = traceScores[meta.key] != null ? Math.round(traceScores[meta.key]) : null;
      if (score == null) return null;
      const userIdeal = Math.round(priorities[meta.priorityKey] ?? 50);
      return { ...meta, score, userIdeal, delta: score - userIdeal };
    })
    .filter(Boolean);
}

function getLifeLabel(lifeKey, score, t) {
  const band = score < 60 ? 'low' : score < 80 ? 'mid' : 'high';
  return t(`advisor.${lifeKey}_${band}`, '');
}

function getClosingQuestion(dims, major, t) {
  const worst = dims.slice().sort((a, b) => a.delta - b.delta)[0];
  if (!worst || worst.delta > -5) return t('advisor.question_clean');
  if (worst.lifeKey === 'battery')      return t('advisor.question_battery');
  if (worst.lifeKey === 'portability')  return t('advisor.question_weight');
  if (worst.lifeKey === 'perf')         return t('advisor.question_perf', { major: major || 'your major' });
  return t('advisor.question_clean');
}

function scoreColor(score) {
  if (score >= 80) return 'var(--accent-success)';
  if (score >= 62) return 'var(--accent-info)';
  if (score >= 45) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

// ── [0] ScoreCard — dimensional scores as visual bars ────────────────────
function ScoreCard({ dims, lang, t }) {
  const isAr = lang === 'ar';
  if (!dims.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 28 }}>
      {dims.map(d => {
        const color = scoreColor(d.score);
        const label = isAr ? d.labelAr : d.label;
        return (
          <div key={d.key} style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.icon} {label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color }}>{d.score}</span>
            </div>
            <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.07)' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                width: `${d.score}%`,
                background: color,
                transition: 'width 0.7s ease',
              }} />
            </div>
            {d.delta !== 0 && (
              <div style={{ fontSize: 10, color: d.delta > 4 ? 'var(--accent-success)' : d.delta < -4 ? 'var(--accent-warning)' : 'var(--text-muted)', marginTop: 5 }}>
                {d.delta > 0 ? `+${d.delta}` : d.delta} {t('advisor.vs_your_priority', 'vs your priority')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── [1] AdvisorHeader ─────────────────────────────────────────────────────
function AdvisorHeader({ name, price, badge, image, integrityScore, relaxedConstraint, candidateCount, t }) {
  const isClean = !relaxedConstraint && integrityScore >= 100;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        {image && (
          <img
            src={image} alt={name}
            style={{ width: 96, height: 96, objectFit: 'contain', borderRadius: 14, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', flexShrink: 0, padding: 8 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 6 }}>{name}</div>
          <div style={{ fontSize: 20, color: 'var(--accent-info)', fontWeight: 700, marginBottom: 10 }}>{price}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20,
              color: isClean ? 'var(--accent-success)' : 'var(--accent-warning)',
              background: isClean ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
              border: `1px solid ${isClean ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
            }}>
              {badge}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {isClean
                ? t('advisor.opening_clean', { count: candidateCount || '—' })
                : t('advisor.opening_relaxed', { constraint: relaxedConstraint || '—' })
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── [2] AdvisorStory — hero narrative ─────────────────────────────────────
function AdvisorStory({ whyChosen, naturalLanguageIntent, traceScores, priorities, t }) {
  const hasParagraphs = whyChosen && String(whyChosen).trim();

  if (!hasParagraphs) {
    const dims = computeDims(traceScores, priorities);
    const perfDim = dims.find(d => d.key === 'performance_score');
    const battDim = dims.find(d => d.key === 'battery_score');
    const fallback = perfDim && battDim
      ? t('advisor.story_fallback', { perf: perfDim.score, battery: battDim.score })
      : t('advisor.story_fallback_generic');
    return (
      <div style={{ padding: '16px 20px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 12, marginBottom: 24 }}>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.85, margin: 0 }}>{fallback}</p>
      </div>
    );
  }

  const paragraphs = String(whyChosen).split(/\n\n+/).filter(Boolean);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ padding: '18px 20px', background: 'rgba(99,102,241,0.05)', borderRadius: 12, border: '1px solid rgba(99,102,241,0.12)', marginBottom: 12 }}>
        {paragraphs.map((para, i) => (
          <p key={i} style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.85, margin: i === 0 ? 0 : '12px 0 0' }}>
            {para}
          </p>
        ))}
      </div>
      {naturalLanguageIntent && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 14px', borderInlineStart: '2px solid rgba(99,102,241,0.4)' }}>
          {t('advisor.you_said')} {t('advisor.quote_open')}{naturalLanguageIntent}{t('advisor.quote_close')}
        </div>
      )}
    </div>
  );
}

// ── [~] AdvisorContext (conditional) ──────────────────────────────────────
function AdvisorContext({ conflictsFound = [], t }) {
  const tension = conflictsFound.find(c => c.gravity > 0.4 && c.type !== 'harmony');
  if (!tension) return null;
  return (
    <div style={{ padding: '14px 16px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.18)', borderRadius: 10, marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#818cf8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {t('advisor.why_hard')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{tension.description}</div>
    </div>
  );
}

// ── [3] AdvisorTradeoff ───────────────────────────────────────────────────
function AdvisorTradeoff({ aiTradeoff, sacrificeVector = {}, flaws = [], traceScores = {}, t }) {
  let text = null;

  if (aiTradeoff) {
    text = aiTradeoff;
  } else {
    const topGate = Object.entries(sacrificeVector).sort((a, b) => {
      const av = typeof a[1] === 'object' ? (a[1].magnitude ?? 0) : 0;
      const bv = typeof b[1] === 'object' ? (b[1].magnitude ?? 0) : 0;
      return bv - av;
    })[0];

    if (topGate) {
      const info = topGate[1];
      text = typeof info === 'object' ? info.meaning : null;
      if (!text) {
        const gateKey = topGate[0];
        const dimKey = gateKey.replace('specs_', '') + '_score';
        const score = traceScores[dimKey] != null ? Math.round(traceScores[dimKey]) : null;
        const lifeKey = gateKey.replace('specs_', '');
        if (score != null) text = getLifeLabel(lifeKey, score, t);
      }
    }
  }

  if (!text && flaws.length > 0) text = flaws[0];
  if (!text) return null;

  return (
    <div style={{
      padding: '14px 18px',
      background: 'rgba(245,158,11,0.06)',
      border: '1px solid rgba(245,158,11,0.2)',
      borderInlineStart: '4px solid var(--accent-warning)',
      borderRadius: 10, marginBottom: 24,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-warning)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>
        ⚠ {t('explanation.main_tradeoff', 'Main Trade-off')}
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

// ── [4] AdvisorSocialProof ────────────────────────────────────────────────
function AdvisorSocialProof({ userSignals = [], userSignalsSource, cohortSatisfaction, t }) {
  const shown = userSignals.slice(0, 2);
  const isEngine = userSignalsSource === 'engine';
  if (!cohortSatisfaction && shown.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      {cohortSatisfaction && cohortSatisfaction.sampleSize >= 10 && (
        <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--accent-success)', fontWeight: 600 }}>
            {t('advisor.cohort_stat', { pct: cohortSatisfaction.majorMatch, major: cohortSatisfaction.major })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            {t('advisor.cohort_sample', { count: cohortSatisfaction.sampleSize })}
          </div>
        </div>
      )}
      {shown.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 }}>
            {t('advisor.similar_buyers')}
          </div>
          {shown.map((s, i) => (
            <div key={i} style={{
              fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65,
              padding: '8px 14px', borderInlineStart: `2px solid ${isEngine ? 'var(--border)' : 'rgba(99,102,241,0.4)'}`,
              marginBottom: 8, fontStyle: isEngine ? 'normal' : 'italic',
            }}>
              {!isEngine && t('advisor.quote_open')}{s}{!isEngine && t('advisor.quote_close')}
            </div>
          ))}
          {isEngine && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
              {t('advisor.engine_assessed')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── [5] AdvisorAlternatives ───────────────────────────────────────────────
function AdvisorAlternatives({ excluded = [], candidateCount, t }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? excluded : excluded.slice(0, 3);
  if (excluded.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
        {t('advisor.alternatives_lead', { count: candidateCount || excluded.length + 3 })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 13,
            padding: '10px 14px', background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)', borderRadius: 8,
          }}>
            <span style={{ color: 'var(--accent-danger)', flexShrink: 0, marginTop: 1, fontSize: 11 }}>✕</span>
            <div>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name}</span>
              <span style={{ color: 'var(--text-muted)', marginInlineStart: 8 }}>{item.reason}</span>
            </div>
          </div>
        ))}
      </div>
      {excluded.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{ background: 'none', border: 'none', color: 'var(--accent-info)', fontSize: 12, cursor: 'pointer', padding: '8px 0 0', display: 'block' }}
        >
          {showAll ? '↑' : t('advisor.see_all_alts')} ({excluded.length - 3})
        </button>
      )}
    </div>
  );
}

// ── [6] AdvisorClosing ────────────────────────────────────────────────────
function AdvisorClosing({ dims, major, ownershipStrategy, onFinalSummary, onAdjust, onFlipRequest, t }) {
  const question = getClosingQuestion(dims, major, t);
  const costPerYear = ownershipStrategy?.lifecycle?.costPerYear;
  const dailyCost = costPerYear ? (costPerYear / 365).toFixed(2) : null;

  return (
    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 14, marginBottom: 24 }}>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 14, fontStyle: 'italic' }}>
        {t('advisor.humility_opening', { years: 3 })} {t('advisor.humility_return')}
      </div>

      <div style={{ fontSize: 16, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
        {question}
      </div>

      {dailyCost && (
        <div style={{ fontSize: 13, color: 'var(--accent-success)', fontWeight: 500, marginBottom: 20 }}>
          💰 {t('advisor.cost_anchor', { cost: `$${dailyCost}` })}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={onFinalSummary} style={{ fontSize: 15, padding: '11px 28px' }}>
          {t('advisor.cta_yes')}
        </button>
        <button onClick={onAdjust} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
          {t('advisor.cta_adjust')}
        </button>
      </div>
      <button onClick={onFlipRequest} style={{ background: 'none', border: 'none', color: 'var(--accent-warning)', fontSize: 12, cursor: 'pointer', padding: 0 }}>
        <i className="fas fa-redo" style={{ marginInlineEnd: 5, fontSize: 11 }}></i>
        {t('flip.trigger', "This doesn't fit — find me something else")}
      </button>
    </div>
  );
}

// ── [7] AdvisorDisclosure (collapsible) ───────────────────────────────────
function AdvisorDisclosure({ integrityScore, irHash, relaxedConstraint, dims, t }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 4 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}
      >
        {open ? '↑' : '↓'} {t('advisor.disclosure_trigger')}
      </button>
      {open && (
        <div style={{ marginTop: 16, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
            <div>integrityScore = {integrityScore}%{integrityScore < 100 && relaxedConstraint ? ` (relaxed: "${relaxedConstraint}")` : ''}</div>
            {dims.map(d => (
              <div key={d.key}>
                {d.label.padEnd(14)} score:{String(d.score).padStart(3)}  priority:{String(d.userIdeal).padStart(3)}  delta:{' '}
                <span style={{ color: d.delta > 4 ? 'var(--accent-success)' : d.delta < -4 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                  {d.delta > 0 ? `+${d.delta}` : d.delta}
                </span>
              </div>
            ))}
            {irHash && <div style={{ marginTop: 8, wordBreak: 'break-all' }}>ir_hash: {irHash}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────
export default function AdvisorConversation({
  selectedCard,
  candidateCount,
  onFinalSummary,
  onAdjust,
  onFlip,
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [flipOpen, setFlipOpen] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  if (!selectedCard) return null;

  const handleFlip = async (flipData) => {
    setIsFlipping(true);
    try { await onFlip?.(flipData); }
    finally { setIsFlipping(false); setFlipOpen(false); }
  };

  const traceScores      = selectedCard.traceScores      ?? {};
  const priorities       = selectedCard.priorities        ?? {};
  const dims             = computeDims(traceScores, priorities);
  const integrityScore   = selectedCard.integrityScore    ?? 100;
  const irHash           = selectedCard.irHash            ?? null;
  const relaxedConstraint= selectedCard.relaxedConstraint ?? null;
  const conflictsFound   = selectedCard.conflictsFound    ?? [];

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '4px 0' }}>

      {/* ── Header: device + price + badge ── */}
      <AdvisorHeader
        name={selectedCard.name}
        price={selectedCard.price}
        badge={selectedCard.badge}
        image={selectedCard.image}
        integrityScore={integrityScore}
        relaxedConstraint={relaxedConstraint}
        candidateCount={candidateCount}
        t={t}
      />

      {/* ── Score bars ── */}
      <ScoreCard dims={dims} lang={lang} t={t} />

      {/* ── AI narrative ── */}
      <AdvisorStory
        whyChosen={selectedCard.whyChosen}
        naturalLanguageIntent={selectedCard.naturalLanguageIntent}
        traceScores={traceScores}
        priorities={priorities}
        t={t}
      />

      {/* ── Conflict context (conditional) ── */}
      <AdvisorContext conflictsFound={conflictsFound} t={t} />

      {/* ── Main trade-off ── */}
      <AdvisorTradeoff
        aiTradeoff={selectedCard.aiTradeoff}
        sacrificeVector={selectedCard.sacrificeVector}
        flaws={selectedCard.flaws}
        traceScores={traceScores}
        t={t}
      />

      {/* ── Social proof ── */}
      <AdvisorSocialProof
        userSignals={selectedCard.userSignals}
        userSignalsSource={selectedCard.userSignalsSource}
        cohortSatisfaction={selectedCard.cohortSatisfaction ?? null}
        t={t}
      />

      {/* ── Why not the alternatives ── */}
      <AdvisorAlternatives
        excluded={selectedCard.excluded}
        candidateCount={candidateCount}
        t={t}
      />

      {/* ── Closing question + CTA ── */}
      <AdvisorClosing
        dims={dims}
        major={selectedCard.priorities?.major}
        ownershipStrategy={selectedCard.ownershipStrategy}
        onFinalSummary={onFinalSummary}
        onAdjust={onAdjust}
        onFlipRequest={() => setFlipOpen(true)}
        t={t}
      />

      {flipOpen && (
        <FlipModal onClose={() => setFlipOpen(false)} onFlip={handleFlip} isFlipping={isFlipping} />
      )}

      {/* ── Technical disclosure (collapsed) ── */}
      <AdvisorDisclosure
        integrityScore={integrityScore}
        irHash={irHash}
        relaxedConstraint={relaxedConstraint}
        dims={dims}
        t={t}
      />
    </div>
  );
}
