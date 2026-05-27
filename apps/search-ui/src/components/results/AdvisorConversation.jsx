import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import FlipModal from './FlipModal';

// ── Dimension helpers ─────────────────────────────────────────────────────
const DIMENSION_MAP = {
  performance_score: { key: 'performance_score', label: 'Performance', priorityKey: 'performance', lifeKey: 'perf' },
  battery_score:     { key: 'battery_score',     label: 'Battery',     priorityKey: 'battery',     lifeKey: 'battery' },
  portability_score: { key: 'portability_score', label: 'Portability', priorityKey: 'portability', lifeKey: 'portability' },
  display_score:     { key: 'display_score',     label: 'Display',     priorityKey: 'display',     lifeKey: 'display' },
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
  if (worst.lifeKey === 'battery') return t('advisor.question_battery');
  if (worst.lifeKey === 'portability') return t('advisor.question_weight');
  if (worst.lifeKey === 'perf') return t('advisor.question_perf', { major: major || 'your major' });
  return t('advisor.question_clean');
}

// ── [1] AdvisorHeader ─────────────────────────────────────────────────────
function AdvisorHeader({ name, price, badge, image, integrityScore, relaxedConstraint, candidateCount, t }) {
  const isClean = !relaxedConstraint && integrityScore >= 100;
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', marginBottom: 28 }}>
      {image && (
        <img
          src={image}
          alt={name}
          style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 12, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      )}
      <div style={{ flex: 1 }}>
        {!isClean && (
          <div style={{
            fontSize: 12, color: 'var(--accent-warning)',
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8, padding: '8px 12px', marginBottom: 10, lineHeight: 1.6,
          }}>
            {t('advisor.opening_relaxed', { constraint: relaxedConstraint || '—' })}
          </div>
        )}
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.25 }}>{name}</div>
        <div style={{ fontSize: 15, color: 'var(--accent-info)', marginTop: 4, fontWeight: 500 }}>{price}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
          {isClean
            ? t('advisor.opening_clean', { count: candidateCount || '—' })
            : t('advisor.opening_after_relax', { count: candidateCount || '—' })
          }
        </div>
        <div style={{ marginTop: 8 }}>
          <span style={{
            display: 'inline-block',
            fontSize: 11, fontWeight: 600,
            color: isClean ? 'var(--accent-success)' : 'var(--accent-warning)',
            background: isClean ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${isClean ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            borderRadius: 6, padding: '3px 10px',
          }}>
            {badge}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── [2] AdvisorStory ──────────────────────────────────────────────────────
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
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.85, margin: 0 }}>{fallback}</p>
      </div>
    );
  }

  const paragraphs = String(whyChosen).split(/\n\n+/).filter(Boolean);
  return (
    <div style={{ marginBottom: 28 }}>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.85, margin: '0 0 14px 0' }}>
          {para}
        </p>
      ))}
      {naturalLanguageIntent && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4, paddingInlineStart: 12, borderInlineStart: '2px solid var(--border)' }}>
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
    <div style={{
      padding: '14px 16px',
      background: 'rgba(99,102,241,0.05)',
      border: '1px solid rgba(99,102,241,0.18)',
      borderRadius: 10, marginBottom: 24,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#818cf8', marginBottom: 6 }}>
        {t('advisor.why_hard')}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
        {tension.description}
      </div>
    </div>
  );
}

// ── [3] AdvisorTradeoff ───────────────────────────────────────────────────
function AdvisorTradeoff({ aiTradeoff, sacrificeVector = {}, flaws = [], traceScores = {}, t }) {
  // Priority: aiTradeoff → sacrifice vector meaning → life label from lowest score → flaws[0]
  let text = null;

  if (aiTradeoff) {
    text = aiTradeoff;
  } else {
    const topGate = Object.entries(sacrificeVector).sort((a, b) => {
      const aVal = typeof a[1] === 'object' ? (a[1].magnitude ?? 0) : 0;
      const bVal = typeof b[1] === 'object' ? (b[1].magnitude ?? 0) : 0;
      return bVal - aVal;
    })[0];

    if (topGate) {
      const info = topGate[1];
      text = typeof info === 'object' ? info.meaning : null;
      if (!text) {
        const gateKey = topGate[0]; // e.g. specs_battery
        const dimKey = gateKey.replace('specs_', '') + '_score'; // battery_score
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
      padding: '14px 16px',
      background: 'rgba(245,158,11,0.05)',
      border: '1px solid rgba(245,158,11,0.18)',
      borderInlineStart: '3px solid var(--accent-warning)',
      borderRadius: 10, marginBottom: 24,
    }}>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{text}</div>
    </div>
  );
}

