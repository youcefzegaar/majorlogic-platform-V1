import { useState } from 'react';
import CommitmentCeremony from '../shared/CommitmentCeremony';

const MODE_TO_PATH = {
  buy_new:                  'new',
  refurbished_if_verified:  'renewed',
  open_box_with_guardrails: 'open_box',
  light_financing:          'installments',
};

function buildWhyText({ mode, priceUsd, budgetMax, renewedPrice, openBoxPrice, monthly12, costPerYear }) {
  const budget = budgetMax || priceUsd;
  const priceRatio   = Math.round((priceUsd / budget) * 100);
  const comfortPct   = 100 - priceRatio;
  const renewedSavings  = priceUsd - renewedPrice;
  const openBoxSavings  = priceUsd - openBoxPrice;
  const overage         = priceUsd - budget;
  const yearlyNote      = costPerYear ? ` Effective net cost: $${costPerYear}/year after resale.` : '';

  switch (mode) {
    case 'refurbished_if_verified':
      return `The price $${priceUsd.toLocaleString()} is ${priceRatio}% of your budget. The certified renewed version at $${renewedPrice.toLocaleString()} delivers the same performance and saves $${renewedSavings.toLocaleString()} — giving you more financial breathing room.`;
    case 'open_box_with_guardrails':
      return `An open box unit is available at ~$${openBoxPrice.toLocaleString()}, saving $${openBoxSavings.toLocaleString()} with minimal compromise on condition. A solid middle ground.`;
    case 'light_financing':
      return `The price $${priceUsd.toLocaleString()} exceeds your budget by $${overage.toLocaleString()}. Installments let you get it now for just $${monthly12.toLocaleString()}/month — no large upfront payment needed.`;
    default:
      return `The price fits comfortably within your budget with ${comfortPct}% to spare. Buying new guarantees the highest resale value and full manufacturer warranty.${yearlyNote}`;
  }
}

const GAINS_LOSSES = {
  new: {
    gains: ['Full manufacturer warranty', 'Pristine condition', 'Highest resale value'],
    losses: ['Highest upfront cost', 'Fastest depreciation in year 1'],
  },
  renewed: {
    gains: ['Significant savings', 'Tested & certified by manufacturer', 'Often includes limited warranty'],
    losses: ['Limited stock availability', 'No original packaging', 'No configuration choice'],
  },
  open_box: {
    gains: ['Moderate savings', 'Specs usually fully intact', 'Immediate availability'],
    losses: ['No original packaging', 'Return policy varies', 'Condition may vary'],
  },
  installments: {
    gains: ['Zero upfront payment', 'Preserves cash flow', 'Get it right now'],
    losses: ['Interest may apply', 'Credit check required', 'Total cost is higher'],
  },
};

