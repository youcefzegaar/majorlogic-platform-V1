import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Eye, EyeOff, Trash2, Plus, Save, Zap, ChevronDown, ChevronUp
} from 'lucide-react';
import { adminService } from '../../api/apiClient';

const CATEGORY_LABELS = {
  ai:        { label: 'AI & Language Models',        color: '#8B5CF6' },
  reviews:   { label: 'Reviews & Community Data',    color: '#F97316' },
  ecommerce: { label: 'E-commerce & Pricing',        color: '#10B981' },
  database:  { label: 'Databases & Cache',            color: '#3B82F6' },
  email:     { label: 'Email & Notifications',        color: '#F59E0B' },
  webhook:   { label: 'Webhooks & Automation',        color: '#EC4899' },
  custom:    { label: 'Custom Integrations',          color: '#6B7280' },
};

const CREDENTIAL_FIELDS = {
  claude:        [{ key: 'api_key',        label: 'Anthropic API Key',   type: 'password', placeholder: 'sk-ant-...' }],
  openai:        [{ key: 'api_key',        label: 'OpenAI API Key',      type: 'password', placeholder: 'sk-...' }],
  amazon_pa:     [
    { key: 'access_key', label: 'AWS Access Key ID',   type: 'password', placeholder: 'AKIA...' },
    { key: 'secret_key', label: 'AWS Secret Key',      type: 'password', placeholder: '' },
    { key: 'partner_tag',label: 'Partner Tag',         type: 'text',     placeholder: 'yoursite-20' },
  ],
  ebay:          [{ key: 'api_key',        label: 'eBay App ID',         type: 'password', placeholder: '' }],
  sendgrid:      [{ key: 'api_key',        label: 'SendGrid API Key',    type: 'password', placeholder: 'SG...' }],
  resend:        [{ key: 'api_key',        label: 'Resend API Key',      type: 'password', placeholder: 're_...' }],
  slack_webhook: [{ key: 'webhook_url',   label: 'Slack Webhook URL',   type: 'text',     placeholder: 'https://hooks.slack.com/...' }],
  zapier:        [{ key: 'webhook_url',   label: 'Zapier Webhook URL',  type: 'text',     placeholder: 'https://hooks.zapier.com/...' }],
  redis:         [{ key: 'connection_url',label: 'Redis URL',           type: 'password', placeholder: 'rediss://...' }],
  postgres_read: [{ key: 'connection_url',label: 'Connection String',   type: 'password', placeholder: 'postgresql://...' }],
  google_sheets: [
    { key: 'service_account_email', label: 'Service Account Email', type: 'text',     placeholder: '...@...iam.gserviceaccount.com' },
    { key: 'private_key',           label: 'Private Key (JSON)',    type: 'password', placeholder: '' },
  ],
  custom_api: [
    { key: 'base_url', label: 'Base URL', type: 'text',     placeholder: 'https://api.example.com' },
    { key: 'api_key',  label: 'API Key',  type: 'password', placeholder: '' },
  ],
  // Reviews & Community
  reddit: [
    { key: 'client_id',     label: 'Reddit Client ID',     type: 'password', placeholder: 'From reddit.com/prefs/apps' },
    { key: 'client_secret', label: 'Reddit Client Secret', type: 'password', placeholder: '' },
    { key: 'user_agent',    label: 'User Agent',           type: 'text',     placeholder: 'MajorLogic/1.0 by u/yourusername' },
  ],
  youtube: [
    { key: 'api_key', label: 'YouTube Data API v3 Key', type: 'password', placeholder: 'AIza...' },
  ],
  bestbuy: [
    { key: 'api_key', label: 'Best Buy API Key', type: 'password', placeholder: 'From developer.bestbuy.com' },
  ],
  google_search: [
    { key: 'api_key', label: 'Google API Key',         type: 'password', placeholder: 'AIza...' },
    { key: 'cx',      label: 'Custom Search Engine ID', type: 'text',     placeholder: '017...:abc...' },
  ],
  trustpilot: [
    { key: 'api_key',    label: 'Trustpilot API Key',    type: 'password', placeholder: '' },
    { key: 'api_secret', label: 'Trustpilot API Secret', type: 'password', placeholder: '' },
  ],
  serpapi: [
    { key: 'api_key', label: 'SerpAPI Key', type: 'password', placeholder: 'From serpapi.com/dashboard' },
  ],
};

