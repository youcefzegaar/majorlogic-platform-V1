import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../shared/Icon';
import DecisionTrust from '../shared/DecisionTrust';

// ── Helpers ──────────────────────────────────────────────────────────────────

const isValid = s => typeof s === 'string' && s.trim() !== '' && s !== 'null' && s !== 'undefined';

function resolveTradeoff(card) {
  if (isValid(card.aiTradeoff)) return card.aiTradeoff;
  for (const info of Object.values(card.sacrificeVector ?? {})) {
    if (isValid(info?.meaning)) return info.meaning;
  }
  if (card.flaws?.length > 0 && isValid(card.flaws[0])) return card.flaws[0];
  return null;
}

function getClosingQuestionKey(traceScores, priorities) {
  const checks = [
    { scoreKey: 'battery_score',     priorityKey: 'battery',     q: 'question_battery' },
    { scoreKey: 'portability_score', priorityKey: 'portability',  q: 'question_weight'  },
    { scoreKey: 'performance_score', priorityKey: 'performance',  q: 'question_perf'    },
  ];
  let worstQ = 'question_clean';
  let worstDelta = -10;
  for (const { scoreKey, priorityKey, q } of checks) {
    const score = traceScores?.[scoreKey];
    const priority = priorities?.[priorityKey] ?? 50;
    if (score != null && score - priority < worstDelta) {
      worstDelta = score - priority;
      worstQ = q;
    }
  }
  return worstQ;
}

// ── [1] Header ───────────────────────────────────────────────────────────────

function AdvisorHeader({ card, t }) {
  const isClean = (card.integrityScore ?? 100) >= 100;
  const count   = card.candidateCount ?? 0;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {card.image && (
          <img
            src={card.image}
            alt={card.name}
            style={{ width: 88, height: 66, objectFit: 'contain', borderRadius: 8,
              background: 'rgba(255,255,255,0.04)', flexShrink: 0 }}
          />
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
            {card.name}
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
            {card.badge} · {card.price}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.6 }}>
            {isClean
              ? t('advisor.opening_clean', { count })
              : t('advisor.opening_relaxed', { constraint: card.relaxedConstraint })}
          </p>
        </div>
      </div>
      <div style={{ marginTop: 14 }}>
        <DecisionTrust
          integrityScore={card.integrityScore ?? 100}
          irHash={card.irHash ?? null}
          relaxedConstraint={card.relaxedConstraint ?? null}
        />
      </div>
    </div>
  );
}

// ── [2] Story ────────────────────────────────────────────────────────────────

function AdvisorStory({ card, t }) {
  const story  = isValid(card.whyChosen) ? card.whyChosen : null;
  const intent = isValid(card.naturalLanguageIntent) ? card.naturalLanguageIntent : null;

  const fallback =
    `${t('trace.dim_performance')}: ${card.traceScores?.performance_score ?? '—'}/100 · ` +
    `${t('trace.dim_battery')}: ${card.traceScores?.battery_score ?? '—'}/100.`;

  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 16, lineHeight: 1.85, color: 'var(--text-primary)', margin: '0 0 12px 0' }}>
        {story || fallback}
      </p>
      {intent && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
          {t('advisor.you_said')} {t('advisor.quote_open')}{intent}{t('advisor.quote_close')}
        </p>
      )}
    </div>
  );
}

// ── [~] Context (conditional) ────────────────────────────────────────────────

function AdvisorContext({ conflicts, t }) {
  const significant = (conflicts ?? []).filter(c => c.type !== 'harmony' && (c.gravity ?? 0) > 0.4);
  if (significant.length === 0) return null;
  const top = significant[0];

  return (
    <div style={{
      marginBottom: 20, padding: '14px 16px',
      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent-warning)',
        marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {t('advisor.why_hard')}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
        {top.description}
      </p>
    </div>
  );
}

// ── [3] Tradeoff ─────────────────────────────────────────────────────────────

function AdvisorTradeoff({ card, t }) {
  const text = resolveTradeoff(card);
  if (!text) return null;

  return (
    <div style={{
      marginBottom: 28, padding: '16px 20px',
      borderInlineStart: '3px solid rgba(245,158,11,0.55)',
      background: 'rgba(245,158,11,0.04)',
      borderRadius: '0 8px 8px 0',
    }}>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: 'var(--text-primary)' }}>
        {text}
      </p>
    </div>
  );
}

