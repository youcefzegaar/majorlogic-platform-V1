import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  Mail, 
  Download,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Clock
} from 'lucide-react';
import { adminService } from '../../api/apiClient';

const GrowthLeads = () => {
  const { data: statsData, isLoading, refetch } = useQuery({
    queryKey: ['growth-stats'],
    queryFn: adminService.getGrowthStats,
  });

  const stats = statsData?.stats || [];

  const totalLeads = stats.reduce((acc, curr) => acc + parseInt(curr.total), 0);

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Growth <span className="text-gradient">Intelligence</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitoring the lead capture performance across the 3 ethical nets.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => refetch()}>
            {isLoading ? <RefreshCw className="spin" size={18} /> : <RefreshCw size={18} />} Refresh
          </button>
          <a href="/admin/export-trigger/laptop-student-us" className="btn btn-primary" target="_blank">
            <Download size={18} /> Export All CSV
          </a>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: '32px' }}>
        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <span>Total Captured Leads</span>
            <Mail size={20} color="var(--accent-primary)" />
          </div>
          <div className="metric-value">{totalLeads.toLocaleString()}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>Across all segments</div>
        </div>
        
        {stats.map((s, i) => (
          <div key={i} className="card metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              <span>{s.lead_type.replace(/_/g, ' ').toUpperCase()}</span>
              <CheckCircle size={20} color="var(--success)" />
            </div>
            <div className="metric-value">{s.total}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              {Math.round((s.opted_in_count / s.total) * 100)}% opted-in for marketing
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Clock size={20} color="var(--accent-secondary)" /> Lead Segmentation Performance
        </h3>
        <table className="table-container">
          <thead>
            <tr>
              <th>Lead Source / Type</th>
              <th style={{ textAlign: 'center' }}>Total</th>
              <th style={{ textAlign: 'center' }}>Marketing Opt-in</th>
              <th>Latest Activity</th>
            </tr>
          </thead>
          <tbody>
            {stats.length > 0 ? stats.map((s, i) => (
              <tr key={i}>
                <td>
                  <strong style={{ color: 'var(--accent-primary)' }}>{s.lead_type}</strong>
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{s.total}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '99px', color: 'var(--success)', fontSize: '0.85rem' }}>
                    {s.opted_in_count} ({Math.round((s.opted_in_count / s.total) * 100)}%)
                  </div>
                </td>
                <td style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  {new Date(s.latest_at).toLocaleString()}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                  {isLoading ? 'Calculating lead stats...' : 'No leads captured yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GrowthLeads;
