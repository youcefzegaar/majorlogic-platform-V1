import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, RefreshCw, Info } from 'lucide-react';
import { adminService } from '../../api/apiClient';

// Color scale: 0 → transparent, 1-2 → cool, 3-5 → warm, >5 → hot
const cellColor = (count, maxCount) => {
  if (count === 0 || maxCount === 0) return 'rgba(255,255,255,0.03)';
  const ratio = count / maxCount;
  if (ratio < 0.2) return 'rgba(99,102,241,0.25)';
  if (ratio < 0.4) return 'rgba(99,102,241,0.5)';
  if (ratio < 0.6) return 'rgba(245,158,11,0.45)';
  if (ratio < 0.8) return 'rgba(239,68,68,0.45)';
  return 'rgba(239,68,68,0.75)';
};

const cellTextColor = (count, maxCount) => {
  if (count === 0) return 'var(--text-tertiary)';
  const ratio = count / maxCount;
  return ratio < 0.4 ? '#a5b4fc' : ratio < 0.6 ? '#fcd34d' : '#fca5a5';
};

const TradeoffHeatmap = () => {
  const [sinceDays, setSinceDays] = useState(30);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['analytics', sinceDays],
    queryFn: () => adminService.getAnalytics(sinceDays),
    staleTime: 5 * 60 * 1000,
  });

  const heatmap      = data?.heatmap       ?? [];
  const bucketLabels = data?.bucketLabels  ?? ['≥90', '80–89', '70–79', '60–69', '<60'];
  const isDemo       = data?.demo === true;
  const total        = data?.totalInterventions ?? 0;

  const maxCount = Math.max(
    ...heatmap.flatMap(row => row.buckets.map(b => b.count)),
    1
  );

  return (
    <div className="card" style={{ padding: 28, marginTop: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart2 size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Trade-off Heatmap</span>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>constraint × integrity score</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select
            value={sinceDays}
            onChange={e => setSinceDays(Number(e.target.value))}
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', borderRadius: 8, padding: '6px 10px', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button className="btn btn-outline" onClick={() => refetch()} disabled={isLoading} style={{ padding: '5px 10px', fontSize: 12 }}>
            {isLoading ? <RefreshCw className="spin" size={13} /> : <RefreshCw size={13} />}
          </button>
        </div>
      </div>

      {isDemo && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', marginBottom: 16, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
          <Info size={13} color="#f59e0b" />
          Database offline — connect a database to see live data.
        </div>
      )}

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>Loading heatmap…</div>
      ) : heatmap.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 13 }}>
          No sacrifice events yet. Data appears once the Recovery Engine relaxes constraints.
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: `180px repeat(${bucketLabels.length}, 1fr)`, gap: 4, marginBottom: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', padding: '4px 8px' }}>Constraint</div>
            {bucketLabels.map(label => (
              <div key={label} style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', padding: '4px 4px' }}>
                {label}<br /><span style={{ fontSize: 10, opacity: 0.7 }}>integrity</span>
              </div>
            ))}
          </div>

          {/* Rows */}
          {heatmap.map(row => (
            <div key={row.constraint} style={{ display: 'grid', gridTemplateColumns: `180px repeat(${bucketLabels.length}, 1fr)`, gap: 4, marginBottom: 4 }}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', padding: '10px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.label}>{row.label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', flexShrink: 0 }}>({row.total})</span>
              </div>
              {row.buckets.map(bucket => (
                <div
                  key={bucket.label}
                  title={`${row.label} | ${bucket.label}% integrity: ${bucket.count} events`}
                  style={{
                    background: cellColor(bucket.count, maxCount),
                    borderRadius: 6,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '10px 4px',
                    fontSize: 12, fontWeight: bucket.count > 0 ? 600 : 400,
                    color: cellTextColor(bucket.count, maxCount),
                    border: '1px solid rgba(255,255,255,0.04)',
                    transition: 'background 0.3s',
                  }}
                >
                  {bucket.count > 0 ? bucket.count : '·'}
                </div>
              ))}
            </div>
          ))}

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>Frequency:</span>
            {[
              { color: 'rgba(255,255,255,0.03)', label: 'None' },
              { color: 'rgba(99,102,241,0.25)',  label: 'Low' },
              { color: 'rgba(245,158,11,0.45)',  label: 'Medium' },
              { color: 'rgba(239,68,68,0.75)',   label: 'High' },
            ].map(({ color, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 14, height: 14, borderRadius: 3, background: color, border: '1px solid rgba(255,255,255,0.08)' }} />
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{label}</span>
              </div>
            ))}
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 'auto' }}>
              {total} total interventions · columns = integrity score after relaxation
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default TradeoffHeatmap;