// ── [4] Social Proof ─────────────────────────────────────────────────────────

function AdvisorSocialProof({ card, t }) {
  const signals   = (card.userSignals ?? []).slice(0, 2);
  const isEngine  = card.userSignalsSource === 'engine';
  const cohort    = card.cohortSatisfaction;
  const hasCohort = cohort && (cohort.sampleSize ?? 0) >= 10;

  if (signals.length === 0 && !hasCohort) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      {hasCohort && (
        <div style={{
          padding: '12px 16px', background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, marginBottom: 12,
        }}>
          <span style={{ color: 'var(--accent-success)', fontWeight: 700, fontSize: 15 }}>
            {cohort.majorMatch}%
          </span>{' '}
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {t('advisor.cohort_stat', { pct: cohort.majorMatch, major: cohort.major })}
          </span>
          <div style={{ marginTop: 3, fontSize: 11, color: 'var(--text-muted)' }}>
            {t('advisor.cohort_sample', { count: cohort.sampleSize })}
          </div>
        </div>
      )}

      {signals.length > 0 && (
        <>
          {!isEngine && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500 }}>
              {t('advisor.similar_buyers')}
            </div>
          )}
          {isEngine ? (
            <ul style={{ margin: 0, paddingInlineStart: 18, color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.75 }}>
              {signals.map((s, i) => (
                <li key={i}>{typeof s === 'string' ? s : (s.signal ?? s.text ?? '')}</li>
              ))}
            </ul>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {signals.map((s, i) => {
                const txt = typeof s === 'string' ? s : (s.signal ?? s.text ?? '');
                return (
                  <blockquote key={i} style={{
                    margin: 0, padding: '10px 14px',
                    background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                    borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65,
                  }}>
                    {t('advisor.quote_open')}{txt}{t('advisor.quote_close')}
                  </blockquote>
                );
              })}
            </div>
          )}
          {isEngine && (
            <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {t('advisor.engine_assessed')}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── [5] Alternatives ─────────────────────────────────────────────────────────

function AdvisorAlternatives({ card, t }) {
  const [showAll, setShowAll] = useState(false);
  const all    = card.excluded ?? [];
  const items  = showAll ? all : all.slice(0, 3);
  const count  = card.candidateCount ?? all.length;

  if (all.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 500 }}>
        {t('advisor.alternatives_lead', { count })}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {items.map((alt, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'baseline',
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            <span style={{ color: 'var(--text-primary)', fontWeight: 500, flexShrink: 0 }}>{alt.name}</span>
            <span style={{ color: 'var(--border-light)', flexShrink: 0 }}>—</span>
            <span>{alt.reason}</span>
          </div>
        ))}
      </div>
      {all.length > 3 && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{ background: 'none', border: 'none', color: 'var(--accent-info)',
            cursor: 'pointer', fontSize: 12, padding: '6px 0 0', textDecoration: 'underline' }}
        >
          {showAll ? '↑' : t('advisor.see_all_alts')}
        </button>
      )}
    </div>
  );
}

// ── [6] Closing ──────────────────────────────────────────────────────────────

