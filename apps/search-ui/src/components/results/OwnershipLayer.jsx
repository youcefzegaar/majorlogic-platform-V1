import { useState } from 'react';
import Icon from '../shared/Icon';
import { buildGoUrl, trackClick } from '../../lib/commerce';

const MODE_CONFIG = {
  buy_new:                 { path: 'new',          label: 'Buy New' },
  refurbished_if_verified: { path: 'renewed',      label: 'Certified Renewed' },
  open_box_with_guardrails:{ path: 'open_box',     label: 'Open Box' },
  light_financing:         { path: 'installments', label: 'Installments' },
};

function buildWhyText({ mode, priceUsd, budgetMax, renewedPrice, openBoxPrice, monthly12, costPerYear }) {
  const budget = budgetMax || priceUsd;
  const priceRatio = Math.round((priceUsd / budget) * 100);
  const renewedSavings = priceUsd - renewedPrice;
  const openBoxSavings = priceUsd - openBoxPrice;
  const overage = priceUsd - budget;

  switch (mode) {
    case 'refurbished_if_verified':
      return `The price $${priceUsd.toLocaleString()} represents ${priceRatio}% of your budget. The certified renewed version at $${renewedPrice.toLocaleString()} delivers the same performance and saves you $${renewedSavings.toLocaleString()} — leaving more financial breathing room.`;

    case 'open_box_with_guardrails':
      return `An open box option is available at ~$${openBoxPrice.toLocaleString()}, saving $${openBoxSavings.toLocaleString()} with minimal compromise on condition. A solid middle ground between new and refurbished.`;

    case 'light_financing':
      return `The price $${priceUsd.toLocaleString()} exceeds your budget by $${overage.toLocaleString()}. Installments let you get it now for just $${monthly12.toLocaleString()}/month — no large upfront payment required.`;

    case 'buy_new':
    default: {
      const comfortPct = 100 - priceRatio;
      const yearlyNote = costPerYear ? ` Effective cost: $${costPerYear}/year after resale.` : '';
      return `The price fits comfortably within your budget with ${comfortPct}% to spare. Buying new guarantees the highest resale value and full manufacturer warranty.${yearlyNote}`;
    }
  }
}

