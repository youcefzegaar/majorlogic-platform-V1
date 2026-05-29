import { useTranslation } from 'react-i18next';

const PILLARS = [
  {
    id: 'sacrifice',
    icon: '⚖️',
    title: 'The Sacrifice Vector',
    body: 'Every recommendation must show what you give up, not just what you gain. No recommendation passes without a clearly stated cost and tradeoff. This is enforced in code — a cryptographic guard runs on every decision.',
    badge: 'Enforced in code',
    badgeColor: 'var(--success)',
  },
  {
    id: 'money',
    icon: '🚫',
    title: 'Money Does Not Rank',
    body: 'Affiliate commissions, ad revenue, or seller partnerships have zero influence on ranking. We run a statistical correlation test (Spearman rank) on every decision to verify this. If the correlation exceeds our threshold, the run fails our integrity audit.',
    badge: 'Statistically verified',
    badgeColor: 'var(--success)',
  },
  {
    id: 'epistemic',
    icon: '🔍',
    title: 'Epistemic Humility',
    body: 'We state confidence levels explicitly. We show what we do not know. We do not manufacture certainty. When data is insufficient, we say provisional — not definitive.',
    badge: 'Always transparent',
    badgeColor: 'var(--info, #60a5fa)',
  },
  {
    id: 'governance',
    icon: '🛡️',
    title: 'Live Governance Audit',
    body: 'Every decision produces an Integrity Certificate — a machine-readable record of which ethical guards passed or failed. These certificates are stored, auditable, and never deleted.',
    badge: 'Per-decision certificates',
    badgeColor: 'var(--info, #60a5fa)',
  },
  {
    id: 'autonomy',
    icon: '🧭',
    title: 'Your Autonomy Is Sacred',
    body: 'We recommend, you decide. We never use dark patterns, urgency manipulation, or manufactured scarcity. You can inspect our reasoning, disagree with it, and start over at any time.',
    badge: 'By design',
    badgeColor: 'var(--warning, #fbbf24)',
  },
];

export default function ConstitutionPage({ onClose }) {
  const { t } = useTranslation();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--background, #0f1117)',
      zIndex: 200,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        position: 'sticky',
        top: 0,
        background: 'var(--surface, #1a1d27)',
        borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22 }}>📜</span>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>
              {t('constitution.title', 'Our Constitution')}
            </h2>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary, #94a3b8)' }}>
              {t('constitution.subtitle', 'The ethical framework behind every recommendation')}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none',
            border: '1px solid var(--border, rgba(255,255,255,0.1))',
            borderRadius: 8,
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '6px 12px',
            fontSize: 13,
          }}
        >
          ✕ {t('buttons.close', 'Close')}
        </button>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px', width: '100%' }}>

        {/* Preamble */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(168,85,247,0.08))',
          border: '1px solid rgba(99,102,241,0.2)',
          borderRadius: 16,
          padding: '24px 28px',
          marginBottom: 40,
        }}>
          <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.7, color: 'var(--text-primary)' }}>
            {t('constitution.preamble',
              'MajorLogic exists to help people make major purchases without being manipulated. ' +
              'These are not aspirations — they are enforced guarantees. Each one is verifiable in code, ' +
              'tested on every decision, and audited continuously.'
            )}
          </p>
        </div>

        {/* Five pillars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {PILLARS.map((pillar, idx) => (
            <div
              key={pillar.id}
              style={{
                background: 'var(--surface, rgba(255,255,255,0.03))',
                border: '1px solid var(--border, rgba(255,255,255,0.07))',
                borderRadius: 14,
                padding: '22px 24px',
                display: 'grid',
                gridTemplateColumns: '48px 1fr',
                gap: '0 16px',
              }}
            >
              <div style={{
                fontSize: 28,
                display: 'flex',
                alignItems: 'flex-start',
                paddingTop: 2,
              }}>
                {pillar.icon}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', fontWeight: 600 }}>
                    #{idx + 1}
                  </span>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                    {pillar.title}
                  </h3>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    color: pillar.badgeColor,
                    border: `1px solid ${pillar.badgeColor}`,
                    borderRadius: 4,
                    padding: '2px 7px',
                  }}>
                    {pillar.badge}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--text-secondary)' }}>
                  {pillar.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{
          marginTop: 40,
          padding: '18px 22px',
          background: 'rgba(16,185,129,0.06)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 12,
          fontSize: '0.85rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          <strong style={{ color: 'var(--success, #10b981)' }}>Verified automatically.</strong>{' '}
          {t('constitution.footer',
            'Every decision run produces an Integrity Certificate checked against these five guarantees. ' +
            'If any check fails, it is logged, alerted, and investigated. ' +
            'This page reflects the actual code — not a marketing promise.'
          )}
        </div>
      </div>
    </div>
  );
}
