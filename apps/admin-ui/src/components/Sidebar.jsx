import {
  LayoutDashboard,
  BrainCircuit,
  Activity,
  Scale,
  Users,
  Tag,
  Settings,
  FlaskConical,
  ClipboardList,
  Plug,
  BookOpen,
} from 'lucide-react';

const Sidebar = ({ currentPath, setCurrentPath }) => {
  const menuItems = [
    { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'domains',      icon: BrainCircuit,    label: 'Cognitive Domains' },
    { id: 'logic_lab',    icon: FlaskConical,    label: 'Logic Lab' },
    { id: 'telemetry',    icon: Activity,        label: 'Telemetry' },
    { id: 'ab_tests',     icon: Scale,           label: 'Commercial Integrity' },
    { id: 'leads',        icon: Users,           label: 'Growth & Leads' },
    { id: 'affiliate',    icon: Tag,             label: 'Affiliate Tags' },
    { id: 'integrations', icon: Plug,            label: 'Integrations' },
    { id: 'audit_log',    icon: ClipboardList,   label: 'Audit Trail' },
    { id: 'settings',     icon: Settings,        label: 'Settings' },
    { id: 'guide',        icon: BookOpen,        label: 'Platform Guide' },
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

export default Sidebar;
