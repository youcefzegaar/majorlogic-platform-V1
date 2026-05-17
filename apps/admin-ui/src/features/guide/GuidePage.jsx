import { useState } from 'react';
import {
  BookOpen, LayoutDashboard, BrainCircuit, FlaskConical,
  Activity, Scale, Users, Tag, Plug, ClipboardList,
  Settings, ChevronRight, Circle, Zap, Shield, TrendingUp,
  Eye, Database, GitBranch, AlertCircle, CheckCircle,
} from 'lucide-react';

const SECTIONS = [
  { id: 'overview',    icon: BookOpen,       label: 'Platform Overview',      color: '#8B5CF6' },
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard',             color: '#6366F1' },
  { id: 'domains',     icon: BrainCircuit,   label: 'Cognitive Domains',      color: '#3B82F6' },
  { id: 'logic_lab',   icon: FlaskConical,   label: 'Logic Lab',              color: '#10B981' },
  { id: 'telemetry',   icon: Activity,       label: 'Telemetry',              color: '#F97316' },
  { id: 'ab_tests',    icon: Scale,          label: 'Commercial Integrity',   color: '#F59E0B' },
  { id: 'leads',       icon: Users,          label: 'Growth & Leads',         color: '#EC4899' },
  { id: 'affiliate',   icon: Tag,            label: 'Affiliate Routing',      color: '#14B8A6' },
  { id: 'integrations',icon: Plug,           label: 'Integrations',           color: '#A78BFA' },
  { id: 'audit_log',   icon: ClipboardList,  label: 'Audit Trail',            color: '#64748B' },
  { id: 'settings',    icon: Settings,       label: 'Settings',               color: '#94A3B8' },
];

// ── Reusable sub-components ──────────────────────────────────────────────────
const Step = ({ n, children }) => (
  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', flexShrink: 0, marginTop: '1px' }}>
      {n}
    </div>
    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</p>
  </div>
);

const Tip = ({ children }) => (
  <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', marginTop: '12px' }}>
    <CheckCircle size={15} color="var(--success)" style={{ flexShrink: 0, marginTop: '1px' }} />
    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</p>
  </div>
);

const Warn = ({ children }) => (
  <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', marginTop: '12px' }}>
    <AlertCircle size={15} color="var(--warning, #F59E0B)" style={{ flexShrink: 0, marginTop: '1px' }} />
    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</p>
  </div>
);

