import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Database, RefreshCw, Zap } from 'lucide-react';
import { adminService } from '../../api/apiClient';

const StatRow = ({ label, value, sub }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
    <div style={{ textAlign: 'right' }}>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginLeft: 6 }}>{sub}</span>}
    </div>
  </div>
);

const HitRateBar = ({ hitRate, label }) => {
  const pct = parseFloat(hitRate) || 0;
  const color = pct >= 95 ? '#10B981' : pct >= 70 ? '#F59E0B' : '#EF4444';
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{hitRate}</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
      </div>
      {pct < 95 && (
        <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-tertiary)' }}>
          Target: ≥95% — {pct < 70 ? 'cache warming up or low traffic' : 'approaching target'}
        </p>
      )}
    </div>
  );
};

const CacheStats = () => {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['cache-stats'],
    queryFn: () => adminService.getCacheStats(),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });

  const ir        = data?.ir        ?? {};
  const narrative = data?.narrative  ?? {};

  return (
    <div className="card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Zap size={18} color="var(--accent-primary)" />
          <span style={{ fontWeight: 600, fontSize: 15 }}>Cache Performance</span>
        </div>
        <button className="btn btn-outline" onClick={() => refetch()} disabled={isLoading} style={{ padding: '4px 10px', fontSize: 12 }}>
          {isLoading ? <RefreshCw className="spin" size={13} /> : <RefreshCw size={13} />}
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
      ) : (
        <>
          <HitRateBar hitRate={ir.hitRate        ?? '—'} label="IR Cache Hit Rate" />
          <HitRateBar hitRate={narrative.hitRate ?? '—'} label="Narrative Cache Hit Rate" />

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Database size={13} color="var(--accent-primary)" />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>IR Cache</span>
                </div>
                <StatRow label="Entries" value={`${ir.size ?? 0} / ${ir.maxSize ?? 50}`} />
                <StatRow label="Hits"    value={ir.hits   ?? 0} />
                <StatRow label="Misses"  value={ir.misses ?? 0} />
              </div>
              <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Database size={13} color="#10B981" />
                  <span style={{ fontSize: 11, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Narrative Cache</span>
                </div>
                <StatRow label="Entries" value={`${narrative.size ?? 0} / 500`} />
                <StatRow label="Hits"    value={narrative.hits   ?? 0} />
                <StatRow label="Misses"  value={narrative.misses ?? 0} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CacheStats;
