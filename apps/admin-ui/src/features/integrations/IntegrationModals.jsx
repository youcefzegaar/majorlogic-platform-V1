import { useState, useRef, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { RefreshCw, CheckCircle, XCircle, Eye, EyeOff, Trash2, Plus, Save, Zap, Search } from 'lucide-react';
import { adminService } from '../../api/apiClient';
import { CATEGORY_LABELS, KNOWN_CATALOG, CREDENTIAL_FIELDS } from './integrations-catalog.js';

// ── Add Dropdown ──────────────────────────────────────────────────────────────
export function AddDropdown({ existingSlugs, onAddKnown, onAddCustom, onClose }) {
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const available = KNOWN_CATALOG.filter(s => {
    if (existingSlugs.includes(s.slug)) return false;
    if (!q) return true;
    return s.name.toLowerCase().includes(q.toLowerCase()) || s.category.includes(q.toLowerCase());
  });

  const grouped = Object.entries(CATEGORY_LABELS).reduce((acc, [cat]) => {
    const items = available.filter(s => s.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, marginTop: '6px',
      width: '300px', maxHeight: '420px', overflowY: 'auto',
      background: '#101014', border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '12px', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', zIndex: 500,
    }}>
      <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, background: '#101014' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 10px', border: '1px solid var(--border-subtle)' }}>
          <Search size={13} color="var(--text-tertiary)" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search integrations..."
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', width: '100%' }} />
        </div>
      </div>

      {Object.keys(grouped).length === 0 && (
        <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.82rem' }}>No services found</p>
      )}
      {Object.entries(grouped).map(([cat, items]) => (
        <div key={cat}>
          <div style={{ padding: '8px 12px 4px', fontSize: '0.68rem', color: CATEGORY_LABELS[cat].color, textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
            {CATEGORY_LABELS[cat].label}
          </div>
          {items.map(svc => (
            <button key={svc.slug} onClick={() => { onAddKnown(svc); onClose(); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '8px 12px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ fontSize: '1.1rem', width: '22px', textAlign: 'center' }}>{svc.icon_emoji}</span>
              <div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 500 }}>{svc.name}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>{svc.description}</div>
              </div>
            </button>
          ))}
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '6px' }}>
        <button onClick={() => { onAddCustom(); onClose(); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 10px', background: 'transparent', border: '1px dashed var(--border-subtle)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.82rem', transition: 'background 0.1s' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <Plus size={13} /> Custom Integration
        </button>
      </div>
    </div>
  );
}

// ── Configure Modal ───────────────────────────────────────────────────────────
export function ConfigureModal({ integration, onClose }) {
  const qc = useQueryClient();
  const [creds, setCreds]   = useState({});
  const [config, setConfig] = useState(integration.config || {});
  const [showValues, setShowValues] = useState({});
  const [testMsg, setTestMsg] = useState(null);

  const fields = CREDENTIAL_FIELDS[integration.slug] || [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }];
  const cat = CATEGORY_LABELS[integration.category] || CATEGORY_LABELS.custom;

  const saveMut = useMutation({
    mutationFn: () => adminService.saveIntegration(integration.slug, {
      credentials: Object.keys(creds).length > 0 ? creds : undefined,
      config: Object.keys(config).length > 0 ? config : undefined,
      is_active: true,
    }),
    onSuccess: () => { setCreds({}); qc.invalidateQueries(['integrations']); onClose(); },
  });

  const testMut = useMutation({
    mutationFn: () => adminService.testIntegration(integration.slug),
    onSuccess: (d) => { setTestMsg({ ok: d.ok, msg: d.message }); qc.invalidateQueries(['integrations']); setTimeout(() => setTestMsg(null), 6000); },
  });

  const revokeMut = useMutation({
    mutationFn: () => adminService.revokeIntegration(integration.slug),
    onSuccess: () => { qc.invalidateQueries(['integrations']); onClose(); },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', border: `1px solid ${cat.color}30` }}>
            {integration.icon_emoji}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{integration.name}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{integration.description}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '1.2rem' }}>✕</button>
        </div>

        <h4 style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
          Credentials {integration.has_credentials && <span style={{ color: 'var(--success)', marginLeft: '6px' }}>● Saved</span>}
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {fields.map(f => (
            <div key={f.key}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>{f.label}</label>
              <div style={{ position: 'relative' }}>
                <input className="input-field"
                  type={f.type === 'password' && !showValues[f.key] ? 'password' : 'text'}
                  placeholder={integration.has_credentials ? '••••• (leave blank to keep)' : f.placeholder}
                  value={creds[f.key] || ''}
                  onChange={e => setCreds(p => ({ ...p, [f.key]: e.target.value }))}
                  style={{ paddingRight: f.type === 'password' ? '40px' : undefined }}
                />
                {f.type === 'password' && (
                  <button style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                    onClick={() => setShowValues(p => ({ ...p, [f.key]: !p[f.key] }))}>
                    {showValues[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {Object.keys(integration.config || {}).length > 0 && (
          <>
            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Configuration</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px', marginBottom: '16px' }}>
              {Object.entries(config).map(([k, v]) => (
                <div key={k}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>{k}</label>
                  <input className="input-field" value={v} onChange={e => setConfig(p => ({ ...p, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
          </>
        )}

        {testMsg && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', background: testMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${testMsg.ok ? 'var(--success)' : 'var(--error)'}`, color: testMsg.ok ? 'var(--success)' : 'var(--error)' }}>
            {testMsg.ok ? <CheckCircle size={14} /> : <XCircle size={14} />} {testMsg.msg}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending ? <RefreshCw className="spin" size={14} /> : <Save size={14} />}
            {saveMut.isPending ? 'Saving...' : 'Save & Activate'}
          </button>
          <button className="btn btn-outline" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
            {testMut.isPending ? <RefreshCw className="spin" size={14} /> : <Zap size={14} />}
            {testMut.isPending ? 'Testing...' : 'Test'}
          </button>
          {integration.has_credentials && (
            <button className="btn btn-outline" style={{ color: 'var(--error)', borderColor: 'var(--error)', marginLeft: 'auto' }}
              onClick={() => { if (confirm(`Revoke credentials for ${integration.name}?`)) revokeMut.mutate(); }}>
              <Trash2 size={14} /> Revoke
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Custom Integration Modal ──────────────────────────────────────────────────
export function CustomModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ slug: '', name: '', category: 'custom', icon_emoji: '🔗', description: '', api_key: '', base_url: '' });
  const [err, setErr] = useState(null);

  const mut = useMutation({
    mutationFn: () => adminService.addIntegration({
      slug: form.slug, name: form.name, category: form.category,
      icon_emoji: form.icon_emoji, description: form.description,
      credentials: form.api_key ? { api_key: form.api_key } : {},
      config: form.base_url ? { base_url: form.base_url } : {},
    }),
    onSuccess: () => { qc.invalidateQueries(['integrations']); onClose(); },
    onError: e => setErr(e?.message || 'Failed'),
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <h3 style={{ margin: 0 }}>Custom Integration</h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '1.2rem' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 58px', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Name *</label>
              <input className="input-field" placeholder="My Service" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Icon</label>
              <input className="input-field" value={form.icon_emoji} onChange={e => setForm(f => ({ ...f, icon_emoji: e.target.value }))} style={{ textAlign: 'center', fontSize: '1.1rem' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Slug (unique ID) *</label>
            <input className="input-field" placeholder="my_service" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Category</label>
            <select className="input-field" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Description</label>
            <input className="input-field" placeholder="What this integration does" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>API Key <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input className="input-field" type="password" placeholder="Can add later" value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Base URL <span style={{ fontWeight: 400 }}>(optional)</span></label>
            <input className="input-field" placeholder="https://api.example.com" value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))} />
          </div>
          {err && <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid var(--error)', color: 'var(--error)', fontSize: '0.82rem' }}>{err}</div>}
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button className="btn btn-primary" onClick={() => mut.mutate()} disabled={!form.slug || !form.name || mut.isPending}>
            {mut.isPending ? <RefreshCw className="spin" size={14} /> : <Plus size={14} />}
            {mut.isPending ? 'Adding...' : 'Add Integration'}
          </button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
