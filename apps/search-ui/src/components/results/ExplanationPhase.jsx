import AdvisorConversation from './AdvisorConversation';

export default function ExplanationPhase({ selectedCard, onFinalSummary, onBackToCards }) {
  return (
    <div className="phase-container active">
      <AdvisorConversation
        selectedCard={selectedCard}
        onFinalSummary={onFinalSummary}
        onBackToCards={onBackToCards}
      />
    </div>
  );
}
