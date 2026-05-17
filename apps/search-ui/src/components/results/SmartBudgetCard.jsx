import React from 'react';

export default function SmartBudgetCard({ selectedCard, selectedPurchase, setSelectedPurchase }) {
  return (
    <div>
      <div className="purchase-section">
        <div className="purchase-section-title">
          <i className="fas fa-shopping-cart"></i> Purchase Links
        </div>

        {['amazon', 'bestbuy', 'direct'].map(store => (
          <div
            key={store}
            className={`purchase-option ${selectedPurchase === store ? 'selected' : ''}`}
            onClick={() => setSelectedPurchase(store)}
          >
            <input type="radio" className="purchase-option-radio" checked={selectedPurchase === store} readOnly />
            <div className="purchase-option-info">
              <div className="purchase-option-name" style={{ textTransform: 'capitalize' }}>
                <i className={store === 'amazon' ? "fab fa-amazon" : store === 'bestbuy' ? "fas fa-store" : "fas fa-globe"}></i> {store}
              </div>
              <div className="purchase-option-price">{selectedCard.purchaseLinks[store]}</div>
            </div>
            <span className={`purchase-option-tag ${store !== 'direct' ? 'tag-affiliate' : 'tag-direct'}`}>
              {store !== 'direct' ? 'Affiliate' : 'No Affiliate'}
            </span>
          </div>
        ))}

        <div
          className="purchase-disclosure"
          style={{
            marginTop: 16,
            padding: 14,
            background: 'rgba(100, 116, 139, 0.08)',
            borderRadius: 10,
            fontSize: 12,
            color: 'var(--text-muted)',
            lineHeight: 1.6
          }}
        >
          <i className="fas fa-info-circle" style={{ color: 'var(--accent-warning)', marginRight: 4 }}></i>
          <strong>Affiliate Disclosure:</strong> Amazon and BestBuy links are affiliate links. We earn a small commission
          if you purchase through them. This <strong>does not affect</strong> the decision ranking or the price you pay.
          The official store has no commission.
        </div>

        <button
          className={`purchase-action-btn ${selectedPurchase}`}
          onClick={() => alert(`Redirecting to ${selectedPurchase} for ${selectedCard.purchaseLinks[selectedPurchase]}`)}
          style={{ marginTop: 16 }}
        >
          <i className={selectedPurchase === 'amazon' ? "fab fa-amazon" : selectedPurchase === 'bestbuy' ? "fas fa-store" : "fas fa-globe"}></i>
          Buy from {selectedPurchase} - {selectedCard.purchaseLinks[selectedPurchase]}
        </button>
      </div>

      <div className="purchase-section" style={{ marginTop: 16 }}>
        <div className="purchase-section-title">
          <i className="fas fa-bell"></i> Future Alerts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: 12, background: 'var(--surface-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>💰</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Price Drop</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>If price drops below $1,000</div>
            </div>
          </div>
          <div style={{ padding: 12, background: 'var(--surface-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🆕</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>New Device</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>If a better device appears in your budget</div>
            </div>
          </div>
          <div style={{ padding: 12, background: 'var(--surface-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚡</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Spec Update</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>If your chosen device specs improve</div>
            </div>
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            📧 Save Decision for Tracking
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input type="email" className="form-input" placeholder="Your email address" style={{ flex: 1 }} />
            <button className="btn btn-primary" style={{ padding: '12px 20px' }} onClick={() => alert('Saved!')}>
              <i className="fas fa-bell"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
