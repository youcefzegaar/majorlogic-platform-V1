import { useTranslation } from 'react-i18next';
import DecisionTrust from '../shared/DecisionTrust';
import { OWNERSHIP_MODE_LABELS } from '../../i18n/ownershipLabels.js';

const GATE_NAMES = {
  specs_performance: 'performance',
  specs_battery: 'battery',
  specs_portability: 'portability',
  specs_display: 'display quality',
  specs_resale: 'resale value',
  budgetUsd: 'maximum budget',
};

const DIMENSION_MAP = {
  performance_score: { label: 'Performance', priorityKey: 'performance' },
  display_score:     { label: 'Display',      priorityKey: 'display'      },
  portability_score: { label: 'Portability',  priorityKey: 'portability'  },
  battery_score:     { label: 'Battery',      priorityKey: 'battery'      },
  value_score:       { label: 'Value',        priorityKey: 'resale'       },
  // economic_score is intentionally absent: resolveScore() aliases it through value_score
};

function resolveScore(traceScores, key) {
  if (traceScores[key] != null) return Math.round(traceScores[key]);
  if (key === 'value_score' && traceScores.economic_score != null)
    return Math.round(traceScores.economic_score);
  return null;
}

function computeDims(traceScores = {}, priorities = {}) {
  const seen = new Set();
  return Object.keys(DIMENSION_MAP)
    .filter(k => {
      const meta = DIMENSION_MAP[k];
      if (seen.has(meta.label)) return false;
      const score = resolveScore(traceScores, k);
      if (score == null) return false;
      seen.add(meta.label);
      return true;
    })
    .map(k => {
      const meta = DIMENSION_MAP[k];
      const score = resolveScore(traceScores, k);
      const userIdeal = Math.round(priorities[meta.priorityKey] ?? 50);
      const delta = score - userIdeal;
      return { key: k, ...meta, score, userIdeal, delta };
    });
}

