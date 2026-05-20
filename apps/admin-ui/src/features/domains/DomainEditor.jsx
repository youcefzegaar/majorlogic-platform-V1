import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Layout,
  Zap,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Sliders,
  Lock,
  ShoppingCart,
  Save,
  RefreshCw,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import { adminService } from '../../api/apiClient';

// ── Ownership Config Panel ────────────────────────────────────────────────────
function OwnershipConfigPanel({ domainSlug }) {
  const [localCfg, setLocalCfg] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['ownership-config', domainSlug],
    queryFn: () => adminService.getOwnershipConfig(domainSlug),
    onSuccess: (d) => { if (!localCfg) setLocalCfg(d.config); },
  });

  const presets = data?.presets ?? {};
  const cfg = localCfg ?? data?.config ?? {};

  const saveMutation = useMutation({
    mutationFn: (c) => adminService.saveOwnershipConfig(domainSlug, c),
    onSuccess: () => {
      setSaveFeedback({ type: 'success', message: 'Ownership config saved.' });
      setTimeout(() => setSaveFeedback(null), 3000);
    },
    onError: () => {
      setSaveFeedback({ type: 'error', message: 'Save failed.' });
      setTimeout(() => setSaveFeedback(null), 4000);
    },
  });

  const applyPreset = (key) => {
    const preset = presets[key];
    if (preset) setLocalCfg({ ...preset, presetKey: key });
  };

  const set = (field, value) => setLocalCfg(prev => ({ ...prev, [field]: value }));
  const setRange = (field, idx, raw) => {
    const val = parseFloat(raw);
    if (isNaN(val)) return;
    setLocalCfg(prev => {
      const range = [...(prev[field] ?? [0, 0])];
      range[idx] = val;
      return { ...prev, [field]: range };
    });
  };

  if (isLoading) return <div style={{ padding: 20, color: 'var(--text-secondary)' }}>Loading config…</div>;

  return (
    <div className="card" style={{ marginTop: 24 }}>
      <h3 style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
        <ShoppingCart size={20} color="var(--accent-secondary)" /> Ownership Acquisition Config
        {data?.isDefault && (
          <span style={{ fontSize: 11, background: 'rgba(245,158,11,0.15)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 4 }}>
            Using default preset
          </span>
        )}
      </h3>
      <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: 20 }}>
        Calibrates the financial model used in the Ownership Phase — discount ranges, APR, and market sources.
      </p>

      {/* Preset selector */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Apply Preset</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(presets).map(([key, p]) => (
            <button
              key={key}
              className="btn btn-outline"
              style={{ padding: '5px 12px', fontSize: 12, opacity: cfg.presetKey === key ? 1 : 0.6 }}
              onClick={() => applyPreset(key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Renewed Discount Range
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" step="0.01" min="0" max="1"
              value={cfg.renewedDiscountRange?.[0] ?? ''}
              onChange={e => setRange('renewedDiscountRange', 0, e.target.value)}
              style={{ width: 80, padding: '6px 10px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
            />
            <span style={{ color: 'var(--text-tertiary)' }}>→</span>
            <input type="number" step="0.01" min="0" max="1"
              value={cfg.renewedDiscountRange?.[1] ?? ''}
              onChange={e => setRange('renewedDiscountRange', 1, e.target.value)}
              style={{ width: 80, padding: '6px 10px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              ({Math.round((cfg.renewedDiscountRange?.[0]??0)*100)}%–{Math.round((cfg.renewedDiscountRange?.[1]??0)*100)}% off)
            </span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Open Box Discount Range
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" step="0.01" min="0" max="1"
              value={cfg.openBoxDiscountRange?.[0] ?? ''}
              onChange={e => setRange('openBoxDiscountRange', 0, e.target.value)}
              style={{ width: 80, padding: '6px 10px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
            />
            <span style={{ color: 'var(--text-tertiary)' }}>→</span>
            <input type="number" step="0.01" min="0" max="1"
              value={cfg.openBoxDiscountRange?.[1] ?? ''}
              onChange={e => setRange('openBoxDiscountRange', 1, e.target.value)}
              style={{ width: 80, padding: '6px 10px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              ({Math.round((cfg.openBoxDiscountRange?.[0]??0)*100)}%–{Math.round((cfg.openBoxDiscountRange?.[1]??0)*100)}% off)
            </span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Default Ownership Years
          </label>
          <input type="number" step="0.5" min="0.5" max="30"
            value={cfg.defaultOwnershipYears ?? ''}
            onChange={e => set('defaultOwnershipYears', parseFloat(e.target.value))}
            style={{ width: 100, padding: '6px 10px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Financing APR
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="number" step="0.001" min="0" max="1"
              value={cfg.apr ?? ''}
              onChange={e => set('apr', parseFloat(e.target.value))}
              style={{ width: 100, padding: '6px 10px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
              ({Math.round((cfg.apr??0)*100)}% annual)
            </span>
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Affiliate Tag
          </label>
          <input type="text" maxLength={60}
            value={cfg.affiliateTag ?? ''}
            onChange={e => set('affiliateTag', e.target.value)}
            style={{ width: '100%', padding: '6px 10px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
            Market Sources
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {['renewed', 'openBox', 'financing'].map(key => (
              <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ width: 70, fontSize: 12, color: 'var(--text-tertiary)' }}>{key}</span>
                <input type="text" maxLength={40}
                  value={cfg.marketSources?.[key] ?? ''}
                  onChange={e => set('marketSources', { ...cfg.marketSources, [key]: e.target.value })}
                  style={{ flex: 1, padding: '5px 8px', background: 'var(--surface-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12 }}
                />
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Save */}
      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => saveMutation.mutate(cfg)}
          disabled={saveMutation.isLoading}
        >
          {saveMutation.isLoading
            ? <><RefreshCw size={14} className="spin" /> Saving…</>
            : <><Save size={14} /> Save Config</>}
        </button>
        {saveFeedback && (
          <span style={{ fontSize: 13, color: saveFeedback.type === 'success' ? 'var(--success)' : 'var(--error)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {saveFeedback.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {saveFeedback.message}
          </span>
        )}
      </div>
    </div>
  );
}

// ── DomainEditor ──────────────────────────────────────────────────────────────
const DomainEditor = ({ domain, onBack }) => {
  const { navigate } = useAppStore();

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

      {/* Ownership Config Panel */}
      <OwnershipConfigPanel domainSlug={domain.slug || domain.id} />

    </div>
  );
};

export default DomainEditor;