export default function OwnershipLayer({ selectedCard, budgetMax }) {
  const [selectedPath, setSelectedPath] = useState(null);
  const [email, setEmail] = useState('');
  const [alertSaved, setAlertSaved] = useState(false);
  const [alertError, setAlertError] = useState(null);

  const strategy = selectedCard.ownershipStrategy;
  const priceUsd = selectedCard.purchaseLinks?.priceUsd || 0;
  const name = selectedCard.name || '';
  const lifecycle = strategy?.lifecycle || null;
  const rec = strategy?.recommendation || { mode: 'buy_new', explanation: 'Buy new for full warranty and peace of mind.' };
  const recommendedPath = MODE_CONFIG[rec.mode]?.path ?? 'new';
  const activePath = selectedPath ?? recommendedPath;

  // Price estimates for each path
  const renewedPrice = Math.round(priceUsd * 0.74);
  const openBoxPrice = Math.round(priceUsd * 0.87);
  const monthly12    = Math.round(priceUsd / 12);
  const monthly24    = Math.round(priceUsd / 24);

  // Dynamic "why this path?" explanation built from real user data
  const whyText = buildWhyText({
    mode: rec.mode,
    priceUsd,
    budgetMax,
    renewedPrice,
    openBoxPrice,
    monthly12,
    costPerYear: lifecycle?.costPerYear ?? null,
  });

  const entityId = selectedCard.entityId;
  const primaryUrl = buildGoUrl(entityId);
  const amazonRenewedUrl = buildGoUrl(entityId, { seller: 'amazon_renewed' });
  const ebayOpenBoxUrl   = buildGoUrl(entityId, { seller: 'ebay' });
  const financingUrl     = buildGoUrl(entityId, { seller: 'amazon' });

  const paths = [
    {
      key: 'new',
      icon: '🆕',
      title: 'Buy New',
      price: priceUsd ? `$${priceUsd.toLocaleString()}` : '—',
      detail: 'Full manufacturer warranty',
      pros: ['Pristine condition', 'Full warranty', 'Latest firmware'],
      cons: ['Highest upfront cost'],
      url: primaryUrl,
      cta: `Check current price`
    },
    {
      key: 'renewed',
      icon: '🔄',
      title: 'Certified Renewed',
      price: `~$${renewedPrice.toLocaleString()}`,
      saving: `Save ~$${(priceUsd - renewedPrice).toLocaleString()} (26%)`,
      detail: 'Amazon Renewed / manufacturer-certified',
      pros: ['Tested & inspected', '20–30% cheaper', 'Often includes limited warranty'],
      cons: ['Limited stock', 'May vary in configuration'],
      url: rec.recommendedOffer?.url || amazonRenewedUrl,
      cta: 'Search Certified Renewed'
    },
    {
      key: 'open_box',
      icon: '📦',
      title: 'Open Box',
      price: `~$${openBoxPrice.toLocaleString()}`,
      saving: `Save ~$${(priceUsd - openBoxPrice).toLocaleString()} (13%)`,
      detail: 'Returned, unopened or lightly used',
      pros: ['Minor savings', 'Often full specs intact', 'Immediate availability'],
      cons: ['No original box', 'Return policy varies'],
      url: ebayOpenBoxUrl,
      cta: 'Find Open Box on eBay'
    },
    {
      key: 'installments',
      icon: '💳',
      title: 'Pay in Installments',
      price: `$${monthly12}/mo`,
      detail: `or $${monthly24}/mo over 24 months`,
      pros: ['Zero upfront payment', 'Preserve cash flow', 'Get it now'],
      cons: ['Interest may apply', 'Credit check required'],
      url: financingUrl,
      cta: 'Check Financing Options'
    }
  ];

  const currentPath = paths.find(p => p.key === activePath);

  const handleSaveAlert = async () => {
    if (!email.trim()) return;
    setAlertError(null);
    const apiUrl = import.meta.env.VITE_API_URL || 'https://majorlogicapi-production.up.railway.app';
    try {
      const res = await fetch(`${apiUrl}/api/v1/laptop-student-us/growth/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          leadType: 'price_alert',
          trackingData: { entityId: selectedCard.entityId, priceUsd }
        })
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setAlertSaved(true);
    } catch {
      setAlertError('Could not save alert. Please try again.');
    }
  };

  return (
    <div className="ownership-layer">

      {/* ── Header ──────────────────────────────────────── */}
      <div className="ownership-header">
        <div className="ownership-header-left">
          <div className="ownership-title">How to Own the {name}</div>
          <div className="ownership-subtitle">
            Algorithm recommends: <strong>{MODE_CONFIG[rec.mode]?.label ?? 'Buy New'}</strong>
          </div>
        </div>
        {lifecycle && (
          <div className="ownership-tco-badge">
            <div className="tco-label">Cost/Year</div>
            <div className="tco-value">${lifecycle.costPerYear}</div>
          </div>
        )}
      </div>

      {/* ── Recommendation Explanation ───────────────────── */}
      <div className="ownership-rec-banner">
        <span className="ownership-rec-icon">⚡</span>
        <span>{whyText}</span>
      </div>

      {/* ── TCO Lifecycle Breakdown ──────────────────────── */}
      {lifecycle && (
        <div className="ownership-tco-grid">
          <div className="tco-cell">
            <div className="tco-cell-label">Purchase Price</div>
            <div className="tco-cell-value">${lifecycle.purchasePrice?.toLocaleString()}</div>
          </div>
          <div className="tco-cell">
            <div className="tco-cell-label">Resale in {lifecycle.ownershipYears}yr</div>
            <div className="tco-cell-value green">+${lifecycle.estimatedResaleValue?.toLocaleString()}</div>
          </div>
          <div className="tco-cell">
            <div className="tco-cell-label">Net Cost</div>
            <div className="tco-cell-value">${lifecycle.netCost?.toLocaleString()}</div>
          </div>
          <div className="tco-cell highlight">
            <div className="tco-cell-label">Cost / Year</div>
            <div className="tco-cell-value">${lifecycle.costPerYear}</div>
          </div>
        </div>
      )}

      {/* ── 3 Acquisition Paths ──────────────────────────── */}
      <div className="ownership-paths">
        {paths.map(p => (
          <button
            key={p.key}
            className={`ownership-path-card ${activePath === p.key ? 'active' : ''} ${recommendedPath === p.key ? 'recommended' : ''}`}
            onClick={() => setSelectedPath(p.key)}
          >
            {recommendedPath === p.key && (
              <div className="ownership-rec-tag">⭐ Recommended</div>
            )}
            <div className="ownership-path-icon">{p.icon}</div>
            <div className="ownership-path-title">{p.title}</div>
            <div className="ownership-path-price">{p.price}</div>
            {p.saving && <div className="ownership-path-saving">{p.saving}</div>}
            {p.detail && <div className="ownership-path-detail">{p.detail}</div>}
            <div className="ownership-path-pros">
              {p.pros.map(x => <div key={x}>✓ {x}</div>)}
            </div>
            <div className="ownership-path-cons">
              {p.cons.map(x => <div key={x}>✗ {x}</div>)}
            </div>
          </button>
        ))}
      </div>

      {/* ── Price disclaimer ─────────────────────────────── */}
      <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(100,116,139,0.08)', borderRadius: 8, fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
        <Icon name="info-circle" style={{ color: 'var(--accent-warning)', marginRight: 4 }} />
        Prices are estimates from catalog data and may vary. Verify the current price on the retailer's site before purchasing.
      </div>

      {/* ── Action Button ────────────────────────────────── */}
      {currentPath?.url && (
        <a
          href={currentPath.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ownership-cta-btn"
          onClick={() => trackClick({ entityId, decisionRunId: selectedCard.decisionRunId, clickType: 'buy_now_clicked' })}
        >
          <Icon name="external-link-alt" /> {currentPath.cta}
        </a>
      )}

      {/* ── Price Alert ──────────────────────────────────── */}
      <div className="ownership-alert">
        <div className="ownership-alert-title">
          <Icon name="bell" /> Alert me when the price drops
        </div>
        {alertSaved ? (
          <div className="ownership-alert-success">
            ✓ We'll notify you when the price drops on any acquisition path.
          </div>
        ) : (
          <>
            <div className="ownership-alert-row">
              <input
                type="email"
                className="form-input"
                placeholder="Your email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveAlert()}
              />
              <button className="btn btn-primary" onClick={handleSaveAlert} style={{ padding: '12px 20px' }}>
                <Icon name="bell" />
              </button>
            </div>
            {alertError && <div className="ownership-alert-error">{alertError}</div>}
          </>
        )}
      </div>

    </div>
  );
}
