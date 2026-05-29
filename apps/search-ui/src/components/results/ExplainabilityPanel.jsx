import { useTranslation } from 'react-i18next';
import DecisionTrust from '../shared/DecisionTrust';
import { LayerL0, LayerL1, LayerL2 } from './ExplanationLayers';

const DIMENSION_MAP = {
  performance_score: { label: 'Performance', priorityKey: 'performance' },
  display_score:     { label: 'Display',      priorityKey: 'display'      },
  portability_score: { label: 'Portability',  priorityKey: 'portability'  },
  battery_score:     { label: 'Battery',      priorityKey: 'battery'      },
  value_score:       { label: 'Value',        priorityKey: 'resale'       },
};

function resolveScore(traceScores, key) {
  if (traceScores[key] != null) return Math.round(traceScores[key]);
  if (key === 'value_score' && traceScores.economic_score != null)
    return Math.round(traceScores.economic_score);
  return null;
}

function computeDims(traceScores = {}, priorities = {}) {
  const seen = new Set();
  return Object.keys(DIMENSION_MAP)
    .filter(k => {
      const meta = DIMENSION_MAP[k];
      if (seen.has(meta.label)) return false;
      const score = resolveScore(traceScores, k);
      if (score == null) return false;
      seen.add(meta.label);
      return true;
    })
    .map(k => {
      const meta = DIMENSION_MAP[k];
      const score = resolveScore(traceScores, k);
      const userIdeal = Math.round(priorities[meta.priorityKey] ?? 50);
      const delta = score - userIdeal;
      return { key: k, ...meta, score, userIdeal, delta };
    });
}

export default function ExplainabilityPanel({ selectedCard, explanationTab, setExplanationTab, onBack }) {
  const { t } = useTranslation();
  if (!selectedCard) return null;

  const traceScores = selectedCard.traceScores ?? {};
  const priorities  = selectedCard.priorities  ?? {};
  const dims = computeDims(traceScores, priorities);

  const integrityScore    = selectedCard.integrityScore ?? 100;
  const irHash            = selectedCard.irHash ?? null;
  const relaxedConstraint = selectedCard.relaxedConstraint ?? null;
  const explanation       = selectedCard.explanation ?? null;

  const LEGACY_TABS = ['decision', 'trade-offs', 'excluded', 'how'];
  const activeLayer = LEGACY_TABS.includes(explanationTab) ? 'L1' : (explanationTab ?? 'L1');

  const layers = [
    { id: 'L0', label: t('explanation.depth_l0') },
    { id: 'L1', label: t('explanation.depth_l1') },
    { id: 'L2', label: t('explanation.depth_l2') },
  ];

  return (
    <div>
      <div className="explain-banner">
        <div className="explain-banner-body" style={{ padding: '20px 24px' }}>
          <div className="selected-card-name" style={{ fontSize: 18 }}>{selectedCard.name}</div>
          <div className="selected-card-type" style={{ marginTop: 4 }}>
            {selectedCard.badge} · {selectedCard.price}
          </div>
          <div style={{ marginTop: 10 }}>
            <DecisionTrust
              integrityScore={integrityScore}
              irHash={irHash}
              relaxedConstraint={relaxedConstraint}
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {layers.map(l => (
            <button
              key={l.id}
              className={`explanation-tab ${activeLayer === l.id ? 'active' : ''}`}
              onClick={() => setExplanationTab(l.id)}
              style={{ flex: 1, textAlign: 'center' }}
            >
              {l.label}
            </button>
          ))}
        </div>

        {activeLayer === 'L0' && (
          <div className="explanation-content active">
            <LayerL0
              explanation={explanation}
              traceScores={traceScores}
              priorities={priorities}
              intent={selectedCard.naturalLanguageIntent}
            />
          </div>
        )}

        {activeLayer === 'L1' && (
          <div className="explanation-content active">
            <LayerL1
              explanation={explanation}
              selectedCard={selectedCard}
              dims={dims}
              onBack={onBack}
            />
          </div>
        )}

        {activeLayer === 'L2' && (
          <div className="explanation-content active">
            <LayerL2
              explanation={explanation}
              integrityScore={integrityScore}
              irHash={irHash}
              relaxedConstraint={relaxedConstraint}
              dims={dims}
            />
          </div>
        )}
      </div>
    </div>
  );
}
