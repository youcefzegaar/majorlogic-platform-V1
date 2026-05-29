import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  BrainCircuit,
  ShieldCheck,
  GitMerge,
  ArrowUpRight,
  RefreshCw,
  Plus,
  Users,
  Bookmark,
  Bell,
} from 'lucide-react';
import { adminService } from '../../api/apiClient';
import { useAppStore } from '../../stores/appStore';

const DashboardHome = () => {
  const { navigate } = useAppStore();
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: adminService.getOverview,
  });

  const counts = dashboardData?.data?.counts || {};
  const avgIntegrity = dashboardData?.data?.avgIntegrity ?? null;
  const domains = dashboardData?.data?.domains || [];
  const interventions = dashboardData?.data?.latestInterventions || [];

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Cognitive <span className="text-gradient">Overview</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor decision engine performance and integrity.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => refetch()}>
            {isLoading ? <RefreshCw className="spin" size={18} /> : <RefreshCw size={18} />} Sync
          </button>
          <button className="btn btn-primary">
            <Plus size={18} /> New Domain
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '24px' }}>
        <MetricCard
          title="Total Decisions"
          value={counts.decision_runs ?? 0}
          icon={<Activity size={20} color="var(--accent-primary)" />}
          trend="Tracking live"
        />
        <MetricCard
          title="Avg. Integrity Score"
          value={avgIntegrity != null ? `${Math.round(avgIntegrity * 100)}%` : '—'}
          icon={<ShieldCheck size={20} color="var(--success)" />}
          subtitle="Constraint adherence"
        />
        <MetricCard
          title="Source Observations"
          value={counts.source_observations ?? 0}
          icon={<BrainCircuit size={20} color="var(--warning)" />}
          subtitle="Raw ingested records"
        />
        <MetricCard
          title="Published Entities"
          value={counts.published_entities ?? 0}
          icon={<GitMerge size={20} color="var(--accent-secondary)" />}
          subtitle="Active catalog size"
        />
      </div>

      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <MetricCard
          title="Registered Users"
          value={counts.registered_users ?? 0}
          icon={<Users size={20} color="var(--accent-primary)" />}
          subtitle="M3 account holders"
        />
        <MetricCard
          title="Saved Decisions"
          value={counts.saved_decisions ?? 0}
          icon={<Bookmark size={20} color="var(--success)" />}
          subtitle="User-saved recommendations"
        />
        <MetricCard
          title="Active Price Alerts"
          value={counts.active_price_alerts ?? 0}
          icon={<Bell size={20} color="var(--warning)" />}
          subtitle="Watching for price drops"
        />
        <MetricCard
          title="User Feedback"
          value={counts.user_feedback ?? 0}
          icon={<Activity size={20} color="var(--accent-secondary)" />}
          subtitle="Satisfaction signals"
        />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '24px' }}>Active Cognitive Domains</h3>
          <table className="table-container">
            <thead>
              <tr>
                <th>Domain Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {domains.length > 0 ? domains.map((d, i) => (
                <tr key={i}>
                  <td><strong>{d.title}</strong></td>
                  <td>
                    <span className="badge badge-success">Active</span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="2" style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>No active domains found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '24px' }}>Recent Recovery Interventions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {interventions.length > 0 ? interventions.map((inv, i) => (
              <div 
                key={i} 
                onClick={() => navigate('decision_trace', { domain: inv.decision_run_id })}
                style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                className="hover-glow"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Decision ID: {inv.decision_run_id.slice(0,8)}...</span>
                  <span className="badge badge-warning">Recovery Active</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
                  Engine relaxed constraints to find valid products.
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                  Integrity: {inv.integrity_score}% | {new Date(inv.created_at).toLocaleTimeString()}
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '20px' }}>No recent interventions.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricCard = ({ title, value, icon, trend, subtitle }) => (
  <div className="card metric-card">
    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
      <span>{title}</span>
      {icon}
    </div>
    <div className="metric-value">{value.toLocaleString()}</div>
    {trend && (
      <div style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
        <ArrowUpRight size={14} /> {trend}
      </div>
    )}
    {subtitle && (
      <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
        {subtitle}
      </div>
    )}
  </div>
);

export default DashboardHome;
