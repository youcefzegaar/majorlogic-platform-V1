import { Search, Bell, Menu } from 'lucide-react';

const Topbar = ({ onMenuClick }) => {
  return (
    <header className="topbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button className="menu-btn" onClick={onMenuClick} aria-label="Toggle menu">
          <Menu size={22} />
        </button>
        <div className="topbar-search">
          <Search size={18} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search..."
            style={{ background: 'transparent', border: 'none', color: 'white', marginLeft: '10px', outline: 'none', width: '100%', fontFamily: 'inherit', fontSize: '0.9rem' }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button className="btn btn-outline" style={{ border: 'none', padding: '8px' }}>
          <Bell size={20} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
          <div className="topbar-username">
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Admin</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)' }}>Superadmin</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: '#2d2d3a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>
            AU
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
