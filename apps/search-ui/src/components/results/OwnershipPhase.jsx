import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CommitmentCeremony from '../shared/CommitmentCeremony';

const MODE_TO_PATH = {
  buy_new:                  'new',
  refurbished_if_verified:  'renewed',
  open_box_with_guardrails: 'open_box',
  light_financing:          'installments',
};

function buildWhyText(t, { mode, priceUsd, budgetMax, renewedPrice, openBoxPrice, monthly12, costPerYear }) {
  const budget = budgetMax || priceUsd;
  const priceRatio   = Math.round((priceUsd / budget) * 100);
  const comfortPct   = 100 - priceRatio;
  const renewedSavings  = priceUsd - renewedPrice;
  const openBoxSavings  = priceUsd - openBoxPrice;
  const overage         = priceUsd - budget;

  switch (mode) {
    case 'refurbished_if_verified':
      return t('ownership.why_renewed', { price: `$${priceUsd.toLocaleString()}`, priceRatio, renewed: `$${renewedPrice.toLocaleString()}`, savings: `$${renewedSavings.toLocaleString()}` });
    case 'open_box_with_guardrails':
      return t('ownership.why_open_box', { price: `$${openBoxPrice.toLocaleString()}`, savings: `$${openBoxSavings.toLocaleString()}` });
    case 'light_financing':
      return t('ownership.why_financing', { price: `$${priceUsd.toLocaleString()}`, overage: `$${overage.toLocaleString()}`, monthly: `$${monthly12.toLocaleString()}` });
    default:
      return costPerYear
        ? t('ownership.why_new_with_cost', { comfort: comfortPct, cost: `$${costPerYear}` })
        : t('ownership.why_new', { comfort: comfortPct });
  }
}

function buildGainsLosses(t) {
  return {
    new:          { gains: [t('ownership.new_gain1'), t('ownership.new_gain2'), t('ownership.new_gain3')], losses: [t('ownership.new_loss1'), t('ownership.new_loss2')] },
    renewed:      { gains: [t('ownership.renewed_gain1'), t('ownership.renewed_gain2'), t('ownership.renewed_gain3')], losses: [t('ownership.renewed_loss1'), t('ownership.renewed_loss2'), t('ownership.renewed_loss3')] },
    open_box:     { gains: [t('ownership.open_box_gain1'), t('ownership.open_box_gain2'), t('ownership.open_box_gain3')], losses: [t('ownership.open_box_loss1'), t('ownership.open_box_loss2'), t('ownership.open_box_loss3')] },
    installments: { gains: [t('ownership.installments_gain1'), t('ownership.installments_gain2'), t('ownership.installments_gain3')], losses: [t('ownership.installments_loss1'), t('ownership.installments_loss2'), t('ownership.installments_loss3')] },
  };
}

