import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function buildFilterSteps(intakeAnswers, budgetMax, analysisSummary, t) {
  const steps = [];

  if (intakeAnswers?.carriesDaily) {
    steps.push(t('advisor.filter_portability'));
  }

  const hours = intakeAnswers?.hoursAwayFromCharger;
  if (hours && hours > 3) {
    steps.push(t('advisor.filter_battery', { hours }));
  }

  if (intakeAnswers?.usageScenarios?.some(s => ['vms', 'design', 'gaming'].includes(s))) {
    steps.push(t('advisor.filter_vms'));
  }

  if (budgetMax) {
    steps.push(t('advisor.filter_budget', { budget: budgetMax, count: analysisSummary?.devices ?? '…' }));
  }

  return steps;
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
  const isReady = candidateCount > 0;

  // Animate steps in one by one
  useEffect(() => {
    setVisibleCount(0);
    if (steps.length === 0) {
      setVisibleCount(1);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= steps.length + 1) clearInterval(interval);
    }, 320);
    return () => clearInterval(interval);
  }, [intakeAnswers, budgetMax]); // eslint-disable-line react-hooks/exhaustive-deps

  const integrityPercent = (() => {
    const raw = decisionMetadata?.integrityScore ?? 1.0;
    return raw <= 1.0 ? Math.round(raw * 100) : Math.round(raw);
  })();

  const isRelaxed = !!decisionMetadata?.relaxedConstraint;

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

        {/* Human-language filter steps */}
        <div style={{ margin: '20px 0', minHeight: 100 }}>
          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                marginBottom: 12,
                opacity: visibleCount > i ? 1 : 0,
                transform: visibleCount > i ? 'translateY(0)' : 'translateY(6px)',
                transition: 'opacity 0.3s ease, transform 0.3s ease',
              }}
            >
              <span style={{ color: 'var(--accent-success)', flexShrink: 0, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step}</span>
            </div>
          ))}

          {/* "Selecting best from N" — appears last */}
          {candidateCount > 0 && visibleCount > steps.length - 1 && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4,
              opacity: visibleCount > steps.length - 1 ? 1 : 0,
              transition: 'opacity 0.4s ease',
            }}>
              <span style={{ color: 'var(--accent-info)', flexShrink: 0, marginTop: 1 }}>→</span>
              <span style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, lineHeight: 1.6 }}>
                {t('advisor.filter_selecting', { count: candidateCount })}
              </span>
            </div>
          )}

          {/* Fallback when no intake answers — show generic progress */}
          {steps.length === 0 && (
            <div style={{ fontSize: 14, color: 'var(--text-muted)', fontStyle: 'italic' }}>
              {isReady
                ? t('advisor.filter_selecting', { count: candidateCount })
                : t('analysis.analyzing_requirements')}
            </div>
          )}
        </div>

        {/* Relaxed constraint notice */}
        {isRelaxed && isReady && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(245,158,11,0.06)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--accent-warning)',
            marginBottom: 16,
          }}>
            {t('advisor.opening_relaxed', { constraint: decisionMetadata.relaxedConstraint })}
          </div>
        )}

        {/* Integrity badge */}
        {isReady && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
              color: integrityPercent >= 100 ? 'var(--accent-success)' : 'var(--accent-warning)',
              background: integrityPercent >= 100 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
              border: `1px solid ${integrityPercent >= 100 ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            }}>
              {integrityPercent >= 100 ? t('trust.perfect_match') : `${integrityPercent}%`}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {t('analysis.confidence')} · {analysisSummary?.confidence ?? 0}%
            </span>
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
