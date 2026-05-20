export default function HeroCard({ type, card, isSelected, onSelect, onConfirm, onDetails }) {
  return (
    <div
      className={`decision-card ${isSelected ? 'recommended' : ''}`}
      onClick={() => onSelect(type)}
    >
      {/* CSS Studio Layer */}
      <div
        className="decision-card-image"
        style={{
          padding: 0,
          background: 'linear-gradient(145deg, #0d1b2a 0%, #1b2838 40%, #0a1628 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '220px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Spotlight glow */}
        <div style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70%',
          height: '60%',
          background: 'radial-gradient(ellipse, rgba(100,160,255,0.08) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}></div>
        {card.image ? (
          <img
            src={card.image}
            alt={card.name}
            style={{
              width: '85%',
              maxHeight: '180px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.6))',
              position: 'relative',
              zIndex: 1
            }}
          />
        ) : (
          <span style={{ fontSize: 64 }}>{card.icon}</span>
        )}
        {/* Bottom reflection */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '40%',
          background: 'linear-gradient(to top, rgba(13,27,42,0.95), transparent)',
          pointerEvents: 'none',
          zIndex: 2
        }}></div>
      </div>

      <div className="decision-card-body">
        <div className="decision-card-header">
          <span className={`decision-card-badge ${card.badgeClass}`}>{card.badge}</span>
        </div>
        <div className="decision-card-name">{card.name}</div>
        <div className="decision-card-price">
          {card.price} {card.originalPrice && <span className="original">{card.originalPrice}</span>}
        </div>

        <div className="judgment-rating">
          <div className={`judgment-score ${card.scoreClass}`}>{card.score}%</div>
          <div className="judgment-label">
            <strong>Judgment Score</strong><br />{card.scoreLabel}
          </div>
        </div>

        <div className="card-section" style={{ marginBottom: 12 }}>
          <div className="card-section-title">Why this choice?</div>
          <div className="card-section-text">
            {String(card.whyChosen || '').split('\n\n')[0]}
          </div>
        </div>

        <div
          className="card-section"
          style={{
            background: 'rgba(244, 63, 94, 0.05)',
            border: '1px solid rgba(244, 63, 94, 0.2)',
            padding: '12px',
            borderRadius: '8px'
          }}
        >
          <div
            className="card-section-title"
            style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <i className="fas fa-bullhorn"></i> Real Review Consensus (The Catch)
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
            Aggregated from expert and user reviews across platforms
          </div>
          <div className="card-section-text" style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>
            {card.flaws && card.flaws[0] ? card.flaws[0] : 'No critical compromises detected in reviews.'}
          </div>
        </div>

        <div className="card-actions">
          <button
            className="card-action-btn select"
            onClick={(e) => { e.stopPropagation(); onConfirm(type); }}
          >
            <i className="fas fa-check-circle"></i> Choose This Decision
          </button>
          <button
            className="card-action-btn details"
            onClick={(e) => { e.stopPropagation(); onDetails(type); }}
          >
            <i className="fas fa-info-circle"></i> Details
          </button>
        </div>
      </div>
    </div>
  );
}
