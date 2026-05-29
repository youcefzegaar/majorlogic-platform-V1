import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../shared/Icon';
import { useDecisionStore } from '../../stores/decisionStore';

// ── L0 — "Just the answer" ─────────────────────────────────────────────────
export function LayerL0({ explanation, traceScores, priorities, intent }) {
  const { t } = useTranslation();
  const exp = explanation;

  const headline = exp?.headline;
  const cost = exp?.cost;

  const topPriorityKey = headline?.topPriorityKey ?? Object.entries(priorities ?? {})
    .sort(([, a], [, b]) => b - a)[0]?.[0] ?? 'performance';
  const leadScore = headline?.leadScore;

  const priorityLabel = topPriorityKey.charAt(0).toUpperCase() + topPriorityKey.slice(1).replace(/_/g, ' ');
  const scoreText = leadScore != null ? `${leadScore}/100` : '—';

  return (
    <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          padding: '16px 20px',
          background: 'rgba(14, 165, 233, 0.06)',
          border: '1px solid rgba(14, 165, 233, 0.18)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-info)', letterSpacing: '0.08em', marginBottom: 8 }}>
            {t('explanation.step_you_described')}
          </div>
          {intent && (
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.65, marginBottom: 10 }}>
              "{intent}"
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Your #1 priority:</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{priorityLabel}</span>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: leadScore != null && leadScore >= 75 ? 'var(--accent-success)' : 'var(--accent-warning)',
            }}>
              {scoreText}
            </span>
          </div>
        </div>

        {cost && (
          <div style={{
            padding: '12px 16px',
            background: cost.severity === 'none'
              ? 'rgba(16, 185, 129, 0.05)'
              : cost.severity === 'high'
                ? 'rgba(244, 63, 94, 0.05)'
                : 'rgba(245, 158, 11, 0.05)',
            border: `1px solid ${cost.severity === 'none' ? 'rgba(16,185,129,0.2)' : cost.severity === 'high' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
              {t('explanation.cost_label')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{cost.text}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reason row (used in L1) ────────────────────────────────────────────────
export function ReasonRow({ reason, idx }) {
  const [open, setOpen] = useState(false);
  const [vote, setVote] = useState(null);
  const { decisionRunId } = useDecisionStore();
  const delta = reason.delta;
  const deltaColor = delta == null ? 'var(--text-muted)'
    : delta >= 0 ? 'var(--accent-success)'
    : 'var(--accent-warning)';

  const dimKey = reason.dimKey || `reason_${idx}`;

  const handleVote = async (value) => {
    if (vote !== null) return;
    setVote(value);
    const apiUrl = import.meta.env.VITE_API_URL || 'https://majorlogicapi-production.up.railway.app';
    fetch(`${apiUrl}/api/v1/laptop-student-us/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        decisionRunId: decisionRunId || 'anonymous',
        score: value === 'helpful' ? 5 : 2,
        tags: [`reason:${dimKey}:${value}`],
      }),
    }).catch(() => {});
  };

  return (
    <div style={{
      padding: '12px 14px',
      background: 'var(--surface-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      marginBottom: 8,
    }}>
      <div
        style={{ cursor: reason.evidence?.length > 0 ? 'pointer' : 'default' }}
        onClick={() => reason.evidence?.length > 0 && setOpen(!open)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>{reason.claim}</div>
            {reason.consequence && (
              <div style={{ fontSize: 11, color: deltaColor, lineHeight: 1.5 }}>{reason.consequence}</div>
            )}
          </div>
          {delta != null && (
            <span style={{ fontSize: 11, fontWeight: 700, color: deltaColor, flexShrink: 0 }}>
              {delta > 0 ? `+${delta}` : delta}
            </span>
          )}
          {reason.evidence?.length > 0 && (
            <Icon name={open ? 'arrow-up' : 'arrow-down'} size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          )}
        </div>
        {open && reason.evidence?.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', gap: 16 }}>
            {reason.evidence.map((ev, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{ev.k}:</span> {ev.v}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Helpful?</span>
        <button
          onClick={() => handleVote('helpful')}
          disabled={vote !== null}
          style={{
            background: vote === 'helpful' ? 'rgba(16,185,129,0.15)' : 'transparent',
            border: 'none', cursor: vote === null ? 'pointer' : 'default',
            fontSize: 14, padding: '2px 6px', borderRadius: 4,
            opacity: vote !== null && vote !== 'helpful' ? 0.3 : 1,
          }}
          aria-label="Helpful"
        >👍</button>
        <button
          onClick={() => handleVote('unhelpful')}
          disabled={vote !== null}
          style={{
            background: vote === 'unhelpful' ? 'rgba(239,68,68,0.15)' : 'transparent',
            border: 'none', cursor: vote === null ? 'pointer' : 'default',
            fontSize: 14, padding: '2px 6px', borderRadius: 4,
            opacity: vote !== null && vote !== 'unhelpful' ? 0.3 : 1,
          }}
          aria-label="Not helpful"
        >👎</button>
        {vote && <span style={{ fontSize: 10, color: 'var(--accent-success)' }}>✓</span>}
      </div>
    </div>
  );
}

// ── L1 — "The reasoning" ──────────────────────────────────────────────────
export function LayerL1({ explanation, selectedCard, dims, onBack }) {
  const { t } = useTranslation();
  const exp = explanation;

  const reasons = exp?.reasons?.length > 0
    ? exp.reasons
    : dims.slice(0, 3).map(d => ({
        dimKey: d.key,
        claim: `${d.label} is ${d.score >= 80 ? 'strong' : d.score >= 60 ? 'solid' : 'limited'} (${d.score}/100)`,
        score: d.score,
        userIdeal: d.userIdeal,
        delta: d.delta,
        consequence: d.delta >= 0
          ? 'Meets your priority — no compromise.'
          : `${Math.abs(d.delta)}-point gap from your target.`,
        evidence: [{ k: 'score', v: `${d.score}/100` }, { k: 'your priority', v: `${d.userIdeal}/100` }],
      }));

  const cost = exp?.cost;
  const costText = cost?.text
    ?? (selectedCard.aiTradeoff || selectedCard.flaws?.[0])
    ?? t('explanation.no_cost_data');
  const costSeverity = cost?.severity ?? (selectedCard.aiTradeoff ? 'medium' : 'none');

  const runnerUp = exp?.runnerUp;
  const conflictsFound = selectedCard.conflictsFound ?? [];
  const tension = conflictsFound.find(c => c.gravity > 0.4 && c.type !== 'harmony');
  const topSacrifice = dims.filter(d => d.delta < -4).sort((a, b) => a.delta - b.delta)[0];

  return (
    <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>

      {tension && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 8, marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', marginBottom: 4 }}>
            {t('explanation.step_why_tension')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {tension.description || tension.title}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        {reasons.map((r, i) => <ReasonRow key={i} reason={r} idx={i} />)}
      </div>

      <div style={{
        padding: '12px 16px',
        background: costSeverity === 'none'
          ? 'rgba(16, 185, 129, 0.05)'
          : costSeverity === 'high'
            ? 'rgba(244, 63, 94, 0.05)'
            : 'rgba(245, 158, 11, 0.05)',
        border: `1px solid ${costSeverity === 'none' ? 'rgba(16,185,129,0.2)' : costSeverity === 'high' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
        borderRadius: 10, marginBottom: 16,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', marginBottom: 6 }}>
          {t('explanation.cost_label')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{costText}</div>
        {cost?.sourceNote && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, fontStyle: 'italic' }}>{cost.sourceNote}</div>
        )}
      </div>

      {runnerUp && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 10, marginBottom: 16,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', marginBottom: 6 }}>
            {t('explanation.head_to_head')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {runnerUp.name}
            {runnerUp.margin != null && (
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginInlineStart: 8 }}>
                ({runnerUp.margin > 0 ? '+' : ''}{runnerUp.margin} pts)
              </span>
            )}
          </div>
          {runnerUp.swapHint && (
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{t('explanation.swap_hint_label')}: </span>
              {runnerUp.swapHint}
            </div>
          )}
        </div>
      )}

      {selectedCard.effectiveOwnershipMode && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          borderRadius: 8, marginBottom: 14,
        }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#818cf8', letterSpacing: '0.08em', marginBottom: 4 }}>
            {t('explanation.purchase_path_label')}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {t(`explanation.mode_${selectedCard.effectiveOwnershipMode}`) || selectedCard.effectiveOwnershipMode}
            {selectedCard.offerTrustData?.[0]?.seller && (
              <span style={{ fontWeight: 400, color: 'var(--text-secondary)' }}>
                {' '}— {selectedCard.offerTrustData[0].seller}
              </span>
            )}
          </div>
          {selectedCard.filteredByOwnership === false && selectedCard.ownershipMode === 'refurbished_if_verified' && selectedCard.effectiveOwnershipMode === 'buy_new' && (
            <div style={{ fontSize: 12, color: 'var(--accent-warning)', marginTop: 4 }}>
              {t('explanation.no_certified_refurb')}
            </div>
          )}
        </div>
      )}

      <div style={{
        padding: '14px 18px',
        background: 'rgba(233, 69, 96, 0.04)',
        border: '1px solid rgba(233, 69, 96, 0.2)',
        borderRadius: 10,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.08em', marginBottom: 8 }}>
          {t('explanation.step_final')}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.55, marginBottom: 12 }}>
          {topSacrifice
            ? t('explanation.agency_question_specific', { dimension: topSacrifice.label.toLowerCase(), score: topSacrifice.score, ideal: topSacrifice.userIdeal })
            : t('explanation.agency_question_generic')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.5 }}>
          {t('explanation.final_body')}
        </div>
        {onBack && (
          <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 14px' }} onClick={onBack}>
            <Icon name="sliders-h" /> {t('buttons.adjust_priorities_btn')}
          </button>
        )}
      </div>

      {(selectedCard.excluded ?? []).length > 0 && (
        <details style={{ marginTop: 16 }}>
          <summary style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
            {t('explanation.step_why_not')}
          </summary>
          <div style={{ marginTop: 10 }}>
            {selectedCard.excluded.slice(0, 3).map((item, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, marginBottom: 8, paddingBottom: 8,
                borderBottom: i < Math.min(selectedCard.excluded.length, 3) - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'flex-start',
              }}>
                <span style={{ color: 'var(--accent-danger)', flexShrink: 0, fontWeight: 700, fontSize: 14, marginTop: 1 }}>✗</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{item.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

// ── L2 — "The math" ────────────────────────────────────────────────────────
export function LayerL2({ explanation, integrityScore, irHash, relaxedConstraint, dims }) {
  const { t } = useTranslation();
  const math = explanation?.math;
  const formula = math?.formula ?? 'integrityScore = Σ(weight × satisfied) / Σ(weight) × 100';

  return (
    <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>

      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>
          {t('explanation.integrity_score_label')}
        </div>
        <div style={{
          fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8,
          background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
        }}>
          {formula}<br />
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

      {(math?.rows?.length > 0 || dims.length > 0) && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 10 }}>
            {t('explanation.pareto_delta_label')}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 2, whiteSpace: 'pre' }}>
            {math?.rows?.length > 0
              ? math.rows.map(([dim, w], i) => (
                  <div key={i}>{String(dim).padEnd(14)} weight: {w}</div>
                ))
              : dims.map(d => (
                  <div key={d.key}>
                    {d.label.padEnd(14)}device: {String(d.score).padStart(3)}  your priority: {String(d.userIdeal).padStart(3)}  delta:{' '}
                    <span style={{ color: d.delta > 4 ? 'var(--accent-success)' : d.delta < -4 ? 'var(--accent-warning)' : 'var(--text-muted)' }}>
                      {d.delta > 0 ? `+${d.delta}` : d.delta}
                    </span>
                  </div>
                ))
            }
          </div>
        </div>
      )}

      {(math?.irHash ?? irHash) && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', marginBottom: 8 }}>
            {t('explanation.fingerprint_label')}
          </div>
          <div style={{
            fontFamily: 'monospace', fontSize: 12, color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: 6,
            border: '1px solid var(--border)', wordBreak: 'break-all',
          }}>
            {math?.irHash ?? irHash}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            {t('explanation.deterministic_note')}
          </div>
        </div>
      )}
    </div>
  );
}
