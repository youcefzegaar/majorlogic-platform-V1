import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

export default function CommitmentCeremony({ selectedCard, onReady }) {
  const { t } = useTranslation();
  const [checked, setChecked] = useState({ sacrifice: false, integrity: false, flaw: false });
  const [revealed, setRevealed] = useState(false);

  const integrityScore    = selectedCard?.integrityScore ?? 100;
  const relaxedConstraint = selectedCard?.relaxedConstraint ?? null;
  const primaryFlaw       = selectedCard?.flaws?.[0] ?? null;

  const traceScores = selectedCard?.traceScores ?? {};
  const priorities  = selectedCard?.priorities  ?? {};
  const DIMS = [
    { scoreKey: 'performance_score', priorityKey: 'performance' },
    { scoreKey: 'display_score',     priorityKey: 'display'     },
    { scoreKey: 'portability_score', priorityKey: 'portability' },
    { scoreKey: 'battery_score',     priorityKey: 'battery'     },
    { scoreKey: 'value_score',       priorityKey: 'resale'      },
  ];
  const topSacrifice = DIMS
    .map(d => {
      const score = traceScores[d.scoreKey] != null ? Math.round(traceScores[d.scoreKey]) : null;
      const ideal = Math.round(priorities[d.priorityKey] ?? 50);
      if (score == null) return null;
      return { ...d, score, ideal, delta: score - ideal };
    })
    .filter(Boolean)
    .sort((a, b) => a.delta - b.delta)
    .find(d => d.delta < -4);
  const sacrificeLabel = topSacrifice
    ? t(`intake.priority_${topSacrifice.priorityKey}`, { defaultValue: topSacrifice.priorityKey })
    : null;

  const allChecked = checked.sacrifice && checked.integrity && checked.flaw;

  const toggle = (key) => setChecked(prev => ({ ...prev, [key]: !prev[key] }));

  const handleReady = () => {
    setRevealed(true);
    onReady?.();
  };

  const checkboxStyle = (active) => ({
    width: 18,
    height: 18,
    borderRadius: 4,
    border: `2px solid ${active ? 'var(--accent-success)' : 'var(--border-light)'}`,
    background: active ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s',
    marginTop: 2,
  });

  const rowStyle = (active) => ({
    display: 'flex',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 8,
    background: active ? 'rgba(16, 185, 129, 0.04)' : 'transparent',
    border: `1px solid ${active ? 'rgba(16, 185, 129, 0.2)' : 'var(--border)'}`,
    marginBottom: 8,
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  if (revealed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '14px 18px',
          background: 'rgba(16, 185, 129, 0.06)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: 10,
          marginBottom: 16,
          fontSize: 13,
          color: 'var(--accent-success)',
          fontWeight: 600,
        }}
      >
        {t('ownership.confirmed')}
      </motion.div>
    );
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-muted)',
        letterSpacing: '0.07em',
        marginBottom: 12,
      }}>
        {t('ownership.before_buy')}
      </div>

      <div style={rowStyle(checked.sacrifice)} onClick={() => toggle('sacrifice')}>
        <div style={checkboxStyle(checked.sacrifice)}>
          {checked.sacrifice && <span style={{ fontSize: 10, color: 'var(--accent-success)' }}>✓</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {topSacrifice
            ? <>{t('ownership.accept_sacrifice_pre')} <strong style={{ color: 'var(--text-primary)' }}>{sacrificeLabel}</strong> {t('ownership.accept_sacrifice_mid', { score: topSacrifice.score, ideal: topSacrifice.ideal })}</>
            : <>{t('ownership.commitment_check1')}</>
          }
        </div>
      </div>

      <div style={rowStyle(checked.integrity)} onClick={() => toggle('integrity')}>
        <div style={checkboxStyle(checked.integrity)}>
          {checked.integrity && <span style={{ fontSize: 10, color: 'var(--accent-success)' }}>✓</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {integrityScore < 100 && relaxedConstraint
            ? <>{t('ownership.accept_relaxed_pre')} <strong style={{ color: 'var(--accent-warning)' }}>"{relaxedConstraint}"</strong> {t('ownership.accept_relaxed_suf', { score: integrityScore })}</>
            : <>{t('ownership.commitment_check2')}</>
          }
        </div>
      </div>

      <div style={rowStyle(checked.flaw)} onClick={() => toggle('flaw')}>
        <div style={checkboxStyle(checked.flaw)}>
          {checked.flaw && <span style={{ fontSize: 10, color: 'var(--accent-success)' }}>✓</span>}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
          {primaryFlaw
            ? <>{t('ownership.read_known_issue_pre')} <strong style={{ color: 'var(--text-primary)' }}>"{primaryFlaw}"</strong></>
            : <>{t('ownership.commitment_check3')}</>
          }
        </div>
      </div>

      <AnimatePresence>
        {allChecked && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            onClick={handleReady}
          >
            {t('ownership.commitment_proceed')}
          </motion.button>
        )}
      </AnimatePresence>

      {!allChecked && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, textAlign: 'center' }}>
          {t('ownership.check_all_three')}
        </div>
      )}
    </div>
  );
}
