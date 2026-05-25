import { motion, AnimatePresence } from 'framer-motion';

/**
 * DecisionTrust — permanent governance bar rendered on all result phases.
 *
 * integrityScore (0-100):
 *   100   → all constraints fully satisfied  → green
 *   <100  → at least one constraint relaxed  → amber + disclosure
 *
 * irHash: cryptographic fingerprint of the decision IR — proves reproducibility.
 */
export default function DecisionTrust({ integrityScore = 100, irHash = null, relaxedConstraint = null }) {
  const isClean = integrityScore >= 100;
  const shortHash = irHash ? irHash.slice(0, 8) : null;

  return (
    <motion.div
      className="decision-trust-bar"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '8px 16px',
        background: isClean
          ? 'rgba(16, 185, 129, 0.06)'
          : 'rgba(245, 158, 11, 0.08)',
        border: `1px solid ${isClean ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.3)'}`,
        borderRadius: '8px',
        fontSize: '12px',
        color: 'var(--text-secondary)',
        flexWrap: 'wrap',
      }}
    >
      {/* Status indicator */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontWeight: 600,
          color: isClean ? 'var(--accent-success)' : 'var(--accent-warning)',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '10px' }}>{isClean ? '●' : '◐'}</span>
        {isClean ? 'Clean decision' : `Integrity ${integrityScore}%`}
      </span>

      {/* Separator */}
      <span style={{ color: 'var(--border-light)', userSelect: 'none' }}>·</span>

      {/* Formula disclosure */}
      <span style={{ color: 'var(--text-muted)' }}>
        {isClean
          ? 'All constraints fully satisfied — Σ(w·s)/Σ(w) = 100%'
          : relaxedConstraint
            ? `"${relaxedConstraint}" relaxed to find results — Σ(w·s)/Σ(w) = ${integrityScore}%`
            : `One or more constraints relaxed — Σ(w·s)/Σ(w) = ${integrityScore}%`
        }
      </span>

      {/* Separator */}
      {shortHash && (
        <>
          <span style={{ color: 'var(--border-light)', userSelect: 'none' }}>·</span>
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: '11px',
              color: 'var(--text-muted)',
              letterSpacing: '0.02em',
            }}
            title={`Decision fingerprint: ${irHash}\nThis decision is deterministic — same inputs produce identical results.`}
          >
            {shortHash}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>deterministic</span>
        </>
      )}

      {/* Relaxed constraint warning */}
      <AnimatePresence>
        {!isClean && (
          <motion.span
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            style={{
              marginLeft: 'auto',
              padding: '2px 8px',
              background: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: '4px',
              color: 'var(--accent-warning)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            constraint relaxed
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
