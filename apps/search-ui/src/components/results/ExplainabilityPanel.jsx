const TRANSLATIONS = {
  ar: {
    decisionExplanation: 'تفاصيل قرار محرك التوصية',
    fullTransparency: 'شفافية كاملة في الأسباب والمقايضات والبدائل المستبعدة',
    whyChosen: 'لماذا تم اختياره؟',
    excluded: 'البدائل المستبعدة',
    tradeOffs: 'المقايضات والتنازلات',
    stability: 'استقرار القرار',
    whatGained: '✓ ما كسبته في هذا الخيار',
    whatLost: '✗ ما ضحيت به في هذا الخيار',
    whyThisChoiceOverAlternatives: '⚖ لماذا تم تفضيل هذا الخيار على البدائل',
    relaxedConstraint: 'تخفيف قيد',
    judgmentScore: 'درجة الملاءمة',
    noExclusions: 'لا توجد بدائل مستبعدة تفي بالحد الأدنى من القيود.',
  },
  en: {
    decisionExplanation: 'Decision Explanation in Detail',
    fullTransparency: 'Full transparency in reasons, trade-offs, and excluded alternatives',
    whyChosen: 'Why Chosen?',
    excluded: 'Excluded',
    tradeOffs: 'Trade-offs',
    stability: 'Stability',
    whatGained: '✓ What You Gained',
    whatLost: '✗ What You Lost',
    whyThisChoiceOverAlternatives: '⚖ Why This Choice Over Alternatives',
    relaxedConstraint: 'Relaxed',
    judgmentScore: 'Judgment Score',
    noExclusions: 'No excluded alternatives met the minimum baseline.',
  }
};

const GATE_NAMES = {
  ar: {
    specs_performance: 'الأداء',
    specs_battery: 'البطارية',
    specs_portability: 'سهولة التنقل والوزن',
    specs_display: 'الشاشة والوضوح',
    specs_resale: 'قيمة إعادة البيع',
    budgetUsd: 'الميزانية القصوى',
  },
  en: {
    specs_performance: 'performance',
    specs_battery: 'battery',
    specs_portability: 'portability',
    specs_display: 'display quality',
    specs_resale: 'resale value',
    budgetUsd: 'maximum budget',
  }
};

