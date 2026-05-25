// Dimension config: maps trace score keys → user priority keys → display labels
const DIMENSIONS = [
  { scoreKey: 'performance_score', priorityKey: 'performance', label: 'Performance' },
  { scoreKey: 'display_score',     priorityKey: 'display',      label: 'Display'      },
  { scoreKey: 'portability_score', priorityKey: 'portability',  label: 'Portability'  },
  { scoreKey: 'battery_score',     priorityKey: 'battery',      label: 'Battery'      },
  { scoreKey: 'value_score',       priorityKey: 'resale',       label: 'Value'        },
];

// Fallback: some backends emit economic_score instead of value_score
function resolveScore(traceScores, scoreKey) {
  if (traceScores[scoreKey] != null) return Math.round(traceScores[scoreKey]);
  if (scoreKey === 'value_score' && traceScores.economic_score != null)
    return Math.round(traceScores.economic_score);
  return null;
}

function ParetoBar({ label, score, userIdeal }) {
  const delta = score - userIdeal;
  const isGain = delta > 4;
  const isSacrifice = delta < -4;
  const barColor = isSacrifice
    ? 'var(--accent-warning)'
    : isGain
    ? 'var(--accent-success)'
    : 'var(--accent-info)';
  const marker = isSacrifice ? '↓' : isGain ? '↑' : '=';
  const markerColor = isSacrifice ? 'var(--accent-warning)' : isGain ? 'var(--accent-success)' : 'var(--text-muted)';

  return (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
        <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ color: markerColor, fontWeight: 700, fontSize: 10 }}>{marker}</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{score}</span>
        </span>
      </div>
      <div
        style={{
          height: 5,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 3,
          overflow: 'visible',
          position: 'relative',
        }}
      >
        {/* User ideal marker */}
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(userIdeal, 99)}%`,
            top: -2,
            width: 1,
            height: 9,
            background: 'rgba(255,255,255,0.22)',
            zIndex: 2,
          }}
          title={`Your priority: ${userIdeal}`}
        />
        <div
          style={{
            width: `${score}%`,
            height: '100%',
            background: barColor,
            borderRadius: 3,
            opacity: 0.8,
            transition: 'width 0.6s ease-out',
          }}
        />
      </div>
    </div>
  );
}

function buildSacrificeSentence(dims) {
  const sacrifices = dims.filter(d => d.score - d.userIdeal < -4)
    .sort((a, b) => (a.score - a.userIdeal) - (b.score - b.userIdeal));
  const gains = dims.filter(d => d.score - d.userIdeal > 4)
    .sort((a, b) => (b.score - b.userIdeal) - (a.score - a.userIdeal));

  if (sacrifices.length === 0 && gains.length === 0) return null;

  const sacStr = sacrifices.map(d => `${d.label} ${d.score - d.userIdeal}`).join(', ');
  const gainStr = gains.slice(0, 2).map(d => `${d.label} +${d.score - d.userIdeal}`).join(', ');

  if (sacrifices.length > 0 && gains.length > 0) {
    return `Trade: sacrifice [${sacStr}] · gain [${gainStr}]`;
  }
  if (sacrifices.length > 0) return `Trade: sacrifice [${sacStr}] — no major gains above your ideal`;
  return `All dimensions at or above your priorities · gain [${gainStr}]`;
}

function resolveIdentityStatement(card) {
  const fs = card.fitStates;
  if (!fs) return null;
  if (typeof fs === 'string') return fs;
  if (typeof fs === 'object') {
    // Try .reason directly, then first value's .reason, then first string value
    if (fs.reason) return fs.reason;
    const first = Object.values(fs)[0];
    if (first?.reason) return first.reason;
    if (typeof first === 'string') return first;
  }
  return null;
}

export default function HeroCard({ type, card, isSelected, onSelect, onConfirm, onDetails }) {
  const traceScores = card.traceScores ?? {};
  const userPriorities = card.priorities ?? {};

  // Build computed dimension deltas for Pareto bars
  const dims = DIMENSIONS.map(d => {
    const score = resolveScore(traceScores, d.scoreKey);
    const userIdeal = Math.round(userPriorities[d.priorityKey] ?? 50);
    return { ...d, score, userIdeal };
  }).filter(d => d.score != null);

  const sacrificeSentence = buildSacrificeSentence(dims);
  const identityStatement = resolveIdentityStatement(card);

  // Social proof from review intelligence
  const intel = card.intelligence ?? {};
  const bayesianScore = intel.bayesianScore ?? intel.score ?? null;
  const userCount = intel.userCount ?? intel.reviewCount ?? null;
  const dominantRisk = intel.dominantRisk ?? intel.primaryRisk ?? null;

  return (
    <div
      className={`decision-card ${isSelected ? 'recommended' : ''}`}
      onClick={() => onSelect(type)}
    >
      {/* Image studio */}
      <div
        className="decision-card-image"
        style={{
          padding: 0,
          background: 'linear-gradient(145deg, #0d1b2a 0%, #1b2838 40%, #0a1628 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '220px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: '60%',
            background: 'radial-gradient(ellipse, rgba(100,160,255,0.08) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        {card.image ? (
          <img
            src={card.image}
            alt={card.name}
            style={{
              width: '85%',
              maxHeight: '180px',
              objectFit: 'contain',
              filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.6))',
              position: 'relative',
              zIndex: 1,
            }}
          />
        ) : (
          <span style={{ fontSize: 64 }}>{card.icon}</span>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40%',
            background: 'linear-gradient(to top, rgba(13,27,42,0.95), transparent)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      </div>

      <div className="decision-card-body">
        {/* Strategy badge */}
        <div className="decision-card-header">
          <span className={`decision-card-badge ${card.badgeClass}`}>{card.badge}</span>
        </div>

        <div className="decision-card-name">{card.name}</div>
        <div className="decision-card-price">
          {card.price}{' '}
          {card.originalPrice && <span className="original">{card.originalPrice}</span>}
        </div>

        {/* AI expert voice — first sentence of the story as the emotional anchor.
            The user reads the human explanation FIRST, then the math confirms it. */}
        {card.whyChosen ? (
          <div
            style={{
              fontSize: 13,
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              margin: '8px 0 12px',
              fontStyle: 'italic',
              borderLeft: '2px solid var(--accent-info)',
              paddingLeft: 10,
            }}
          >
            {String(card.whyChosen).split(/\n\n/)[0]}
          </div>
        ) : identityStatement ? (
          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              lineHeight: 1.55,
              margin: '8px 0 12px',
              fontStyle: 'italic',
            }}
          >
            {identityStatement}
          </div>
        ) : null}

        {/* 5 Pareto bars — replaces the score circle (Tufte: every pixel carries data) */}
        {dims.length > 0 && (
          <div className="card-section" style={{ marginBottom: 12 }}>
            <div
              className="card-section-title"
              style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}
            >
              <span>Decision Profile</span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                vs. your priorities
              </span>
            </div>
            {dims.map(d => (
              <ParetoBar
                key={d.scoreKey}
                label={d.label}
                score={d.score}
                userIdeal={d.userIdeal}
              />
            ))}
            {sacrificeSentence && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  borderTop: '1px solid var(--border)',
                  paddingTop: 6,
                  lineHeight: 1.5,
                }}
              >
                {sacrificeSentence}
              </div>
            )}
          </div>
        )}

        {/* Fallback: show old anchor sentence only when no trace scores */}
        {dims.length === 0 && (
          <div className="card-section" style={{ marginBottom: 10 }}>
            <div className="card-section-title">Why this choice?</div>
            <div className="card-section-text" style={{ lineHeight: 1.65 }}>
              {String(card.whyChosen || '').split(/(?<=[.!؟])\s+/)[0]}
            </div>
          </div>
        )}

        {/* Key trade-off — proactive disclosure */}
        {card.aiTradeoff && (
          <div
            className="card-section"
            style={{
              background: 'rgba(245, 158, 11, 0.05)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: 10,
            }}
          >
            <div
              className="card-section-title"
              style={{ color: 'rgba(245,158,11,0.9)', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              ⚖️ Key Trade-off
            </div>
            <div className="card-section-text" style={{ fontWeight: 500 }}>
              {card.aiTradeoff}
            </div>
          </div>
        )}

        {/* Top advantage (from review intelligence) */}
        {card.topPros?.length > 0 && (
          <div
            className="card-section"
            style={{
              background: 'rgba(16, 185, 129, 0.05)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: 10,
            }}
          >
            <div
              className="card-section-title"
              style={{ color: 'var(--accent-success)', display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              ✓ What users consistently praise
            </div>
            <div className="card-section-text">{card.topPros[0]}</div>
          </div>
        )}

        {/* ALL flaws — proactively shown in card center, not buried in details */}
        {card.flaws?.length > 0 && (
          <div
            className="card-section"
            style={{
              background: 'rgba(244, 63, 94, 0.05)',
              border: '1px solid rgba(244, 63, 94, 0.2)',
              padding: '10px 12px',
              borderRadius: '8px',
              marginBottom: 10,
            }}
          >
            <div
              className="card-section-title"
              style={{ color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <i className="fas fa-bullhorn"></i> Known issues
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
              Aggregated from expert and user reviews
            </div>
            {card.flaws.map((flaw, i) => (
              <div
                key={i}
                className="card-section-text"
                style={{
                  color: 'var(--text-secondary)',
                  fontWeight: 500,
                  marginBottom: i < card.flaws.length - 1 ? 6 : 0,
                  paddingBottom: i < card.flaws.length - 1 ? 6 : 0,
                  borderBottom: i < card.flaws.length - 1 ? '1px solid rgba(244,63,94,0.1)' : 'none',
                }}
              >
                {flaw}
              </div>
            ))}
          </div>
        )}

        {/* Social proof from review intelligence */}
        {(bayesianScore != null || userCount != null) && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              fontSize: 11,
              color: 'var(--text-muted)',
              marginBottom: 10,
              flexWrap: 'wrap',
            }}
          >
            {bayesianScore != null && (
              <span>
                Bayesian confidence:{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>
                  {typeof bayesianScore === 'number' && bayesianScore <= 1
                    ? `${Math.round(bayesianScore * 100)}%`
                    : bayesianScore}
                </strong>
              </span>
            )}
            {userCount != null && (
              <span>
                <strong style={{ color: 'var(--text-secondary)' }}>{userCount}</strong> verified buyers
              </span>
            )}
            {dominantRisk && (
              <span style={{ color: 'var(--accent-warning)' }}>Risk: {dominantRisk}</span>
            )}
          </div>
        )}

        <div className="card-actions">
          <button
            className="card-action-btn select"
            onClick={(e) => { e.stopPropagation(); onConfirm(type); }}
          >
            <i className="fas fa-check-circle"></i> Choose This
          </button>
          <button
            className="card-action-btn details"
            onClick={(e) => { e.stopPropagation(); onDetails(type); }}
          >
            <i className="fas fa-info-circle"></i> Full Explanation
          </button>
        </div>
      </div>
    </div>
  );
}
