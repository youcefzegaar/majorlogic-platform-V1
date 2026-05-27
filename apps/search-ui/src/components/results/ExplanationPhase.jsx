import { useTranslation } from 'react-i18next';
import AdvisorConversation from './AdvisorConversation';

export default function ExplanationPhase({
  selectedCard,
  candidateCount,
  onFinalSummary,
  onBackToCards,
  onFlip,
}) {
  return (
    <div className="phase-container active">
      <AdvisorConversation
        selectedCard={selectedCard}
        candidateCount={candidateCount}
        onFinalSummary={onFinalSummary}
        onAdjust={onBackToCards}
        onFlip={onFlip}
      />
    </div>
  );
}
