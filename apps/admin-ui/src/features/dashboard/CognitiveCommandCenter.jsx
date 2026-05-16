import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldAlert, 
  Activity, 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle,
  ChevronRight,
  Zap
} from 'lucide-react';
import { adminService } from '../../api/apiClient';
import { useAppStore } from '../../stores/appStore';

const CognitiveCommandCenter = () => {
  const { navigate } = useAppStore();
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: adminService.getOverview,
    refetchInterval: 10000 // Refresh every 10s for "Live Pulse"
  });

  const metrics = dashboardData?.data?.overview || {};
  const interventions = dashboardData?.data?.latestInterventions || [];

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
            Cognitive <span className="text-gradient">Command Center</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
            Architecting transparency through real-time decision forensics.
          </p>
        </div>
        <div style={{ background: 'rgba(124, 58, 237, 0.1)', padding: '12px 24px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="status-dot active"></div>
          <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>System Integrity: 98.4%</span>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '40px' }}>
        <StatCard title="Total Cognitive Runs" value={metrics.total_decisions || 0} icon={<Activity color="var(--accent-primary)" />} change="+12% from last hour" />
        <StatCard title="Avg. Decision Confidence" value={`${metrics.avg_confidence || 0}%`} icon={<BrainCircuit color="var(--warning)" />} change="Stable" />
        <StatCard title="Integrity Drift" value="0.2%" icon={<ShieldAlert color="var(--success)" />} change="Within Safe Limits" />
        <StatCard title="Commercial Alignment" value="Low" icon={<TrendingUp color="var(--accent-secondary)" />} change="Ethical Bias OK" />
      </div>

      <div className="grid-2">
        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={20} color="var(--warning)" /> Active Recovery Feed
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Real-time Interventions</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {interventions.map((inv, i) => (
              <div 
                key={i} 
                className="hover-glow"
                onClick={() => navigate('decision_trace', { domain: inv.decision_run_id })}
                style={{ 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Decision Run: {inv.decision_run_id.slice(0, 8)}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--warning)', marginTop: '4px' }}>
                    Relaxed: <code style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '2px 4px' }}>{inv.relaxed_constraint}</code>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-tertiary)" />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Zap size={20} color="var(--accent-primary)" /> Shadow Running Preview
          </h3>
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-subtle)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Simulate logic changes against the last 5,000 real decision runs.
            </p>
            <button className="btn btn-outline" onClick={() => navigate('domains')}>
              Launch Shadow Simulation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, change }) => (
  <div className="card metric-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{title}</span>
      {icon}
    </div>
    <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '8px' }}>{value}</div>
    <div style={{ fontSize: '0.75rem', color: change.includes('+') ? 'var(--success)' : 'var(--text-tertiary)' }}>
      {change}
    </div>
  </div>
);

export default CognitiveCommandCenter;
