export default function ExplainabilityPanel({ selectedCard, explanationTab, setExplanationTab }) {
  return (
    <>
      <div className="explain-banner">
        <div className="explain-banner-body" style={{ padding: '20px 24px' }}>
          <div className="selected-card-name" style={{ fontSize: 18 }}>{selectedCard.name}</div>
          <div className="selected-card-type" style={{ marginTop: 4 }}>{selectedCard.badge} — Judgment Score: {selectedCard.score}%</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`selected-card-badge ${selectedCard.badgeClass}`}>{selectedCard.badge}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedCard.price}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-info)' }}>🔍</div>
          <div>
            <div className="card-title">Decision Explanation in Detail</div>
            <div className="card-subtitle">Full transparency in reasons, trade-offs, and excluded alternatives</div>
          </div>
        </div>

        <div className="explanation-tabs">
          <button className={`explanation-tab ${explanationTab === 'why-chosen' ? 'active' : ''}`} onClick={() => setExplanationTab('why-chosen')}>Why Chosen?</button>
          <button className={`explanation-tab ${explanationTab === 'excluded' ? 'active' : ''}`} onClick={() => setExplanationTab('excluded')}>Excluded</button>
          <button className={`explanation-tab ${explanationTab === 'trade-offs' ? 'active' : ''}`} onClick={() => setExplanationTab('trade-offs')}>Trade-offs</button>
          <button className={`explanation-tab ${explanationTab === 'stability' ? 'active' : ''}`} onClick={() => setExplanationTab('stability')}>Stability</button>
        </div>

        {explanationTab === 'why-chosen' && (
          <div className="explanation-content active">
            <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{selectedCard.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 12 }}>
                {String(selectedCard.whyChosen || '').split('\n\n').map((para, i) => (
                  <p key={i} style={{ margin: '0 0 10px 0' }}>{para}</p>
                ))}
              </div>
              {selectedCard.flaws.map(f => (
                <div key={f} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--accent-danger)' }}>✗</strong> {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {explanationTab === 'trade-offs' && (
          <div className="explanation-content active">
            <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div className="trade-off-grid">
                <div style={{ padding: 16, background: 'rgba(16, 185, 129, 0.05)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 700, marginBottom: 8 }}>✓ What You Gained</div>
                  {selectedCard.tradeOffs.gained.map(g => <div key={g} style={{ fontSize: 13, marginBottom: 4 }}>• {g}</div>)}
                </div>
                <div style={{ padding: 16, background: 'rgba(244, 63, 94, 0.05)', borderRadius: 10, border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-danger)', fontWeight: 700, marginBottom: 8 }}>✗ What You Lost</div>
                  {selectedCard.tradeOffs.lost.map(l => <div key={l} style={{ fontSize: 13, marginBottom: 4 }}>• {l}</div>)}
                </div>
              </div>
              {Object.keys(selectedCard.sacrificeVector || {}).length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(99, 102, 241, 0.05)', borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 8 }}>⚖ Why This Choice Over Alternatives</div>
                  {Object.entries(selectedCard.sacrificeVector).map(([gate, info]) => (
                    <div key={gate} style={{ fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>
                      • Relaxed <strong style={{ color: 'var(--text-primary)' }}>{gate.replace(/_/g, ' ')}</strong>
                      {info?.meaning ? ` — ${info.meaning}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {explanationTab === 'stability' && (
          <div className="explanation-content active">
            <div style={{ textAlign: 'center', padding: 20 }}>
              <div className={`stability-circle ${selectedCard.stability.status}`}>
                <div className={`stability-score ${selectedCard.stability.status}`}>{selectedCard.stability.score}%</div>
                <div className="stability-label">{selectedCard.stability.label}</div>
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto' }}>
                {selectedCard.stability.description}
              </div>
            </div>
          </div>
        )}

        {explanationTab === 'excluded' && (
          <div className="explanation-content active">
            {selectedCard.excluded.map((item, idx) => (
              <div key={idx} className="excluded-item">
                <span style={{ fontWeight: 600 }}>{item.name}</span>
                <span className="excluded-reason">{item.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
