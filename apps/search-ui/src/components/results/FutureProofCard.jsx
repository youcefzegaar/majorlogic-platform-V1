import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '../shared/Icon';
import { trackClick } from '../../lib/commerce';
import { API_URL } from '../../lib/apiUrl.js';

export default function FutureProofCard({ selectedCard, timeline, ownershipChoice }) {
  const { t } = useTranslation();
  const [shareState, setShareState] = useState('idle'); // 'idle' | 'copying' | 'copied' | 'error'

  const handleShare = async () => {
    setShareState('copying');
    try {
      const decisionId = selectedCard.savedDecisionId;
      let shareUrl;

      if (decisionId) {
        const res = await fetch(`${API_URL}/user/decisions/${decisionId}/share`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!res.ok) throw new Error('share_failed');
        const data = await res.json();
        shareUrl = data.shareUrl;
      } else {
        // Guest fallback: share the current page URL
        shareUrl = window.location.href;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareState('copied');
      setTimeout(() => setShareState('idle'), 3000);
    } catch {
      setShareState('error');
      setTimeout(() => setShareState('idle'), 3000);
    }
  };

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
    `My AI-matched laptop: ${selectedCard.name} — ${selectedCard.score}% match 🎯 via @MajorLogicAI`
  )}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `My AI-matched laptop: ${selectedCard.name} — check MajorLogic for yours`
  )}`;

  // Resolve purchase link from ownership choice (set in OwnershipPhase) or fall back to primary link
  const buyUrl = ownershipChoice?.url || selectedCard.purchaseLinks?.primary;
  const buyCta = ownershipChoice?.cta || (selectedCard.price ? `Buy Now — ${selectedCard.price}` : 'Buy Now');
  const buyIsAffiliate = ownershipChoice?.isAffiliate ?? selectedCard.purchaseLinks?.isAffiliate ?? false;
  const buyFallbackSeller = !ownershipChoice && selectedCard.purchaseLinks?.primarySeller;

  return (
    <div>
      <div className="final-card-hero">
        <div className="final-card-hero-header">
          <span className={`final-card-hero-badge ${selectedCard.badgeClass}`}>{selectedCard.badge}</span>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('future.final_decision')}</span>
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
              <div className="final-judgment-title">{t('future.judgment_score', { label: selectedCard.scoreLabel })}</div>
              <div className="final-judgment-desc">{t('future.achieves_priorities')}</div>
            </div>
          </div>

          <div className="final-section">
            <div className="final-section-title">{t('future.why_decision')}</div>
            <div className="final-section-text">
              {String(selectedCard.whyChosen || '').split('\n\n').map((para, i) => (
                <p key={i} style={{ margin: '0 0 8px 0' }}>{para}</p>
              ))}
            </div>
          </div>

          <div className="final-section">
            <div className="final-section-title">{t('future.real_flaws')}</div>
            <div className="final-section-text" style={{ color: 'var(--accent-danger)' }}>
              {selectedCard.flaws.map(f => <div key={f}>• {f}</div>)}
            </div>
          </div>

          <div className="final-section">
            <div className="final-section-title">{t('future.key_tradeoffs')}</div>
            <div>
              {selectedCard.tradeOffs.gained.map(g => (
                <div key={g} className="final-trade-off">
                  <Icon name="arrow-up" />
                  <span>{g}</span>
                </div>
              ))}
              {selectedCard.tradeOffs.lost.map(l => (
                <div key={l} className="final-trade-off">
                  <Icon name="arrow-down" />
                  <span>{l}</span>
                </div>
              ))}
            </div>
          </div>

          {buyUrl && (
            <div className="final-section">
              <div className="final-section-title">{t('future.where_to_buy')}</div>
              <a
                href={buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="final-buy-btn"
                onClick={() => trackClick({ entityId: selectedCard.entityId, decisionRunId: selectedCard.decisionRunId, clickType: 'buy_now_clicked' })}
              >
                <Icon name="shopping-cart" />
                &nbsp;{buyCta}
                {buyFallbackSeller && (
                  <span className="final-buy-seller"> {t('future.via_seller', { seller: buyFallbackSeller })}</span>
                )}
              </a>
              <div className="final-affiliate-disclosure">
                {buyIsAffiliate
                  ? t('future.affiliate_link')
                  : t('future.direct_link')
                }
              </div>
            </div>
          )}

          <div className="final-section">
            <div className="final-section-title">{t('future.share_decision')}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                onClick={handleShare}
                disabled={shareState === 'copying'}
              >
                <Icon name={shareState === 'copied' ? 'check' : 'copy'} />
                {shareState === 'copied' ? t('future.share_copied') : shareState === 'error' ? t('future.share_error') : t('future.share_copy_link')}
              </button>
              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}
              >
                <Icon name="share-alt" />
                X / Twitter
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, textDecoration: 'none' }}
              >
                <Icon name="comment" />
                WhatsApp
              </a>
            </div>
          </div>

          <div className="final-section">
            <div className="final-section-title">{t('future.decision_stability')}</div>
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
            <div className="card-title">{t('future.decision_evolution')}</div>
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
