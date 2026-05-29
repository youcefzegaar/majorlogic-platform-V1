export default function ConfidenceRing({ pct, size = 20 }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const fill = Math.min(Math.max(pct ?? 0, 0), 100);
  const color = fill >= 80 ? 'var(--accent-success)' : fill >= 60 ? 'var(--accent-warning)' : 'var(--accent-danger)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth="2" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth="2"
        strokeDasharray={`${fill / 100 * circ} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