const Badge = ({ label, color }) => (
  <span style={{ display: 'inline-block', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', background: `${color}18`, color, border: `1px solid ${color}35`, marginRight: '5px', fontWeight: 600 }}>{label}</span>
);

const SectionTitle = ({ icon: Icon, label, color, id }) => (
  <div id={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={20} color={color} />
    </div>
    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>{label}</h2>
  </div>
);

// ── Section content ──────────────────────────────────────────────────────────
const sections = {
  overview: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '20px' }}>
        MajorLogic is a <strong>Declarative Decision Engine</strong> — it scores and ranks products for users based on
        configurable rules, not hard-coded logic. All business rules live in <code style={{ background: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '4px', fontSize: '0.82rem' }}>decision-config.json</code>,
        making the platform fully auditable and testable without touching code.
      </p>

      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Core Pipeline</h4>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {['Strategic Governance', 'Quality Gates', 'Score Engine', 'Value Layers', 'Slot Selection', 'Persistence'].map((step, i, arr) => (
          <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.78rem', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: 'var(--accent-secondary)', fontWeight: 500 }}>{step}</span>
            {i < arr.length - 1 && <ChevronRight size={12} color="var(--text-tertiary)" />}
          </div>
        ))}
      </div>

      <h4 style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Key Concepts</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: '10px' }}>
        {[
          { icon: BrainCircuit, color: '#8B5CF6', title: 'Domain', desc: 'An isolated decision context (e.g. laptop-student-us)' },
          { icon: GitBranch,    color: '#3B82F6', title: 'Gate',   desc: 'A pass/fail quality threshold (budget, brand, etc.)' },
          { icon: Zap,          color: '#F59E0B', title: 'Score',  desc: 'Weighted numeric value per attribute' },
          { icon: Shield,       color: '#10B981', title: 'Sacrifice Vector', desc: 'What a recommendation gave up to qualify' },
          { icon: TrendingUp,   color: '#EC4899', title: 'Recovery Engine', desc: 'Auto-relaxes gates when no results found' },
          { icon: Eye,          color: '#6366F1', title: 'Trace',  desc: 'Step-by-step audit of any decision' },
        ].map(({ icon: Icon, color, title, desc }) => (
          <div key={title} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Icon size={14} color={color} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{title}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>
    </>
  ),

  dashboard: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        The Dashboard is your real-time view of platform health and recent decision activity.
      </p>
      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>What you see</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {[
          { label: 'Decisions Today',    desc: 'Total recommendation requests processed in the last 24 h' },
          { label: 'Avg Score',          desc: 'Mean confidence score across all recommendations — higher is better' },
          { label: 'Recovery Rate',      desc: 'How often the Zero-Result Recovery Engine had to relax gates' },
          { label: 'Active Domain',      desc: 'Which decision domain is currently serving live traffic' },
        ].map(({ label, desc }) => (
          <div key={label} style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <Circle size={6} color="var(--accent-primary)" style={{ flexShrink: 0, marginTop: '6px' }} />
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{desc}</span>
            </div>
          </div>
        ))}
      </div>
      <Tip>Click any decision trace card to open the full forensic view with step-by-step gate evaluation.</Tip>
    </>
  ),

  domains: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        A <strong>Cognitive Domain</strong> encapsulates one recommendation context — one persona, one product category, one market segment.
        Each domain has its own config, gates, and score weights.
      </p>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>How to create or edit a domain</h4>
      <Step n={1}>Go to <strong>Cognitive Domains</strong> in the sidebar.</Step>
      <Step n={2}>Click <strong>New Domain</strong> or select an existing domain card to open the editor.</Step>
      <Step n={3}>In the editor, configure: <em>Quality Gates</em> (hard filters), <em>Score Nodes</em> (weighted attributes), and <em>Slot Definitions</em> (Hero, Smart Budget, Future Proof).</Step>
      <Step n={4}>Use <strong>Shadow Runner</strong> (from the editor toolbar) to test your config against real scenarios before publishing.</Step>
      <Step n={5}>Save — changes take effect on the next incoming request immediately.</Step>

      <Warn>Editing a live domain affects all users in real time. Use Shadow Runner to validate first.</Warn>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '20px', marginBottom: '10px' }}>Domain Status Badges</h4>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <Badge label="Active" color="#10B981" />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>Currently serving live traffic</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
        <Badge label="Draft" color="#F59E0B" />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>Saved but not yet published</span>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
        <Badge label="Archived" color="#64748B" />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>Disabled, kept for reference</span>
      </div>
    </>
  ),

  logic_lab: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        Logic Lab lets you edit the decision rules directly — gates, score formulas, and weights — with a live preview of how the changes affect results.
      </p>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Editing decision logic</h4>
      <Step n={1}>Open <strong>Logic Lab</strong> from the sidebar.</Step>
      <Step n={2}>Select the node type to edit: <em>Gate</em> (pass/fail), <em>Score</em> (weighted value), or <em>Derived</em> (formula).</Step>
      <Step n={3}>Modify the threshold or formula. Supported operations: <code style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>add · subtract · multiply · min · max · average · clamp · inverse</code></Step>
      <Step n={4}>The right panel shows a live diff of how your edit changes the final scores.</Step>
      <Step n={5}>Click <strong>Commit to Domain</strong> to apply — or <strong>Discard</strong> to cancel.</Step>

      <Tip>You can also edit <code>decision-config.json</code> directly in your code editor for bulk changes, then reload Logic Lab to see them reflected.</Tip>
    </>
  ),

  telemetry: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        The Telemetry feed shows every intervention and decision event in real time — useful for debugging unexpected recommendations.
      </p>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Reading the feed</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {[
          { badge: 'GATE_FAIL',     color: '#EF4444', desc: 'A product failed a quality gate and was excluded' },
          { badge: 'GATE_RELAXED',  color: '#F59E0B', desc: 'Recovery Engine relaxed a gate because no results matched' },
          { badge: 'SLOT_ASSIGNED', color: '#10B981', desc: 'A product was chosen for Hero / Smart Budget / Future Proof' },
          { badge: 'TRACE',         color: '#6366F1', desc: 'Full decision trace available — click to open forensics view' },
        ].map(({ badge, color, desc }) => (
          <div key={badge} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Badge label={badge} color={color} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{desc}</span>
          </div>
        ))}
      </div>
      <Tip>Use the search box to filter by session ID or product ASIN to trace a specific user journey.</Tip>
    </>
  ),

  ab_tests: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        Commercial Integrity monitors the balance between organic recommendations and commercial influence — ensuring affiliate revenue doesn't corrupt recommendation quality.
      </p>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Key metrics</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {[
          { label: 'Integrity Score',    desc: 'Measures how much commercial routing biased the recommendation (100 = no bias)' },
          { label: 'Affiliate Lift',     desc: 'Revenue gain from affiliate links vs. organic baseline' },
          { label: 'Trust Penalty',      desc: 'Score reduction applied when commercial weight exceeds the configured threshold' },
          { label: 'A/B Variant',        desc: 'Which scoring weights variant (A or B) a session received' },
        ].map(({ label, desc }) => (
          <div key={label} style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <Circle size={6} color="#F59E0B" style={{ flexShrink: 0, marginTop: '6px' }} />
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{label}: </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  ),

  leads: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        Growth &amp; Leads captures users who showed strong intent but didn't convert — enabling re-engagement campaigns.
      </p>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>How leads are captured</h4>
      <Step n={1}>User submits a recommendation request with a budget and preferences.</Step>
      <Step n={2}>The engine scores &gt; 0 results but the user doesn't click through to buy.</Step>
      <Step n={3}>After a configurable timeout, the session is added to the Leads table with the full decision context.</Step>
      <Step n={4}>Use the <strong>Filters</strong> panel (budget range, top product, score threshold) to segment leads.</Step>
      <Step n={5}>Export or push leads to your email provider via <strong>Integrations</strong>.</Step>

      <Tip>Leads with a high Sacrifice Vector score are your best re-engagement targets — they had strong intent but the best match was slightly out of budget.</Tip>
    </>
  ),

  affiliate: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        Commercial Routing controls how affiliate tags are appended to product links — one entry per seller/partner.
      </p>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Adding a new partner</h4>
      <Step n={1}>Click <strong>Add Partner</strong> in the top right.</Step>
      <Step n={2}>Enter the <em>Seller ID</em> (exact string, e.g. <code style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>Amazon</code>) and a display name.</Step>
      <Step n={3}>Enter your <em>Affiliate Tag</em> (e.g. <code style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>majorlogic-20</code>) and the URL parameter key (usually <code style={{ fontSize: '0.78rem', background: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '4px' }}>tag</code>).</Step>
      <Step n={4}>Click <strong>Save</strong>. The tag will be appended to all matching product links immediately.</Step>

      <Warn>Disabling a partner removes affiliate tags from its links but does NOT delete any historical click data.</Warn>
    </>
  ),

  integrations: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        Integrations stores API credentials for every third-party service. All values are AES-256 encrypted at rest — you can't retrieve a saved key, only replace it.
      </p>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Adding an integration</h4>
      <Step n={1}>Click <strong>Add Integration</strong> → choose a service from the catalog or click <em>Custom Integration</em>.</Step>
      <Step n={2}>The service is added to the table in a <em>disabled</em> state.</Step>
      <Step n={3}>Click <strong>Configure</strong> on the new row → enter your API key/credentials → click <strong>Save &amp; Activate</strong>.</Step>
      <Step n={4}>Optionally click <strong>Test</strong> to verify the credentials are valid before going live.</Step>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '20px', marginBottom: '10px' }}>Managing existing integrations</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[
          { action: 'Enable / Disable', desc: 'Toggle whether the service is used by the platform — credentials are kept' },
          { action: 'Configure',        desc: 'Update credentials or config values (model name, webhook URL, etc.)' },
          { action: 'Revoke',           desc: 'Delete stored credentials only — service entry remains' },
          { action: 'Delete',           desc: 'Remove the integration entry entirely' },
        ].map(({ action, desc }) => (
          <div key={action} style={{ display: 'flex', gap: '10px', fontSize: '0.82rem' }}>
            <span style={{ fontWeight: 600, minWidth: '110px', color: 'var(--text-primary)' }}>{action}</span>
            <span style={{ color: 'var(--text-tertiary)' }}>{desc}</span>
          </div>
        ))}
      </div>
    </>
  ),

  audit_log: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        The Audit Trail logs every admin action with a timestamp, actor, and full before/after diff — required for compliance and debugging.
      </p>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>What is logged</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
        {[
          'Domain config changes (gate thresholds, score weights)',
          'Affiliate partner additions, edits, deletes',
          'Integration credential saves and revocations',
          'Admin authentication events (login, password change)',
        ].map(item => (
          <div key={item} style={{ display: 'flex', gap: '8px', fontSize: '0.82rem' }}>
            <Circle size={5} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: '7px' }} />
            <span style={{ color: 'var(--text-secondary)' }}>{item}</span>
          </div>
        ))}
      </div>
      <Tip>Filter by action type or date range to narrow down what changed before a regressions appeared.</Tip>
    </>
  ),

  settings: () => (
    <>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '16px' }}>
        System Settings covers authentication security and real-time infrastructure status.
      </p>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Changing your admin password</h4>
      <Step n={1}>Navigate to <strong>Settings → Security &amp; Access</strong>.</Step>
      <Step n={2}>Enter your current password, then the new password twice.</Step>
      <Step n={3}>Click <strong>Update Password</strong>. The change is effective immediately.</Step>

      <h4 style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '20px', marginBottom: '10px' }}>Infrastructure State panel</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {[
          { label: 'Node.js Version', desc: 'Runtime version the API server is running on' },
          { label: 'Uptime',          desc: 'Time since the last API server restart' },
          { label: 'Memory Usage',    desc: 'Current RSS memory consumption of the server process' },
          { label: 'PostgreSQL',      desc: 'Live connection status and active connection count' },
        ].map(({ label, desc }) => (
          <div key={label} style={{ display: 'flex', gap: '10px', fontSize: '0.82rem' }}>
            <span style={{ fontWeight: 600, minWidth: '130px', color: 'var(--text-primary)' }}>{label}</span>
            <span style={{ color: 'var(--text-tertiary)' }}>{desc}</span>
          </div>
        ))}
      </div>

      <Warn>Restarting the server clears in-memory IR cache — the first few requests after restart will be slightly slower while the cache warms up.</Warn>
    </>
  ),
};

