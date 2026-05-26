import { useTranslation } from 'react-i18next';

const RadarChart = ({ data }) => {
  const cx = 120;
  const cy = 120;
  const r = 80;

  const getPoint = (val, angle) => {
    const rad = (angle - 90) * Math.PI / 180;
    const distance = (val / 100) * r;
    return `${cx + distance * Math.cos(rad)},${cy + distance * Math.sin(rad)}`;
  };

  const points = [
    getPoint(data.performance, 0),
    getPoint(data.battery, 90),
    getPoint(data.portability, 180),
    getPoint(data.build, 270)
  ].join(' ');

  return (
    <svg width="100%" viewBox="0 0 240 240" style={{ overflow: 'visible', maxWidth: 240, display: 'block' }}>
      <polygon points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} fill="rgba(255,255,255,0.02)" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
      <polygon points={`${cx},${cy - r * 0.5} ${cx + r * 0.5},${cy} ${cx},${cy + r * 0.5} ${cx - r * 0.5},${cy}`} fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4" />
      <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="var(--border)" strokeWidth="1" />
      <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="var(--border)" strokeWidth="1" />

      <text x={cx} y={cy - r - 10} textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="600">Performance</text>
      <text x={cx + r + 10} y={cy + 4} textAnchor="start" fill="var(--text-secondary)" fontSize="12" fontWeight="600">Battery</text>
      <text x={cx} y={cy + r + 20} textAnchor="middle" fill="var(--text-secondary)" fontSize="12" fontWeight="600">Portability</text>
      <text x={cx - r - 10} y={cy + 4} textAnchor="end" fill="var(--text-secondary)" fontSize="12" fontWeight="600">Build</text>

      <polygon points={points} fill="rgba(233, 69, 96, 0.2)" stroke="var(--accent)" strokeWidth="2" style={{ transition: 'all 0.4s ease-out' }} />

      <circle cx={getPoint(data.performance, 0).split(',')[0]} cy={getPoint(data.performance, 0).split(',')[1]} r="4" fill="var(--accent)" style={{ transition: 'all 0.4s ease-out' }} />
      <circle cx={getPoint(data.battery, 90).split(',')[0]} cy={getPoint(data.battery, 90).split(',')[1]} r="4" fill="var(--accent)" style={{ transition: 'all 0.4s ease-out' }} />
      <circle cx={getPoint(data.portability, 180).split(',')[0]} cy={getPoint(data.portability, 180).split(',')[1]} r="4" fill="var(--accent)" style={{ transition: 'all 0.4s ease-out' }} />
      <circle cx={getPoint(data.build, 270).split(',')[0]} cy={getPoint(data.build, 270).split(',')[1]} r="4" fill="var(--accent)" style={{ transition: 'all 0.4s ease-out' }} />
    </svg>
  );
};

export default function DecisionTrace({ priorities, analysisSummary, detectedConflicts, budgetMin, budgetMax }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="constraint-list">
        <div className="constraint-item">
          <div className="constraint-status ok"><i className="fas fa-check"></i></div>
          <div className="constraint-info">
            <div className="constraint-name">
              {t('trace.budget_constraint', { min: budgetMin.toLocaleString(), max: budgetMax.toLocaleString() })}
            </div>
            <div className="constraint-detail">
              {t('trace.devices_in_budget', { count: analysisSummary.devices })}
            </div>
          </div>
          <div className="constraint-tension">
            <div className="tension-bar-bg"><div className="tension-bar-fill low" style={{ width: '20%' }}></div></div>
            <div className="tension-label">{t('trace.low_tension')}</div>
          </div>
        </div>

        {detectedConflicts.map(insight => {
          const isHarmony = insight.type === 'harmony';
          const isRisk = insight.type === 'risk';
          const icon = isHarmony ? 'fa-check-circle' : isRisk ? 'fa-info-circle' : 'fa-bolt';
          const colorClass = isHarmony ? 'ok' : isRisk ? 'info' : 'warning';
          const barColorClass = isHarmony ? 'low' : isRisk ? 'medium' : 'high';
          const tensionLabel = isHarmony
            ? t('trace.alignment')
            : isRisk
              ? t('trace.risk')
              : t('trace.tension');

          return (
            <div
              key={insight.id}
              className="constraint-item"
              style={{
                border: isHarmony
                  ? '1px solid rgba(16, 185, 129, 0.3)'
                  : isRisk
                    ? '1px solid rgba(14, 165, 233, 0.3)'
                    : '1px solid var(--border)',
                background: isHarmony ? 'rgba(16, 185, 129, 0.02)' : 'var(--surface-elevated)'
              }}
            >
              <div className={`constraint-status ${colorClass}`}><i className={`fas ${icon}`}></i></div>
              <div className="constraint-info">
                <div className="constraint-name">{insight.title}</div>
                <div className="constraint-detail" style={{ lineHeight: 1.5 }}>{insight.description}</div>
              </div>
              <div className="constraint-tension">
                <div className="tension-bar-bg">
                  <div className={`tension-bar-fill ${barColorClass}`} style={{ width: `${Math.round(insight.gravity * 100)}%` }}></div>
                </div>
                <div className="tension-label">
                  {tensionLabel} ({Math.round(insight.gravity * 100)}%)
                </div>
              </div>
            </div>
          );
        })}

        {detectedConflicts.length === 0 && (
          <div className="constraint-item">
            <div className="constraint-status ok"><i className="fas fa-check-double"></i></div>
            <div className="constraint-info">
              <div className="constraint-name">{t('trace.harmony_title')}</div>
              <div className="constraint-detail">{t('trace.harmony_desc')}</div>
            </div>
          </div>
        )}
      </div>

      <div className="analysis-grid">
        <div className="analysis-panel">
          <div className="analysis-panel-title">
            <i className="fas fa-bullseye" style={{ color: 'var(--accent-info)', marginRight: 8 }}></i>
            {t('trace.dimensional_profile')}
          </div>
          <RadarChart data={priorities} />
        </div>

        <div className="analysis-panel analysis-panel-summary">
          <div className="analysis-panel-title">
            <i className="fas fa-chart-pie" style={{ color: 'var(--accent-warning)', marginRight: 8 }}></i>
            {t('trace.analysis_summary_title')}
          </div>
          <div className="analysis-stats-grid">
            <div className="analysis-stat-card">
              <div style={{ fontSize: 22, marginBottom: 6 }}>⚠️</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-warning)', lineHeight: 1 }}>{analysisSummary.conflicts}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>{t('trace.conflicts')}</div>
            </div>
            <div className="analysis-stat-card">
              <div style={{ fontSize: 22, marginBottom: 6 }}>💻</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-success)', lineHeight: 1 }}>{analysisSummary.devices}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>{t('trace.viable_devices')}</div>
            </div>
            <div className="analysis-stat-card">
              <div style={{ fontSize: 22, marginBottom: 6 }}>🧭</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-info)', lineHeight: 1 }}>{analysisSummary.paths}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>{t('trace.resolution_paths')}</div>
            </div>
            <div className="analysis-stat-card">
              <div style={{ fontSize: 22, marginBottom: 6 }}>🎯</div>
              <div style={{
                fontSize: 26,
                fontWeight: 800,
                color: analysisSummary.confidence >= 80
                  ? 'var(--accent-success)'
                  : analysisSummary.confidence >= 60
                    ? 'var(--accent-warning)'
                    : 'var(--accent-danger)',
                lineHeight: 1
              }}>
                {analysisSummary.confidence}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>{t('trace.confidence')}</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
