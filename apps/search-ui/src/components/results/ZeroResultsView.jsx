import { useTranslation } from 'react-i18next';

export default function ZeroResultsView({ noResults, onEditRequirements }) {
  const { t } = useTranslation();

  return (
    <div
      className="no-results-container"
      style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'var(--surface)',
        borderRadius: 16,
        border: '2px dashed var(--border)'
      }}
    >
      <div style={{ fontSize: 64, marginBottom: 20 }}>🤷‍♂️</div>
      <h3 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>{noResults.message}</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
        {t('zero.too_strict')}
      </p>
      {noResults.suggestions && noResults.suggestions.length > 0 && (
        <div
          className="suggestions-box"
          style={{
            background: 'rgba(245, 158, 11, 0.05)',
            padding: 20,
            borderRadius: 12,
            border: '1px solid rgba(245, 158, 11, 0.2)',
            maxWidth: 400,
            margin: '0 auto'
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--accent-warning)',
              marginBottom: 12,
              textTransform: 'uppercase',
              letterSpacing: 1
            }}
          >
            {t('zero.suggestions_title')}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {noResults.suggestions.map(s => (
              <span
                key={s}
                className="suggestion-chip"
                style={{
                  background: 'var(--surface-elevated)',
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)'
                }}
              >
                {t('zero.relax_prefix')} <strong>{s.replace('_', ' ')}</strong>
              </span>
            ))}
          </div>
        </div>
      )}
      <button className="btn btn-secondary" onClick={onEditRequirements} style={{ marginTop: 32 }}>
        <i className="fas fa-edit"></i> {t('buttons.edit_requirements')}
      </button>
    </div>
  );
}
