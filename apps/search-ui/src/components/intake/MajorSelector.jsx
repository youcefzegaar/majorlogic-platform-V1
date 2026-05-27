import { useTranslation } from 'react-i18next';

const SPECS = [
  { id: 'cs', icon: '💻' },
  { id: 'engineering', icon: '⚙️' },
  { id: 'design', icon: '🎨' },
  { id: 'medical', icon: '🧬' },
  { id: 'general', icon: '📚' },
  { id: 'ai', icon: '🤖' }
];

export default function MajorSelector({ major, setMajor }) {
  const { t } = useTranslation();
  return (
    <div className="intake-card">
      <div className="card-header">
        <div className="card-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-info)' }}>💻</div>
        <div>
          <div className="card-title">{t('intake.field_title')}</div>
          <div className="card-subtitle">{t('intake.field_subtitle')}</div>
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
            {t(`intake.field_${spec.id}`)}
          </div>
        ))}
      </div>
    </div>
  );
}
