import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Plus, Save, Trash2, CheckCircle, XCircle, Edit2, X } from 'lucide-react';
import { adminService } from '../../api/apiClient';

// ── Inline Edit Row ───────────────────────────────────────────────────────────
const EditRow = ({ row, onSave, onCancel, isPending }) => {
  const [form, setForm] = useState({
    seller:             row?.seller || '',
    seller_display_name: row?.seller_display_name || '',
    affiliateTag:       row?.affiliate_tag || '',
    affiliate_param_key: row?.affiliate_param_key || 'tag',
    notes:              row?.notes || '',
    isActive:           row?.is_active ?? true,
  });

  return (
    <tr style={{ background: 'rgba(99,102,241,0.05)' }}>
      <td style={{ padding: '10px 14px' }}>
        <input className="input-field" placeholder="Amazon" value={form.seller_display_name}
          onChange={e => setForm(f => ({ ...f, seller_display_name: e.target.value }))}
          style={{ marginBottom: '4px' }} />
        <input className="input-field" placeholder="seller_id (exact)" value={form.seller}
          onChange={e => setForm(f => ({ ...f, seller: e.target.value }))}
          style={{ fontSize: '0.75rem', fontFamily: 'monospace' }} />
      </td>
      <td style={{ padding: '10px 14px' }}>
        <input className="input-field" placeholder="majorlogic-20" value={form.affiliateTag}
          onChange={e => setForm(f => ({ ...f, affiliateTag: e.target.value }))}
          style={{ fontFamily: 'monospace' }} />
      </td>
      <td style={{ padding: '10px 14px' }}>
        <input className="input-field" value={form.affiliate_param_key}
          onChange={e => setForm(f => ({ ...f, affiliate_param_key: e.target.value }))}
          style={{ width: '80px', fontFamily: 'monospace' }} />
      </td>
      <td style={{ padding: '10px 14px' }}>
        <input className="input-field" placeholder="via Impact.com" value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '0.78rem' }}
            onClick={() => onSave(form)} disabled={!form.seller || isPending}>
            {isPending ? <RefreshCw className="spin" size={13} /> : <Save size={13} />}
            {isPending ? 'Saving...' : 'Save'}
          </button>
          <button className="btn btn-outline" style={{ padding: '5px 8px' }} onClick={onCancel}>
            <X size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const AffiliateManager = () => {
  const qc = useQueryClient();
  const [editingSeller, setEditingSeller] = useState(null); // seller id being edited
  const [addingNew, setAddingNew]         = useState(false);
  const [saveMsg, setSaveMsg]             = useState(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['affiliate-settings'],
    queryFn: adminService.getAffiliateSettings,
  });

  const saveMut = useMutation({
    mutationFn: (payload) => adminService.saveAffiliateSettings(payload),
    onSuccess: () => {
      qc.invalidateQueries(['affiliate-settings']);
      setEditingSeller(null);
      setAddingNew(false);
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(null), 3000);
    },
  });

  const toggleMut = useMutation({
    mutationFn: ({ seller, is_active }) => adminService.saveAffiliateSettings({ seller, isActive: is_active }),
    onSuccess: () => qc.invalidateQueries(['affiliate-settings']),
  });

  const settings = data?.settings || [];
  const activeCount = settings.filter(s => s.is_active).length;

  const handleSave = (form) => saveMut.mutate(form);

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '6px' }}>
            Commercial <span className="text-gradient">Routing</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.88rem' }}>
            Affiliate tags and partner parameters for product link routing.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {saveMsg && (
            <span style={{ fontSize: '0.82rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <CheckCircle size={13} /> {saveMsg}
            </span>
          )}
          <span style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', padding: '5px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: '7px', border: '1px solid var(--border-subtle)' }}>
            {activeCount}/{settings.length} active
          </span>
          <button className="btn btn-outline" onClick={() => refetch()} disabled={isFetching} style={{ padding: '7px' }}>
            <RefreshCw size={15} className={isFetching ? 'spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => { setAddingNew(true); setEditingSeller(null); }}>
            <Plus size={15} /> Add Partner
          </button>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '80px' }}><RefreshCw className="spin" size={32} /></div>
      ) : (
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Seller / Partner', 'Affiliate Tag', 'URL Param', 'Notes', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Add new row */}
              {addingNew && (
                <EditRow row={null} onSave={handleSave} onCancel={() => setAddingNew(false)} isPending={saveMut.isPending} />
              )}

              {settings.length === 0 && !addingNew && (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>
                  No partners yet — <button onClick={() => setAddingNew(true)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-primary)', fontSize: '0.85rem' }}>add one</button>
                </td></tr>
              )}

              {settings.map((s, idx) => {
                const isEditing = editingSeller === s.seller;
                if (isEditing) {
                  return (
                    <EditRow key={s.seller} row={s} onSave={handleSave} onCancel={() => setEditingSeller(null)} isPending={saveMut.isPending} />
                  );
                }
                return (
                  <tr key={s.seller}
                    style={{ borderTop: idx === 0 && !addingNew ? 'none' : '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                    {/* Seller */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.seller_display_name || s.seller}</div>
                      {s.seller_display_name && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{s.seller}</div>
                      )}
                    </td>

                    {/* Tag */}
                    <td style={{ padding: '12px 14px' }}>
                      {s.affiliate_tag
                        ? <code style={{ fontSize: '0.82rem', background: 'rgba(99,102,241,0.1)', padding: '2px 8px', borderRadius: '5px', color: 'var(--accent-secondary)' }}>{s.affiliate_tag}</code>
                        : <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>—</span>
                      }
                    </td>

                    {/* Param key */}
                    <td style={{ padding: '12px 14px' }}>
                      <code style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px' }}>
                        {s.affiliate_param_key || 'tag'}
                      </code>
                    </td>

                    {/* Notes */}
                    <td style={{ padding: '12px 14px', fontSize: '0.78rem', color: 'var(--text-tertiary)', maxWidth: '200px' }}>
                      {s.notes || '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Enable / Disable */}
                        <button
                          onClick={() => toggleMut.mutate({ seller: s.seller, is_active: !s.is_active })}
                          style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${s.is_active ? 'var(--border-subtle)' : 'rgba(16,185,129,0.4)'}`, background: s.is_active ? 'transparent' : 'rgba(16,185,129,0.08)', cursor: 'pointer', fontSize: '0.75rem', color: s.is_active ? 'var(--text-tertiary)' : 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          {s.is_active ? <><XCircle size={12} /> Disable</> : <><CheckCircle size={12} /> Enable</>}
                        </button>

                        {/* Edit */}
                        <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => { setEditingSeller(s.seller); setAddingNew(false); }}>
                          <Edit2 size={12} /> Edit
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => { if (confirm(`Remove "${s.seller_display_name || s.seller}"?`)) saveMut.mutate({ seller: s.seller, isActive: false, affiliateTag: '', _delete: true }); }}
                          style={{ padding: '5px 8px', borderRadius: '7px', border: '1px solid transparent', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', transition: 'color 0.15s, border-color 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
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
    </div>
  );
};

export default AffiliateManager;
