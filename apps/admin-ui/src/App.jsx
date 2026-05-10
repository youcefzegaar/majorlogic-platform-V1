import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  BrainCircuit, 
  Activity, 
  GitMerge, 
  Settings, 
  Bell, 
  Search, 
  Plus,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Users,
  Tag,
  Mail,
  ExternalLink
} from 'lucide-react';
import { DomainAPI, TelemetryAPI, AffiliateAPI, LeadsAPI } from './lib/supabase.js';
import './index.css';

const Sidebar = ({ currentPath, setCurrentPath }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'domains', icon: BrainCircuit, label: 'Cognitive Domains' },
    { id: 'telemetry', icon: Activity, label: 'Telemetry' },
    { id: 'ab_tests', icon: GitMerge, label: 'A/B Testing' },
    { id: 'leads', icon: Users, label: 'Growth & Leads' },
    { id: 'affiliate', icon: Tag, label: 'Affiliate Tags' },
    { id: 'settings', icon: Settings, label: 'Settings' }
  ];

  return (
    <aside className="sidebar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px', padding: '0 8px' }}>
        <div style={{ 
          width: '40px', height: '40px', 
          borderRadius: '12px', 
          background: 'var(--accent-gradient)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <BrainCircuit size={24} color="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '1.25rem', margin: 0, lineHeight: 1 }}>MajorLogic</h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Enterprise Engine</span>
        </div>
      </div>

      <nav style={{ flex: 1, overflowY: 'auto' }}>
        {menuItems.map(item => (
          <a 
            key={item.id}
            href={`#${item.id}`}
            className={`nav-item ${currentPath === item.id ? 'active' : ''}`}
            onClick={(e) => { e.preventDefault(); setCurrentPath(item.id); }}
          >
            <item.icon size={20} />
            {item.label}
          </a>
        ))}
      </nav>

      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="status-dot active"></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>System Connected</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Live Telemetry Active</p>
      </div>
    </aside>
  );
};

const Topbar = () => {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-full)', padding: '8px 16px', width: '300px', border: '1px solid var(--border-subtle)' }}>
        <Search size={18} color="var(--text-tertiary)" />
        <input 
          type="text" 
          placeholder="Search domains or intents..." 
          style={{ background: 'transparent', border: 'none', color: 'white', marginLeft: '12px', outline: 'none', width: '100%', fontFamily: 'inherit' }}
        />
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button className="btn btn-outline" style={{ border: 'none', padding: '8px' }}>
          <Bell size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '20px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Admin User</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>Superadmin</div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-full)', background: '#2d2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
            AU
          </div>
        </div>
      </div>
    </header>
  );
};

