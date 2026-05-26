import { useTranslation } from 'react-i18next';
import ExplainabilityPanel from './ExplainabilityPanel';

export default function ExplanationPhase({ selectedCard, explanationTab, setExplanationTab, onFinalSummary, onBackToCards }) {
  const { t } = useTranslation();

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
          {t('phase.final_summary_btn')}
        </button>
        <button className="btn btn-secondary" onClick={onBackToCards}>
          <i className="fas fa-arrow-left" style={{ marginRight: 8 }}></i>
          {t('phase.back_to_cards')}
        </button>
      </div>
    </div>
  );
}