function AdvisorClosing({ card, onFinalSummary, onBackToCards, t }) {
  const qKey   = getClosingQuestionKey(card.traceScores, card.priorities);
  const costPerYear =
    card.ownershipStrategy?.tco?.costPerYear ??
    card.ownershipStrategy?.lifecycle?.costPerYear ??
    card.tcoEstimate?.costPerYear ??
    null;
  const dailyCost = costPerYear ? (costPerYear / 365).toFixed(2) : null;

  return (
    <div style={{
      padding: '20px 24px', background: 'var(--surface-elevated)',
      border: '1px solid var(--border)', borderRadius: 12, marginBottom: 28,
    }}>
      <p style={{ margin: '0 0 14px', fontSize: 15, color: 'var(--text-primary)',
        fontWeight: 500, lineHeight: 1.65 }}>
        {t(`advisor.${qKey}`)}
      </p>
      {dailyCost && (
        <p style={{ margin: '0 0 18px', fontSize: 12, color: 'var(--text-muted)' }}>
          {t('advisor.cost_anchor', { cost: `$${dailyCost}` })}
        </p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={onFinalSummary}>
          <Icon name="shopping-cart" style={{ marginInlineEnd: 8 }} />
          {t('advisor.cta_yes')}
        </button>
        <button
          onClick={onBackToCards}
          style={{ background: 'none', border: 'none', color: 'var(--accent-info)',
            cursor: 'pointer', fontSize: 13, textDecoration: 'underline', padding: 0 }}
        >
          {t('advisor.cta_adjust')}
        </button>
      </div>
    </div>
  );
}

// ── [7] Disclosure (collapsed) ───────────────────────────────────────────────

function AdvisorDisclosure({ card, t }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ background: 'none', border: 'none', color: 'var(--text-muted)',
          cursor: 'pointer', fontSize: 12, padding: 0, textDecoration: 'underline' }}
      >
        {open ? '↑' : '↓'} {t('advisor.disclosure_trigger')}
      </button>

      {open && (
        <div style={{
          marginTop: 12, padding: 16,
          background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
          borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.75,
        }}>
          <div>
            <strong style={{ color: 'var(--text-secondary)' }}>Integrity score:</strong>{' '}
            {card.integrityScore ?? 100}/100
          </div>
          {card.irHash && (
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Decision fingerprint:</strong>{' '}
              <code style={{ fontFamily: 'monospace', fontSize: 11 }}>{card.irHash}</code>
            </div>
          )}
          {card.relaxedConstraint && (
            <div style={{ marginTop: 4 }}>
              <strong style={{ color: 'var(--text-secondary)' }}>Relaxed constraint:</strong>{' '}
              {card.relaxedConstraint}
            </div>
          )}
          <div style={{ marginTop: 4 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Devices evaluated:</strong>{' '}
            {card.candidateCount ?? '—'}
          </div>

          {(card.tradeOffs?.gained?.length > 0 || card.tradeOffs?.lost?.length > 0) && (
            <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <div style={{ color: 'var(--accent-success)', fontWeight: 600, marginBottom: 4 }}>✓ Gained</div>
                {(card.tradeOffs.gained ?? []).map((g, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>· {g}</div>
                ))}
              </div>
              <div>
                <div style={{ color: 'var(--accent-warning)', fontWeight: 600, marginBottom: 4 }}>✗ Sacrificed</div>
                {(card.tradeOffs.lost ?? []).map((l, i) => (
                  <div key={i} style={{ marginBottom: 2 }}>· {l}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AdvisorConversation({ selectedCard, onFinalSummary, onBackToCards }) {
  const { t } = useTranslation();
  if (!selectedCard) return null;

  return (
    <div style={{ maxWidth: 680 }}>
      <AdvisorHeader card={selectedCard} t={t} />
      <AdvisorStory card={selectedCard} t={t} />
      <AdvisorContext conflicts={selectedCard.conflictsFound} t={t} />
      <AdvisorTradeoff card={selectedCard} t={t} />
      <AdvisorSocialProof card={selectedCard} t={t} />
      <AdvisorAlternatives card={selectedCard} t={t} />
      <AdvisorClosing
        card={selectedCard}
        onFinalSummary={onFinalSummary}
        onBackToCards={onBackToCards}
        t={t}
      />
      <AdvisorDisclosure card={selectedCard} t={t} />
    </div>
  );
}
