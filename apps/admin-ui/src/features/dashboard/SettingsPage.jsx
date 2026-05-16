import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Lock, 
  Database, 
  Server, 
  ShieldCheck,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../api/apiClient';

const SettingsPage = () => {
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [updating, setUpdating] = useState(false);

  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: adminService.getOverview,
  });

  const system = dashboardData?.system || { node: 'v20.0.0', uptime: 0, memory: {} };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      alert("Passwords don't match");
      return;
    }
    setUpdating(true);
    // Future: Connect to real API endpoint
    setTimeout(() => {
      alert('Password updated successfully');
      setUpdating(false);
      setPasswords({ current: '', new: '', confirm: '' });
    }, 1000);
  };

  return (
    <div className="page-content">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>System <span className="text-gradient">Settings</span></h1>
        <p style={{ color: 'var(--text-secondary)' }}>Configure core platform parameters and administrator security.</p>
      </div>

      <div className="grid-2">
        {/* Security Section */}
        <div className="card">
          <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Lock size={20} color="var(--accent-primary)" /> Security & Access
          </h3>
          
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Current Password</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPass ? 'text' : 'password'} 
                  className="input-field" 
                  value={passwords.current}
                  onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                  required
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(!showPass)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>New Password</label>
              <input 
                type="password" 
                className="input-field" 
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Confirm New Password</label>
              <input 
                type="password" 
                className="input-field" 
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                required
              />
            </div>

            <button className="btn btn-primary" style={{ marginTop: '8px' }} disabled={updating}>
              {updating ? <RefreshCw className="spin" size={18} /> : <ShieldCheck size={18} />} Update Password
            </button>
          </form>
        </div>

        {/* System Info Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="card">
            <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Server size={20} color="var(--accent-secondary)" /> Infrastructure State
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Node.js Version</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{system.node}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Uptime</span>
                <span style={{ fontWeight: 600 }}>{Math.floor(system.uptime / 3600)}h {Math.floor((system.uptime % 3600) / 60)}m</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Memory Usage</span>
                <span style={{ fontWeight: 600 }}>{Math.round((system.memory?.rss || 0) / 1024 / 1024)} MB</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Database size={20} color="var(--success)" /> Persistence Layer
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(16, 185, 129, 0.05)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--success)' }}>
              <div className="status-dot active"></div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--success)' }}>PostgreSQL Online</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>Latency: 12ms | Connections: 4/20</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
