import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Link2, 
  Tag, 
  Save, 
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { adminService } from '../../api/apiClient';

const AffiliateManager = () => {
  const [editingSettings, setEditingSettings] = useState([]);
  const [newSeller, setNewSeller] = useState({ seller: '', affiliateTag: '', notes: '' });

  const { data: settingsData, isLoading, refetch } = useQuery({
    queryKey: ['affiliate-settings'],
    queryFn: adminService.getAffiliateSettings,
    onSuccess: (data) => setEditingSettings(data.settings)
  });

  // Sync state when data loads
  React.useEffect(() => {
    if (settingsData?.settings) {
      setEditingSettings(settingsData.settings);
    }
  }, [settingsData]);

  const saveMutation = useMutation({
    mutationFn: (data) => adminService.saveAffiliateSettings(data),
    onSuccess: () => {
      refetch();
      alert('Affiliate settings saved!');
    }
  });

  const handleUpdate = (seller, field, value) => {
    setEditingSettings(prev => prev.map(s => s.seller === seller ? { ...s, [field]: value } : s));
  };

  const handleSave = (seller) => {
    const setting = editingSettings.find(s => s.seller === seller);
    saveMutation.mutate(setting);
  };

  const handleAddNew = () => {
    if (!newSeller.seller) return;
    saveMutation.mutate({
      ...newSeller,
      isActive: true
    });
    setNewSeller({ seller: '', affiliateTag: '', notes: '' });
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Commercial <span className="text-gradient">Routing</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage affiliate tags and commercial partnership parameters.</p>
        </div>
        <button className="btn btn-outline" onClick={() => refetch()}>
          {isLoading ? <RefreshCw className="spin" size={18} /> : <RefreshCw size={18} />} Refresh
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {editingSettings.map((s, i) => (
          <div key={i} className="card" style={{ borderLeft: s.affiliate_tag ? '4px solid var(--success)' : '4px solid var(--warning)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr auto', gap: '24px', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{s.seller_display_name || s.seller}</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{s.seller}</span>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Affiliate Tag / Parameter</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    className="input-field" 
                    value={s.affiliate_tag || ''} 
                    onChange={(e) => handleUpdate(s.seller, 'affiliateTag', e.target.value)}
                    placeholder="e.g. majorlogic-20"
                    style={{ fontFamily: 'monospace' }}
                  />
                  <input 
                    className="input-field" 
                    value={s.affiliate_param_key || 'tag'} 
                    onChange={(e) => handleUpdate(s.seller, 'affiliate_param_key', e.target.value)}
                    placeholder="param"
                    style={{ width: '80px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox" 
                    checked={s.is_active} 
                    onChange={(e) => handleUpdate(s.seller, 'isActive', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                  />
                  <span style={{ fontSize: '0.9rem' }}>Active for Routing</span>
                </label>
              </div>

              <button className="btn btn-primary" onClick={() => handleSave(s.seller)} disabled={saveMutation.isPending}>
                <Save size={16} />
              </button>
            </div>
            {s.notes && (
              <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-tertiary)', borderTop: '1px solid var(--border-subtle)', paddingTop: '8px' }}>
                Note: {s.notes}
              </div>
            )}
          </div>
        ))}

        {/* Add New Seller */}
        <div className="card" style={{ background: 'rgba(124, 58, 237, 0.05)', border: '1px dashed var(--accent-primary)' }}>
          <h3 style={{ marginBottom: '20px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Add New Commercial Partner
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr auto', gap: '16px', alignItems: 'end' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px' }}>Seller Name (Exact)</label>
              <input 
                className="input-field" 
                value={newSeller.seller} 
                onChange={(e) => setNewSeller({ ...newSeller, seller: e.target.value })}
                placeholder="e.g. Apple"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px' }}>Initial Tag</label>
              <input 
                className="input-field" 
                value={newSeller.affiliateTag} 
                onChange={(e) => setNewSeller({ ...newSeller, affiliateTag: e.target.value })}
                placeholder="tag-123"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', marginBottom: '6px' }}>Internal Notes</label>
              <input 
                className="input-field" 
                value={newSeller.notes} 
                onChange={(e) => setNewSeller({ ...newSeller, notes: e.target.value })}
                placeholder="e.g. via Impact.com"
              />
            </div>
            <button className="btn btn-primary" onClick={handleAddNew} disabled={!newSeller.seller}>
              Add Partner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateManager;