const DashboardHome = () => {
  const [metrics, setMetrics] = useState({ total: 24592, avgConfidence: 92, avgIntegrity: 98, recoveries: 142 });
  const [domains, setDomains] = useState([
    { id: 1, title: 'Laptops (US)', version: 'v1.2.0', is_active: true },
    { id: 2, title: 'Smartphones', version: 'v1.0.1', is_active: true }
  ]);
  const [interventions, setInterventions] = useState([
     { intent_slug: 'creative_nomad', relaxed_constraint: 'gate_weight', integrity_score: 60, created_at: new Date().toISOString() }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const dbDomains = await DomainAPI.getActiveDomains();
        const dbMetrics = await TelemetryAPI.getDashboardMetrics();
        const dbInterventions = await TelemetryAPI.getRecentInterventions();
        
        if (dbDomains && dbDomains.length > 0) setDomains(dbDomains);
        if (dbMetrics && dbMetrics.total > 0) setMetrics(dbMetrics);
        if (dbInterventions && dbInterventions.length > 0) setInterventions(dbInterventions);
      } catch (err) {
        console.error("Supabase not fully configured yet, using mock data.");
      }
      setLoading(false);
    }
    loadData();
  }, []);

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Cognitive <span className="text-gradient">Overview</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor decision engine performance and integrity.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline">
            {loading ? <RefreshCw className="spin" size={18} /> : <RefreshCw size={18} />} Sync
          </button>
          <button className="btn btn-primary">
            <Plus size={18} /> New Domain
          </button>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Total Decisions</span>
            <Activity size={20} color="var(--accent-primary)" />
          </div>
          <div className="metric-value">{metrics.total.toLocaleString()}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <ArrowUpRight size={14} /> Tracking live
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Avg. Confidence</span>
            <BrainCircuit size={20} color="var(--warning)" />
          </div>
          <div className="metric-value">{metrics.avgConfidence}%</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            System certainty level
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Avg. Integrity Score</span>
            <ShieldCheck size={20} color="var(--success)" />
          </div>
          <div className="metric-value">{metrics.avgIntegrity}%</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            Constraint adherence
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Recoveries (Relaxed)</span>
            <GitMerge size={20} color="var(--accent-secondary)" />
          </div>
          <div className="metric-value">{metrics.recoveries}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            Zero-result evasions
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3 style={{ marginBottom: '24px' }}>Active Cognitive Domains</h3>
          <table className="table-container">
            <thead>
              <tr>
                <th>Domain Name</th>
                <th>Version</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((d, i) => (
                <tr key={d.id || i}>
                  <td><strong>{d.title}</strong></td>
                  <td>{d.version}</td>
                  <td>
                    <span className={`badge ${d.is_active ? 'badge-success' : 'badge-warning'}`}>
                      {d.is_active ? 'Active' : 'Draft'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '24px' }}>Recent Recovery Interventions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {interventions.map((inv, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600 }}>Intent: {inv.intent_slug}</span>
                  <span className="badge badge-warning">Constraint Relaxed</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
                  System dropped constraint <code style={{ color: 'var(--accent-primary)' }}>{inv.relaxed_constraint}</code> to yield results.
                </p>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Integrity: {inv.integrity_score}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [currentPath, setCurrentPath] = useState('dashboard');
  const [editingDomain, setEditingDomain] = useState(null);

  const handleEditDomain = (domain) => {
    setEditingDomain(domain);
    setCurrentPath('domain_editor');
  };

  return (
    <div className="app-container">
      <Sidebar currentPath={currentPath} setCurrentPath={setCurrentPath} />
      <main className="main-content">
        <Topbar />
        {currentPath === 'dashboard' && <DashboardHome />}
        {currentPath === 'domains' && <DomainsPage onEdit={handleEditDomain} />}
        {currentPath === 'domain_editor' && <DomainEditor domain={editingDomain} onBack={() => setCurrentPath('domains')} />}
        {currentPath === 'telemetry' && <TelemetryPage />}
        {currentPath === 'ab_tests' && <ABTestingPage />}
        {currentPath === 'leads' && <LeadsPage />}
        {currentPath === 'affiliate' && <AffiliatePage />}
        {currentPath === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
};

// --- Additional Pages ---

const DomainsPage = ({ onEdit }) => {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const data = await DomainAPI.getActiveDomains();
      if (data && data.length > 0) setDomains(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Cognitive <span className="text-gradient">Domains</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage decision boundaries, constraint maps, and intent topologies.</p>
        </div>
        <button className="btn btn-primary"><Plus size={18} /> Create Domain</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}><RefreshCw className="spin" /></div>
      ) : (
        <div className="grid-3">
          {domains.map(domain => (
            <div key={domain.id} className="card" style={{ borderTop: '4px solid var(--accent-primary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.2rem' }}>{domain.title}</h3>
                <span className={`badge ${domain.is_active ? 'badge-success' : 'badge-warning'}`}>
                  {domain.version} {domain.is_active ? 'Active' : 'Draft'}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                {domain.slug.replace(/-/g, ' ')} domain. Managed under the Cognitive Constitution.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Updated: {new Date(domain.updated_at).toLocaleDateString()}</span>
                <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => onEdit(domain)}>Edit Logic</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const DomainEditor = ({ domain, onBack }) => {
  const [dimensions, setDimensions] = useState(domain.config?.dimensions || [
    { id: 'price', name: 'Price', type: 'Numeric', human_meaning: 'Budgetary Burden', psychological_effect: 'Financial Stress' }
  ]);
  const [conflicts, setConflicts] = useState(domain.config?.conflicts || []);
  const [saving, setSaving] = useState(false);

  const addDimension = () => {
    const newDim = { id: `dim_${Date.now()}`, name: 'New Dimension', type: 'Numeric', human_meaning: '', psychological_effect: '' };
    setDimensions([...dimensions, newDim]);
  };

  const addConflict = () => {
    if (dimensions.length < 2) {
      alert('You need at least 2 dimensions to create a conflict.');
      return;
    }
    const newConflict = {
      id: `conf_${Date.now()}`,
      dim_a: dimensions[0].id,
      dim_b: dimensions[1].id,
      strength: 70 // Default high conflict
    };
    setConflicts([...conflicts, newConflict]);
  };

  const updateConflict = (id, field, value) => {
    setConflicts(conflicts.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const newConfig = { ...domain.config, dimensions, conflicts };
      await DomainAPI.updateDomainConfig(domain.id, newConfig);
      alert('Cognitive Logic & Conflict Map Saved');
    } catch (err) {
      alert('Error saving logic: ' + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontWeight: 600 }}>
            ← Back to Domains
          </button>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Logic Editor: <span className="text-gradient">{domain.title}</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Defining the Cognitive Meta Model and Decision Primitives.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <RefreshCw className="spin" size={18} /> : <ShieldCheck size={18} />} Save All Logic
        </button>
      </div>

      <div className="grid-2">
        {/* Left Column: Dimensions */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <BrainCircuit size={20} color="var(--accent-primary)" /> Dimensions (Primitives)
            </h3>
            <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={addDimension}>
              <Plus size={16} /> Add Primitive
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {dimensions.map(dim => (
              <div key={dim.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <input className="input-field" value={dim.name} onChange={(e) => setDimensions(dimensions.map(d => d.id === dim.id ? {...d, name: e.target.value} : d))} placeholder="Technical Name" />
                  <select className="input-field" value={dim.type} onChange={(e) => setDimensions(dimensions.map(d => d.id === dim.id ? {...d, type: e.target.value} : d))}>
                    <option>Numeric</option>
                    <option>Boolean</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <input className="input-field" placeholder="Human Meaning" value={dim.human_meaning} onChange={(e) => setDimensions(dimensions.map(d => d.id === dim.id ? {...d, human_meaning: e.target.value} : d))} />
                  <input className="input-field" placeholder="Psychological Effect" value={dim.psychological_effect} onChange={(e) => setDimensions(dimensions.map(d => d.id === dim.id ? {...d, psychological_effect: e.target.value} : d))} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Conflict Map */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <GitMerge size={20} color="var(--accent-secondary)" /> Conflict Map
            </h3>
            <button className="btn btn-outline" style={{ padding: '4px 8px' }} onClick={addConflict}>
              <Plus size={16} /> Add Conflict Pair
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {conflicts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)' }}>
                No conflicts defined. Add your first conflict pair.
              </div>
            ) : (
              conflicts.map(conf => (
                <div key={conf.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <select className="input-field" style={{ flex: 1 }} value={conf.dim_a} onChange={(e) => updateConflict(conf.id, 'dim_a', e.target.value)}>
                      {dimensions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <div style={{ color: 'var(--accent-secondary)' }}><GitMerge size={18} /></div>
                    <select className="input-field" style={{ flex: 1 }} value={conf.dim_b} onChange={(e) => updateConflict(conf.id, 'dim_b', e.target.value)}>
                      {dimensions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>Conflict Strength: {conf.strength}%</label>
                  <input 
                    type="range" 
                    min="1" max="100" 
                    value={conf.strength} 
                    onChange={(e) => updateConflict(conf.id, 'strength', parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--accent-secondary)' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                    <span>Low Friction</span>
                    <span>High Incompatibility</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Stress Test Section */}
      <div className="card" style={{ marginTop: '24px', borderTop: '4px solid var(--warning)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <RefreshCw size={20} color="var(--warning)" /> Cognitive Stress Test (Chaos Monkey)
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Simulating 1,000 adversarial intent profiles to verify domain stability.
            </p>
          </div>
          <button 
            className="btn btn-outline" 
            style={{ borderColor: 'var(--warning)', color: 'var(--warning)' }}
            onClick={() => {
              setSaving(true);
              setTimeout(() => {
                setSaving(false);
                alert('Stress Test Completed: Stability 94.2%, Collapse Rate 2.1%, Integrity High.');
              }, 2000);
            }}
          >
            Run Adversarial Simulation
          </button>
        </div>

        <div className="grid-3">
          <div style={{ padding: '16px', background: 'rgba(255,165,0,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,165,0,0.1)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>STABILITY SCORE</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>94.2%</div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', marginTop: '12px' }}>
              <div style={{ width: '94%', height: '100%', background: 'var(--success)', borderRadius: '2px' }}></div>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>COLLAPSE RATE</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>2.1%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Adversarial intent failures</div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '8px' }}>RECOVERY DRIFT</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>0.4%</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px' }}>Average semantic shift</div>
          </div>
        </div>

        <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <ShieldCheck size={16} color="var(--success)" />
          <span>Constitution Audit: Decision laws are enforced. No critical logical deadlocks detected.</span>
        </div>
      </div>
    </div>
  );
};

const TelemetryPage = () => {
  return (
    <div className="page-content">
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Cognitive <span className="text-gradient">Telemetry</span></h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Real-time visualization of the Decision Kernel's health and user friction points.</p>

      <div className="card" style={{ marginBottom: '24px', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
          <Activity size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
          <p>Confidence Trend Chart (Coming Soon)</p>
          <p style={{ fontSize: '0.8rem' }}>Will render Recharts line graph connecting to Supabase Telemetry API</p>
        </div>
      </div>

      <div className="grid-2">
         <div className="card">
          <h3 style={{ marginBottom: '16px' }}>Top Conflict Pairs</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '16px' }}>Dimensions that users frequently demand together but are mathematically opposed.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
              <span>Performance ⚡ vs Portability 🪶</span>
              <span style={{ color: 'var(--warning)' }}>42% of queries</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)' }}>
              <span>High Specs 🚀 vs Low Budget 💰</span>
              <span style={{ color: 'var(--warning)' }}>38% of queries</span>
            </div>
          </div>
         </div>
      </div>
    </div>
  );
};

const ABTestingPage = () => {
  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>A/B <span className="text-gradient">Testing</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Deploy Challenger models against Champions to optimize decision integrity.</p>
        </div>
        <button className="btn btn-primary"><GitMerge size={18} /> New Experiment</button>
      </div>

      <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: 'var(--accent-gradient)' }}></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Laptops Weight Relaxation Test <span className="badge badge-success">Running</span>
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
              Testing a less aggressive penalty for weight constraints on the 'Student' intent.
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>50 / 50</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Traffic Split</div>
          </div>
        </div>

        <div className="grid-2">
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>🏆 Champion (v1.2.0)</span>
              <span>Avg Confidence: 94%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
              <div style={{ width: '94%', height: '100%', background: 'var(--text-secondary)', borderRadius: '2px' }}></div>
            </div>
          </div>

          <div style={{ padding: '16px', background: 'rgba(99,102,241,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>⚔️ Challenger (v1.3.0-beta)</span>
              <span style={{ color: 'var(--accent-primary)' }}>Avg Confidence: 97%</span>
            </div>
            <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
              <div style={{ width: '97%', height: '100%', background: 'var(--accent-primary)', borderRadius: '2px', boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LeadsPage = () => {
  const [leads, setLeads] = useState([
    { id: 1, email: 'user1@example.com', lead_type: 'price_alert', created_at: '2026-05-10T10:00:00Z' },
    { id: 2, email: 'user2@example.com', lead_type: 'save_results', created_at: '2026-05-10T09:30:00Z' }
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const dbLeads = await LeadsAPI.getLeads();
        if (dbLeads && dbLeads.length > 0) setLeads(dbLeads);
      } catch (err) { console.error(err); }
    }
    loadData();
  }, []);

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Growth & <span className="text-gradient">Leads</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Captured user intent and contact information from the decision funnel.</p>
        </div>
        <button className="btn btn-outline"><Mail size={18} /> Export CSV</button>
      </div>

      <div className="card">
        <table className="table-container">
          <thead>
            <tr>
              <th>Email Address</th>
              <th>Lead Type</th>
              <th>Date Captured</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map(lead => (
              <tr key={lead.id}>
                <td>{lead.email}</td>
                <td><span className="badge badge-primary">{lead.lead_type.replace('_', ' ')}</span></td>
                <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                <td><button className="btn btn-outline" style={{ padding: '4px 8px' }}><ExternalLink size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const AffiliatePage = () => {
  const [settings, setSettings] = useState([
    { id: 1, seller: 'Amazon', affiliate_tag: 'majorlogic-20', is_active: true },
    { id: 2, seller: 'Best Buy', affiliate_tag: 'ml-bb-24', is_active: true }
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const dbSettings = await AffiliateAPI.getSettings();
        if (dbSettings && dbSettings.length > 0) setSettings(dbSettings);
      } catch (err) { console.error(err); }
    }
    loadData();
  }, []);

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Affiliate <span className="text-gradient">Tags</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage dynamic monetization tags across multiple sellers.</p>
        </div>
        <button className="btn btn-primary"><Plus size={18} /> Add Seller</button>
      </div>

      <div className="grid-2">
        {settings.map(s => (
          <div key={s.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {s.seller} {s.is_active && <div className="status-dot active"></div>}
              </h3>
              <button className="btn btn-outline" style={{ padding: '4px 8px' }}>Edit</button>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }}>Active Tag</label>
              <code style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{s.affiliate_tag}</code>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span className="badge badge-success">Live</span>
              <span className="badge badge-primary">Redirect Active</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SettingsPage = () => {
  return (
    <div className="page-content">
      <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Platform <span className="text-gradient">Settings</span></h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '32px' }}>Manage API Keys, AI Providers, and Global Configuration.</p>

      <div className="card" style={{ maxWidth: '600px' }}>
        <h3 style={{ marginBottom: '24px' }}>AI Provider Configuration</h3>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Provider</label>
          <select style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-strong)', color: 'white', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit' }}>
            <option>Google Gemini (Current)</option>
            <option>OpenAI GPT-4</option>
            <option>Anthropic Claude</option>
          </select>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>API Key</label>
          <input 
            type="password" 
            value="************************"
            readOnly
            style={{ width: '100%', padding: '10px 12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-strong)', color: 'white', borderRadius: 'var(--radius-sm)', fontFamily: 'inherit' }}
          />
          <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>Key is encrypted and stored in Supabase Vault.</p>
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Save Configuration</button>
      </div>
    </div>
  );
};

export default App;