const StatusBadge = ({ ok, tested }) => {
  if (!tested) return <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Not tested</span>;
  return ok
    ? <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.75rem', color:'var(--success)' }}><CheckCircle size={12}/> Connected</span>
    : <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'0.75rem', color:'var(--error)' }}><XCircle size={12}/> Failed</span>;
};

const IntegrationCard = ({ integration }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [creds, setCreds] = useState({});
  const [config, setConfig] = useState(integration.config || {});
  const [showValues, setShowValues] = useState({});
  const [testMsg, setTestMsg] = useState(null);

  const fields = CREDENTIAL_FIELDS[integration.slug] || [
    { key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }
  ];

  const saveMutation = useMutation({
    mutationFn: () => adminService.saveIntegration(integration.slug, {
      credentials: Object.keys(creds).length > 0 ? creds : undefined,
      config: Object.keys(config).length > 0 ? config : undefined,
      is_active: true,
    }),
    onSuccess: () => { setCreds({}); qc.invalidateQueries(['integrations']); },
  });

  const testMutation = useMutation({
    mutationFn: () => adminService.testIntegration(integration.slug),
    onSuccess: (data) => {
      setTestMsg({ ok: data.ok, msg: data.message });
      qc.invalidateQueries(['integrations']);
      setTimeout(() => setTestMsg(null), 6000);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: () => adminService.revokeIntegration(integration.slug),
    onSuccess: () => qc.invalidateQueries(['integrations']),
  });

  const toggleMutation = useMutation({
    mutationFn: (active) => adminService.saveIntegration(integration.slug, { is_active: active }),
    onSuccess: () => qc.invalidateQueries(['integrations']),
  });

  const cat = CATEGORY_LABELS[integration.category] || CATEGORY_LABELS.custom;

  return (
    <div className="card" style={{
      border: integration.is_active ? `1px solid ${cat.color}40` : '1px solid var(--border-subtle)',
      transition: 'border 0.2s'
    }}>
      {/* Card Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
          background: `${cat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', border: `1px solid ${cat.color}30`
        }}>{integration.icon_emoji}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 700 }}>{integration.name}</span>
            {integration.is_active && (
              <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: '99px', background: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}40` }}>ACTIVE</span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>{integration.description}</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <StatusBadge ok={integration.last_test_ok} tested={!!integration.last_tested_at} />

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', userSelect: 'none' }}>
            <div style={{
              width: '36px', height: '20px', borderRadius: '10px',
              background: integration.is_active ? cat.color : 'var(--border-subtle)',
              position: 'relative', transition: 'background 0.2s', cursor: 'pointer'
            }} onClick={() => toggleMutation.mutate(!integration.is_active)}>
              <div style={{
                width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                position: 'absolute', top: '2px', transition: 'left 0.2s',
                left: integration.is_active ? '18px' : '2px'
              }} />
            </div>
          </label>

          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', display: 'flex' }}
            onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Expanded Form */}
      {expanded && (
        <div style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>

          {/* Credentials */}
          <h4 style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Credentials {integration.has_credentials && <span style={{ color: 'var(--success)', marginLeft: '6px' }}>● Saved</span>}
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>{f.label}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input-field"
                    type={f.type === 'password' && !showValues[f.key] ? 'password' : 'text'}
                    placeholder={integration.has_credentials ? '••••••••••• (leave blank to keep existing)' : f.placeholder}
                    value={creds[f.key] || ''}
                    onChange={(e) => setCreds(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ paddingRight: f.type === 'password' ? '40px' : undefined }}
                  />
                  {f.type === 'password' && (
                    <button style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}
                      onClick={() => setShowValues(prev => ({ ...prev, [f.key]: !prev[f.key] }))}>
                      {showValues[f.key] ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Config (non-secret) */}
          {Object.keys(integration.config || {}).length > 0 && (
            <>
              <h4 style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Configuration</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                {Object.entries(config).map(([k, v]) => (
                  <div key={k}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '5px' }}>{k}</label>
                    <input className="input-field" value={v} onChange={(e) => setConfig(prev => ({ ...prev, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Test Result Banner */}
          {testMsg && (
            <div style={{
              marginBottom: '12px', padding: '10px 14px', borderRadius: '8px',
              background: testMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${testMsg.ok ? 'var(--success)' : 'var(--error)'}`,
              fontSize: '0.85rem', color: testMsg.ok ? 'var(--success)' : 'var(--error)',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              {testMsg.ok ? <CheckCircle size={14} /> : <XCircle size={14} />}
              {testMsg.msg}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <RefreshCw className="spin" size={15} /> : <Save size={15} />}
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-outline" onClick={() => testMutation.mutate()} disabled={testMutation.isPending}>
              {testMutation.isPending ? <RefreshCw className="spin" size={15} /> : <Zap size={15} />}
              {testMutation.isPending ? 'Testing...' : 'Test Connection'}
            </button>
            {integration.has_credentials && (
              <button className="btn btn-outline" style={{ color: 'var(--error)', borderColor: 'var(--error)' }}
                onClick={() => { if (confirm(`Revoke all credentials for ${integration.name}?`)) revokeMutation.mutate(); }}>
                <Trash2 size={15} /> Revoke Keys
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AddIntegrationModal = ({ onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState({ slug: '', name: '', category: 'custom', icon_emoji: '🔗', description: '', api_key: '', base_url: '' });

  const mutation = useMutation({
    mutationFn: () => adminService.addIntegration({
      slug: form.slug, name: form.name, category: form.category,
      icon_emoji: form.icon_emoji, description: form.description,
      credentials: form.api_key ? { api_key: form.api_key } : {},
      config: form.base_url ? { base_url: form.base_url } : {},
    }),
    onSuccess: () => { qc.invalidateQueries(['integrations']); onClose(); },
  });

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', margin: '20px' }}>
        <h3 style={{ marginBottom: '20px' }}>Add Custom Integration</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Display Name *</label>
              <input className="input-field" placeholder="My Service" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Icon</label>
              <input className="input-field" placeholder="🔗" value={form.icon_emoji} onChange={e => setForm(f => ({...f, icon_emoji: e.target.value}))} style={{ textAlign: 'center', fontSize: '1.2rem' }} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Slug (unique ID) *</label>
            <input className="input-field" placeholder="my_service" value={form.slug} onChange={e => setForm(f => ({...f, slug: e.target.value.toLowerCase().replace(/\s+/g, '_')}))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Category</label>
            <select className="input-field" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Description</label>
            <input className="input-field" placeholder="What this integration does" value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>API Key</label>
            <input className="input-field" type="password" placeholder="Leave blank to add later" value={form.api_key} onChange={e => setForm(f => ({...f, api_key: e.target.value}))} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '5px' }}>Base URL (optional)</label>
            <input className="input-field" placeholder="https://api.example.com" value={form.base_url} onChange={e => setForm(f => ({...f, base_url: e.target.value}))} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button className="btn btn-primary" onClick={() => mutation.mutate()} disabled={!form.slug || !form.name || mutation.isPending}>
            {mutation.isPending ? <RefreshCw className="spin" size={15} /> : <Plus size={15} />} Add Integration
          </button>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

const IntegrationsPage = () => {
  const [showAdd, setShowAdd] = useState(false);
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['integrations'],
    queryFn: adminService.getIntegrations,
    staleTime: 10000,
  });

  const integrations = data?.integrations || [];
  const byCategory = integrations.reduce((acc, i) => {
    (acc[i.category] = acc[i.category] || []).push(i);
    return acc;
  }, {});

  const activeCount = integrations.filter(i => i.is_active).length;

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>
            <span className="text-gradient">Integrations</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Manage API keys, database connections, and external service credentials — all encrypted at rest.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', padding: '6px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            {activeCount} active
          </div>
          <button className="btn btn-outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={16} className={isFetching ? 'spin' : ''} />
          </button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={16} /> Add Integration
          </button>
        </div>
      </div>

      {/* Security Notice */}
      <div style={{ marginBottom: '24px', padding: '12px 16px', borderRadius: '8px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
        <AlertTriangle size={16} color="var(--accent-primary)" />
        All credentials are encrypted with AES-256 before storage. Keys are never returned to the browser after saving.
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '80px' }}><RefreshCw className="spin" size={36} /></div>
      ) : (
        Object.entries(CATEGORY_LABELS).map(([cat, meta]) => {
          const items = byCategory[cat] || [];
          if (items.length === 0) return null;
          return (
            <div key={cat} style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{ width: '4px', height: '18px', borderRadius: '2px', background: meta.color }} />
                <h3 style={{ margin: 0, fontSize: '0.9rem', color: meta.color, textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {meta.label}
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {items.filter(i => i.is_active).length}/{items.length} active
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map(i => <IntegrationCard key={i.slug} integration={i} />)}
              </div>
            </div>
          );
        })
      )}

      {showAdd && <AddIntegrationModal onClose={() => setShowAdd(false)} />}
    </div>
  );
};

export default IntegrationsPage;