export default function OwnershipPhase({ selectedCard, budgetMax, cameFromExplanation, onChoiceMade, onNext, onBack }) {
  const { t } = useTranslation();
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

  const whyText = buildWhyText(t, {
    mode: rec.mode, priceUsd, budgetMax,
    renewedPrice, openBoxPrice, monthly12,
    costPerYear: costPerYearNew,
  });

  const GAINS_LOSSES = buildGainsLosses(t);
  const gl = GAINS_LOSSES[currentPath] || GAINS_LOSSES.new;

  // Bar chart — normalize against highest total cost
  const barMax = Math.max(priceUsd, total24, 1);
  const bars = [
    { key: 'new',          icon: '🆕', label: t('ownership.bar_buy_new'),          value: priceUsd,    display: `$${priceUsd.toLocaleString()}`,    saving: null },
    { key: 'renewed',      icon: '🔄', label: t('ownership.bar_certified_renewed'), value: renewedPrice, display: `$${renewedPrice.toLocaleString()}`, saving: `↓ ${Math.round(renewedDiscount * 100)}%` },
    { key: 'open_box',     icon: '📦', label: t('ownership.bar_open_box'),          value: openBoxPrice, display: `$${openBoxPrice.toLocaleString()}`, saving: `↓ ${Math.round(openBoxDiscount * 100)}%` },
    { key: 'installments', icon: '💳', label: t('ownership.bar_installments'),      value: total24,     display: `$${total24.toLocaleString()}`,      saving: `↑ +$${interest12.toLocaleString()}` },
  ];

  // Comparison table rows
  const tableRows = [
    {
      key: 'price', label: t('ownership.row_price'),
      new: `$${priceUsd.toLocaleString()}`,
      renewed: `$${renewedPrice.toLocaleString()}`,
      open_box: `$${openBoxPrice.toLocaleString()}`,
      installments: `$${monthly12}${t('ownership.mo_suffix')}`,
    },
    {
      key: 'cost_year', label: t('ownership.row_cost_year'),
      new: `$${costPerYearNew.toLocaleString()}`,
      renewed: `$${costPerYearRenewed.toLocaleString()}`,
      open_box: `$${costPerYearOpenBox.toLocaleString()}`,
      installments: `$${costPerYearFinancing.toLocaleString()}`,
    },
    {
      key: 'you_save', label: t('ownership.row_you_save'),
      new: '—',
      renewed: `$${(priceUsd - renewedPrice).toLocaleString()}`,
      open_box: `$${(priceUsd - openBoxPrice).toLocaleString()}`,
      installments: `−$${interest12.toLocaleString()} ${t('ownership.interest_label')}`,
    },
    {
      key: 'resale_est', label: t('ownership.row_resale_est'),
      new: `~$${resaleVal.toLocaleString()}`,
      renewed: `~$${renewedResaleVal.toLocaleString()}`,
      open_box: `~$${openBoxResaleVal.toLocaleString()}`,
      installments: `~$${resaleVal.toLocaleString()}`,
    },
    {
      key: 'break_even', label: t('ownership.row_break_even'),
      new: '—',
      renewed: breakEvenYears ? t('ownership.yr_suffix', { n: breakEvenYears }) : t('ownership.less_than_1yr'),
      open_box: '—',
      installments: '—',
    },
    {
      key: 'warranty', label: t('ownership.row_warranty'),
      new: t('ownership.warranty_full'),
      renewed: t('ownership.warranty_limited'),
      open_box: t('ownership.warranty_limited'),
      installments: t('ownership.warranty_full'),
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
    new:          t('ownership.cta_buy_new',      { price: `$${priceUsd.toLocaleString()}` }),
    renewed:      t('ownership.cta_buy_renewed',  { price: `$${renewedPrice.toLocaleString()}` }),
    open_box:     t('ownership.cta_open_box',     { price: `$${openBoxPrice.toLocaleString()}` }),
    installments: t('ownership.cta_installments', { price: `$${monthly12}` }),
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
    } catch { setAlertError(t('ownership.alert_error')); }
  };

  const pathLabels = { new: `🆕 $${priceUsd.toLocaleString()}`, renewed: `🔄 $${renewedPrice.toLocaleString()}`, open_box: `📦 $${openBoxPrice.toLocaleString()}`, installments: `💳 $${monthly12}${t('ownership.mo_suffix')}` };

  return (
    <div className="phase-container active">

      {/* ── Device Header ─────────────────────────────── */}
      <div className="op-header">
        <div>
          <div className="op-device-name">{name}</div>
          <div className="op-page-title">{t('ownership.title')}</div>
        </div>
        <span className={`decision-card-badge ${selectedCard.badgeClass}`}>{selectedCard.badge}</span>
      </div>

      {/* ── Renewed Entry Notice ─────────────────────── */}
      {isRenewedCard && (
        <div className="op-renewed-entry-notice">
          <span className="op-renewed-entry-icon">♻️</span>
          <div>
            <strong>{t('ownership.renewed_entry_title')}</strong>
            <div>
              {t('ownership.renewed_entry_intro', { retail: `$${priceUsd.toLocaleString()}`, renewed: `$${renewedPrice.toLocaleString()}` })}
            </div>
          </div>
        </div>
      )}

      {/* ── Why This Path? ────────────────────────────── */}
      <div className="op-why-banner">
        <div className="op-why-icon">⚡</div>
        <div style={{ flex: 1 }}>
          <div className="op-why-label">{t('ownership.what_engine_suggests')}: <strong>{bars.find(b => b.key === recPath)?.label}</strong></div>
          <div className="op-why-text">{whyText}</div>
        </div>
        <div className="op-confidence-badge" title="Estimate confidence based on market data richness, lifecycle availability, and device tier predictability">
          <div className="op-confidence-value">{confidenceScore}%</div>
          <div className="op-confidence-label">{t('ownership.confidence_label')}</div>
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
          { label: t('ownership.frame_purchase_price'),              value: `$${activePrice.toLocaleString()}`,       note: t('ownership.frame_anchor') },
          { label: t('ownership.frame_per_year', { years: ownerYears }), value: `$${grossPerYear.toLocaleString()}/yr`, note: t('ownership.frame_normalized') },
          { label: t('ownership.frame_per_day_gross'),               value: `$${grossPerDay}/day`,                  note: t('ownership.frame_if_daily') },
          { label: t('ownership.frame_per_day_net'),                 value: `$${netPerDay}/day`,                    note: t('ownership.frame_after_resale', { resale: `$${activeResale.toLocaleString()}` }) },
        ];
        return (
          <div className="op-section">
            <div className="op-section-title">
              {t('ownership.what_costs_title')}
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                {t('ownership.what_costs_subtitle', { years: ownerYears })}
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
        <div className="op-section-title">{t('ownership.compare_title')}</div>
        <div className="op-table-wrap">
          <table className="op-table">
            <thead>
              <tr>
                <th></th>
                {['new','renewed','open_box','installments'].map(k => (
                  <th key={k} className={k === recPath ? 'op-th-rec' : ''}>
                    {k === recPath && <div className="op-rec-chip">{t('ownership.rec_chip')}</div>}
                    {bars.find(b => b.key === k)?.icon} {bars.find(b => b.key === k)?.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map(row => (
                <tr key={row.key}>
                  <td className="op-row-label">{row.label}</td>
                  {['new','renewed','open_box','installments'].map(k => {
                    const isRec = k === recPath;
                    const isSavingsGreen = row.key === 'you_save' && (k === 'renewed' || k === 'open_box');
                    const isSavingsRed   = row.key === 'you_save' && k === 'installments';
                    const isResaleGreen  = row.key === 'resale_est' && k !== 'installments';
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
        <div className="op-section-title">{t('ownership.cost_chart_title')}</div>
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
          {pathLabels[currentPath]} — {t('ownership.gain_lose_title')}
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
            <div className="op-gl-col-title">{t('ownership.gain_col')}</div>
            {gl.gains.map(g => <div key={g} className="op-gl-item">{g}</div>)}
          </div>
          <div className="op-gl-col op-gl-losses">
            <div className="op-gl-col-title">{t('ownership.loss_col')}</div>
            {gl.losses.map(l => <div key={l} className="op-gl-item">{l}</div>)}
          </div>
        </div>
      </div>

      {/* ── Commitment Ceremony ───────────────────────── */}
      {!ceremonyComplete && (
        <div>
          <CommitmentCeremony
            selectedCard={selectedCard}
            onReady={() => setCeremonyComplete(true)}
          />
          {!cameFromExplanation && (
            <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
              <button
                className="btn btn-secondary"
                style={{ fontSize: 12, padding: '6px 16px', opacity: 0.7 }}
                onClick={() => setCeremonyComplete(true)}
              >
                {t('buttons.skip_to_purchase')}
              </button>
            </div>
          )}
        </div>
      )}


      {/* ── Price Alert ───────────────────────────────── */}
      <div className="op-alert-section">
        <div className="op-alert-title"><i className="fas fa-bell"></i> {t('ownership.alert_title')}</div>
        {alertSaved ? (
          <div className="op-alert-success">{t('ownership.alert_success')}</div>
        ) : (
          <>
            <div className="op-alert-row">
              <input type="email" className="form-input" placeholder={t('ownership.alert_email_placeholder')} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAlert()} />
              <button className="btn btn-primary" style={{ padding: '12px 20px' }} onClick={handleAlert}><i className="fas fa-bell"></i></button>
            </div>
            {alertError && <div className="op-alert-error">{t('ownership.alert_error')}</div>}
          </>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────── */}
      <div className="btn-group" style={{ marginTop: 8 }}>
        <button
          className="btn btn-primary"
          disabled={!ceremonyComplete}
          style={{ opacity: ceremonyComplete ? 1 : 0.4 }}
          onClick={() => {
            if (onChoiceMade) onChoiceMade({
              path: currentPath,
              url: urlMap[currentPath] ?? null,
              cta: ctaMap[currentPath],
              isAffiliate: selectedCard.purchaseLinks?.isAffiliate ?? false,
            });
            onNext();
          }}
        >
          <i className="fas fa-arrow-right"></i> {t('ownership.final_summary_btn')}
        </button>
        <button className="btn btn-secondary" onClick={onBack}><i className="fas fa-arrow-left"></i> {t('buttons.back_to_explanation')}</button>
      </div>

    </div>
  );
}
