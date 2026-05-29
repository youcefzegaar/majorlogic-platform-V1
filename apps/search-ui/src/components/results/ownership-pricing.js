/**
 * Ownership Pricing Engine
 *
 * Pure functions — no React, no side effects.
 * All monetary math, gains/losses text, and URL construction lives here.
 */

export const MODE_TO_PATH = {
  buy_new:                  'new',
  refurbished_if_verified:  'renewed',
  open_box_with_guardrails: 'open_box',
  light_financing:          'installments',
};

/**
 * Computes all pricing variants for a card given user budget.
 * Returns a flat object of prices, costs, and derived metrics.
 */
export function computePricing(selectedCard, budgetMax) {
  const cfg        = selectedCard.ownershipStrategy?.ownershipConfig ?? {};
  const lifecycle  = selectedCard.ownershipStrategy?.lifecycle || null;
  const rec        = selectedCard.ownershipStrategy?.recommendation || { mode: selectedCard.renewedEntry ? 'refurbished_if_verified' : 'buy_new' };
  const scorePct   = (selectedCard.score || 60) / 100;
  const priceUsd   = selectedCard.purchaseLinks?.priceUsd || 0;
  const knownRenewedPrice = selectedCard.purchaseLinks?.renewedPriceUsd ?? null;

  const ownerYears = lifecycle?.ownershipYears || cfg.defaultOwnershipYears || 4;
  const resaleVal  = lifecycle?.estimatedResaleValue || Math.round(priceUsd * 0.30);
  const hasLifecycle = lifecycle !== null;
  const hasRealOffer = rec.recommendedOffer?.url != null;

  // Renewed — score-weighted + price-tier adjusted
  const [renewedMin, renewedMax] = cfg.renewedDiscountRange ?? [0.15, 0.32];
  const tierAdj = priceUsd > 2000 ? -0.03 : priceUsd > 1500 ? -0.01 : 0;
  const renewedDiscount = Math.min(renewedMax, Math.max(renewedMin,
    renewedMin + (1 - scorePct) * (renewedMax - renewedMin) + tierAdj
  ));
  const renewedPrice = knownRenewedPrice ?? Math.round(priceUsd * (1 - renewedDiscount));

  // Open Box
  const [obMin, obMax] = cfg.openBoxDiscountRange ?? [0.08, 0.14];
  const openBoxDiscount = obMin + (1 - scorePct) * (obMax - obMin);
  const openBoxPrice = Math.round(priceUsd * (1 - openBoxDiscount));

  // Financing — PMT: P × r / (1 − (1+r)^−n)
  const APR = cfg.apr ?? 0.189;
  const monthlyRate = APR / 12;
  const pmt = (P, r, n) => Math.round(P * r / (1 - Math.pow(1 + r, -n)));
  const monthly12  = pmt(priceUsd, monthlyRate, 12);
  const monthly24  = pmt(priceUsd, monthlyRate, 24);
  const total12    = monthly12 * 12;
  const total24    = monthly24 * 24;
  const interest12 = total12 - priceUsd;

  // Cost/Year — straight-line depreciation per path
  const costPerYearNew      = lifecycle?.costPerYear || Math.round((priceUsd - resaleVal) / ownerYears);
  const renewedResaleVal    = Math.round(resaleVal * (1 - renewedDiscount * 0.55));
  const costPerYearRenewed  = Math.max(1, Math.round((renewedPrice - renewedResaleVal) / ownerYears));
  const openBoxResaleVal    = Math.round(resaleVal * (1 - openBoxDiscount * 0.35));
  const costPerYearOpenBox  = Math.max(1, Math.round((openBoxPrice - openBoxResaleVal) / ownerYears));
  const costPerYearFinancing = Math.round(total12 / ownerYears);

  // Break-even (Renewed vs New)
  const renewedResalePenalty = resaleVal - renewedResaleVal;
  const breakEvenYears = renewedResalePenalty > 0
    ? +(( priceUsd - renewedPrice) / (renewedResalePenalty / ownerYears)).toFixed(1)
    : null;

  // Confidence score (0–96)
  const confidenceScore = Math.min(96, Math.round(
    scorePct                  * 35 +
    (hasLifecycle ? 1 : 0.25) * 30 +
    (hasRealOffer ? 1 : 0.20) * 20 +
    (priceUsd > 500  ? 1 : 0.60) * 15
  ));

  return {
    priceUsd, renewedPrice, openBoxPrice, monthly12, monthly24, total12, total24, interest12,
    renewedDiscount, openBoxDiscount,
    costPerYearNew, costPerYearRenewed, costPerYearOpenBox, costPerYearFinancing,
    resaleVal, renewedResaleVal, openBoxResaleVal,
    ownerYears, breakEvenYears, confidenceScore,
    rec, cfg,
  };
}

