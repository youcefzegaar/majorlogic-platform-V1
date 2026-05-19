import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RefreshCw, CheckCircle, XCircle, AlertTriangle,
  Eye, EyeOff, Trash2, Plus, Save, Zap, Search, Settings
} from 'lucide-react';
import { adminService } from '../../api/apiClient';

const CATEGORY_LABELS = {
  ai:        { label: 'AI & Language Models',     color: '#8B5CF6' },
  reviews:   { label: 'Reviews & Community',      color: '#F97316' },
  ecommerce: { label: 'E-commerce & Pricing',     color: '#10B981' },
  database:  { label: 'Databases & Cache',         color: '#3B82F6' },
  email:     { label: 'Email & Notifications',     color: '#F59E0B' },
  webhook:   { label: 'Webhooks & Automation',     color: '#EC4899' },
  custom:    { label: 'Custom',                    color: '#6B7280' },
};

// All services available to add (pre-seeded in DB + on-demand catalog)
const KNOWN_CATALOG = [
  { slug: 'gemini',          name: 'Google Gemini',    category: 'ai',        icon_emoji: '🔷', description: 'Gemini Pro / Flash for AI tasks',              config: { model: 'gemini-1.5-pro' } },
  { slug: 'mistral',         name: 'Mistral AI',       category: 'ai',        icon_emoji: '🌬️', description: 'Mistral & Mixtral fast models',               config: { model: 'mistral-large-latest' } },
  { slug: 'cohere',          name: 'Cohere',           category: 'ai',        icon_emoji: '💡', description: 'Command R+ for RAG and enterprise AI',         config: { model: 'command-r-plus' } },
  { slug: 'groq',            name: 'Groq',             category: 'ai',        icon_emoji: '🚀', description: 'Ultra-fast LLM inference',                     config: { model: 'llama3-70b-8192' } },
  { slug: 'perplexity',      name: 'Perplexity',       category: 'ai',        icon_emoji: '🔭', description: 'Search-augmented AI responses',                config: {} },
  { slug: 'walmart',         name: 'Walmart API',      category: 'ecommerce', icon_emoji: '🏪', description: 'Walmart product search and prices',            config: {} },
  { slug: 'cj_affiliate',    name: 'CJ Affiliate',     category: 'ecommerce', icon_emoji: '🤝', description: 'Commission Junction affiliate network',        config: {} },
  { slug: 'rakuten',         name: 'Rakuten Ads',      category: 'ecommerce', icon_emoji: '🟥', description: 'Rakuten affiliate marketing platform',         config: {} },
  { slug: 'mailchimp',       name: 'Mailchimp',        category: 'email',     icon_emoji: '🐵', description: 'Email campaigns and automations',              config: {} },
  { slug: 'postmark',        name: 'Postmark',         category: 'email',     icon_emoji: '📮', description: 'Reliable transactional email',                 config: {} },
  { slug: 'discord_webhook', name: 'Discord Webhook',  category: 'webhook',   icon_emoji: '💜', description: 'Send alerts to Discord channels',              config: {} },
  { slug: 'telegram',        name: 'Telegram Bot',     category: 'webhook',   icon_emoji: '✈️', description: 'Notifications via Telegram bot',               config: {} },
  { slug: 'amazon_reviews',  name: 'Amazon Reviews',   category: 'reviews',   icon_emoji: '📦', description: 'Amazon product reviews data',                  config: {} },
  { slug: 'g2',              name: 'G2 Crowd',         category: 'reviews',   icon_emoji: '📊', description: 'Software and service reviews from G2',         config: {} },
  { slug: 'mongodb',         name: 'MongoDB Atlas',    category: 'database',  icon_emoji: '🍃', description: 'MongoDB Atlas analytics connection',           config: {} },
  { slug: 'clickhouse',      name: 'ClickHouse',       category: 'database',  icon_emoji: '🏠', description: 'Column-store DB for fast analytics',           config: {} },
];

