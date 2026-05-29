import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { API_URL as apiUrl } from '../../lib/apiUrl.js';

export default function TrustPanel({ irHash }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="trust-panel">
      <button
        className="trust-panel__trigger"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span className="trust-panel__shield">◈</span>
        <span>{t('trust.ranking_title')}</span>
        <span className="trust-panel__chevron">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="trust-panel__body">
          <div className="trust-panel__flow">
            <div className="trust-panel__step trust-panel__step--blind">
              <span className="trust-panel__step-num">1</span>
              <div>
                <div className="trust-panel__step-title">{t('trust.step_laptop_ranking')}</div>
                <div className="trust-panel__step-desc">{t('trust.step_laptop_desc')}</div>
              </div>
            </div>
            {irHash && (
              <div className="trust-panel__hash">
                {t('trust.ir_hash_label')}: <code className="trust-panel__code">{irHash.slice(0, 16)}…</code>
              </div>
            )}
            <div className="trust-panel__step trust-panel__step--store">
              <span className="trust-panel__step-num">2</span>
              <div>
                <div className="trust-panel__step-title">{t('trust.step_store_ranking')}</div>
                <div className="trust-panel__step-desc">{t('trust.step_store_desc')}</div>
              </div>
            </div>
          </div>
          <a
            href={`${apiUrl}/disclosure`}
            target="_blank"
            rel="noopener noreferrer"
            className="trust-panel__link"
          >
            {t('trust.view_mechanism')}
          </a>
        </div>
      )}
    </div>
  );
}