export default function ExplainabilityPanel({ selectedCard, explanationTab, setExplanationTab }) {
  const lang = selectedCard?.locale === 'ar' ? 'ar' : 'en';
  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} style={{ textAlign: isRtl ? 'right' : 'left' }}>
      <div className="explain-banner">
        <div className="explain-banner-body" style={{ padding: '20px 24px' }}>
          <div className="selected-card-name" style={{ fontSize: 18 }}>{selectedCard.name}</div>
          <div className="selected-card-type" style={{ marginTop: 4 }}>
            {selectedCard.badge} — {t.judgmentScore}: {selectedCard.score}%
          </div>
          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', justifyContent: isRtl ? 'flex-start' : 'flex-start' }}>
            <span className={`selected-card-badge ${selectedCard.badgeClass}`}>{selectedCard.badge}</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedCard.price}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div className="card-icon" style={{ background: 'rgba(14, 165, 233, 0.15)', color: 'var(--accent-info)', minWidth: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32, borderRadius: 8 }}>🔍</div>
          <div>
            <div className="card-title">{t.decisionExplanation}</div>
            <div className="card-subtitle">{t.fullTransparency}</div>
          </div>
        </div>

        <div className="explanation-tabs" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          <button className={`explanation-tab ${explanationTab === 'why-chosen' ? 'active' : ''}`} onClick={() => setExplanationTab('why-chosen')}>{t.whyChosen}</button>
          <button className={`explanation-tab ${explanationTab === 'excluded' ? 'active' : ''}`} onClick={() => setExplanationTab('excluded')}>{t.excluded}</button>
          <button className={`explanation-tab ${explanationTab === 'trade-offs' ? 'active' : ''}`} onClick={() => setExplanationTab('trade-offs')}>{t.tradeOffs}</button>
          <button className={`explanation-tab ${explanationTab === 'stability' ? 'active' : ''}`} onClick={() => setExplanationTab('stability')}>{t.stability}</button>
        </div>

        {explanationTab === 'why-chosen' && (
          <div className="explanation-content active">
            <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
              {/* Device name + story */}
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{selectedCard.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 16 }}>
                {String(selectedCard.whyChosen || '').split('\n\n').map((para, i) => (
                  <p key={i} style={{ margin: '0 0 10px 0' }}>{para}</p>
                ))}
              </div>

              {/* AI Key Trade-off block */}
              {selectedCard.aiTradeoff && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(245, 158, 11, 0.07)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 10,
                  marginBottom: 12,
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: 16, lineHeight: 1 }}>⚖️</span>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(245,158,11,0.9)', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {isRtl ? 'التنازل الرئيسي' : 'Key Trade-off'}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {selectedCard.aiTradeoff}
                    </div>
                  </div>
                </div>
              )}

              {/* Honest flaws */}
              {selectedCard.flaws.map(f => (
                <div key={f} style={{
                  fontSize: 13,
                  color: 'var(--text-secondary)',
                  marginTop: 8,
                  paddingLeft: isRtl ? 0 : 8,
                  paddingRight: isRtl ? 8 : 0,
                  borderLeft: isRtl ? 'none' : '2px solid var(--accent-danger)',
                  borderRight: isRtl ? '2px solid var(--accent-danger)' : 'none',
                }}>
                  <strong style={{ color: 'var(--accent-danger)', marginRight: isRtl ? 0 : 6, marginLeft: isRtl ? 6 : 0 }}>✗</strong> {f}
                </div>
              ))}
            </div>
          </div>
        )}

        {explanationTab === 'trade-offs' && (
          <div className="explanation-content active">
            <div style={{ padding: 20, background: 'var(--surface-elevated)', borderRadius: 12, border: '1px solid var(--border)' }}>
              <div className="trade-off-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                {/* Gained column */}
                <div style={{ padding: 16, background: 'rgba(16, 185, 129, 0.05)', borderRadius: 10, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-success)', fontWeight: 700, marginBottom: 8 }}>{t.whatGained}</div>
                  {selectedCard.tradeOffs.gained.map(g => <div key={g} style={{ fontSize: 13, marginBottom: 4 }}>• {g}</div>)}
                </div>

                {/* Lost column */}
                <div style={{ padding: 16, background: 'rgba(244, 63, 94, 0.05)', borderRadius: 10, border: '1px solid rgba(244, 63, 94, 0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-danger)', fontWeight: 700, marginBottom: 8 }}>{t.whatLost}</div>
                  {selectedCard.tradeOffs.lost.map((l, i) => (
                    <div key={i} style={{ fontSize: 13, marginBottom: 6, display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                      <span style={{ color: 'var(--accent-danger)', flexShrink: 0, marginTop: 1 }}>•</span>
                      <span style={{ lineHeight: 1.5 }}>
                        {l}
                        {/* Badge for AI-generated first item */}
                        {i === 0 && selectedCard.aiTradeoff && l === selectedCard.aiTradeoff && (
                          <span style={{
                            display: 'inline-block',
                            marginLeft: isRtl ? 0 : 6,
                            marginRight: isRtl ? 6 : 0,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: 'rgba(99,102,241,0.15)',
                            color: 'var(--accent-primary)',
                            letterSpacing: '0.04em'
                          }}>AI</span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sacrifice Vector */}
              {Object.keys(selectedCard.sacrificeVector || {}).length > 0 && (
                <div style={{ marginTop: 16, padding: 16, background: 'rgba(99, 102, 241, 0.05)', borderRadius: 10, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-primary)', fontWeight: 700, marginBottom: 8 }}>{t.whyThisChoiceOverAlternatives}</div>
                  {Object.entries(selectedCard.sacrificeVector).map(([gate, info]) => (
                    <div key={gate} style={{ fontSize: 13, marginBottom: 4, color: 'var(--text-secondary)' }}>
                      • {isRtl ? 'تخفيف قيد ' : 'Relaxed '}
                      <strong style={{ color: 'var(--text-primary)' }}>
                        {GATE_NAMES[lang][gate] || gate.replace(/_/g, ' ')}
                      </strong>
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
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', maxWidth: 500, margin: '0 auto', marginTop: 16 }}>
                {selectedCard.stability.description}
              </div>
            </div>
          </div>
        )}

        {explanationTab === 'excluded' && (
          <div className="explanation-content active">
            {selectedCard.excluded.length === 0 ? (
              <div style={{ padding: 20, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                {t.noExclusions}
              </div>
            ) : (
              selectedCard.excluded.map((item, idx) => (
                <div key={idx} className="excluded-item" style={{ padding: 12, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
                  <span className="excluded-reason" style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{item.reason}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
