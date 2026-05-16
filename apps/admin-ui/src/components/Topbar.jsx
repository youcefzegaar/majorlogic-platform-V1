import React from 'react';
import { Search, Bell } from 'lucide-react';

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

export default Topbar;
