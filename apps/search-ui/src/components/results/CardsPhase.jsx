import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import HeroCard from './HeroCard';
import ZeroResultsView from './ZeroResultsView';
import Icon from '../shared/Icon';
import ConfidenceRing from '../shared/ConfidenceRing';
import TrustPanel from './TrustPanel';

export default function CardsPhase({
  cards, noResults, decisionMetadata, analysisSummary,
  selectedCardType, onSelectCard, onConfirmCard, onCardDetails, onEditRequirements,
  priorities, setPriorities,
  budgetMin, setBudgetMin, budgetMax, setBudgetMax,
  isAnalyzing, onUpdateResults, onResetPriorities
}) {
  const { t } = useTranslation();
  const firstRender = useRef(true);
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    if (isAnalyzing) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => { onUpdateResults(); }, 600);
    return () => clearTimeout(debounceTimer.current);
  }, [priorities, budgetMin, budgetMax]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="phase-container active">
      <div className="cards-phase-header">
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800 }}>{t('cards.title')}</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 4 }}>{t('cards.subtitle')}</p>
        </div>
        <div className="confidence-badge">
          <span className="confidence-badge__label">{t('cards.confidence')}</span>
          <ConfidenceRing pct={analysisSummary.confidence} />
          <span className="confidence-badge__pct">{analysisSummary.confidence}%</span>
        </div>
      </div>

      <TrustPanel irHash={decisionMetadata.irHash ?? null} />

      {decisionMetadata.catalogFreshness?.isStale && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.4)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--accent-warning, #f59e0b)' }}>
          <Icon name="clock" />
          <span>
            {t('cards.stale_data_warning', 'Prices may be outdated')}
            {decisionMetadata.catalogFreshness.publishedAt && (
              <> — {t('cards.data_as_of', 'data as of')} {new Date(decisionMetadata.catalogFreshness.publishedAt).toLocaleDateString()}</>
            )}
          </span>
        </div>
      )}
      {!decisionMetadata.catalogFreshness?.isStale && decisionMetadata.catalogFreshness?.publishedAt && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textAlign: 'right' }}>
          {t('cards.data_as_of', 'Data as of')} {new Date(decisionMetadata.catalogFreshness.publishedAt).toLocaleDateString()}
        </div>
      )}

      <div className="cards-layout">
        <div className="cards-main">
          {decisionMetadata.relaxedConstraint === 'within_budget' && (
            <div className="recovery-warning" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-warning)', border: '1px solid var(--accent-warning)', padding: '16px 20px', borderRadius: 12, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, fontSize: '14px' }}>
              <Icon name="exclamation-triangle" style={{ fontSize: '20px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: 4 }}>{t('cards.budget_relaxed_title')}</strong>
                {t('cards.budget_relaxed_body')}
              </div>
            </div>
          )}
          {noResults ? (
            <ZeroResultsView noResults={noResults} onEditRequirements={onEditRequirements} />
          ) : Object.keys(cards).length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t('cards.no_results_title')}</div>
              <div style={{ fontSize: 14 }}>{t('cards.no_results_body')}</div>
              <button className="btn btn-secondary" style={{ marginTop: 20 }} onClick={onEditRequirements}>
                {t('buttons.edit_requirements')}
              </button>
            </div>
          ) : (() => {
            const mainEntries = Object.entries(cards).filter(([type]) => type !== 'renewed_value');
            const renewedCard = cards['renewed_value'] || null;
            return (
              <>
                <div className="decision-cards-grid">
                  {mainEntries.map(([type, card]) => (
                    <HeroCard
                      key={type}
                      type={type}
                      card={card}
                      isSelected={selectedCardType === type}
                      onSelect={onSelectCard}
                      onConfirm={onConfirmCard}
                      onDetails={onCardDetails}
                    />
                  ))}
                </div>

                {renewedCard && (
                  <div className="renewed-opp-section">
                    <div className="renewed-opp-section-header">
                      <span className="renewed-opp-gem-icon">♻️</span>
                      <div>
                        <div className="renewed-opp-section-title">{t('cards.renewed_gem')}</div>
                        <div className="renewed-opp-section-sub">
                          {t('cards.renewed_gem_sub')}
                          {renewedCard.heroScoreGap > 0 && (
                            <span style={{ marginLeft: 8, color: 'var(--accent-success)', fontWeight: 600 }}>
                              +{renewedCard.heroScoreGap} pts vs Hero · Saves ${renewedCard.renewedSavings?.toLocaleString()} vs retail
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <HeroCard
                      type="renewed_value"
                      card={renewedCard}
                      isSelected={selectedCardType === 'renewed_value'}
                      onSelect={onSelectCard}
                      onConfirm={onConfirmCard}
                      onDetails={onCardDetails}
                    />
                  </div>
                )}
              </>
            );
          })()}
        </div>

        <div className="cards-sidebar">
          <div className="sidebar-panel">
            <div className="sidebar-panel-title"><Icon name="sliders-h" /> {t('cards.adjust_priorities')}</div>
            {Object.entries(priorities).map(([key, val]) => (
              <div key={key} className="sidebar-slider-item">
                <div className="sidebar-slider-label">
                  <span style={{ textTransform: 'capitalize' }}>{key}</span>
                  <span>{val}%</span>
                </div>
                <input type="range" className="sidebar-slider" value={val} onChange={(e) => setPriorities({ ...priorities, [key]: Number(e.target.value) })} />
              </div>
            ))}
          </div>

          <div className="sidebar-panel">
            <div className="sidebar-panel-title"><Icon name="wallet" /> {t('cards.budget_range')}</div>
            <div className="sidebar-budget" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-muted)' }}>$</span>
                  <input type="number" className="budget-input" style={{ width: '100%', paddingLeft: 20, padding: 8, fontSize: 13 }} value={budgetMin} onChange={(e) => setBudgetMin(Number(e.target.value))} />
                </div>
                <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('cards.budget_to')}</span>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: 8, top: 8, color: 'var(--text-muted)' }}>$</span>
                  <input type="number" className="budget-input" style={{ width: '100%', paddingLeft: 20, padding: 8, fontSize: 13 }} value={budgetMax} onChange={(e) => setBudgetMax(Number(e.target.value))} />
                </div>
              </div>
            </div>
          </div>

          <div className="sidebar-panel">
            <button className="sidebar-action-btn primary" onClick={onUpdateResults} disabled={isAnalyzing} style={{ marginBottom: 8 }}>
              <Icon name="sync-alt" /> {isAnalyzing ? t('buttons.updating') : t('buttons.update_results')}
            </button>
            <button className="sidebar-action-btn secondary" onClick={onResetPriorities}>
              <Icon name="undo" /> {t('buttons.reset')}
            </button>
          </div>

          <div className="live-update-indicator">
            <div className="live-dot"></div>
            <span>{isAnalyzing ? t('buttons.updating') : t('cards.auto_updates')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
