import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Swords, RefreshCw, Info, TrendingDown, AlertTriangle, ShieldAlert } from 'lucide-react';
import { adminService } from '../../api/apiClient';
import TradeoffHeatmap from './TradeoffHeatmap';

// ── Bar ───────────────────────────────────────────────────────────────────────
const SacrificeBar = ({ label, count, maxCount, avgLoss }) => {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  const severity = avgLoss >= 15 ? 'high' : avgLoss >= 8 ? 'medium' : 'low';
  const colors = {
    high:   { bar: '#ef4444', badge: 'rgba(239,68,68,0.15)',   text: '#fca5a5' },
    medium: { bar: '#f59e0b', badge: 'rgba(245,158,11,0.15)',  text: '#fcd34d' },
    low:    { bar: '#6366f1', badge: 'rgba(99,102,241,0.15)',  text: '#a5b4fc' },
  };
  const c = colors[severity];

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{count}× relaxed</span>
          {avgLoss > 0 && (
            <span style={{
              fontSize: 11, padding: '2px 8px', borderRadius: 20,
              background: c.badge, color: c.text, fontWeight: 600,
            }}>
              −{avgLoss}% integrity
            </span>
          )}
        </div>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: c.bar, borderRadius: 4,
          transition: 'width 0.6s ease',
        }} />
      </div>
    </div>
  );
};

// ── Legend ────────────────────────────────────────────────────────────────────
const LegendItem = ({ color, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
    <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
    {label}
  </div>
);

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = () => (
  <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
    <ShieldAlert size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
    <p style={{ fontSize: 14 }}>No sacrifice events recorded yet.</p>
    <p style={{ fontSize: 12, marginTop: 4 }}>
      Data appears here once the Recovery Engine relaxes a constraint during decision execution.
    </p>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
const SacrificeVector = () => {
  const [sinceDays, setSinceDays] = useState(30);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['sacrifice-report', sinceDays],
    queryFn: () => adminService.getSacrificeReport(sinceDays),
    staleTime: 5 * 60 * 1000,
  });

  const report       = data?.report ?? {};
  const sacrifices   = report.hardSacrifices ?? [];
  const maxCount     = Math.max(...sacrifices.map(s => s.count), 1);
  const isDemo       = data?.demo === true;
  const sampleSize   = report.sampleSize ?? 0;

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>
            Sacrifice <span className="text-gradient">Vector</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: 520 }}>
            Tracks which constraints the Recovery Engine has relaxed across decisions —
            revealing the platform's trade-off patterns and integrity cost.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <select
            value={sinceDays}
            onChange={e => setSinceDays(Number(e.target.value))}
            style={{
              background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
              borderRadius: 8, padding: '8px 12px', color: 'var(--text-primary)',
              fontSize: 13, cursor: 'pointer',
            }}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          <button className="btn btn-outline" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <RefreshCw className="spin" size={16} /> : <RefreshCw size={16} />} Refresh
          </button>
        </div>
      </div>

      {/* ── Demo banner ── */}
      {isDemo && (
        <div style={{
          display: 'flex', gap: 10, alignItems: 'center',
          padding: '12px 16px', marginBottom: 24,
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: 10, fontSize: 13, color: 'var(--text-secondary)',
        }}>
          <Info size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
          Database is offline. Connect a database to see live sacrifice data.
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Sacrifice Events</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{sampleSize}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>last {sinceDays} days</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Unique Constraints Relaxed</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>{sacrifices.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>distinct gates</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Top Sacrifice</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, wordBreak: 'break-all' }}>
            {report.topConstraint
              ? report.topConstraint.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
              : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>most relaxed gate</div>
        </div>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>Avg Integrity Loss</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700 }}>
            {sacrifices.length > 0
              ? `${Math.round(sacrifices.reduce((s, x) => s + x.avgIntegrityLoss, 0) / sacrifices.length)}%`
              : '—'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>per sacrifice event</div>
        </div>
      </div>

      {/* ── Bar chart ── */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Swords size={18} color="var(--accent-primary)" />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Constraint Relaxation Frequency</span>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <LegendItem color="#ef4444" label="High cost (≥15% loss)" />
            <LegendItem color="#f59e0b" label="Medium cost (8-14%)" />
            <LegendItem color="#6366f1" label="Low cost (&lt;8%)" />
          </div>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: 14 }}>
            Loading sacrifice data…
          </div>
        ) : sacrifices.length === 0 ? (
          <EmptyState />
        ) : (
          sacrifices.map(s => (
            <SacrificeBar
              key={s.constraint}
              label={s.label}
              count={s.count}
              maxCount={maxCount}
              avgLoss={s.avgIntegrityLoss}
            />
          ))
        )}
      </div>

      {/* ── Concept note ── */}
      <div style={{
        marginTop: 20, padding: '16px 20px',
        background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 10, display: 'flex', gap: 12, alignItems: 'flex-start',
      }}>
        <AlertTriangle size={16} color="#6366f1" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-primary)' }}>What is a Sacrifice?</strong>
          {' '}A sacrifice occurs when the Recovery Engine relaxes a constraint so users still
          get a recommendation even when nothing perfectly fits their criteria. Each relaxation
          trades integrity score for user value. High-frequency sacrifices reveal where your
          catalog or budget range needs expansion.
        </div>
      </div>

      {/* ── Trade-off Heatmap ── */}
      <TradeoffHeatmap />
    </div>
  );
};

export default SacrificeVector;
