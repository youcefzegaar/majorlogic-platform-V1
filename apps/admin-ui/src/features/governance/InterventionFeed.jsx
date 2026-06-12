import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldAlert,
  Activity,
  ChevronRight,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { adminService } from '../../api/apiClient';
import { useAppStore } from '../../stores/appStore';
import CacheStats from './CacheStats';

const InterventionFeed = () => {
  const { navigate } = useAppStore();
  const { data: interventionsData, isLoading, refetch } = useQuery({
    queryKey: ['interventions-data'],
    queryFn: adminService.getInterventions,
  });
  const { data: feedbackData } = useQuery({
    queryKey: ['feedback-data'],
    queryFn: () => adminService.getFeedback({ limit: 20 }),
  });

  const interventions = interventionsData?.interventions || [];
  const feedbackItems = feedbackData?.feedback || [];

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Recovery <span className="text-gradient">Interventions</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Audit the "Safety Valve" activities where constraints were automatically relaxed.</p>
        </div>
        <button className="btn btn-outline" onClick={() => refetch()}>
          {isLoading ? <RefreshCw className="spin" size={18} /> : <RefreshCw size={18} />} Refresh
        </button>
      </div>

      <CacheStats />

      <div style={{ marginTop: 28 }} className="card">
        <table className="table-container">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Decision ID</th>
              <th>Relaxed Constraint</th>
              <th>Integrity Score</th>
              <th>Impact</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {interventions.length > 0 ? interventions.map((inv, i) => (
              <tr key={i}>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                  {new Date(inv.created_at).toLocaleString()}
                </td>
                <td>
                  <code style={{ fontSize: '0.8rem' }}>{inv.decision_run_id.slice(0, 8)}</code>
                </td>
                <td>
                  <span className="badge badge-warning">{inv.relaxed_constraint}</span>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '40px', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        width: `${inv.integrity_score}%`, 
                        height: '100%', 
                        background: inv.integrity_score >= 80 ? 'var(--success)' : 'var(--warning)' 
                      }}></div>
                    </div>
                    <span>{inv.integrity_score}%</span>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '0.85rem' }}>
                    Recovered <strong>{inv.recovered_count}</strong> products
                  </span>
                </td>
                <td>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    onClick={() => navigate('decision_trace', { domain: inv.decision_run_id })}
                  >
                    Trace <ChevronRight size={14} />
                  </button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                  {isLoading ? 'Loading interventions...' : 'No intervention events recorded.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <MessageSquare size={20} />
          <h2 style={{ fontSize: '1.3rem', margin: 0 }}>User Feedback</h2>
        </div>
        <div className="card">
          <table className="table-container">
            <thead>
              <tr>
                <th>Received</th>
                <th>Decision Run</th>
                <th>Score</th>
                <th>Tags</th>
                <th>Comment</th>
              </tr>
            </thead>
            <tbody>
              {feedbackItems.length > 0 ? feedbackItems.map((fb, i) => (
                <tr key={i}>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    {new Date(fb.received_at).toLocaleString()}
                  </td>
                  <td>
                    <code style={{ fontSize: '0.8rem' }}>{fb.decision_run_id?.slice(0, 8) ?? '—'}</code>
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: fb.score >= 4 ? 'var(--success)' : fb.score <= 2 ? 'var(--danger)' : 'var(--warning)' }}>
                      {fb.score}/5
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {(fb.tags || []).join(', ') || '—'}
                  </td>
                  <td style={{ fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fb.comment || '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                    No feedback received yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InterventionFeed;