export function buildWhyText(t, { mode, priceUsd, budgetMax, renewedPrice, openBoxPrice, monthly12, costPerYear }) {
  const budget = budgetMax || priceUsd;
  const priceRatio     = Math.round((priceUsd / budget) * 100);
  const comfortPct     = 100 - priceRatio;
  const renewedSavings = priceUsd - renewedPrice;
  const openBoxSavings = priceUsd - openBoxPrice;
  const overage        = priceUsd - budget;
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

export function buildGainsLosses(t) {
  return {
    new:          { gains: [t('ownership.new_gain1'),          t('ownership.new_gain2'),          t('ownership.new_gain3')],          losses: [t('ownership.new_loss1'),          t('ownership.new_loss2')] },
    renewed:      { gains: [t('ownership.renewed_gain1'),      t('ownership.renewed_gain2'),      t('ownership.renewed_gain3')],      losses: [t('ownership.renewed_loss1'),      t('ownership.renewed_loss2'),      t('ownership.renewed_loss3')] },
    open_box:     { gains: [t('ownership.open_box_gain1'),     t('ownership.open_box_gain2'),     t('ownership.open_box_gain3')],     losses: [t('ownership.open_box_loss1'),     t('ownership.open_box_loss2'),     t('ownership.open_box_loss3')] },
    installments: { gains: [t('ownership.installments_gain1'), t('ownership.installments_gain2'), t('ownership.installments_gain3')], losses: [t('ownership.installments_loss1'), t('ownership.installments_loss2'), t('ownership.installments_loss3')] },
  };
}

export function buildTableRows(t, { priceUsd, renewedPrice, openBoxPrice, monthly12, costPerYearNew, costPerYearRenewed, costPerYearOpenBox, costPerYearFinancing, resaleVal, renewedResaleVal, openBoxResaleVal, interest12, breakEvenYears }) {
  return [
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
}

export function buildBars(t, { priceUsd, renewedPrice, openBoxPrice, total24, renewedDiscount, openBoxDiscount, interest12 }) {
  return [
    { key: 'new',          icon: '🆕', label: t('ownership.bar_buy_new'),          value: priceUsd,     display: `$${priceUsd.toLocaleString()}`,     saving: null },
    { key: 'renewed',      icon: '🔄', label: t('ownership.bar_certified_renewed'), value: renewedPrice, display: `$${renewedPrice.toLocaleString()}`, saving: `↓ ${Math.round(renewedDiscount * 100)}%` },
    { key: 'open_box',     icon: '📦', label: t('ownership.bar_open_box'),          value: openBoxPrice, display: `$${openBoxPrice.toLocaleString()}`, saving: `↓ ${Math.round(openBoxDiscount * 100)}%` },
    { key: 'installments', icon: '💳', label: t('ownership.bar_installments'),      value: total24,      display: `$${total24.toLocaleString()}`,      saving: `↑ +$${interest12.toLocaleString()}` },
  ];
}

export function buildUrlMap(selectedCard, { renewedPrice, openBoxPrice, monthly12 }, t) {
  const cfg = selectedCard.ownershipStrategy?.ownershipConfig ?? {};
  const rec = selectedCard.ownershipStrategy?.recommendation || {};
  const tag = cfg.affiliateTag || 'majorlogic-20';
  const src = cfg.marketSources || {};
  const enc = encodeURIComponent(selectedCard.name || '');
  const priceUsd = selectedCard.purchaseLinks?.priceUsd || 0;

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

  return { urlMap, ctaMap };
}
