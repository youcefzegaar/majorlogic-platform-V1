import FutureProofCard from './FutureProofCard';

export default function SummaryPhase({ selectedCard, timeline, onNewDecision, onBackToExplanation }) {
  return (
    <div className="phase-container active">
      <div className="final-summary-layout">
        <FutureProofCard selectedCard={selectedCard} timeline={timeline} />
      </div>
      <div className="btn-group" style={{ marginTop: 32 }}>
        <button className="btn btn-primary" onClick={onNewDecision}><i className="fas fa-plus"></i> New Decision</button>
        <button className="btn btn-secondary" onClick={onBackToExplanation}><i className="fas fa-arrow-left"></i> Back to Ownership</button>
      </div>
    </div>
  );
}