// ── Step ① — User intent statement ─────────────────────────────────────
function StepIntent({ intent }) {
  const { t } = useTranslation();
  const text = intent || t('explanation.step_no_intent');
  return (
    <div style={{
      padding: '12px 16px',
      background: 'rgba(14, 165, 233, 0.06)',
      border: '1px solid rgba(14, 165, 233, 0.18)',
      borderRadius: 10,
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-info)', letterSpacing: '0.08em', marginBottom: 6 }}>
        {t('explanation.step_you_described')}
      </div>
      <div style={{ fontSize: 13, color: intent ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.65 }}>
        "{text}"
      </div>
    </div>
  );
}

// ── Step ② — Market-observed tension (hypothesis, not law) ──────────────
function StepPhysics({ conflictsFound = [] }) {
  const { t } = useTranslation();
  const tension = conflictsFound.find(c => c.gravity > 0.4 && c.type !== 'harmony');
  if (!tension) return null;

  const trendLabel = tension.trend === 'weakening'
    ? t('explanation.trend_weakening')
    : tension.trend === 'strengthening'
    ? t('explanation.trend_strengthening')
    : t('explanation.trend_stable');

  const confidencePct = tension.confidence != null
    ? Math.round(tension.confidence * 100)
    : null;

  return (
    <div style={{
      padding: '12px 16px',
      background: 'rgba(99, 102, 241, 0.05)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: 10,
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', marginBottom: 6 }}>
        {t('explanation.step_why_tension')}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
        {tension.title}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 8 }}>
        {tension.description}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
        <span>
          {t('explanation.observed_strength')}: <strong style={{ color: 'var(--text-secondary)' }}>{Math.round(tension.gravity * 100)}%</strong>
        </span>
        {confidencePct != null && (
          <span>
            {t('explanation.confidence_pct')}: <strong style={{ color: 'var(--text-secondary)' }}>{confidencePct}%</strong>
          </span>
        )}
        {tension.trend && (
          <span style={{
            color: tension.trend === 'weakening' ? 'var(--accent-success)' : 'var(--text-muted)',
            fontStyle: 'italic',
          }}>
            {t('explanation.trend_label')}: {trendLabel}
          </span>
        )}
        {tension.sample_period && (
          <span>{t('explanation.calibrated_on', { period: tension.sample_period })}</span>
        )}
      </div>
    </div>
  );
}

// ── Step ③ — Pareto delta visual ────────────────────────────────────────
function StepPareto({ dims }) {
  const { t } = useTranslation();
  const sacrifices = dims.filter(d => d.delta < -4).sort((a, b) => a.delta - b.delta);
  const gains = dims.filter(d => d.delta > 4).sort((a, b) => b.delta - a.delta);
  const neutral = dims.filter(d => d.delta >= -4 && d.delta <= 4);

  if (dims.length === 0) return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
        {t('explanation.step_pareto')}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        {t('explanation.pareto_no_scores')}
      </div>
    </div>
  );

  if (sacrifices.length === 0 && gains.length === 0) return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
        {t('explanation.step_pareto')}
      </div>
      <div style={{ fontSize: 12, color: 'var(--accent-success)', fontStyle: 'italic' }}>
        {t('explanation.pareto_aligned')}
      </div>
      {neutral.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-muted)' }}>
          {t('explanation.pareto_within_range')}: {neutral.map(d => d.label).join(', ')}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 10 }}>
        {t('explanation.step_pareto')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: sacrifices.length > 0 && gains.length > 0 ? '1fr 1fr' : '1fr', gap: 12 }}>
        {sacrifices.length > 0 && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(245, 158, 11, 0.06)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-warning)', marginBottom: 8 }}>
              {t('explanation.you_sacrifice')}
            </div>
            {sacrifices.map(d => (
              <div key={d.key} style={{ marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{d.label}</span>
                  <span style={{ color: 'var(--accent-warning)', fontWeight: 700 }}>{d.delta}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${d.score}%`, height: '100%', background: 'var(--accent-warning)', opacity: 0.7, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {gains.length > 0 && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(16, 185, 129, 0.06)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-success)', marginBottom: 8 }}>
              {t('explanation.you_gain')}
            </div>
            {gains.map(d => (
              <div key={d.key} style={{ marginBottom: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{d.label}</span>
                  <span style={{ color: 'var(--accent-success)', fontWeight: 700 }}>+{d.delta}</span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ width: `${d.score}%`, height: '100%', background: 'var(--accent-success)', opacity: 0.7, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {neutral.length > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
          {t('explanation.pareto_within_range')}: {neutral.map(d => d.label).join(', ')}
        </div>
      )}
    </div>
  );
}

// ── Step ④ — Full story (real-life language) ────────────────────────────
function StepStory({ whyChosen }) {
  const { t } = useTranslation();
  if (!whyChosen) return null;
  const paragraphs = String(whyChosen).split(/\n\n+/).filter(Boolean);
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
        {t('explanation.step_in_your_life')}
      </div>
      {paragraphs.map((para, i) => (
        <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.85, margin: '0 0 12px 0' }}>
          {para}
        </p>
      ))}
    </div>
  );
}

// ── Step ⑤ — Key strengths (verified buyers or engine-assessed pros) ────
function StepUserVoices({ userSignals = [], isEngineGenerated = false }) {
  const { t } = useTranslation();
  if (userSignals.length === 0) return null;
  const shown = userSignals.slice(0, 3);
  return (
    <div style={{
      padding: '12px 16px',
      background: 'rgba(16, 185, 129, 0.04)',
      border: '1px solid rgba(16, 185, 129, 0.15)',
      borderRadius: 10,
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-success)', letterSpacing: '0.08em', marginBottom: 8 }}>
        {isEngineGenerated
          ? t('explanation.step_key_strengths')
          : `${t('explanation.step_verified_buyers')} (${shown.length} with similar priorities)`}
      </div>
      {shown.map((signal, i) => (
        <div
          key={i}
          style={{
            fontSize: 13,
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: i < shown.length - 1 ? 8 : 0,
            paddingBottom: i < shown.length - 1 ? 8 : 0,
            borderBottom: i < shown.length - 1 ? '1px solid rgba(16,185,129,0.1)' : 'none',
          }}
        >
          {isEngineGenerated ? signal : `"${signal}"`}
        </div>
      ))}
      {isEngineGenerated && (
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
          {t('explanation.engine_assessed')}
        </div>
      )}
    </div>
  );
}

// ── Step ⑥ — Why not others ─────────────────────────────────────────────
function StepExcluded({ excluded = [] }) {
  const { t } = useTranslation();
  if (excluded.length === 0) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 8 }}>
        {t('explanation.step_why_not')}
      </div>
      {excluded.slice(0, 3).map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 8,
            paddingBottom: 8,
            borderBottom: i < Math.min(excluded.length, 3) - 1 ? '1px solid var(--border)' : 'none',
            alignItems: 'flex-start',
          }}
        >
          <span style={{ color: 'var(--accent-danger)', flexShrink: 0, fontWeight: 700, fontSize: 14, marginTop: 1 }}>✗</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
              {item.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {item.reason}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Step ⑦ — Transfer of agency ────────────────────────────────────────
function StepAgency({ dims, onBack }) {
  const { t } = useTranslation();
  const topSacrifice = dims
    .filter(d => d.delta < -4)
    .sort((a, b) => a.delta - b.delta)[0];

  return (
    <div style={{
      padding: '16px 20px',
      background: 'rgba(233, 69, 96, 0.04)',
      border: '1px solid rgba(233, 69, 96, 0.2)',
      borderRadius: 12,
      marginBottom: 4,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 10 }}>
        {t('explanation.step_final')}
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.55, marginBottom: 16 }}>
        {topSacrifice
          ? t('explanation.agency_question_specific', { dimension: topSacrifice.label.toLowerCase(), score: topSacrifice.score, ideal: topSacrifice.userIdeal })
          : t('explanation.agency_question_generic')}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
        {t('explanation.final_body')}
      </div>
      {onBack && (
        <button
          className="btn btn-secondary"
          style={{ fontSize: 12, padding: '6px 14px' }}
          onClick={onBack}
        >
          <i className="fas fa-sliders-h"></i> {t('buttons.adjust_priorities_btn')}
        </button>
      )}
    </div>
  );
}

// ── Step ⑧ — Purchase path (ownership mode + store trust tier) ──────────
function StepPurchasePath({ ownershipMode, effectiveOwnershipMode, filteredByOwnership, offerTrustData = [], locale }) {
  const { t } = useTranslation();
  if (!effectiveOwnershipMode) return null;

  const isRtl = locale === 'ar';
  const label = OWNERSHIP_MODE_LABELS[effectiveOwnershipMode]?.[isRtl ? 'ar' : 'en'];
  const topOffer = offerTrustData[0];

  const tierLabel = (o) => {
    if (!o?.vendorTrustScore) return null;
    if (o.vendorTrustScore >= 85) return t('explanation.tier_certified');
    if (o.vendorTrustScore >= 70) return t('explanation.tier_verified');
    return t('explanation.tier_standard');
  };

  // Show fallback message only when mode was refurbished but no certified stores were found
  const showFallbackMsg = filteredByOwnership === false
    && ownershipMode === 'refurbished_if_verified'
    && effectiveOwnershipMode === 'buy_new';

  return (
    <div style={{
      padding: '12px 16px',
      background: 'rgba(99, 102, 241, 0.05)',
      border: '1px solid rgba(99, 102, 241, 0.2)',
      borderRadius: 10,
      marginBottom: 16,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', marginBottom: 6 }}>
        {t('explanation.purchase_path_label')}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: tierLabel(topOffer) ? 4 : 0 }}>
        {label}
        {topOffer?.seller && (
          <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>
            {' '}— {topOffer.seller}
            {tierLabel(topOffer) && (
              <span style={{
                marginLeft: 6,
                fontSize: 10,
                fontWeight: 700,
                color: topOffer.vendorTrustScore >= 85 ? 'var(--accent-success)' : 'var(--text-muted)',
                background: topOffer.vendorTrustScore >= 85 ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.06)',
                padding: '2px 6px',
                borderRadius: 4,
              }}>
                {tierLabel(topOffer)}
              </span>
            )}
          </span>
        )}
      </div>
      {showFallbackMsg && (
        <div style={{ fontSize: 12, color: 'var(--accent-warning)', marginTop: 6 }}>
          {t('explanation.no_certified_refurb')}
        </div>
      )}
    </div>
  );
}

// ── "3 things that might bother you" ────────────────────────────────────
function BotherSection({ flaws = [], topPros = [] }) {
  const { t } = useTranslation();
  if (flaws.length === 0) return null;
  return (
    <div style={{ marginTop: 20 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-muted)',
        letterSpacing: '0.07em',
        marginBottom: 12,
      }}>
        {t('explanation.bother_title')}
      </div>
      {flaws.slice(0, 3).map((flaw, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            marginBottom: 10,
            paddingBottom: 10,
            borderBottom: i < Math.min(flaws.length, 3) - 1 ? '1px solid var(--border)' : 'none',
          }}
        >
          <span style={{ color: 'var(--accent-warning)', flexShrink: 0, fontWeight: 700, marginTop: 2 }}>⚠</span>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: 4 }}>
              {flaw}
            </div>
            {topPros[i] && (
              <div style={{ fontSize: 11, color: 'var(--accent-success)', fontStyle: 'italic' }}>
                {t('explanation.counterbalance')}: {topPros[i]}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── "How we calculated?" tab ─────────────────────────────────────────────
function HowWeCalculated({ integrityScore, irHash, relaxedConstraint, dims }) {
  const { t } = useTranslation();
  const shortHash = irHash ? irHash.slice(0, 16) : null;

  return (
    <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>
          {t('explanation.integrity_score_label')}
        </div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
          integrityScore = [Σ(weight × satisfied) / Σ(weight)] × 100<br />
          <span style={{ color: integrityScore >= 100 ? 'var(--accent-success)' : 'var(--accent-warning)' }}>
            Result: {integrityScore}%
          </span>
          {integrityScore < 100 && relaxedConstraint && (
            <><br /><span style={{ color: 'var(--accent-warning)', fontSize: 11 }}>
              "{relaxedConstraint}" was relaxed to find results
            </span></>
          )}
        </div>
      </div>

      {dims.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>
            {t('explanation.pareto_delta_label')}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2, whiteSpace: 'pre' }}>
            {dims.map(d => (
              <div key={d.key}>
                {d.label.padEnd(14)}device: {String(d.score).padStart(3)}  your priority: {String(d.userIdeal).padStart(3)}  delta:{' '}
                <span style={{ color: d.delta > 4 ? 'var(--accent-success)' : d.delta < -4 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                  {d.delta > 0 ? `+${d.delta}` : d.delta}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {shortHash && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 8 }}>
            {t('explanation.fingerprint_label')}
          </div>
          <div style={{
            fontFamily: 'monospace',
            fontSize: 12,
            color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.03)',
            padding: '8px 12px',
            borderRadius: 6,
            border: '1px solid var(--border)',
            wordBreak: 'break-all',
          }}>
            {irHash}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {t('explanation.deterministic_note')}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExplainabilityPanel({ selectedCard, explanationTab, setExplanationTab, onBack }) {
  const { t } = useTranslation();
  if (!selectedCard) return null;

  const traceScores = selectedCard.traceScores ?? {};
  const priorities  = selectedCard.priorities  ?? {};
  const dims = computeDims(traceScores, priorities);

  const integrityScore = selectedCard.integrityScore ?? 100;
  const irHash         = selectedCard.irHash ?? null;
  const relaxedConstraint = selectedCard.relaxedConstraint ?? null;
  const conflictsFound    = selectedCard.conflictsFound    ?? [];

  return (
    <div>
      <div className="explain-banner">
        <div className="explain-banner-body" style={{ padding: '20px 24px' }}>
          <div className="selected-card-name" style={{ fontSize: 18 }}>{selectedCard.name}</div>
          <div className="selected-card-type" style={{ marginTop: 4 }}>
            {selectedCard.badge} · {selectedCard.price}
          </div>
          <div style={{ marginTop: 10 }}>
            <DecisionTrust
              integrityScore={integrityScore}
              irHash={irHash}
              relaxedConstraint={relaxedConstraint}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="explanation-tabs" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <button className={`explanation-tab ${explanationTab === 'decision' ? 'active' : ''}`} onClick={() => setExplanationTab('decision')}>
            {t('explanation.tab_decision')}
          </button>
          <button className={`explanation-tab ${explanationTab === 'trade-offs' ? 'active' : ''}`} onClick={() => setExplanationTab('trade-offs')}>
            {t('explanation.tab_tradeoffs')}
          </button>
          <button className={`explanation-tab ${explanationTab === 'excluded' ? 'active' : ''}`} onClick={() => setExplanationTab('excluded')}>
            {t('explanation.tab_alternatives')}
          </button>
          <button className={`explanation-tab ${explanationTab === 'how' ? 'active' : ''}`} onClick={() => setExplanationTab('how')}>
            {t('explanation.tab_how')}
          </button>
        </div>

        {/* ── Tab: The Decision — 7-step constructive sequence ── */}
        {explanationTab === 'decision' && (
          <div className="explanation-content active">
            <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <StepIntent intent={selectedCard.naturalLanguageIntent} />
              <StepPhysics conflictsFound={conflictsFound} />
              <StepPareto dims={dims} />
              <StepStory whyChosen={selectedCard.whyChosen} />
              <StepUserVoices
                userSignals={selectedCard.userSignals ?? []}
                isEngineGenerated={selectedCard.userSignalsSource === 'engine'}
              />
              <StepExcluded excluded={selectedCard.excluded ?? []} />
              <StepAgency dims={dims} onBack={onBack} />
              <StepPurchasePath
                ownershipMode={selectedCard.ownershipMode}
                effectiveOwnershipMode={selectedCard.effectiveOwnershipMode}
                filteredByOwnership={selectedCard.filteredByOwnership}
                offerTrustData={selectedCard.offerTrustData ?? []}
                locale={selectedCard.locale}
              />
              <BotherSection flaws={selectedCard.flaws ?? []} topPros={selectedCard.topPros ?? []} />
            </div>
          </div>
        )}

        {/* ── Tab: Trade-offs ── */}
        {explanationTab === 'trade-offs' && (
          <div className="explanation-content active">
            <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ padding: 16, background: 'rgba(16, 185, 129, 0.05)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 700, marginBottom: 8 }}>{t('explanation.gained')}</div>
                  {(selectedCard.tradeOffs?.gained ?? []).map((g, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 4 }}>• {g}</div>
                  ))}
                </div>
                <div style={{ padding: 16, background: 'rgba(244, 63, 94, 0.05)', borderRadius: 10, border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-danger)', fontWeight: 700, marginBottom: 8 }}>{t('explanation.lost')}</div>
                  {(selectedCard.tradeOffs?.lost ?? []).map((l, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--accent-danger)', flexShrink: 0 }}>•</span>
                      <span>{l}</span>
                    </div>
                  ))}
                </div>
              </div>

              {Object.keys(selectedCard.sacrificeVector || {}).length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(99, 102, 241, 0.05)', borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ fontSize: 12, color: '#818cf8', fontWeight: 700, marginBottom: 4 }}>
                    {t('explanation.intentional_tradeoffs')}
                  </div>
                  {Object.entries(selectedCard.sacrificeVector).map(([gate, info]) => (
                    <div key={gate} style={{ fontSize: 13, marginBottom: 6, color: 'var(--text-secondary)', display: 'flex', gap: 6 }}>
                      <span style={{ color: '#818cf8', flexShrink: 0 }}>→</span>
                      <span>
                        <strong style={{ color: 'var(--text-primary)' }}>
                          {GATE_NAMES[gate] || gate.replace(/_/g, ' ')}
                        </strong>
                        {info?.meaning ? ` — ${info.meaning}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Alternatives ── */}
        {explanationTab === 'excluded' && (
          <div className="explanation-content active">
            {(selectedCard.excluded ?? []).length === 0 ? (
              <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                {t('explanation.no_alternatives')}
              </div>
            ) : (
              (selectedCard.excluded ?? []).map((item, idx) => (
                <div key={idx} style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.reason}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── Tab: How we calculated ── */}
        {explanationTab === 'how' && (
          <div className="explanation-content active">
            <HowWeCalculated
              integrityScore={integrityScore}
              irHash={irHash}
              relaxedConstraint={relaxedConstraint}
              dims={dims}
            />
          </div>
        )}
      </div>
    </div>
  );
}
