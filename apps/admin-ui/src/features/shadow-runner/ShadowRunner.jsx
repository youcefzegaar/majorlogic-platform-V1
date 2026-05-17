import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Zap,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Users,
  Activity,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { adminService } from '../../api/apiClient';

const RISK_COLORS = { low: 'var(--success)', medium: 'var(--warning)', high: 'var(--error)' };

const MetricCard = ({ label, value, unit = '', positive = null, sub }) => {
  const color = positive === null ? '#fff' : (positive ? 'var(--success)' : 'var(--error)');
  return (
    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
      <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, display: 'flex', alignItems: 'center', gap: '6px' }}>
        {value}{unit}
        {positive === true && <TrendingUp size={18} />}
        {positive === false && <TrendingDown size={18} />}
      </div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
};

const ShadowRunner = ({ domain, onBack }) => {
  const [gateWeights, setGateWeights] = useState({});
  const [sampleSize, setSampleSize] = useState(100);

  const mutation = useMutation({
    mutationFn: (data) => adminService.simulate(data),
  });

  const handleGateWeight = (gateId, value) => {
    setGateWeights(prev => ({ ...prev, [gateId]: parseFloat(value) }));
  };

  const runSimulation = () => {
    mutation.mutate({
      domainId: domain?.slug || domain?.id,
      modifications: { gateWeights },
      sampleSize
    });
  };

  const report = mutation.data?.report;
  const gates = domain?.config?.gates || {};

  return (
    <div className="page-content">
      <div style={{ marginBottom: '32px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back to Editor
        </button>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>What-If <span className="text-gradient">Analysis</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Simulate the impact of logic changes before deploying them to production.</p>
      </div>

      <div className="grid-2">
        {/* Controls */}
        <div className="card">
          <h3 style={{ marginBottom: '8px' }}>Gate Weight Adjustments</h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Drag sliders to see how relaxing or tightening constraints affects outcomes.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(gates).map(([id, gate]) => {
              const current = gateWeights[id] !== undefined ? gateWeights[id] : gate.weight;
              const original = gate.weight;
              const changed = gateWeights[id] !== undefined && gateWeights[id] !== original;
              return (
                <div key={id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{gate.humanMeaning || id}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{id}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {changed && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textDecoration: 'line-through' }}>{original}</span>
                      )}
                      <span style={{ fontWeight: 800, color: changed ? (current < original ? 'var(--warning)' : 'var(--success)') : 'var(--accent-primary)', fontFamily: 'monospace' }}>
                        {current.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={current}
                    onChange={(e) => handleGateWeight(id, e.target.value)}
                    style={{ width: '100%', accentColor: changed ? (current < original ? 'var(--warning)' : 'var(--success)') : 'var(--accent-primary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                    <span>0 — Disabled</span>
                    <span>1 — Full Weight</span>
                  </div>
                </div>
              );
            })}
          </div>

          {Object.keys(gates).length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              No gates configured for this domain.
            </div>
          )}

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Sample Size</label>
            <select
              className="input-field"
              value={sampleSize}
              onChange={(e) => setSampleSize(parseInt(e.target.value))}
              style={{ marginBottom: '16px' }}
            >
              <option value={100}>Last 100 runs</option>
              <option value={500}>Last 500 runs</option>
              <option value={1000}>Last 1,000 runs</option>
            </select>

            {Object.keys(gateWeights).length > 0 && (
              <button
                className="btn btn-outline"
                style={{ width: '100%', marginBottom: '8px' }}
                onClick={() => setGateWeights({})}
              >
                Reset to Current Values
              </button>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%' }}
              onClick={runSimulation}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <RefreshCw className="spin" size={18} /> : <Zap size={18} />}
              {mutation.isPending ? 'Running simulation...' : 'Run What-If Analysis'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="card" style={{ background: mutation.isSuccess ? 'rgba(124, 58, 237, 0.02)' : '' }}>
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Activity size={20} color="var(--accent-primary)" /> Impact Analysis Report
          </h3>

          {!mutation.isSuccess && !mutation.isPending && !mutation.isError && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
              <Zap size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
              <p>Adjust gate weights and run the simulation to see predicted impact.</p>
            </div>
          )}

          {mutation.isPending && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <RefreshCw className="spin" size={48} style={{ marginBottom: '16px', color: 'var(--accent-primary)' }} />
              <p style={{ color: 'var(--text-secondary)' }}>Simulating {sampleSize} decision runs...</p>
            </div>
          )}

          {mutation.isError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--error)' }}>
              <h4 style={{ color: 'var(--error)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} /> Simulation Error
              </h4>
              <p style={{ color: 'rgba(239,68,68,0.8)', fontSize: '0.9rem' }}>
                {mutation.error?.response?.data?.message || mutation.error?.message || 'Unknown error'}
              </p>
            </div>
          )}

          {mutation.isSuccess && report && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Risk Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                borderRadius: '20px', border: `1px solid ${RISK_COLORS[report.riskLevel]}`,
                background: `${RISK_COLORS[report.riskLevel]}15`, alignSelf: 'flex-start'
              }}>
                <ShieldCheck size={16} color={RISK_COLORS[report.riskLevel]} />
                <span style={{ fontWeight: 700, color: RISK_COLORS[report.riskLevel], textTransform: 'uppercase', fontSize: '0.8rem' }}>
                  {report.riskLevel} risk
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid-2">
                <MetricCard
                  label="Users Affected"
                  value={report.usersAffected}
                  sub={`out of ${report.sampleSize} sampled`}
                  positive={null}
                />
                <MetricCard
                  label="Integrity Delta"
                  value={report.integrityDelta > 0 ? `+${report.integrityDelta}` : report.integrityDelta}
                  unit=" pts"
                  positive={report.integrityDelta >= 0}
                  sub="Avg. decision purity change"
                />
              </div>

              <div className="grid-2">
                <MetricCard
                  label="Zero-Result Rate"
                  value={report.zeroResultDelta > 0 ? `+${report.zeroResultDelta}` : report.zeroResultDelta}
                  unit="%"
                  positive={report.zeroResultDelta <= 0}
                  sub="Lower = more results shown"
                />
                <MetricCard
                  label="Commercial Alignment"
                  value={report.commercialAlignmentDelta > 0 ? `+${report.commercialAlignmentDelta}` : report.commercialAlignmentDelta}
                  unit="%"
                  positive={null}
                  sub="Affiliate bias shift"
                />
              </div>

              {/* Modified Gates Summary */}
              {report.modifiedGates?.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Modified Gates</div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {report.modifiedGates.map(g => (
                      <span key={g} style={{ fontFamily: 'monospace', fontSize: '0.8rem', padding: '2px 8px', background: 'rgba(124,58,237,0.15)', borderRadius: '4px', color: 'var(--accent-primary)' }}>{g}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Alerts */}
              {report.riskAlerts?.length > 0 ? (
                <div style={{ background: `${RISK_COLORS[report.riskLevel]}10`, padding: '20px', borderRadius: 'var(--radius-md)', border: `1px solid ${RISK_COLORS[report.riskLevel]}` }}>
                  <h4 style={{ color: RISK_COLORS[report.riskLevel], display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <AlertTriangle size={18} /> Risk Alerts
                  </h4>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: RISK_COLORS[report.riskLevel], lineHeight: 1.6 }}>
                    {report.riskAlerts.map((alert, i) => <li key={i} style={{ marginBottom: '6px' }}>{alert}</li>)}
                  </ul>
                </div>
              ) : (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
                  <h4 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} /> No Risk Detected
                  </h4>
                  <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'rgba(16,185,129,0.85)' }}>
                    This change maintains system integrity. Safe to deploy.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShadowRunner;
