import ExplainabilityPanel from './ExplainabilityPanel';

export default function ExplanationPhase({ selectedCard, explanationTab, setExplanationTab, onFinalSummary, onBackToCards }) {
  return (
    <div className="phase-container active">
      <ExplainabilityPanel selectedCard={selectedCard} explanationTab={explanationTab} setExplanationTab={setExplanationTab} />
      <div className="btn-group">
        <button className="btn btn-primary" onClick={onFinalSummary}><i className="fas fa-arrow-right"></i> Final Summary</button>
        <button className="btn btn-secondary" onClick={onBackToCards}><i className="fas fa-arrow-left"></i> Back to Cards</button>
      </div>
    </div>
  );
}
