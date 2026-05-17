import DecisionTrace from './DecisionTrace';

export default function AnalysisPhase({
  priorities, analysisSummary, detectedConflicts, budgetMin, budgetMax,
  onViewCards, onAdjustPriorities
}) {
  return (
    <div className="phase-container active">
      <div className="card">
        <div className="card-header">
          <div className="card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)' }}>⚠️</div>
          <div>
            <div className="card-title">Analyzing Your Needs &amp; Conflicts</div>
            <div className="card-subtitle">4 main constraints identified that affect your decision</div>
          </div>
        </div>
        <div className="conflict-alert">
          <i className="fas fa-exclamation-triangle"></i>
          <div className="conflict-alert-text">
            <strong>Alert:</strong> Clear conflict detected between <strong>High Performance</strong> and{' '}
            <strong>Battery Life</strong> with <strong>Limited Budget</strong>
          </div>
        </div>
        <DecisionTrace
          priorities={priorities}
          analysisSummary={analysisSummary}
          detectedConflicts={detectedConflicts}
          budgetMin={budgetMin}
          budgetMax={budgetMax}
        />
      </div>
      <div className="btn-group">
        <button className="btn btn-primary" onClick={onViewCards}><i className="fas fa-magic"></i> View Cards</button>
        <button className="btn btn-secondary" onClick={onAdjustPriorities}><i className="fas fa-arrow-left"></i> Adjust Priorities</button>
      </div>
    </div>
  );
}
