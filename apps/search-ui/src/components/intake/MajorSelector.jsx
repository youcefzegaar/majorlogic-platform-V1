const SPECS = [
  { id: 'cs', icon: '💻', label: 'CS / IT' },
  { id: 'engineering', icon: '⚙️', label: 'Engineering' },
  { id: 'design', icon: '🎨', label: 'Design' },
  { id: 'medical', icon: '🧬', label: 'Medical' },
  { id: 'general', icon: '📚', label: 'General' },
  { id: 'ai', icon: '🤖', label: 'AI' }
];

export default function MajorSelector({ major, setMajor }) {
  return (
    <div className="intake-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-info)' }}>💻</div>
        <div>
          <div className="card-title">Your Field</div>
          <div className="card-subtitle">Choose your primary work area</div>
        </div>
      </div>
      <div className="specialization-grid">
        {SPECS.map(spec => (
          <div
            key={spec.id}
            className={`spec-chip ${major === spec.id ? 'selected' : ''}`}
            onClick={() => setMajor(spec.id)}
          >
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{spec.icon}</div>
            {spec.label}
          </div>
        ))}
      </div>
    </div>
  );
}
