import ExplainabilityPanel from './ExplainabilityPanel';

export default function ExplanationPhase({ selectedCard, explanationTab, setExplanationTab, onFinalSummary, onBackToCards }) {
  const isAr = selectedCard?.locale === 'ar';

  return (
    <div className="phase-container active" dir={isAr ? 'rtl' : 'ltr'}>
      <ExplainabilityPanel selectedCard={selectedCard} explanationTab={explanationTab} setExplanationTab={setExplanationTab} />
      <div className="btn-group" style={{ display: 'flex', gap: 12, justifyContent: 'flex-start', marginTop: 20 }}>
        <button className="btn btn-primary" onClick={onFinalSummary}>
          <i className={`fas ${isAr ? 'fa-arrow-left' : 'fa-arrow-right'}`} style={{ marginLeft: isAr ? 8 : 0, marginRight: isAr ? 0 : 8 }}></i>
          {isAr ? 'الملخص النهائي' : 'Final Summary'}
        </button>
        <button className="btn btn-secondary" onClick={onBackToCards}>
          <i className={`fas ${isAr ? 'fa-arrow-right' : 'fa-arrow-left'}`} style={{ marginLeft: isAr ? 8 : 0, marginRight: isAr ? 0 : 8 }}></i>
          {isAr ? 'العودة للبطاقات' : 'Back to Cards'}
        </button>
      </div>
    </div>
  );
}