// ── Main Page ────────────────────────────────────────────────────────────────
const GuidePage = () => {
  const [active, setActive] = useState('overview');

  const sec = SECTIONS.find(s => s.id === active);

  return (
    <div className="page-content" style={{ display: 'flex', gap: '0', padding: 0, maxWidth: '100%', height: '100%' }}>

      {/* ── Left nav ── */}
      <div style={{
        width: '220px', flexShrink: 0,
        borderRight: '1px solid var(--border-subtle)',
        padding: '28px 0',
        overflowY: 'auto',
        position: 'sticky', top: 0, alignSelf: 'flex-start',
        maxHeight: 'calc(100vh - 60px)',
      }}>
        <div style={{ padding: '0 16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BookOpen size={16} color="var(--accent-primary)" />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Platform Guide</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>How to control MajorLogic</p>
        </div>

        <nav>
          {SECTIONS.map(s => (
            <button key={s.id} onClick={() => setActive(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '8px 16px',
                background: active === s.id ? `${s.color}12` : 'transparent',
                border: 'none',
                borderLeft: active === s.id ? `2px solid ${s.color}` : '2px solid transparent',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { if (active !== s.id) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
              onMouseLeave={e => { if (active !== s.id) e.currentTarget.style.background = 'transparent'; }}>
              <s.icon size={14} color={active === s.id ? s.color : 'var(--text-tertiary)'} />
              <span style={{ fontSize: '0.82rem', color: active === s.id ? s.color : 'var(--text-secondary)', fontWeight: active === s.id ? 600 : 400 }}>
                {s.label}
              </span>
            </button>
          ))}
        </nav>
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: '28px 36px', overflowY: 'auto', maxHeight: 'calc(100vh - 60px)' }}>
        {sec && (
          <>
            <SectionTitle icon={sec.icon} label={sec.label} color={sec.color} id={sec.id} />
            {sections[sec.id]?.()}
          </>
        )}
      </div>
    </div>
  );
};

export default GuidePage;
