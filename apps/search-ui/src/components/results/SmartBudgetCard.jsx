import { useState } from 'react';
import Icon from '../shared/Icon';
import { trackClick } from '../../lib/commerce';
import { API_URL as apiUrl } from '../../lib/apiUrl.js';

export default function SmartBudgetCard({ selectedCard, selectedPurchase, setSelectedPurchase }) {
  const [email, setEmail] = useState('');
  const [alertSaved, setAlertSaved] = useState(false);
  const [alertError, setAlertError] = useState(null);

  const { purchaseLinks = {} } = selectedCard || {};
  const offers = [
    purchaseLinks.primary && {
      key: 'primary',
      label: purchaseLinks.primarySeller || 'Best Price',
      url: purchaseLinks.primary,
      isAffiliate: false,
      price: `$${(purchaseLinks.priceUsd || 0).toLocaleString()}`
    },
    purchaseLinks.affiliate && {
      key: 'affiliate',
      label: purchaseLinks.affiliateSeller || 'Partner Store',
      url: purchaseLinks.affiliate,
      isAffiliate: true,
      price: `$${(purchaseLinks.priceUsd || 0).toLocaleString()}`
    }
  ].filter(Boolean);

  const selected = offers.find(o => o.key === selectedPurchase) || offers[0];

  const handleBuy = () => {
    if (!selected?.url) return;
    trackClick({ entityId: selectedCard.entityId, decisionRunId: selectedCard.decisionRunId, clickType: 'buy_now_clicked' });
    window.open(selected.url, '_blank', 'noopener,noreferrer');
  };

  const handleSaveAlert = async () => {
    if (!email) return;
    setAlertError(null);
    try {
      const res = await fetch(`${apiUrl}/api/v1/laptop-student-us/growth/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          leadType: 'price_alert',
          trackingData: { entityId: selectedCard.entityId, priceUsd: purchaseLinks.priceUsd }
        })
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      setAlertSaved(true);
    } catch (err) {
      console.error('[SmartBudgetCard] Price alert save failed:', err);
      setAlertError('Could not save alert. Please try again.');
    }
  };

  return (
    <div>
      <div className="purchase-section">
        <div className="purchase-section-title">
          <Icon name="shopping-cart" /> Purchase Links
        </div>

        {offers.length > 0 ? offers.map(offer => (
          <div
            key={offer.key}
            className={`purchase-option ${selectedPurchase === offer.key ? 'selected' : ''}`}
            onClick={() => setSelectedPurchase(offer.key)}
          >
            <input type="radio" className="purchase-option-radio" checked={selectedPurchase === offer.key} readOnly />
            <div className="purchase-option-info">
              <div className="purchase-option-name">
                <Icon name="store" /> {offer.label}
              </div>
              <div className="purchase-option-price">{offer.price}</div>
            </div>
            <span className={`purchase-option-tag ${offer.isAffiliate ? 'tag-affiliate' : 'tag-direct'}`}>
              {offer.isAffiliate ? 'Affiliate' : 'No Commission'}
            </span>
          </div>
        )) : (
          <div style={{ padding: 12, color: 'var(--text-muted)', fontSize: 13 }}>
            Purchase links not available yet.
          </div>
        )}

        {offers.length > 0 && (
          <>
            <div style={{ marginTop: 16, padding: 14, background: 'rgba(100,116,139,0.08)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              <Icon name="info-circle" style={{ color: 'var(--accent-warning)', marginRight: 4 }} />
              <strong>Prices shown are estimates</strong> captured at catalog time and may differ from the current store price.
              Always verify on the retailer's site before purchasing.
              {' '}Some links earn us a small commission — this <strong>never</strong> affects our rankings.
            </div>

            <button
              className={`purchase-action-btn ${selected?.key || ''}`}
              onClick={handleBuy}
              disabled={!selected?.url}
              style={{ marginTop: 16 }}
            >
              <Icon name="external-link-alt" />
              {selected ? `Check current price on ${selected.label}` : 'No link available'}
            </button>
          </>
        )}
      </div>

      <div className="purchase-section" style={{ marginTop: 16 }}>
        <div className="purchase-section-title">
          <Icon name="bell" /> Price & Availability Alerts
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { icon: '💰', title: 'Price Drop', desc: purchaseLinks.priceUsd > 0 ? `Alert when price drops below $${Math.round(purchaseLinks.priceUsd * 0.9).toLocaleString()}` : 'Alert when price drops' },
            { icon: '🆕', title: 'Better Option', desc: 'If a superior device appears in your budget' },
            { icon: '⚡', title: 'Stock Alert', desc: 'If this device goes out of stock' }
          ].map(item => (
            <div key={item.title} style={{ padding: 12, background: 'var(--surface-elevated)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
            📧 Save Decision & Enable Alerts
          </div>
          {alertSaved ? (
            <div style={{ padding: 12, background: 'rgba(34,197,94,0.1)', color: 'var(--accent-success)', borderRadius: 10, fontSize: 13 }}>
              ✓ Alerts enabled — we'll notify you of price drops.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="Your email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary" style={{ padding: '12px 20px' }} onClick={handleSaveAlert}>
                  <Icon name="bell" />
                </button>
              </div>
              {alertError && (
                <div style={{ marginTop: 6, fontSize: 12, color: 'var(--accent-error, #ef4444)' }}>
                  {alertError}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
