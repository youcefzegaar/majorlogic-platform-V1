/**
 * Derives a Semantic Aura descriptor from a card's dominant score vector.
 * Returns { type, hue, soft, line } for use in CSS and animation.
 * visual-laws.md §2
 */
export function deriveAura(dims = {}) {
  const { performance = 0, portability = 0, value = 0, display = 0 } = dims;
  const mobility = portability;

  const scores = {
    performance: Number(performance),
    mobility:    Number(mobility),
    value:       Number(value),
    balanced:    (Number(performance) + Number(mobility) + Number(value) + Number(display)) / 4,
  };

  const type = Object.entries(scores).reduce((a, b) => (b[1] > a[1] ? b : a))[0];

  const TOKENS = {
    performance: { hue: '#fb7185', soft: 'rgba(251,113,133,0.12)', line: 'rgba(251,113,133,0.4)' },
    mobility:    { hue: '#56b6f2', soft: 'rgba(86,182,242,0.12)',  line: 'rgba(86,182,242,0.4)'  },
    balanced:    { hue: '#a78bfa', soft: 'rgba(167,139,250,0.12)', line: 'rgba(167,139,250,0.4)' },
    value:       { hue: '#f5b454', soft: 'rgba(245,180,84,0.12)',  line: 'rgba(245,180,84,0.4)'  },
  };

  return { type, ...TOKENS[type] };
}
