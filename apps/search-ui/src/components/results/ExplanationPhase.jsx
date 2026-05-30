import { useTranslation } from 'react-i18next';
import ExplainabilityPanel from './ExplainabilityPanel';
import Icon from '../shared/Icon';

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
          <Icon name="arrow-right" style={{ marginRight: 8 }} />
          {t('phase.final_summary_btn')}
        </button>
        <button className="btn btn-secondary" onClick={onBackToCards}>
          <Icon name="arrow-left" style={{ marginRight: 8 }} />
          {t('phase.back_to_cards')}
        </button>
      </div>
    </div>
  );
}
