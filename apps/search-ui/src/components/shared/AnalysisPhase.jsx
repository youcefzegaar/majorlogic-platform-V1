import { useTranslation } from 'react-i18next';
import DecisionTrace from './DecisionTrace';
import DecisionTrust from './DecisionTrust';

export default function AnalysisPhase({
  priorities, analysisSummary, detectedConflicts, decisionMetadata,
  budgetMin, budgetMax, onViewCards, onAdjustPriorities
}) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const conflictCount = detectedConflicts.filter(c => c.type !== 'harmony').length;
  const hasConflicts = conflictCount > 0;

  const integrityPercent = (() => {
    const raw = decisionMetadata?.integrityScore ?? 1.0;
    return raw <= 1.0 ? Math.round(raw * 100) : Math.round(raw);
  })();

  return (
    <div className="phase-container active">
      <div className="card">
        <div className="card-header">
          <div
            className="card-icon"
            style={{
              background: hasConflicts ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: hasConflicts ? 'var(--accent-warning)' : 'var(--accent-success)',
            }}
          >
            {hasConflicts ? '⚠️' : '✓'}
          </div>
          <div>
            <div className="card-title">{t('analysis.title')}</div>
            <div className="card-subtitle">
              {analysisSummary.devices > 0
                ? t('analysis.devices_evaluated', { count: analysisSummary.devices })
                : t('analysis.analyzing_requirements')}
              {hasConflicts
                ? ` · ${t('analysis.conflicts_found', { count: conflictCount })}`
                : ` · ${t('analysis.priorities_aligned')}`}
            </div>
          </div>
        </div>

        {detectedConflicts.filter(c => c.type === 'conflict' || c.type === 'risk').map(conflict => (
          <div
            key={conflict.id}
            className="conflict-alert"
            style={{
              borderColor: conflict.type === 'conflict'
                ? 'rgba(245, 158, 11, 0.3)'
                : 'rgba(14, 165, 233, 0.3)',
              background: conflict.type === 'conflict'
                ? 'rgba(245, 158, 11, 0.06)'
                : 'rgba(14, 165, 233, 0.06)',
            }}
          >
            <i
              className={`fas ${conflict.type === 'conflict' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}
              style={{
                color: conflict.type === 'conflict'
                  ? 'var(--accent-warning)'
                  : 'var(--accent-info)',
              }}
            ></i>
            <div className="conflict-alert-text">
              <strong>{conflict.title}:</strong>{' '}
              {conflict.description}
              {conflict.gravity != null && (
                <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>
                  ({t('trace.tension').toLowerCase()} {Math.round(conflict.gravity * 100)}%)
                </span>
              )}
            </div>
          </div>
        ))}

        {!hasConflicts && detectedConflicts.length > 0 && (
          <div
            className="conflict-alert"
            style={{
              borderColor: 'rgba(16, 185, 129, 0.3)',
              background: 'rgba(16, 185, 129, 0.06)',
            }}
          >
            <i className="fas fa-check-circle" style={{ color: 'var(--accent-success)' }}></i>
            <div className="conflict-alert-text">
              {t('analysis.priorities_aligned_desc')}
            </div>
          </div>
        )}

        <DecisionTrace
          priorities={priorities}
          analysisSummary={analysisSummary}
          detectedConflicts={detectedConflicts}
          budgetMin={budgetMin}
          budgetMax={budgetMax}
        />

        <div style={{ marginTop: 16 }}>
          <DecisionTrust
            integrityScore={integrityPercent}
            irHash={decisionMetadata?.irHash ?? null}
            relaxedConstraint={decisionMetadata?.relaxedConstraint ?? null}
          />
        </div>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={onViewCards}>
          <i className="fas fa-magic"></i> {t('analysis.view_paths')}
        </button>
        <button className="btn btn-secondary" onClick={onAdjustPriorities}>
          <i className="fas fa-arrow-left"></i> {t('cards.adjust_priorities')}
        </button>
      </div>
    </div>
  );
}