const CREDENTIAL_FIELDS = {
  claude:        [{ key: 'api_key',        label: 'Anthropic API Key',        type: 'password', placeholder: 'sk-ant-...' }],
  openai:        [{ key: 'api_key',        label: 'OpenAI API Key',           type: 'password', placeholder: 'sk-...' }],
  gemini:        [{ key: 'api_key',        label: 'Google AI API Key',        type: 'password', placeholder: 'AIza...' }],
  mistral:       [{ key: 'api_key',        label: 'Mistral API Key',          type: 'password', placeholder: '' }],
  cohere:        [{ key: 'api_key',        label: 'Cohere API Key',           type: 'password', placeholder: '' }],
  groq:          [{ key: 'api_key',        label: 'Groq API Key',             type: 'password', placeholder: 'gsk_...' }],
  perplexity:    [{ key: 'api_key',        label: 'Perplexity API Key',       type: 'password', placeholder: 'pplx-...' }],
  amazon_pa:     [
    { key: 'access_key',  label: 'AWS Access Key ID', type: 'password', placeholder: 'AKIA...' },
    { key: 'secret_key',  label: 'AWS Secret Key',    type: 'password', placeholder: '' },
    { key: 'partner_tag', label: 'Partner Tag',        type: 'text',     placeholder: 'yoursite-20' },
  ],
  ebay:          [{ key: 'api_key',        label: 'eBay App ID',              type: 'password', placeholder: '' }],
  walmart:       [{ key: 'api_key',        label: 'Walmart API Key',          type: 'password', placeholder: '' }],
  cj_affiliate:  [{ key: 'api_key',        label: 'CJ API Key',               type: 'password', placeholder: '' }],
  rakuten:       [{ key: 'api_key',        label: 'Rakuten API Key',          type: 'password', placeholder: '' }],
  sendgrid:      [{ key: 'api_key',        label: 'SendGrid API Key',         type: 'password', placeholder: 'SG...' }],
  resend:        [{ key: 'api_key',        label: 'Resend API Key',           type: 'password', placeholder: 're_...' }],
  mailchimp:     [{ key: 'api_key',        label: 'Mailchimp API Key',        type: 'password', placeholder: '' }],
  postmark:      [{ key: 'api_key',        label: 'Postmark Server Token',    type: 'password', placeholder: '' }],
  slack_webhook: [{ key: 'webhook_url',    label: 'Slack Webhook URL',        type: 'text',     placeholder: 'https://hooks.slack.com/...' }],
  zapier:        [{ key: 'webhook_url',    label: 'Zapier Webhook URL',       type: 'text',     placeholder: 'https://hooks.zapier.com/...' }],
  discord_webhook:[{ key: 'webhook_url',   label: 'Discord Webhook URL',      type: 'text',     placeholder: 'https://discord.com/api/webhooks/...' }],
  telegram:      [
    { key: 'bot_token',  label: 'Bot Token',   type: 'password', placeholder: '123456:ABC-...' },
    { key: 'chat_id',    label: 'Chat ID',      type: 'text',     placeholder: '-100...' },
  ],
  redis:         [{ key: 'connection_url', label: 'Redis URL',                type: 'password', placeholder: 'rediss://...' }],
  postgres_read: [{ key: 'connection_url', label: 'Connection String',        type: 'password', placeholder: 'postgresql://...' }],
  mongodb:       [{ key: 'connection_url', label: 'MongoDB URI',              type: 'password', placeholder: 'mongodb+srv://...' }],
  clickhouse:    [{ key: 'connection_url', label: 'ClickHouse URL',           type: 'password', placeholder: 'https://host:8443' }],
  google_sheets: [
    { key: 'service_account_email', label: 'Service Account Email', type: 'text',     placeholder: '...@....iam.gserviceaccount.com' },
    { key: 'private_key',           label: 'Private Key (JSON)',    type: 'password', placeholder: '' },
  ],
  google_search: [
    { key: 'api_key', label: 'Google API Key',          type: 'password', placeholder: 'AIza...' },
    { key: 'cx',      label: 'Custom Search Engine ID', type: 'text',     placeholder: '017...' },
  ],
  reddit: [
    { key: 'client_id',     label: 'Client ID',     type: 'password', placeholder: 'From reddit.com/prefs/apps' },
    { key: 'client_secret', label: 'Client Secret', type: 'password', placeholder: '' },
    { key: 'user_agent',    label: 'User Agent',    type: 'text',     placeholder: 'MajorLogic/1.0' },
  ],
  youtube:    [{ key: 'api_key', label: 'YouTube Data API v3 Key', type: 'password', placeholder: 'AIza...' }],
  bestbuy:    [{ key: 'api_key', label: 'Best Buy API Key',        type: 'password', placeholder: '' }],
  trustpilot: [
    { key: 'api_key',    label: 'Trustpilot API Key',    type: 'password', placeholder: '' },
    { key: 'api_secret', label: 'Trustpilot API Secret', type: 'password', placeholder: '' },
  ],
  serpapi:        [{ key: 'api_key', label: 'SerpAPI Key',        type: 'password', placeholder: '' }],
  amazon_reviews: [{ key: 'api_key', label: 'API Key',            type: 'password', placeholder: '' }],
  g2:             [{ key: 'api_key', label: 'G2 API Key',         type: 'password', placeholder: '' }],
  custom_api:     [
    { key: 'base_url', label: 'Base URL', type: 'text',     placeholder: 'https://api.example.com' },
    { key: 'api_key',  label: 'API Key',  type: 'password', placeholder: '' },
  ],
};

