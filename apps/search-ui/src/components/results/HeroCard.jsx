import { useTranslation } from 'react-i18next';
import Icon from '../shared/Icon';
import ConfidenceRing from '../shared/ConfidenceRing';
import { deriveAura } from '../../lib/deriveAura';

function resolveIdentityStatement(card) {
  const fs = card.fitStates;
  if (!fs) return null;
  if (typeof fs === 'string') return fs;
  if (typeof fs === 'object') {
    if (fs.reason) return fs.reason;
    const first = Object.values(fs)[0];
    if (first?.reason) return first.reason;
    if (typeof first === 'string') return first;
  }
  return null;
}

function TransparencyBadge({ card }) {
  const conf = card.decision_confidence;
  const confPct = conf != null ? (conf <= 1 ? Math.round(conf * 100) : Math.round(conf)) : null;
  const integrity = card.integrityScore ?? null;
  const sourceCount = card.intelligence?.sourceCount ?? null;
  const isAffiliate = card.purchaseLinks?.isAffiliate;

  const hasAny = confPct != null || integrity != null || sourceCount != null || isAffiliate;
  if (!hasAny) return null;

  return (
    <div className="transparency-badge">
      {confPct != null && (
        <span className="tb-item" title={`Confidence: ${confPct}%`}>
          <ConfidenceRing pct={confPct} size={16} />
          <span>{confPct}%</span>
        </span>
      )}
      {integrity != null && (
        <span className="tb-item tb-integrity" title="Decision integrity">
          <span className="tb-dot">◆</span>
          <span>{integrity}%</span>
        </span>
      )}
      {sourceCount != null && (
        <span className="tb-item tb-sources" title="Review sources">
          <span className="tb-dot">◎</span>
          <span>{sourceCount}</span>
        </span>
      )}
      {isAffiliate && (
        <span className="tb-item tb-affiliate" title="Affiliate link disclosed">
          <span>§</span>
        </span>
      )}
    </div>
  );
}

function TradeoffLens({ sacrificeVector }) {
  const { t } = useTranslation();
  const sacrifices = Object.values(sacrificeVector || {}).slice(0, 3);

  if (sacrifices.length === 0) {
    return (
      <div className="tradeoff-lens tradeoff-lens--clean">
        <span style={{ color: 'var(--accent-success)' }}>✓</span>
        <span>{t('no_cost_data')}</span>
      </div>
    );
  }

  return (
    <div className="tradeoff-lens">
      {sacrifices.map((s, i) => {
        const pct = Math.round((s.severity ?? 0.3) * 100);
        const label = (s.meaning ?? '').replace(/_/g, ' ') || 'trade-off';
        return (
          <div key={i} className="tl-row">
            <div className="tl-label" title={label}>{label}</div>
            <div className="tl-track">
              <div className="tl-fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="tl-pct">{pct}%</div>
          </div>
        );
      })}
    </div>
  );
}

export default function HeroCard({ type, card, isSelected, onSelect, onConfirm, onDetails }) {
  const { t } = useTranslation();
  const identityStatement = resolveIdentityStatement(card);

  const aiVoice = card.whyChosen
    ? String(card.whyChosen).split(/\n\n/)[0]
    : identityStatement;

  const keyFlaw = card.flaws?.[0] ?? null;
  const keyPro  = card.topPros?.[0] ?? null;

  const dims = {
    performance: card.traceScores?.performance_score ?? 0,
    portability: card.traceScores?.portability_score ?? 0,
    value:       card.traceScores?.value_score       ?? 0,
    display:     card.traceScores?.display_score     ?? 0,
  };
  const aura = deriveAura(dims);

  return (
    <div
      className={`decision-card ${isSelected ? 'recommended' : ''}`}
      style={{ '--card-aura-soft': aura.soft, '--card-aura-line': aura.line, '--card-aura-hue': aura.hue }}
      onClick={() => onSelect(type)}
    >
      <div className="decision-card-image decision-card-image--aura">
        <div className="card-aura-glow" />
        {card.image ? (
          <img
            src={card.image}
            alt={card.name}
            className="card-product-img"
          />
        ) : (
          <span style={{ fontSize: 64 }}>{card.icon}</span>
        )}
        <div className="card-img-fade" />
      </div>

      <div className="decision-card-body">
        <div className="decision-card-header">
          <span className={`decision-card-badge ${card.badgeClass}`}>{card.badge}</span>
          <TransparencyBadge card={card} />
        </div>
        <div className="decision-card-name">{card.name}</div>
        <div className="decision-card-price">
          {card.priceStale ? `~${card.price}` : card.price}{' '}
          {card.originalPrice && <span className="original">{card.originalPrice}</span>}
          {card.priceCapturedAt && (
            <span className="price-date" style={{ fontSize: '11px', color: 'var(--text-muted, #6b7280)', marginLeft: '6px', fontWeight: 400 }}>
              {t('results.price_as_of', {
                date: new Intl.DateTimeFormat(card.locale || 'en', { month: 'short', day: 'numeric' }).format(new Date(card.priceCapturedAt))
              })}
            </span>
          )}
        </div>

        {aiVoice && (
          <div className="card-ai-voice">
            {aiVoice}
          </div>
        )}

        {keyPro && (
          <div className="card-key-pro">
            <span>✓</span> {keyPro}
          </div>
        )}

        {keyFlaw && (
          <div className="card-key-flaw">
            <span className="card-key-flaw__icon">⚠</span>
            {keyFlaw}
          </div>
        )}

        <TradeoffLens sacrificeVector={card.sacrificeVector} />

        <div className="card-actions">
          <button
            className="card-action-btn select"
            onClick={(e) => { e.stopPropagation(); onConfirm(type); }}
          >
            <Icon name="check-circle" /> {t('buttons.choose_this')}
          </button>
          <button
            className="card-action-btn details"
            onClick={(e) => { e.stopPropagation(); onDetails(type); }}
          >
            {t('buttons.why_this')}
          </button>
        </div>
      </div>
    </div>
  );
}
