import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function buildFilterSteps(intakeAnswers, budgetMax, analysisSummary, t) {
  const steps = [];
  if (intakeAnswers?.carriesDaily) steps.push(t('advisor.filter_portability'));
  const hours = intakeAnswers?.hoursAwayFromCharger;
  if (hours && hours > 3) steps.push(t('advisor.filter_battery', { hours }));
  if (intakeAnswers?.usageScenarios?.some(s => ['vms', 'design', 'gaming'].includes(s)))
    steps.push(t('advisor.filter_vms'));
  if (budgetMax) steps.push(t('advisor.filter_budget', { budget: budgetMax, count: analysisSummary?.devices ?? '…' }));
  return steps;
}

function ConfidenceBar({ value }) {
  const color = value >= 80 ? 'var(--accent-success)' : value >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)';
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 3, transition: 'width 0.8s ease' }} />
    </div>
  );
}

function MetricChip({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '12px 16px', flex: 1, minWidth: 110,
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
}

export default function AnalysisPhase({
  priorities, analysisSummary, detectedConflicts, decisionMetadata,
  budgetMin, budgetMax, onViewCards, onAdjustPriorities,
  intakeAnswers,
}) {
  const { t } = useTranslation();
  const [visibleCount, setVisibleCount] = useState(0);

  const steps = buildFilterSteps(intakeAnswers, budgetMax, analysisSummary, t);
  const candidateCount = analysisSummary?.devices ?? 0;
  const confidence = analysisSummary?.confidence ?? 0;
  const isReady = candidateCount > 0;

  const integrityPercent = (() => {
    const raw = decisionMetadata?.integrityScore ?? 1.0;
    return raw <= 1.0 ? Math.round(raw * 100) : Math.round(raw);
  })();
  const isRelaxed = !!decisionMetadata?.relaxedConstraint;

  useEffect(() => {
    setVisibleCount(0);
    if (steps.length === 0) { setVisibleCount(1); return; }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= steps.length + 1) clearInterval(interval);
    }, 320);
    return () => clearInterval(interval);
  }, [intakeAnswers, budgetMax]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="phase-container active">
      <div className="card">
        <div className="card-header">
          <div className="card-icon" style={{ background: 'rgba(99,102,241,0.12)', color: '#818cf8' }}>🔍</div>
          <div>
            <div className="card-title">{t('analysis.title')}</div>
            <div className="card-subtitle">
              {isReady
                ? t('analysis.devices_evaluated', { count: candidateCount })
                : t('analysis.analyzing_requirements')}
            </div>
          </div>
        </div>

        {/* Metrics row */}
        {isReady && (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
            <MetricChip
              label={t('analysis.metric_devices', 'Devices Analyzed')}
              value={candidateCount}
              color="var(--accent-info)"
            />
            <MetricChip
              label={t('analysis.metric_confidence', 'Confidence')}
              value={`${confidence}%`}
              color={confidence >= 75 ? 'var(--accent-success)' : 'var(--accent-warning)'}
            />
            <MetricChip
              label={t('analysis.metric_integrity', 'Match Quality')}
              value={integrityPercent >= 100 ? t('trust.perfect_match') : `${integrityPercent}%`}
              color={integrityPercent >= 100 ? 'var(--accent-success)' : 'var(--accent-warning)'}
            />
          </div>
        )}

        {/* Confidence bar */}
        {isReady && confidence > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('analysis.confidence')}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{confidence}%</span>
            </div>
            <ConfidenceBar value={confidence} />
          </div>
        )}

        {/* Human-language filter steps */}
        {steps.length > 0 && (
          <div style={{ margin: '4px 0 20px', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid var(--border)' }}>
            {steps.map((step, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: i < steps.length - 1 ? 10 : 0,
                  opacity: visibleCount > i ? 1 : 0,
                  transform: visibleCount > i ? 'translateY(0)' : 'translateY(6px)',
                  transition: 'opacity 0.3s ease, transform 0.3s ease',
                }}
              >
                <span style={{ color: 'var(--accent-success)', flexShrink: 0, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step}</span>
              </div>
            ))}
            {candidateCount > 0 && visibleCount > steps.length - 1 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, opacity: 1, transition: 'opacity 0.4s ease' }}>
                <span style={{ color: 'var(--accent-info)', flexShrink: 0 }}>→</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                  {t('advisor.filter_selecting', { count: candidateCount })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Fallback: no intake answers */}
        {steps.length === 0 && (
          <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 16 }}>
            {isReady ? t('advisor.filter_selecting', { count: candidateCount }) : t('analysis.analyzing_requirements')}
          </div>
        )}

        {/* Conflict / relaxed notice */}
        {isRelaxed && isReady && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8, fontSize: 13, color: 'var(--accent-warning)', marginBottom: 16,
          }}>
            {t('advisor.opening_relaxed', { constraint: decisionMetadata.relaxedConstraint })}
          </div>
        )}

        {/* Detected conflicts */}
        {detectedConflicts?.length > 0 && isReady && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {detectedConflicts.slice(0, 3).map((c, i) => (
              <span key={i} style={{
                fontSize: 11, padding: '3px 10px', borderRadius: 6,
                background: 'rgba(244,63,94,0.07)', border: '1px solid rgba(244,63,94,0.2)',
                color: 'var(--accent-danger)',
              }}>
                ⚠ {c.label || c}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={onViewCards} disabled={!isReady}>
          <i className="fas fa-magic"></i> {t('analysis.view_paths')}
        </button>
        <button className="btn btn-secondary" onClick={onAdjustPriorities}>
          <i className="fas fa-arrow-left"></i> {t('cards.adjust_priorities')}
        </button>
      </div>
    </div>
  );
}
