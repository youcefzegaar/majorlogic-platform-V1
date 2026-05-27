import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FLIP_REASONS = [
  { key: 'price_high',    icon: '💰', priorityDelta: { budgetMax: -100 } },
  { key: 'too_heavy',     icon: '🎒', priorityDelta: { portability: +20 } },
  { key: 'battery_short', icon: '🔋', priorityDelta: { battery: +20 } },
  { key: 'want_windows',  icon: '🪟', priorityDelta: {} },
  { key: 'want_mac',      icon: '🍎', priorityDelta: {} },
  { key: 'other',         icon: '✏️', priorityDelta: {} },
];

export default function FlipModal({ onClose, onFlip, isFlipping }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);
  const [customText, setCustomText] = useState('');

  const handleConfirm = () => {
    if (!selected) return;
    const reason = FLIP_REASONS.find(r => r.key === selected);
    onFlip({ reasonKey: selected, customText, priorityDelta: reason?.priorityDelta ?? {} });
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: '100%', maxWidth: 420 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="card-header" style={{ marginBottom: 20 }}>
          <div className="card-icon" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--accent-warning)' }}>
            <i className="fas fa-redo"></i>
          </div>
          <div>
            <div className="card-title">{t('flip.title', "This doesn't fit — tell us why")}</div>
            <div className="card-subtitle">{t('flip.subtitle', "We'll find a better match instantly")}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {FLIP_REASONS.map(({ key, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setSelected(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                border: selected === key ? '1px solid var(--accent-info)' : '1px solid var(--border)',
                background: selected === key ? 'rgba(14,165,233,0.08)' : 'rgba(255,255,255,0.02)',
                color: selected === key ? 'var(--accent-info)' : 'var(--text-primary)',
                fontWeight: selected === key ? 600 : 400,
                fontSize: 14, textAlign: 'start', transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: 18 }}>{icon}</span>
              {t(`flip.reason_${key}`, key.replace(/_/g, ' '))}
            </button>
          ))}
        </div>

        {selected === 'other' && (
          <textarea
            className="form-input"
            rows="2"
            style={{ marginBottom: 16 }}
            placeholder={t('flip.other_placeholder', 'Tell us more...')}
            value={customText}
            onChange={e => setCustomText(e.target.value)}
          />
        )}

        <div className="btn-group">
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selected || isFlipping}
          >
            {isFlipping
              ? <><i className="fas fa-spinner fa-spin"></i> {t('flip.finding', 'Finding better match...')}</>
              : <><i className="fas fa-search"></i> {t('flip.find_better', 'Find a better match')}</>
            }
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            {t('buttons.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
