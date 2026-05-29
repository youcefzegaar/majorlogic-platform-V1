import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CommitmentCeremony from '../shared/CommitmentCeremony';
import Icon from '../shared/Icon';
import {
  MODE_TO_PATH,
  computePricing,
  buildWhyText,
  buildGainsLosses,
  buildTableRows,
  buildBars,
  buildUrlMap,
} from './ownership-pricing.js';
import { API_URL as apiUrl } from '../../lib/apiUrl.js';

export default function OwnershipPhase({ selectedCard, budgetMax, cameFromExplanation, onChoiceMade, onNext, onBack }) {
  const { t } = useTranslation();
  const isRenewedCard = selectedCard.renewedEntry === true;
  const [activePath, setActivePath]         = useState(isRenewedCard ? 'renewed' : null);
  const [email, setEmail]                   = useState('');
  const [alertSaved, setAlertSaved]         = useState(false);
  const [alertError, setAlertError]         = useState(null);
  const [ceremonyComplete, setCeremonyComplete] = useState(false);

  const pricing   = computePricing(selectedCard, budgetMax);
  const { priceUsd, renewedPrice, openBoxPrice, monthly12, total12, total24,
    costPerYearNew, costPerYearRenewed, costPerYearOpenBox, costPerYearFinancing,
    resaleVal, renewedResaleVal, openBoxResaleVal, ownerYears, confidenceScore, rec } = pricing;

  const recPath     = isRenewedCard ? 'renewed' : (MODE_TO_PATH[rec.mode] ?? 'new');
  const currentPath = activePath ?? recPath;

  const whyText   = buildWhyText(t, { mode: rec.mode, priceUsd, budgetMax, renewedPrice, openBoxPrice, monthly12, costPerYear: costPerYearNew });
  const GAINS_LOSSES = buildGainsLosses(t);
  const gl        = GAINS_LOSSES[currentPath] || GAINS_LOSSES.new;
  const tableRows = buildTableRows(t, pricing);
  const bars      = buildBars(t, pricing);
  const barMax    = Math.max(priceUsd, total24, 1);
  const { urlMap, ctaMap } = buildUrlMap(selectedCard, pricing, t);

  const pathLabels = {
    new:          `🆕 $${priceUsd.toLocaleString()}`,
    renewed:      `🔄 $${renewedPrice.toLocaleString()}`,
    open_box:     `📦 $${openBoxPrice.toLocaleString()}`,
    installments: `💳 $${monthly12}${t('ownership.mo_suffix')}`,
  };

  const handleAlert = async () => {
    if (!email.trim()) return;
    setAlertError(null);
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

  return (
    <div className="phase-container active">

      {/* ── Device Header ─────────────────────────────── */}
      <div className="op-header">
        <div>
          <div className="op-device-name">{selectedCard.name || ''}</div>
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
            <div>{t('ownership.renewed_entry_intro', { retail: `$${priceUsd.toLocaleString()}`, renewed: `$${renewedPrice.toLocaleString()}` })}</div>
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
          { label: t('ownership.frame_purchase_price'),                   value: `$${activePrice.toLocaleString()}`,    note: t('ownership.frame_anchor') },
          { label: t('ownership.frame_per_year', { years: ownerYears }),  value: `$${grossPerYear.toLocaleString()}/yr`, note: t('ownership.frame_normalized') },
          { label: t('ownership.frame_per_day_gross'),                    value: `$${grossPerDay}/day`,                 note: t('ownership.frame_if_daily') },
          { label: t('ownership.frame_per_day_net'),                      value: `$${netPerDay}/day`,                   note: t('ownership.frame_after_resale', { resale: `$${activeResale.toLocaleString()}` }) },
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
                <div key={i} style={{
                  padding: '12px 14px',
                  background: i === 3 ? 'rgba(16, 185, 129, 0.07)' : 'var(--surface-elevated)',
                  border: `1px solid ${i === 3 ? 'rgba(16, 185, 129, 0.25)' : 'var(--border)'}`,
                  borderRadius: 10, textAlign: 'center',
                }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>{f.label}</div>
                  <div style={{ fontSize: i === 0 ? 18 : 20, fontWeight: 800, color: i === 3 ? 'var(--accent-success)' : 'var(--text-primary)', marginBottom: 4 }}>{f.value}</div>
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
                      <td key={k} className={['op-td', isRec ? 'op-td-rec' : '', isSavingsGreen || isResaleGreen ? 'op-td-green' : '', isSavingsRed ? 'op-td-red' : ''].filter(Boolean).join(' ')}>
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
          <CommitmentCeremony selectedCard={selectedCard} onReady={() => setCeremonyComplete(true)} />
          {!cameFromExplanation && (
            <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 4 }}>
              <button className="btn btn-secondary" style={{ fontSize: 12, padding: '6px 16px', opacity: 0.7 }} onClick={() => setCeremonyComplete(true)}>
                {t('buttons.skip_to_purchase')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Price Alert ───────────────────────────────── */}
      <div className="op-alert-section">
        <div className="op-alert-title"><Icon name="bell" /> {t('ownership.alert_title')}</div>
        {alertSaved ? (
          <div className="op-alert-success">{t('ownership.alert_success')}</div>
        ) : (
          <>
            <div className="op-alert-row">
              <input type="email" className="form-input" placeholder={t('ownership.alert_email_placeholder')} value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAlert()} />
              <button className="btn btn-primary" style={{ padding: '12px 20px' }} onClick={handleAlert}><Icon name="bell" /></button>
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
          <Icon name="arrow-right" /> {t('ownership.final_summary_btn')}
        </button>
        <button className="btn btn-secondary" onClick={onBack}><Icon name="arrow-left" /> {t('buttons.back_to_explanation')}</button>
      </div>

    </div>
  );
}
