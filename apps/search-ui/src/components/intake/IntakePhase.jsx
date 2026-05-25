import MajorSelector from './MajorSelector';
import BudgetSelector from './BudgetSelector';
import PreferenceSliders from './PreferenceSliders';

export default function IntakePhase({
  goal, setGoal,
  major, setMajor,
  priorities, setPriorities,
  budgetMin, setBudgetMin,
  budgetMax, setBudgetMax,
  isAnalyzing, onAnalyze
}) {
  return (
    <div className="phase-container active">
      <div className="intake-grid">
        <div className="intake-card full-width">
          <div className="card-header">
            <div className="card-icon" style={{ background: 'rgba(233, 69, 96, 0.15)', color: 'var(--accent)' }}>🎯</div>
            <div>
              <div className="card-title">What are you trying to achieve?</div>
              <div className="card-subtitle">Describe your goal briefly and your needs in detail</div>
            </div>
          </div>
          <textarea
            className="form-input"
            rows="3"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="I need a laptop for heavy programming and working on large projects... My budget is between $1,500 and $2,500."
          ></textarea>
        </div>
        <MajorSelector major={major} setMajor={setMajor} />
        <PreferenceSliders priorities={priorities} setPriorities={setPriorities} />
        <BudgetSelector budgetMin={budgetMin} setBudgetMin={setBudgetMin} budgetMax={budgetMax} setBudgetMax={setBudgetMax} />
      </div>
      {/* Affiliate Disclosure — must appear before any recommendation is shown */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '10px 14px',
          background: 'rgba(14, 165, 233, 0.05)',
          border: '1px solid rgba(14, 165, 233, 0.18)',
          borderRadius: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}
      >
        <span style={{ fontSize: 14, marginTop: 1, flexShrink: 0 }}>ℹ️</span>
        <span>
          <strong style={{ color: 'var(--text-primary)' }}>How we work:</strong>{' '}
          We may earn a commission when you purchase through our links.
          This does not influence the algorithm — device rankings are determined solely by your priorities and our decision engine.{' '}
          <button
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--accent-info)',
              cursor: 'pointer',
              fontSize: 12,
              padding: 0,
              textDecoration: 'underline',
            }}
            onClick={() => window.open('/how-we-work', '_blank')}
          >
            How we guarantee this →
          </button>
        </span>
      </div>

      <div className="btn-group">
        <button className="btn btn-primary" onClick={onAnalyze} disabled={isAnalyzing}>
          <i className="fas fa-brain"></i>{isAnalyzing ? 'Analyzing...' : 'Analyze Decision'}
        </button>
        <button className="btn btn-secondary"><i className="fas fa-save"></i> Save Draft</button>
      </div>
      {isAnalyzing && (
        <div className="thinking-state">
          <div className="thinking-dots">
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
            <div className="thinking-dot"></div>
          </div>
          <span style={{ color: 'var(--text-secondary)' }}>Analyzing your conflicts...</span>
        </div>
      )}
    </div>
  );
}
