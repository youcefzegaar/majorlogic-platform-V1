import ExplainabilityPanel from './ExplainabilityPanel';

export default function ExplanationPhase({ selectedCard, explanationTab, setExplanationTab, onFinalSummary, onBackToCards }) {
  return (
    <div className="phase-container active">
      <ExplainabilityPanel
        selectedCard={selectedCard}
        explanationTab={explanationTab}
        setExplanationTab={setExplanationTab}
        onBack={onBackToCards}
      />
      <div className="btn-group" style={{ display: 'flex', gap: 12, justifyContent: 'flex-start', marginTop: 20 }}>
        <button className="btn btn-primary" onClick={onFinalSummary}>
          <i className="fas fa-arrow-right" style={{ marginRight: 8 }}></i>
          Final Summary
        </button>
        <button className="btn btn-secondary" onClick={onBackToCards}>
          <i className="fas fa-arrow-left" style={{ marginRight: 8 }}></i>
          Back to Cards
        </button>
      </div>
    </div>
  );
}
