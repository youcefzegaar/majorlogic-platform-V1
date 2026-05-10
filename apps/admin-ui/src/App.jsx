import React, { useState } from 'react';
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
  ShieldCheck
} from 'lucide-react';
import './index.css';

const Sidebar = ({ currentPath, setCurrentPath }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'domains', icon: BrainCircuit, label: 'Cognitive Domains' },
    { id: 'telemetry', icon: Activity, label: 'Telemetry' },
    { id: 'ab_tests', icon: GitMerge, label: 'A/B Testing' },
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

      <nav style={{ flex: 1 }}>
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

      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div className="status-dot active"></div>
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>System Healthy</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>v1.0.0 Stable</p>
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
  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Cognitive <span className="text-gradient">Overview</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Monitor decision engine performance and integrity.</p>
        </div>
        <button className="btn btn-primary">
          <Plus size={18} /> New Domain
        </button>
      </div>

      <div className="grid-4" style={{ marginBottom: '32px' }}>
        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Total Decisions</span>
            <Activity size={20} color="var(--accent-primary)" />
          </div>
          <div className="metric-value">24,592</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px' }}>
            <ArrowUpRight size={14} /> +12% this week
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Avg. Confidence</span>
            <BrainCircuit size={20} color="var(--warning)" />
          </div>
          <div className="metric-value">92%</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            High certainty across intents
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Avg. Integrity Score</span>
            <ShieldCheck size={20} color="var(--success)" />
          </div>
          <div className="metric-value">98.5%</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            Rarely activating recovery
          </div>
        </div>

        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
            <span>Active A/B Tests</span>
            <GitMerge size={20} color="var(--accent-secondary)" />
          </div>
          <div className="metric-value">2</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
            Laptop & Car domains
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
                <th>Avg Confidence</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Laptops (US)</strong></td>
                <td>v1.2.0</td>
                <td><span className="badge badge-success">Active</span></td>
                <td>94%</td>
              </tr>
              <tr>
                <td><strong>Smartphones</strong></td>
                <td>v1.0.1</td>
                <td><span className="badge badge-success">Active</span></td>
                <td>88%</td>
              </tr>
              <tr>
                <td><strong>Real Estate (UK)</strong></td>
                <td>v0.9.0</td>
                <td><span className="badge badge-warning">Draft</span></td>
                <td>-</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: '24px' }}>Recent Recovery Interventions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>Intent: Creative Nomad</span>
                <span className="badge badge-warning">Constraint Relaxed</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
                System dropped constraint <code style={{ color: 'var(--accent-primary)' }}>gate_weight</code> to yield 1 result.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>Just now • Integrity: 60%</div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 600 }}>Intent: Budget Student</span>
                <span className="badge badge-warning">Constraint Relaxed</span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '8px' }}>
                System dropped constraint <code style={{ color: 'var(--accent-primary)' }}>gate_performance</code> to yield 3 results.
              </p>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>2 hours ago • Integrity: 60%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [currentPath, setCurrentPath] = useState('dashboard');

  return (
    <div className="app-container">
      <Sidebar currentPath={currentPath} setCurrentPath={setCurrentPath} />
      <main className="main-content">
        <Topbar />
        {currentPath === 'dashboard' && <DashboardHome />}
        {currentPath !== 'dashboard' && (
          <div className="page-content">
            <h1 style={{ fontSize: '2rem' }}>{currentPath.charAt(0).toUpperCase() + currentPath.slice(1).replace('_', ' ')}</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>This module is currently under construction. Please check back later.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
