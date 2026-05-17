import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  FlaskConical,
  RefreshCw,
  Zap,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Sliders
} from 'lucide-react';
import { adminService } from '../../api/apiClient';
import { useAppStore } from '../../stores/appStore';

const LogicLab = () => {
  const { navigate } = useAppStore();
  const [activeDomain] = useState('laptop-student-us');
  const [config, setConfig] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const { data: configData, isLoading, refetch } = useQuery({
    queryKey: ['logic-config', activeDomain],
    queryFn: () => adminService.getLogicConfig(activeDomain),
  });

  useEffect(() => {
    if (configData?.config) {
      setConfig(JSON.parse(JSON.stringify(configData.config)));
    }
  }, [configData]);

  const saveMutation = useMutation({
    mutationFn: (data) => adminService.saveLogicConfig(activeDomain, data),
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: `Logic v${data.version} deployed successfully.` });
      setTimeout(() => setFeedback(null), 4000);
      refetch();
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Failed to save changes.' });
      setTimeout(() => setFeedback(null), 5000);
    }
  });

  if (isLoading || !config) return <div style={{ textAlign: 'center', padding: '100px' }}><RefreshCw className="spin" size={40} /></div>;

  const handleGateChange = (gateId, field, value) => {
    setConfig(prev => ({
      ...prev,
      gates: { ...prev.gates, [gateId]: { ...prev.gates[gateId], [field]: value } }
    }));
  };

  const handleWeightChange = (rulesetId, metric, value) => {
    setConfig(prev => ({
      ...prev,
      rulesets: {
        ...prev.rulesets,
        [rulesetId]: {
          ...prev.rulesets[rulesetId],
          weights: { ...prev.rulesets[rulesetId].weights, [metric]: parseFloat(value) }
        }
      }
    }));
  };

  const handleSimulate = () => {
    const domain = { slug: activeDomain, id: activeDomain, title: 'Laptop Student US', config };
    navigate('shadow_runner', { domain });
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Logic <span className="text-gradient">Lab</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>No-code control plane for the Decision Engine kernel.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '8px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Version:</span>
            <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>v{config.version}</span>
          </div>
          <button className="btn btn-outline" onClick={handleSimulate}>
            <Zap size={18} color="var(--warning)" /> What-If Analysis
          </button>
          <button className="btn btn-primary" onClick={() => saveMutation.mutate(config)} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <RefreshCw className="spin" size={18} /> : <ShieldCheck size={18} />} Deploy Changes
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          marginBottom: '20px', padding: '14px 20px', borderRadius: 'var(--radius-md)',
          background: feedback.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${feedback.type === 'success' ? 'var(--success)' : 'var(--error)'}`,
          display: 'flex', alignItems: 'center', gap: '10px'
        }}>
          {feedback.type === 'success'
            ? <CheckCircle size={18} color="var(--success)" />
            : <AlertTriangle size={18} color="var(--error)" />}
          <span style={{ color: feedback.type === 'success' ? 'var(--success)' : 'var(--error)' }}>
            {feedback.message}
          </span>
        </div>
      )}

      <div className="grid-2">
        {/* Pass/Fail Gates */}
        <div className="card">
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Zap size={20} color="var(--warning)" /> Hard Constraint Gates
          </h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Entities failing these gates are excluded unless the Recovery Engine intervenes.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {Object.entries(config.gates).map(([id, gate]) => (
              <div key={id} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'monospace' }}>{id}</span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    Priority Weight: <input type="number" step="0.1" value={gate.weight} onChange={(e) => handleGateChange(id, 'weight', parseFloat(e.target.value))} style={{ width: '50px', background: 'transparent', border: '1px solid #333', color: '#fff', textAlign: 'center', borderRadius: '4px' }} />
                  </div>
                </div>
                <input 
                  className="input-field" 
                  value={gate.humanMeaning} 
                  onChange={(e) => handleGateChange(id, 'humanMeaning', e.target.value)}
                  placeholder="Human meaning (for audit logs)"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scoring Weights */}
        <div className="card">
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FlaskConical size={20} color="var(--accent-primary)" /> Soft Ranking Weights
          </h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Adjust how metrics influence the final suitability score.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {Object.entries(config.rulesets).map(([rsId, rs]) => (
              <div key={rsId}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '16px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  Ruleset: {rsId}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Object.entries(rs.weights || {}).map(([metric, weight]) => (
                    <div key={metric} style={{ background: 'rgba(255,255,255,0.01)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <label style={{ fontSize: '0.85rem' }}>{metric}</label>
                        <span style={{ fontWeight: 700, color: 'var(--accent-secondary)' }}>{Math.round(weight * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" max="1" step="0.01" 
                        value={weight} 
                        onChange={(e) => handleWeightChange(rsId, metric, e.target.value)}
                        style={{ width: '100%', accentColor: 'var(--accent-secondary)' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogicLab;
