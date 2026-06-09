import { useState } from 'react';
import {
  BookOpen, LayoutDashboard, BrainCircuit, FlaskConical,
  Activity, Scale, Users, Tag, Plug, ClipboardList, Settings,
} from 'lucide-react';
import { SectionTitle } from './GuideComponents';
import { sections } from './GuideSections';

const SECTIONS = [
  { id: 'overview',     icon: BookOpen,        label: 'Platform Overview',    color: '#8B5CF6' },
  { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard',            color: '#6366F1' },
  { id: 'domains',      icon: BrainCircuit,    label: 'Cognitive Domains',    color: '#3B82F6' },
  { id: 'logic_lab',    icon: FlaskConical,    label: 'Logic Lab',            color: '#10B981' },
  { id: 'telemetry',    icon: Activity,        label: 'Telemetry',            color: '#F97316' },
  { id: 'ab_tests',     icon: Scale,           label: 'Commercial Integrity', color: '#F59E0B' },
  { id: 'leads',        icon: Users,           label: 'Growth & Leads',       color: '#EC4899' },
  { id: 'affiliate',    icon: Tag,             label: 'Affiliate Routing',    color: '#14B8A6' },
  { id: 'integrations', icon: Plug,            label: 'Integrations',         color: '#A78BFA' },
  { id: 'audit_log',    icon: ClipboardList,   label: 'Audit Trail',          color: '#64748B' },
  { id: 'settings',     icon: Settings,        label: 'Settings',             color: '#94A3B8' },
];

const GuidePage = () => {
  const [active, setActive] = useState('overview');
  const sec = SECTIONS.find(s => s.id === active);

  return (
    <div className="page-content" style={{ display: 'flex', gap: '0', padding: 0, maxWidth: '100%', height: '100%' }}>

      {/* Left nav */}
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

      {/* Content */}
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