// ── Add Dropdown ──────────────────────────────────────────────────────────────
const AddDropdown = ({ existingSlugs, onAddKnown, onAddCustom, onClose }) => {
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
      {/* Search */}
      <div style={{ padding: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)', position: 'sticky', top: 0, background: '#101014' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '6px 10px', border: '1px solid var(--border-subtle)' }}>
          <Search size={13} color="var(--text-tertiary)" />
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search integrations..."
            style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', width: '100%' }}
          />
        </div>
      </div>

      {/* Grouped list */}
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

      {/* Custom option */}
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
};

// ── Configure Modal ───────────────────────────────────────────────────────────
const ConfigureModal = ({ integration, onClose }) => {
  const qc = useQueryClient();
  const [creds, setCreds]       = useState({});
  const [config, setConfig]     = useState(integration.config || {});
  const [showValues, setShowValues] = useState({});
  const [testMsg, setTestMsg]   = useState(null);

  const fields = CREDENTIAL_FIELDS[integration.slug] || [{ key: 'api_key', label: 'API Key', type: 'password', placeholder: '' }];

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

  const cat = CATEGORY_LABELS[integration.category] || CATEGORY_LABELS.custom;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="card" style={{ width: '100%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto' }}>

        {/* Header */}
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

        {/* Credentials */}
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

        {/* Config */}
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

        {/* Test result */}
        {testMsg && (
          <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', background: testMsg.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${testMsg.ok ? 'var(--success)' : 'var(--error)'}`, color: testMsg.ok ? 'var(--success)' : 'var(--error)' }}>
            {testMsg.ok ? <CheckCircle size={14} /> : <XCircle size={14} />} {testMsg.msg}
          </div>
        )}

        {/* Actions */}
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
};

// ── Custom Integration Modal ──────────────────────────────────────────────────
const CustomModal = ({ onClose }) => {
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
};

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  const integrations = data?.integrations || [];
  const existingSlugs = integrations.map(i => i.slug);
  const activeCount = integrations.filter(i => i.is_active).length;

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
          <input value={tableSearch} onChange={e => setTableSearch(e.target.value)} placeholder="Filter by name..." style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.82rem', width: '100%' }} />
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

                    {/* Service */}
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

                    {/* Category */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '99px', background: `${cat.color}15`, color: cat.color, border: `1px solid ${cat.color}30`, whiteSpace: 'nowrap' }}>
                        {cat.label.split(' ')[0]}
                      </span>
                    </td>

                    {/* Keys */}
                    <td style={{ padding: '12px 14px' }}>
                      {i.has_credentials
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--success)' }}><CheckCircle size={12} /> Set</span>
                        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}><XCircle size={12} /> None</span>
                      }
                    </td>

                    {/* Last tested */}
                    <td style={{ padding: '12px 14px', fontSize: '0.75rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                      {i.last_tested_at
                        ? <span style={{ color: i.last_test_ok ? 'var(--success)' : 'var(--error)' }}>
                            {i.last_test_ok ? '✓' : '✗'} {fmtDate(i.last_tested_at)}
                          </span>
                        : '—'
                      }
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Enable / Disable */}
                        <button
                          onClick={() => toggleMut.mutate({ slug: i.slug, active: !i.is_active })}
                          title={i.is_active ? 'Disable' : 'Enable'}
                          style={{ padding: '5px 10px', borderRadius: '7px', border: `1px solid ${i.is_active ? 'var(--border-subtle)' : cat.color + '60'}`, background: i.is_active ? 'transparent' : `${cat.color}12`, cursor: 'pointer', fontSize: '0.75rem', color: i.is_active ? 'var(--text-tertiary)' : cat.color, display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                          {i.is_active
                            ? <><XCircle size={12} /> Disable</>
                            : <><CheckCircle size={12} /> Enable</>
                          }
                        </button>

                        {/* Configure */}
                        <button className="btn btn-outline" style={{ padding: '5px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setConfiguring(i)}>
                          <Settings size={12} /> Configure
                        </button>

                        {/* Delete */}
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

      {/* Modals */}
      {configuring && <ConfigureModal integration={configuring} onClose={() => setConfiguring(null)} />}
      {showCustom   && <CustomModal onClose={() => setShowCustom(false)} />}
    </div>
  );
};

export default IntegrationsPage;
