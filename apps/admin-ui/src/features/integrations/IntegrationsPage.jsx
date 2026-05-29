import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, XCircle, Plus, Search, Settings, Trash2 } from 'lucide-react';
import { adminService } from '../../api/apiClient';
import { CATEGORY_LABELS, KNOWN_CATALOG } from './integrations-catalog.js';
import { AddDropdown, ConfigureModal, CustomModal } from './IntegrationModals.jsx';

const IntegrationsPage = () => {
  const qc = useQueryClient();
  const [configuring, setConfiguring] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustom, setShowCustom]     = useState(false);
  const [tableSearch, setTableSearch]   = useState('');
  const [catFilter, setCatFilter]       = useState('all');
  const addBtnRef = useRef(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['integrations'],
    queryFn: adminService.getIntegrations,
    staleTime: 10000,
  });

  const quickAddMut = useMutation({
    mutationFn: (svc) => adminService.addIntegration({
      slug: svc.slug, name: svc.name, category: svc.category,
      icon_emoji: svc.icon_emoji, description: svc.description,
      credentials: {}, config: svc.config || {},
    }),
    onSuccess: () => qc.invalidateQueries(['integrations']),
  });

  const toggleMut = useMutation({
    mutationFn: ({ slug, active }) => adminService.saveIntegration(slug, { is_active: active }),
    onSuccess: () => qc.invalidateQueries(['integrations']),
  });

  const deleteMut = useMutation({
    mutationFn: (slug) => adminService.deleteIntegration(slug),
    onSuccess: () => qc.invalidateQueries(['integrations']),
  });

  const reseedMut = useMutation({
    mutationFn: () => adminService.reseedIntegrations(),
    onSuccess: () => qc.invalidateQueries(['integrations']),
  });

  const integrations  = data?.integrations || [];
  const existingSlugs = integrations.map(i => i.slug);
  const activeCount   = integrations.filter(i => i.is_active).length;

  const filtered = integrations.filter(i => {
    if (catFilter !== 'all' && i.category !== catFilter) return false;
    if (tableSearch && !i.name.toLowerCase().includes(tableSearch.toLowerCase()) && !i.slug.includes(tableSearch.toLowerCase())) return false;
    return true;
  });

  const fmtDate = (d) => {
    if (!d) return null;
    const diff = Date.now() - new Date(d).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="page-content">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}><span className="text-gradient">Integrations</span></h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.88rem' }}>
            API keys and service credentials — AES-256 encrypted at rest.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
            {activeCount}/{integrations.length} active
          </span>
          <button className="btn btn-outline" onClick={() => refetch()} disabled={isFetching} style={{ padding: '7px' }}>
            <RefreshCw size={15} className={isFetching ? 'spin' : ''} />
          </button>
          {integrations.length === 0 && (
            <button className="btn btn-outline" onClick={() => reseedMut.mutate()} disabled={reseedMut.isPending}
              style={{ fontSize: '0.82rem', color: 'var(--warning, #F59E0B)', borderColor: 'var(--warning, #F59E0B)' }}>
              {reseedMut.isPending ? <RefreshCw className="spin" size={14} /> : '⚙️'} استعادة التكاملات
            </button>
          )}
          <div style={{ position: 'relative' }} ref={addBtnRef}>
            <button className="btn btn-primary" onClick={() => setShowDropdown(v => !v)}>
              <Plus size={15} /> Add Integration
            </button>
            {showDropdown && (
              <AddDropdown
                existingSlugs={existingSlugs}
                onAddKnown={(svc) => quickAddMut.mutate(svc)}
                onAddCustom={() => setShowCustom(true)}
                onClose={() => setShowDropdown(false)}
              />
            )}
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '6px 10px', border: '1px solid var(--border-subtle)', flex: '0 0 220px' }}>
          <Search size={13} color="var(--text-tertiary)" />
          <input value={tableSearch} onChange={e => setTableSearch(e.target.value)} placeholder="Filter by name..."
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', width: '100%' }} />
        </div>
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
          {[['all', 'All', '#6B7280'], ...Object.entries(CATEGORY_LABELS).map(([k, v]) => [k, v.label.split(' ')[0], v.color])].map(([k, label, color]) => (
            <button key={k} onClick={() => setCatFilter(k)} style={{ padding: '4px 10px', borderRadius: '99px', fontSize: '0.75rem', cursor: 'pointer', border: `1px solid ${catFilter === k ? color : 'var(--border-subtle)'}`, background: catFilter === k ? `${color}20` : 'transparent', color: catFilter === k ? color : 'var(--text-tertiary)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '80px' }}><RefreshCw className="spin" size={32} /></div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Service', 'Category', 'Keys', 'Last Tested', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No integrations match</td></tr>
              )}
              {filtered.map((i, idx) => {
                const cat = CATEGORY_LABELS[i.category] || CATEGORY_LABELS.custom;
                return (
                  <tr key={i.slug} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: `${cat.color}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', border: `1px solid ${cat.color}25`, flexShrink: 0 }}>
                          {i.icon_emoji}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{i.name}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{i.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '99px', background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30`, whiteSpace: 'nowrap' }}>
                        {cat.label.split(' ')[0]}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      {i.has_credentials
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--success)' }}><CheckCircle size={12} /> Set</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}><XCircle size={12} /> None</span>
                      }
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {i.last_tested_at
                        ? <span style={{ color: i.last_test_ok ? 'var(--success)' : 'var(--error)' }}>
                            {i.last_test_ok ? '✓' : '✗'} {fmtDate(i.last_tested_at)}
                          </span>
                        : '—'
                      }
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => toggleMut.mutate({ slug: i.slug, active: !i.is_active })}
                          title={i.is_active ? 'Disable' : 'Enable'}
                          style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${i.is_active ? 'var(--border-subtle)' : cat.color + '60'}`, background: i.is_active ? 'transparent' : `${cat.color}12`, cursor: 'pointer', fontSize: '0.75rem', color: i.is_active ? 'var(--text-tertiary)' : cat.color, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          {i.is_active ? <><XCircle size={12} /> Disable</> : <><CheckCircle size={12} /> Enable</>}
                        </button>
                        <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setConfiguring(i)}>
                          <Settings size={12} /> Configure
                        </button>
                        <button
                          onClick={() => { if (confirm(`Delete "${i.name}" integration?`)) deleteMut.mutate(i.slug); }}
                          title="Delete integration"
                          style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid transparent', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', transition: 'color 0.15s, border-color 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.borderColor = 'var(--error)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-tertiary)'; e.currentTarget.style.borderColor = 'transparent'; }}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {configuring && <ConfigureModal integration={configuring} onClose={() => setConfiguring(null)} />}
      {showCustom   && <CustomModal onClose={() => setShowCustom(false)} />}
    </div>
  );
};

export default IntegrationsPage;
