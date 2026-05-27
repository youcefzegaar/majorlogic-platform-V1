import { useTranslation } from 'react-i18next';
import { useDecisionStore } from '../../stores/decisionStore.js';

export default function MyDecisionsModal({ cards, selectedCardType, onClose, onNewDecision }) {
  const { t } = useTranslation();
  const { setPhase } = useDecisionStore();

  const currentCard = cards?.[selectedCardType];

  const handleViewDecision = () => {
    onClose();
    setPhase(2);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="card-header" style={{ marginBottom: 24 }}>
          <div className="card-icon" style={{ background: 'rgba(233,69,96,0.15)', color: 'var(--accent)' }}>
            <i className="fas fa-history"></i>
          </div>
          <div>
            <div className="card-title">{t('nav.my_decisions')}</div>
            <div className="card-subtitle">{t('my_decisions.subtitle', 'Your decision history')}</div>
          </div>
        </div>

        {currentCard ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              {t('my_decisions.this_session', 'This session')}
            </div>
            <div style={{
              padding: 16, borderRadius: 12,
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
              marginBottom: 20,
            }}>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {currentCard.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                {currentCard.badge} · {currentCard.price ? `$${currentCard.price}` : ''}
              </div>
              <button className="btn btn-primary" onClick={handleViewDecision} style={{ fontSize: 13, padding: '8px 16px' }}>
                <i className="fas fa-eye"></i> {t('my_decisions.view_decision', 'View Decision')}
              </button>
            </div>
          </>
        ) : (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7,
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              {t('my_decisions.empty_title', 'No decisions yet')}
            </div>
            {t('my_decisions.empty_body', 'Start a new decision to see it here.')}
          </div>
        )}

        {/* Account upsell */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)',
          borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
          marginBottom: 20,
        }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {t('my_decisions.save_title', 'Save decisions permanently')}
          </div>
          {t('my_decisions.save_body', 'Create a free account to save decisions across sessions and get 30-day satisfaction follow-ups. Coming soon.')}
        </div>

        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => { onClose(); onNewDecision(); }}>
            <i className="fas fa-plus-circle"></i> {t('nav.new_decision')}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            {t('buttons.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
}
