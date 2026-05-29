import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  TrendingDown, 
  AlertTriangle, 
  Scale,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { adminService } from '../../api/apiClient';

const CommercialIntegrity = () => {
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['integrity-report'],
    queryFn: adminService.getReport,
    staleTime: 5 * 60 * 1000,
  });

  const report = reportData?.report ?? null;
  const integrityScore = report?.moneyBlindness?.score ?? null;
  const provisional = report?.moneyBlindness?.provisional ?? true;
  const spearmanCorr = report?.moneyBlindness?.avgSpearmanPct != null
    ? report.moneyBlindness.avgSpearmanPct.toFixed(1)
    : null;
  const certCount = report?.moneyBlindness?.certificatesAnalyzed ?? 0;
  const driftScore = spearmanCorr != null ? spearmanCorr : null;

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Commercial <span className="text-gradient">Integrity</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitoring the "Algorithmic Safety Valve" to prevent commercial bias in recommendations.</p>
        </div>
        <button className="btn btn-outline" onClick={() => refetch()}>
          {isLoading ? <RefreshCw className="spin" size={18} /> : <RefreshCw size={18} />} Refresh Audit
        </button>
      </div>

      <div className="grid-2" style={{ marginBottom: '32px' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="var(--success)" /> Neutrality Index
            </h3>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {isLoading ? '…' : integrityScore != null ? `${integrityScore}%` : 'N/A'}
            </span>
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            {integrityScore != null
              ? `Based on ${certCount} integrity certificate${certCount !== 1 ? 's' : ''} (last 7 days). Rank–affiliate Spearman correlation: ${spearmanCorr ?? '—'}%.${provisional ? ' Provisional — low sample.' : ''}`
              : 'Run decisions to generate integrity certificates.'}
          </p>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${integrityScore ?? 0}%`, height: '100%', background: 'var(--success)' }}></div>
          </div>
        </div>

        <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingDown size={20} color="var(--warning)" /> Commercial Drift
            </h3>
            <span style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {isLoading ? '…' : driftScore != null ? `${driftScore}%` : 'N/A'}
            </span>
          </div>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            Current correlation between product ranking and affiliate commission levels. Lower is better.
          </p>
          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${driftScore ?? 0}%`, height: '100%', background: 'var(--warning)' }}></div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Scale size={20} color="var(--accent-primary)" /> Algorithmic Guardrails
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <GuardrailItem 
            title="Affiliate Weight Limit" 
            desc="Maximum influence allowed for commercial parameters in the final score."
            value="0.0% (Hard Disabled)"
            status="locked"
          />
          <GuardrailItem 
            title="Randomized Independent Audit" 
            desc="Percentage of runs where the 'Independent Pick' role is forced for integrity testing."
            value="15% of sessions"
            status="active"
          />
          <GuardrailItem 
            title="Price Fairness Gating" 
            desc="Automatically excludes sellers with prices > 15% above market average regardless of commission."
            value="Enabled"
            status="active"
          />
        </div>
      </div>
    </div>
  );
};

const GuardrailItem = ({ title, desc, value, status }) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <h4 style={{ margin: 0, fontSize: '1rem' }}>{title}</h4>
      <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{desc}</p>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: status === 'active' ? 'var(--success)' : 'var(--text-tertiary)', marginTop: '4px' }}>
        ● {status}
      </div>
    </div>
  </div>
);

export default CommercialIntegrity;
