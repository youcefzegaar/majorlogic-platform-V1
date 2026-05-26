import { useTranslation } from 'react-i18next';

function resolveIdentityStatement(card) {
  const fs = card.fitStates;
  if (!fs) return null;
  if (typeof fs === 'string') return fs;
  if (typeof fs === 'object') {
    if (fs.reason) return fs.reason;
    const first = Object.values(fs)[0];
    if (first?.reason) return first.reason;
    if (typeof first === 'string') return first;
  }
  return null;
}

export default function HeroCard({ type, card, isSelected, onSelect, onConfirm, onDetails }) {
  const { t } = useTranslation();
  const identityStatement = resolveIdentityStatement(card);

  const aiVoice = card.whyChosen
    ? String(card.whyChosen).split(/\n\n/)[0]
    : identityStatement;

  const keyFlaw = card.flaws?.[0] ?? null;
  const keyPro  = card.topPros?.[0] ?? null;

  return (
    <div
      className={`decision-card ${isSelected ? 'recommended' : ''}`}
      onClick={() => onSelect(type)}
    >
      <div
        className="decision-card-image"
        style={{
          padding: 0,
          background: 'linear-gradient(145deg, #0d1b2a 0%, #1b2838 40%, #0a1628 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '200px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%', left: '50%',
            transform: 'translateX(-50%)',
            width: '70%', height: '60%',
            background: 'radial-gradient(ellipse, rgba(100,160,255,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {card.image ? (
          <img
            src={card.image}
            alt={card.name}
            style={{
              width: '85%',
              maxHeight: '170px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.6))',
              position: 'relative',
              zIndex: 1,
            }}
          />
        ) : (
          <span style={{ fontSize: 64 }}>{card.icon}</span>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 0, left: 0, right: 0,
            height: '40%',
            background: 'linear-gradient(to top, rgba(13,27,42,0.95), transparent)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      </div>

      <div className="decision-card-body">
        <div className="decision-card-header">
          <span className={`decision-card-badge ${card.badgeClass}`}>{card.badge}</span>
        </div>
        <div className="decision-card-name">{card.name}</div>
        <div className="decision-card-price">
          {card.price}{' '}
          {card.originalPrice && <span className="original">{card.originalPrice}</span>}
        </div>

        {aiVoice && (
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: '8px 0 12px',
              fontStyle: 'italic',
              borderLeft: '2px solid var(--accent-info)',
              paddingLeft: 10,
            }}
          >
            {aiVoice}
          </div>
        )}

        {keyPro && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11,
              color: 'var(--accent-success)',
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: 20,
              padding: '3px 10px',
              marginBottom: 10,
            }}
          >
            <span>✓</span> {keyPro}
          </div>
        )}

        {keyFlaw && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              background: 'rgba(244, 63, 94, 0.04)',
              border: '1px solid rgba(244, 63, 94, 0.15)',
              borderRadius: 6,
              padding: '6px 10px',
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            <span style={{ color: 'var(--accent-danger)', marginRight: 5 }}>⚠</span>
            {keyFlaw}
          </div>
        )}

        <div className="card-actions">
          <button
            className="card-action-btn select"
            onClick={(e) => { e.stopPropagation(); onConfirm(type); }}
          >
            <i className="fas fa-check-circle"></i> {t('buttons.choose_this')}
          </button>
          <button
            className="card-action-btn details"
            onClick={(e) => { e.stopPropagation(); onDetails(type); }}
          >
            {t('buttons.why_this')}
          </button>
        </div>
      </div>
    </div>
  );
}
