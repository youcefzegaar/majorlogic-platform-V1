import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Zap, 
  ArrowLeft, 
  AlertTriangle, 
  CheckCircle, 
  Users, 
  Activity,
  RefreshCw
} from 'lucide-react';
import { adminService } from '../api/apiClient';

const ShadowRunner = ({ domain, onBack }) => {
  const [modifications, setModifications] = useState({});
  const [sampleSize, setSampleSize] = useState(100);

  const mutation = useMutation({
    mutationFn: (data) => adminService.simulate(data),
  });

  const handleWeightChange = (gateId, value) => {
    setModifications({ ...modifications, [gateId]: parseFloat(value) });
  };

  const runSimulation = () => {
    mutation.mutate({
      domainId: domain.slug,
      modifications,
      sampleSize
    });
  };

  const report = mutation.data?.report;

  return (
    <div className="page-content">
      <div style={{ marginBottom: '32px' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 600 }}>
          <ArrowLeft size={18} /> Back to Editor
        </button>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Shadow <span className="text-gradient">Runner</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Predict impact by simulating logic changes against historical data.</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '24px' }}>Proposed Modifications</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {Object.entries(domain.config?.gates || {}).map(([id, gate]) => (
              <div key={id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>{gate.humanMeaning || id}</label>
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                    {modifications[id] !== undefined ? modifications[id] : gate.weight}
                  </span>
                </div>
                <input 
                  type="range" 
                  min="0" max="1" step="0.05"
                  value={modifications[id] !== undefined ? modifications[id] : gate.weight}
                  onChange={(e) => handleWeightChange(id, e.target.value)}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                />
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border-subtle)' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Sample Size (Historical Runs)</label>
            <select 
              className="input-field" 
              value={sampleSize} 
              onChange={(e) => setSampleSize(parseInt(e.target.value))}
              style={{ marginBottom: '20px' }}
            >
              <option value={100}>Last 100 runs</option>
              <option value={500}>Last 500 runs</option>
              <option value={1000}>Last 1,000 runs</option>
            </select>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }} 
              onClick={runSimulation}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <RefreshCw className="spin" size={18} /> : <Zap size={18} />} Run Shadow Simulation
            </button>
          </div>
        </div>

        <div className="card" style={{ background: mutation.isSuccess ? 'rgba(16, 185, 129, 0.02)' : '' }}>
          <h3 style={{ marginBottom: '24px' }}>Impact Analysis Report</h3>
          
          {!mutation.isSuccess && !mutation.isPending && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-tertiary)' }}>
              <Zap size={48} style={{ marginBottom: '16px', opacity: 0.2 }} />
              <p>Configure modifications and run simulation to see the impact report.</p>
            </div>
          )}

          {mutation.isPending && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <RefreshCw className="spin" size={48} style={{ marginBottom: '16px', color: 'var(--accent-primary)' }} />
              <p>Re-running {sampleSize} historical decisions...</p>
            </div>
          )}

          {mutation.isSuccess && report && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className="grid-2">
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>Users Affected</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={20} color="var(--accent-primary)" /> {report.impact_metrics.users_affected}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Recommendation changed</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '8px' }}>Integrity Delta</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: report.impact_metrics.avg_integrity_delta >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    {report.impact_metrics.avg_integrity_delta > 0 ? '+' : ''}{report.impact_metrics.avg_integrity_delta.toFixed(2)}%
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Avg. decision purity</div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontWeight: 600 }}>Zero-Result Change</span>
                  <span style={{ color: report.impact_metrics.zero_result_delta <= 0 ? 'var(--success)' : 'var(--warning)', fontWeight: 800 }}>
                    {report.impact_metrics.zero_result_delta > 0 ? '+' : ''}{report.impact_metrics.zero_result_delta.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    width: `${Math.abs(report.impact_metrics.zero_result_delta) * 5}%`, 
                    height: '100%', 
                    background: report.impact_metrics.zero_result_delta <= 0 ? 'var(--success)' : 'var(--warning)' 
                  }}></div>
                </div>
              </div>

              {report.risk_alerts.length > 0 && (
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--warning)' }}>
                  <h4 style={{ color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <AlertTriangle size={18} /> Risk Assessment
                  </h4>
                  <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.9rem', color: 'rgba(245, 158, 11, 0.9)' }}>
                    {report.risk_alerts.map((alert, i) => <li key={i}>{alert}</li>)}
                  </ul>
                </div>
              )}

              {report.risk_alerts.length === 0 && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
                  <h4 style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} /> Optimization Validated
                  </h4>
                  <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'rgba(16, 185, 129, 0.9)' }}>
                    No significant risks detected. This change improves or maintains current system integrity.
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