// ── [4] AdvisorSocialProof ────────────────────────────────────────────────
function AdvisorSocialProof({ userSignals = [], userSignalsSource, cohortSatisfaction, t }) {
  const shown = userSignals.slice(0, 2);
  const isEngine = userSignalsSource === 'engine';

  return (
    <div style={{ marginBottom: 24 }}>
      {cohortSatisfaction && cohortSatisfaction.sampleSize >= 10 && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(16,185,129,0.05)',
          border: '1px solid rgba(16,185,129,0.18)',
          borderRadius: 10, marginBottom: 16,
        }}>
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
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
            {t('advisor.similar_buyers')}
          </div>
          {isEngine
            ? shown.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, paddingInlineStart: 12, borderInlineStart: '2px solid var(--border)' }}>
                  {s}
                </div>
              ))
            : shown.map((s, i) => (
                <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: 10 }}>
                  {t('advisor.quote_open')}{s}{t('advisor.quote_close')}
                </div>
              ))
          }
          {isEngine && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>
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
  const shown = showAll ? excluded : excluded.slice(0, 2);
  if (excluded.length === 0) return null;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
        {t('advisor.alternatives_lead', { count: candidateCount || excluded.length + 3 })}
      </div>
      {shown.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13 }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 500, flexShrink: 0 }}>{item.name}</span>
          <span style={{ color: 'var(--text-muted)' }}>—</span>
          <span style={{ color: 'var(--text-muted)' }}>{item.reason}</span>
        </div>
      ))}
      {excluded.length > 2 && (
        <button
          onClick={() => setShowAll(!showAll)}
          style={{ background: 'none', border: 'none', color: 'var(--accent-info)', fontSize: 12, cursor: 'pointer', padding: 0, marginTop: 4 }}
        >
          {showAll ? '↑' : t('advisor.see_all_alts')}
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
    <div style={{ marginBottom: 24 }}>
      {/* Epistemic humility */}
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' }}>
        {t('advisor.humility_opening', { years: 3 })}
        {' '}{t('advisor.humility_return')}
      </div>

      {/* Closing question */}
      <div style={{ fontSize: 15, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 16, lineHeight: 1.5 }}>
        {question}
      </div>

      {/* Daily cost anchor */}
      {dailyCost && (
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
          {t('advisor.cost_anchor', { cost: `$${dailyCost}` })}
        </div>
      )}

      {/* CTAs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
        <button className="btn btn-primary" onClick={onFinalSummary} style={{ fontSize: 15, padding: '10px 24px' }}>
          {t('advisor.cta_yes')}
        </button>
        <button
          onClick={onAdjust}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
        >
          {t('advisor.cta_adjust')}
        </button>
      </div>
      <button
        onClick={onFlipRequest}
        style={{ background: 'none', border: 'none', color: 'var(--accent-warning)', fontSize: 12, cursor: 'pointer', padding: 0 }}
      >
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
    <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', padding: 0 }}
      >
        {open ? '↑' : '↓'} {t('advisor.disclosure_trigger')}
      </button>

      {open && (
        <div style={{ marginTop: 16, padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.9 }}>
            <div>integrityScore = {integrityScore}%{integrityScore < 100 && relaxedConstraint ? ` (relaxed: "${relaxedConstraint}")` : ''}</div>
            {dims.map(d => (
              <div key={d.key}>
                {d.label.padEnd(14)} device: {String(d.score).padStart(3)}  priority: {String(d.userIdeal).padStart(3)}  delta:{' '}
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
  const { t } = useTranslation();
  const [flipOpen, setFlipOpen] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);

  if (!selectedCard) return null;

  const handleFlip = async (flipData) => {
    setIsFlipping(true);
    try {
      await onFlip?.(flipData);
    } finally {
      setIsFlipping(false);
      setFlipOpen(false);
    }
  };

  const traceScores = selectedCard.traceScores ?? {};
  const priorities  = selectedCard.priorities  ?? {};
  const dims = computeDims(traceScores, priorities);

  const integrityScore    = selectedCard.integrityScore    ?? 100;
  const irHash            = selectedCard.irHash            ?? null;
  const relaxedConstraint = selectedCard.relaxedConstraint ?? null;
  const conflictsFound    = selectedCard.conflictsFound    ?? [];

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '4px 0' }}>
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

      <AdvisorStory
        whyChosen={selectedCard.whyChosen}
        naturalLanguageIntent={selectedCard.naturalLanguageIntent}
        traceScores={traceScores}
        priorities={priorities}
        t={t}
      />

      <AdvisorContext conflictsFound={conflictsFound} t={t} />

      <AdvisorTradeoff
        aiTradeoff={selectedCard.aiTradeoff}
        sacrificeVector={selectedCard.sacrificeVector}
        flaws={selectedCard.flaws}
        traceScores={traceScores}
        t={t}
      />

      <AdvisorSocialProof
        userSignals={selectedCard.userSignals}
        userSignalsSource={selectedCard.userSignalsSource}
        cohortSatisfaction={selectedCard.cohortSatisfaction ?? null}
        t={t}
      />

      <AdvisorAlternatives
        excluded={selectedCard.excluded}
        candidateCount={candidateCount}
        t={t}
      />

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
        <FlipModal
          onClose={() => setFlipOpen(false)}
          onFlip={handleFlip}
          isFlipping={isFlipping}
        />
      )}

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
