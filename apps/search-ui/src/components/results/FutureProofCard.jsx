import React from 'react';

export default function FutureProofCard({ selectedCard, timeline }) {
  return (
    <div>
      <div className="final-card-hero">
        <div className="final-card-hero-header">
          <span className={`final-card-hero-badge ${selectedCard.badgeClass}`}>{selectedCard.badge}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Final Decision</span>
        </div>
        <div
          className="final-card-hero-image"
          style={{
            background: 'linear-gradient(145deg, #0d1b2a 0%, #1b2838 40%, #0a1628 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
            minHeight: 200,
            borderRadius: 12
          }}
        >
          <div style={{
            position: 'absolute',
            top: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: '60%',
            background: 'radial-gradient(ellipse, rgba(100,160,255,0.1) 0%, transparent 70%)',
            pointerEvents: 'none'
          }}></div>
          {selectedCard.image ? (
            <img
              src={selectedCard.image}
              alt={selectedCard.name}
              style={{
                width: '80%',
                maxHeight: '170px',
                objectFit: 'contain',
                filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.6))',
                position: 'relative',
                zIndex: 1
              }}
            />
          ) : (
            <span style={{ fontSize: 72 }}>{selectedCard.icon}</span>
          )}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '35%',
            background: 'linear-gradient(to top, rgba(13,27,42,0.9), transparent)',
            pointerEvents: 'none',
            zIndex: 2
          }}></div>
        </div>

        <div className="final-card-hero-body">
          <div className="final-card-hero-name">{selectedCard.name}</div>
          <div className="final-card-hero-price">
            {selectedCard.price}{' '}
            {selectedCard.originalPrice && <span className="original">{selectedCard.originalPrice}</span>}
          </div>

          <div className="final-judgment">
            <div className={`final-judgment-score ${selectedCard.scoreClass}`}>{selectedCard.score}%</div>
            <div className="final-judgment-info">
              <div className="final-judgment-title">Judgment Score - {selectedCard.scoreLabel}</div>
              <div className="final-judgment-desc">Achieves core priorities</div>
            </div>
          </div>

          <div className="final-section">
            <div className="final-section-title">Why This Decision?</div>
            <div className="final-section-text">{selectedCard.whyChosen}</div>
          </div>

          <div className="final-section">
            <div className="final-section-title">Real Flaws</div>
            <div className="final-section-text" style={{ color: 'var(--accent-danger)' }}>
              {selectedCard.flaws.map(f => <div key={f}>• {f}</div>)}
            </div>
          </div>

          <div className="final-section">
            <div className="final-section-title">Key Trade-offs</div>
            <div>
              {selectedCard.tradeOffs.gained.map(g => (
                <div key={g} className="final-trade-off">
                  <i className="fas fa-arrow-up trade-off-positive"></i>
                  <span>{g}</span>
                </div>
              ))}
              {selectedCard.tradeOffs.lost.map(l => (
                <div key={l} className="final-trade-off">
                  <i className="fas fa-arrow-down trade-off-negative"></i>
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="final-section">
            <div className="final-section-title">Decision Stability</div>
            <div style={{ textAlign: 'center', padding: 16 }}>
              <div className={`stability-circle ${selectedCard.stability.status}`}>
                <div className={`stability-score ${selectedCard.stability.status}`}>{selectedCard.stability.score}%</div>
                <div className="stability-label">{selectedCard.stability.label}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                {selectedCard.stability.description}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <div className="card-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)' }}>📈</div>
          <div>
            <div className="card-title">Decision Evolution</div>
          </div>
        </div>
        <div className="evolution-timeline">
          {timeline.map((item, idx) => (
            <div key={idx} className="timeline-item">
              <div
                className="timeline-dot"
                style={{ background: idx === timeline.length - 1 ? 'var(--accent-success)' : 'var(--accent)' }}
              ></div>
              <div className="timeline-content">
                <div className="timeline-date">{item.date}</div>
                <div className="timeline-title">{item.title}</div>
                <div className="timeline-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
