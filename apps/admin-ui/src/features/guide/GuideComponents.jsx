import { CheckCircle, AlertCircle } from 'lucide-react';

export const Step = ({ n, children }) => (
  <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent-primary)', flexShrink: 0, marginTop: '1px' }}>
      {n}
    </div>
    <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</p>
  </div>
);

export const Tip = ({ children }) => (
  <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', marginTop: '12px' }}>
    <CheckCircle size={15} color="var(--success)" style={{ flexShrink: 0, marginTop: '1px' }} />
    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</p>
  </div>
);

export const Warn = ({ children }) => (
  <div style={{ display: 'flex', gap: '10px', padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '8px', marginTop: '12px' }}>
    <AlertCircle size={15} color="var(--warning, #F59E0B)" style={{ flexShrink: 0, marginTop: '1px' }} />
    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{children}</p>
  </div>
);

export const Badge = ({ label, color }) => (
  <span style={{ display: 'inline-block', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '99px', background: `${color}18`, color, border: `1px solid ${color}35`, marginRight: '5px', fontWeight: 600 }}>{label}</span>
);

export const SectionTitle = ({ icon: Icon, label, color, id }) => (
  <div id={id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: `${color}15`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Icon size={20} color={color} />
    </div>
    <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700 }}>{label}</h2>
  </div>
);
