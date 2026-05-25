import DecisionTrace from './DecisionTrace';
import DecisionTrust from './DecisionTrust';

export default function AnalysisPhase({
  priorities, analysisSummary, detectedConflicts, decisionMetadata,
  budgetMin, budgetMax, onViewCards, onAdjustPriorities
}) {
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
            <div className="card-title">Decision Analysis</div>
            <div className="card-subtitle">
              {analysisSummary.devices > 0
                ? `Scanned ${analysisSummary.devices} devices within your budget`
                : 'Analyzing your requirements'}
              {hasConflicts
                ? ` · ${conflictCount} tension${conflictCount > 1 ? 's' : ''} detected`
                : ' · priorities aligned'}
            </div>
          </div>
        </div>

        {/* Real conflict alerts from the decision engine */}
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
                  (tension {Math.round(conflict.gravity * 100)}%)
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Harmony notice when no conflicts */}
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
              <strong>Priorities aligned</strong> — no significant trade-offs required.
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

        {/* Integrity banner — always visible after analysis */}
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
          <i className="fas fa-magic"></i> View Decision Paths
        </button>
        <button className="btn btn-secondary" onClick={onAdjustPriorities}>
          <i className="fas fa-arrow-left"></i> Adjust Priorities
        </button>
      </div>
    </div>
  );
}
