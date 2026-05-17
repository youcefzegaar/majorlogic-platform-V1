import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ShieldCheck,
  RefreshCw,
  Layout,
  Zap,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Sliders,
  Lock
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { adminService } from '../../api/apiClient';

const DomainEditor = ({ domain, onBack }) => {
  const { navigate } = useAppStore();
  const [feedback, setFeedback] = useState(null);

  const saveMutation = useMutation({
    mutationFn: (config) => adminService.saveLogicConfig(domain.slug || domain.id, config),
    onSuccess: (data) => {
      setFeedback({ type: 'success', message: `Logic v${data.version} deployed successfully.` });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: err?.response?.data?.message || 'Save failed.' });
      setTimeout(() => setFeedback(null), 5000);
    }
  });

  if (!domain) return <div style={{ padding: '40px', color: 'var(--text-secondary)' }}>No domain selected.</div>;

  const config = domain.config || {};
  const gates = Object.entries(config.gates || {});
  const rulesets = Object.entries(config.rulesets || {});

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 600 }}>
            <ArrowLeft size={18} /> Back to Domains
          </button>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
            Domain: <span className="text-gradient">{domain.title}</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Read-only view of the active decision config — v{config.version || '?'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={() => navigate('shadow_runner', { domain })}>
            <Zap size={18} color="var(--warning)" /> What-If Analysis
          </button>
          <button className="btn btn-outline" onClick={() => navigate('decision_topology', { domain })}>
            <Layout size={18} /> Visual Topology
          </button>
          <button
            className="btn btn-outline"
            onClick={() => navigate('logic_lab')}
          >
            <Sliders size={18} /> Edit in Logic Lab
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
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
        {/* Gates Panel */}
        <div className="card">
          <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={20} color="var(--warning)" /> Hard Constraint Gates
          </h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Entities failing these gates are excluded from recommendations.
          </p>

          {gates.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No gates configured.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {gates.map(([id, gate]) => (
              <div key={id} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.9rem' }}>{id}</span>
                  <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                    weight: {gate.weight}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{gate.humanMeaning || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Rulesets Panel */}
        <div className="card">
          <h3 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sliders size={20} color="var(--accent-secondary)" /> Scoring Rulesets
          </h3>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '24px' }}>
            Weights used to rank entities that pass the gates.
          </p>

          {rulesets.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>No rulesets configured.</div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {rulesets.map(([rsId, rs]) => (
              <div key={rsId}>
                <h4 style={{ fontSize: '0.85rem', marginBottom: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'monospace' }}>
                  {rsId}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {Object.entries(rs.weights || {}).map(([metric, weight]) => (
                    <div key={metric} style={{ background: 'rgba(255,255,255,0.02)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.85rem' }}>{metric}</span>
                        <span style={{ fontWeight: 700, color: 'var(--accent-secondary)', fontFamily: 'monospace' }}>{Math.round(weight * 100)}%</span>
                      </div>
                      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                        <div style={{ width: `${weight * 100}%`, height: '100%', background: 'var(--accent-secondary)', borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA to Logic Lab */}
      <div style={{ marginTop: '24px', padding: '24px', background: 'rgba(124,58,237,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>Want to modify the logic?</p>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', margin: 0 }}>
            Use Logic Lab to adjust gate weights and ruleset scoring with live preview.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('logic_lab')}>
          <Sliders size={18} /> Open Logic Lab
        </button>
      </div>
    </div>
  );
};

export default DomainEditor;