export default function OwnershipPhase({ selectedCard, budgetMax, onNext, onBack }) {
  // If user picked the Renewed Opportunity card, pre-land on the "renewed" path
  const isRenewedCard = selectedCard.renewedEntry === true;
  const [activePath, setActivePath]         = useState(isRenewedCard ? 'renewed' : null);
  const [email, setEmail]                   = useState('');
  const [alertSaved, setAlertSaved]         = useState(false);
  const [alertError, setAlertError]         = useState(null);
  const [ceremonyComplete, setCeremonyComplete] = useState(false);

  // priceUsd is always the RETAIL (new) price so all discounts are computed from the same baseline
  const priceUsd    = selectedCard.purchaseLinks?.priceUsd || 0;
  // For renewed_value cards the engine already computed the exact renewed price
  const knownRenewedPrice = selectedCard.purchaseLinks?.renewedPriceUsd ?? null;
  const name        = selectedCard.name || '';
  const lifecycle   = selectedCard.ownershipStrategy?.lifecycle || null;
  const rec         = selectedCard.ownershipStrategy?.recommendation || { mode: isRenewedCard ? 'refurbished_if_verified' : 'buy_new' };
  const recPath     = isRenewedCard ? 'renewed' : (MODE_TO_PATH[rec.mode] ?? 'new');
  const currentPath = activePath ?? recPath;

  // ── Dynamic Pricing Engine ─────────────────────────────────────────────
  const cfg          = selectedCard.ownershipStrategy?.ownershipConfig ?? {};
  const scorePct     = (selectedCard.score || 60) / 100;
  const ownerYears   = lifecycle?.ownershipYears || cfg.defaultOwnershipYears || 4;
  const resaleVal    = lifecycle?.estimatedResaleValue || Math.round(priceUsd * 0.30);
  const hasLifecycle = lifecycle !== null;
  const hasRealOffer = rec.recommendedOffer?.url != null;

  // 1. Renewed discount — score-weighted + price-tier adjusted
  const [renewedMin, renewedMax] = cfg.renewedDiscountRange ?? [0.15, 0.32];
  const renewedBaseDiscount = renewedMin + (1 - scorePct) * (renewedMax - renewedMin);
  const tierAdj = priceUsd > 2000 ? -0.03 : priceUsd > 1500 ? -0.01 : 0;
  const renewedDiscount = Math.min(renewedMax, Math.max(renewedMin, renewedBaseDiscount + tierAdj));
  // Use the exact price computed by the card engine when available (no double-discounting)
  const renewedPrice = knownRenewedPrice ?? Math.round(priceUsd * (1 - renewedDiscount));

  // 2. Open Box — thinner market, condition variance
  const [obMin, obMax] = cfg.openBoxDiscountRange ?? [0.08, 0.14];
  const openBoxDiscount = obMin + (1 - scorePct) * (obMax - obMin);
  const openBoxPrice = Math.round(priceUsd * (1 - openBoxDiscount));

  // 3. Financing — PMT formula: P × r / (1 − (1+r)^−n)
  const APR = cfg.apr ?? 0.189;
  const monthlyRate = APR / 12;
  const pmt = (P, r, n) => Math.round(P * r / (1 - Math.pow(1 + r, -n)));
  const monthly12  = pmt(priceUsd, monthlyRate, 12);
  const monthly24  = pmt(priceUsd, monthlyRate, 24);
  const total12    = monthly12 * 12;
  const total24    = monthly24 * 24;
  const interest12 = total12 - priceUsd;

  // 4. Cost / Year — straight-line depreciation with resale-adjusted floor per path
  const costPerYearNew = lifecycle?.costPerYear
    || Math.round((priceUsd - resaleVal) / ownerYears);

  // Renewed enters the depreciation curve mid-way → lower resale floor
  const renewedResaleVal   = Math.round(resaleVal * (1 - renewedDiscount * 0.55));
  const costPerYearRenewed = Math.max(1, Math.round((renewedPrice - renewedResaleVal) / ownerYears));

  // Open box: minimal condition penalty relative to new
  const openBoxResaleVal   = Math.round(resaleVal * (1 - openBoxDiscount * 0.35));
  const costPerYearOpenBox = Math.max(1, Math.round((openBoxPrice - openBoxResaleVal) / ownerYears));

  // Financing: total cash outflow (interest-inclusive) annualised
  const costPerYearFinancing = Math.round(total12 / ownerYears);

  // 5. Break-even — years until upfront savings offset lower resale value (Renewed vs New)
  const renewedResalePenalty = resaleVal - renewedResaleVal;
  const breakEvenYears = renewedResalePenalty > 0
    ? +(( priceUsd - renewedPrice) / (renewedResalePenalty / ownerYears)).toFixed(1)
    : null;

  // 6. Confidence Score — weighted evidence quality for price estimates (0–96)
  //    Four components: device data richness, lifecycle availability,
  //    real offer presence, mainstream price tier predictability
  const confidenceScore = Math.min(96, Math.round(
    scorePct              * 35 +
    (hasLifecycle ? 1 : 0.25) * 30 +
    (hasRealOffer ? 1 : 0.20) * 20 +
    (priceUsd > 500  ? 1 : 0.60) * 15
  ));
  // ── End Pricing Engine ──────────────────────────────────────────────────

  const whyText = buildWhyText({
    mode: rec.mode, priceUsd, budgetMax,
    renewedPrice, openBoxPrice, monthly12,
    costPerYear: costPerYearNew,
  });

  const gl = GAINS_LOSSES[currentPath] || GAINS_LOSSES.new;

  // Bar chart — normalize against highest total cost
  const barMax = Math.max(priceUsd, total24, 1);
  const bars = [
    { key: 'new',          icon: '🆕', label: 'Buy New',             value: priceUsd,    display: `$${priceUsd.toLocaleString()}`,    saving: null },
    { key: 'renewed',      icon: '🔄', label: 'Certified Renewed',   value: renewedPrice, display: `$${renewedPrice.toLocaleString()}`, saving: `↓ ${Math.round(renewedDiscount * 100)}%` },
    { key: 'open_box',     icon: '📦', label: 'Open Box',            value: openBoxPrice, display: `$${openBoxPrice.toLocaleString()}`, saving: `↓ ${Math.round(openBoxDiscount * 100)}%` },
    { key: 'installments', icon: '💳', label: 'Installments (24mo)', value: total24,     display: `$${total24.toLocaleString()}`,      saving: `↑ +$${interest12.toLocaleString()}` },
  ];

  // Comparison table rows
  const tableRows = [
    {
      label: 'Price',
      new: `$${priceUsd.toLocaleString()}`,
      renewed: `$${renewedPrice.toLocaleString()}`,
      open_box: `$${openBoxPrice.toLocaleString()}`,
      installments: `$${monthly12}/mo`,
    },
    {
      label: 'Cost / Year',
      new: `$${costPerYearNew.toLocaleString()}`,
      renewed: `$${costPerYearRenewed.toLocaleString()}`,
      open_box: `$${costPerYearOpenBox.toLocaleString()}`,
      installments: `$${costPerYearFinancing.toLocaleString()}`,
    },
    {
      label: 'You Save',
      new: '—',
      renewed: `$${(priceUsd - renewedPrice).toLocaleString()}`,
      open_box: `$${(priceUsd - openBoxPrice).toLocaleString()}`,
      installments: `−$${interest12.toLocaleString()} interest`,
    },
    {
      label: 'Resale Est.',
      new: `~$${resaleVal.toLocaleString()}`,
      renewed: `~$${renewedResaleVal.toLocaleString()}`,
      open_box: `~$${openBoxResaleVal.toLocaleString()}`,
      installments: `~$${resaleVal.toLocaleString()}`,
    },
    {
      label: 'Break-Even',
      new: '—',
      renewed: breakEvenYears ? `${breakEvenYears} yr` : '< 1 yr',
      open_box: '—',
      installments: '—',
    },
    {
      label: 'Warranty',
      new: 'Full',
      renewed: 'Limited',
      open_box: 'Limited',
      installments: 'Full',
    },
  ];

  const tag = cfg.affiliateTag || 'majorlogic-20';
  const src = cfg.marketSources || {};
  const enc = encodeURIComponent(name);
  const urlMap = {
    new:          selectedCard.purchaseLinks?.primary || selectedCard.purchaseLinks?.affiliate,
    renewed:      rec.recommendedOffer?.url || (
      src.renewed === 'amazon_renewed'
        ? `https://www.amazon.com/s?k=${enc}+renewed&rh=p_n_condition-type%3A2224371011&tag=${tag}`
        : `https://www.backmarket.com/en-us/search?q=${enc}`
    ),
    open_box:     src.openBox === 'ebay'
      ? `https://www.ebay.com/sch/i.html?_nkw=${enc}&LH_ItemCondition=2500`
      : `https://www.swappa.com/search?q=${enc}`,
    installments: `https://www.amazon.com/s?k=${enc}&tag=${tag}`,
  };
  const ctaMap = {
    new:          `Buy New — $${priceUsd.toLocaleString()}`,
    renewed:      `Buy Certified Renewed — $${renewedPrice.toLocaleString()}`,
    open_box:     `Find Open Box — ~$${openBoxPrice.toLocaleString()}`,
    installments: `Check Financing — $${monthly12}/month`,
  };

  const handleAlert = async () => {
    if (!email.trim()) return;
    setAlertError(null);
    const apiUrl = import.meta.env.VITE_API_URL || 'https://majorlogicapi-production.up.railway.app';
    try {
      const res = await fetch(`${apiUrl}/api/v1/laptop-student-us/growth/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), leadType: 'price_alert', trackingData: { entityId: selectedCard.entityId, priceUsd } }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      setAlertSaved(true);
    } catch { setAlertError('Could not save. Please try again.'); }
  };

  const pathLabels = { new: `🆕 $${priceUsd.toLocaleString()}`, renewed: `🔄 $${renewedPrice.toLocaleString()}`, open_box: `📦 $${openBoxPrice.toLocaleString()}`, installments: `💳 $${monthly12}/mo` };

  return (
    <div className="phase-container active">

      {/* ── Device Header ─────────────────────────────── */}
      <div className="op-header">
        <div>
          <div className="op-device-name">{name}</div>
          <div className="op-page-title">How to Own It</div>
        </div>
        <span className={`decision-card-badge ${selectedCard.badgeClass}`}>{selectedCard.badge}</span>
      </div>

      {/* ── Renewed Entry Notice ─────────────────────── */}
      {isRenewedCard && (
        <div className="op-renewed-entry-notice">
          <span className="op-renewed-entry-icon">♻️</span>
          <div>
            <strong>You chose the Renewed Opportunity</strong>
            <div>
              This device retails at <strong>${priceUsd.toLocaleString()}</strong> — above your budget — but its certified-renewed version at <strong>${renewedPrice.toLocaleString()}</strong> fits.
              The analysis below uses the retail price as the baseline so every number is accurate.
            </div>
          </div>
        </div>
      )}

      {/* ── Why This Path? ────────────────────────────── */}
      <div className="op-why-banner">
        <div className="op-why-icon">⚡</div>
        <div style={{ flex: 1 }}>
          <div className="op-why-label">What the engine suggests: <strong>{bars.find(b => b.key === recPath)?.label}</strong></div>
          <div className="op-why-text">{whyText}</div>
        </div>
        <div className="op-confidence-badge" title="Estimate confidence based on market data richness, lifecycle availability, and device tier predictability">
          <div className="op-confidence-value">{confidenceScore}%</div>
          <div className="op-confidence-label">confidence</div>
        </div>
      </div>

      {/* ── Tri-Frame Mental Accounting ───────────────── */}
      {priceUsd > 0 && (() => {
        const pathPrices      = { new: priceUsd, renewed: renewedPrice, open_box: openBoxPrice, installments: total12 };
        const pathResaleVals  = { new: resaleVal, renewed: renewedResaleVal, open_box: openBoxResaleVal, installments: resaleVal };
        const pathCostPerYear = { new: costPerYearNew, renewed: costPerYearRenewed, open_box: costPerYearOpenBox, installments: costPerYearFinancing };
        const activePrice       = pathPrices[currentPath] ?? priceUsd;
        const activeResale      = pathResaleVals[currentPath] ?? resaleVal;
        const activeCostPerYear = pathCostPerYear[currentPath] ?? costPerYearNew;
        const grossPerYear = Math.round(activePrice / ownerYears);
        const grossPerDay  = (activePrice / (ownerYears * 365)).toFixed(2);
        const netPerDay    = (activeCostPerYear / 365).toFixed(2);
        const frames = [
          { label: 'Purchase price',         value: `$${activePrice.toLocaleString()}`,       note: 'the anchor' },
          { label: `Per year (${ownerYears} yr use)`, value: `$${grossPerYear.toLocaleString()}/yr`, note: 'normalized' },
          { label: 'Per day (gross)',         value: `$${grossPerDay}/day`,                  note: 'if used daily' },
          { label: 'Per day (net)',           value: `$${netPerDay}/day`,                    note: `after ~$${activeResale.toLocaleString()} resale` },
        ];
        return (
          <div className="op-section">
            <div className="op-section-title">
              What this actually costs you
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                — if used daily for {ownerYears} years, based on what you told us
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
              {frames.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: '12px 14px',
                    background: i === 3 ? 'rgba(16, 185, 129, 0.07)' : 'var(--surface-elevated)',
                    border: `1px solid ${i === 3 ? 'rgba(16, 185, 129, 0.25)' : 'var(--border)'}`,
                    borderRadius: 10,
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{f.label}</div>
                  <div style={{
                    fontSize: i === 0 ? 18 : 20,
                    fontWeight: 800,
                    color: i === 3 ? 'var(--accent-success)' : 'var(--text-primary)',
                    marginBottom: 4,
                  }}>{f.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>{f.note}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* ── Comparison Table ──────────────────────────── */}
      <div className="op-section">
        <div className="op-section-title">Compare All Options</div>
        <div className="op-table-wrap">
          <table className="op-table">
            <thead>
              <tr>
                <th></th>
                {['new','renewed','open_box','installments'].map(k => (
                  <th key={k} className={k === recPath ? 'op-th-rec' : ''}>
                    {k === recPath && <div className="op-rec-chip">⭐ Recommended</div>}
                    {bars.find(b => b.key === k)?.icon} {bars.find(b => b.key === k)?.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map(row => (
                <tr key={row.label}>
                  <td className="op-row-label">{row.label}</td>
                  {['new','renewed','open_box','installments'].map(k => {
                    const isRec = k === recPath;
                    const isSavingsGreen = row.label === 'You Save' && (k === 'renewed' || k === 'open_box');
                    const isSavingsRed   = row.label === 'You Save' && k === 'installments';
                    const isResaleGreen  = row.label === 'Resale Est.' && k !== 'installments';
                    return (
                      <td key={k} className={[
                        'op-td',
                        isRec         ? 'op-td-rec'   : '',
                        isSavingsGreen || isResaleGreen ? 'op-td-green' : '',
                        isSavingsRed  ? 'op-td-red'   : '',
                      ].filter(Boolean).join(' ')}>
                        {row[k]}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Cost Bar Chart ────────────────────────────── */}
      <div className="op-section">
        <div className="op-section-title">Cost Comparison</div>
        <div className="op-bars">
          {bars.map(b => (
            <div key={b.key} className={`op-bar-row ${b.key === recPath ? 'op-bar-rec' : ''}`} onClick={() => setActivePath(b.key)}>
              <div className="op-bar-label">{b.icon} {b.label}</div>
              <div className="op-bar-track">
                <div className="op-bar-fill" style={{ width: `${Math.round((b.value / barMax) * 100)}%` }}></div>
              </div>
              <div className="op-bar-value">{b.display} {b.saving && <span className={b.saving.startsWith('↑') ? 'op-saving-neg' : 'op-saving-pos'}>{b.saving}</span>}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Gains / Losses ────────────────────────────── */}
      <div className="op-section">
        <div className="op-section-title">
          {pathLabels[currentPath]} — What You Gain &amp; Lose
          <div className="op-path-tabs">
            {Object.keys(pathLabels).map(k => (
              <button key={k} className={`op-path-tab ${currentPath === k ? 'active' : ''}`} onClick={() => setActivePath(k)}>
                {pathLabels[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="op-gl-grid">
          <div className="op-gl-col op-gl-gains">
            <div className="op-gl-col-title">✓ What You Gain</div>
            {gl.gains.map(g => <div key={g} className="op-gl-item">{g}</div>)}
          </div>
          <div className="op-gl-col op-gl-losses">
            <div className="op-gl-col-title">✗ What You Lose</div>
            {gl.losses.map(l => <div key={l} className="op-gl-item">{l}</div>)}
          </div>
        </div>
      </div>

      {/* ── Commitment Ceremony ───────────────────────── */}
      {!ceremonyComplete && (
        <CommitmentCeremony
          selectedCard={selectedCard}
          onReady={() => setCeremonyComplete(true)}
        />
      )}

      {/* ── CTA Buttons (revealed after commitment) ───── */}
      {ceremonyComplete && (
        <div className="op-cta-section">
          {urlMap[currentPath] && (
            <>
              <a href={urlMap[currentPath]} target="_blank" rel="noopener noreferrer" className="op-cta-primary">
                <i className="fas fa-external-link-alt"></i> {ctaMap[currentPath]}
              </a>
              <div className="op-affiliate-disclosure">
                {selectedCard.purchaseLinks?.isAffiliate
                  ? <><span className="op-affiliate-badge">🤝</span> Affiliate link — we earn a small commission at no extra cost to you.</>
                  : <><span className="op-affiliate-badge">✅</span> Direct link — no commission earned.</>
                }
                <span style={{ marginLeft: 12, fontSize: 11 }}>
                  <a
                    href="/how-we-work"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent-info)', textDecoration: 'underline' }}
                  >
                    Search without affiliate link →
                  </a>
                </span>
              </div>
            </>
          )}
          <div className="op-cta-alts">
            {Object.keys(pathLabels).filter(k => k !== currentPath).map(k => (
              urlMap[k] && (
                <a key={k} href={urlMap[k]} target="_blank" rel="noopener noreferrer" className="op-cta-secondary" onClick={() => setActivePath(k)}>
                  {pathLabels[k]}
                </a>
              )
            ))}
          </div>
        </div>
      )}

      {/* ── Price Alert ───────────────────────────────── */}
      <div className="op-alert-section">
        <div className="op-alert-title"><i className="fas fa-bell"></i> Alert me when the price drops</div>
        {alertSaved ? (
          <div className="op-alert-success">✓ We'll notify you when the price drops.</div>
        ) : (
          <>
            <div className="op-alert-row">
              <input type="email" className="form-input" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAlert()} />
              <button className="btn btn-primary" style={{ padding: '12px 20px' }} onClick={handleAlert}><i className="fas fa-bell"></i></button>
            </div>
            {alertError && <div className="op-alert-error">{alertError}</div>}
          </>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <div className="btn-group" style={{ marginTop: 8 }}>
        <button className="btn btn-primary" onClick={onNext}><i className="fas fa-arrow-right"></i> Final Summary</button>
        <button className="btn btn-secondary" onClick={onBack}><i className="fas fa-arrow-left"></i> Back to Explanation</button>
      </div>

    </div>
  );
}
