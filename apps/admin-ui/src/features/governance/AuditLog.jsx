import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardList,
  RefreshCw,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  LogIn,
  LogOut,
  Save,
  Zap,
  Download,
  Key,
  Tag
} from 'lucide-react';
import { adminService } from '../../api/apiClient';

const PAGE_SIZE = 50;

const ACTION_META = {
  login:            { label: 'Login',           icon: LogIn,       color: 'var(--success)' },
  logout:           { label: 'Logout',          icon: LogOut,      color: 'var(--text-secondary)' },
  save_logic:       { label: 'Save Logic',      icon: Save,        color: 'var(--accent-primary)' },
  simulate:         { label: 'Simulate',        icon: Zap,         color: 'var(--warning)' },
  export_leads:     { label: 'Export Leads',    icon: Download,    color: 'var(--accent-secondary)' },
  export_token:     { label: 'Export Token',    icon: Key,         color: 'var(--text-tertiary)' },
  update_affiliate: { label: 'Affiliate Update',icon: Tag,         color: 'var(--accent-primary)' },
  change_password:  { label: 'Password Change', icon: Key,         color: 'var(--warning)' },
};

const KNOWN_ACTIONS = Object.keys(ACTION_META);

const ActionBadge = ({ action, status }) => {
  const meta = ACTION_META[action] || { label: action, icon: ClipboardList, color: 'var(--text-secondary)' };
  const Icon = meta.icon;
  const color = status === 'error' ? 'var(--error)' : meta.color;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      padding: '3px 10px', borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}40`
    }}>
      <Icon size={12} />
      {meta.label}
    </span>
  );
};

const AuditLog = () => {
  const [filters, setFilters] = useState({ username: '', action: '', from: '', to: '' });
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const offset = page * PAGE_SIZE;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['audit-log', applied, offset],
    queryFn: () => adminService.getAuditLog({ ...applied, limit: PAGE_SIZE, offset }),
    keepPreviousData: true,
    refetchInterval: 30000,
  });

  const events = data?.events || [];
  const total  = data?.total  || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const activeCount = Object.keys(applied).length;

  const applyFilters = () => {
    const clean = {};
    if (filters.username.trim()) clean.username = filters.username.trim();
    if (filters.action)         clean.action   = filters.action;
    if (filters.from)           clean.from     = filters.from;
    if (filters.to)             clean.to       = filters.to;
    setApplied(clean);
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ username: '', action: '', from: '', to: '' });
    setApplied({});
    setPage(0);
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
  };

  const Pagination = () => totalPages > 1 ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
      <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
        style={{ background: 'transparent', border: 'none', cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}>
        <ChevronLeft size={20} />
      </button>
      <span>{page + 1} / {totalPages}</span>
      <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
        style={{ background: 'transparent', border: 'none', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', color: page >= totalPages - 1 ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}>
        <ChevronRight size={20} />
      </button>
    </div>
  ) : null;

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Audit <span className="text-gradient">Trail</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Complete record of every admin action — who did what and when.</p>
        </div>
        <button className="btn btn-outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={18} className={isFetching ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              className="input-field"
              placeholder="Filter by username..."
              value={filters.username}
              onChange={(e) => setFilters(f => ({ ...f, username: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              style={{ paddingLeft: '38px' }}
            />
          </div>
          <button className="btn btn-outline" onClick={() => setShowFilters(v => !v)} style={{ position: 'relative' }}>
            <Filter size={16} /> Filters
            {activeCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                background: 'var(--accent-primary)', color: '#fff',
                borderRadius: '50%', width: '18px', height: '18px',
                fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{activeCount}</span>
            )}
          </button>
          <button className="btn btn-primary" onClick={applyFilters}>Apply</button>
          {activeCount > 0 && (
            <button className="btn btn-outline" onClick={clearFilters} style={{ padding: '8px 12px' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Action Type</label>
              <select className="input-field" value={filters.action} onChange={(e) => setFilters(f => ({ ...f, action: e.target.value }))}>
                <option value="">All Actions</option>
                {KNOWN_ACTIONS.map(a => <option key={a} value={a}>{ACTION_META[a].label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>From</label>
              <input type="date" className="input-field" value={filters.from} onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>To</label>
              <input type="date" className="input-field" value={filters.to} onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))} />
            </div>
          </div>
        )}

        {activeCount > 0 && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            {Object.entries(applied).map(([k, v]) => (
              <div key={k} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)',
                borderRadius: '99px', padding: '3px 10px', fontSize: '0.8rem'
              }}>
                <span style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', fontSize: '0.7rem' }}>{k}:</span>
                <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{String(v)}</span>
                <X size={12} style={{ cursor: 'pointer', color: 'var(--text-tertiary)' }}
                  onClick={() => { const n = { ...applied }; delete n[k]; setApplied(n); setPage(0); }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ClipboardList size={18} color="var(--accent-secondary)" />
            {isLoading ? 'Loading...' : `${total.toLocaleString()} events`}
            {isFetching && !isLoading && <RefreshCw size={14} className="spin" style={{ color: 'var(--text-tertiary)' }} />}
          </span>
          <Pagination />
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table-container" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Details</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {events.length > 0 ? events.map((ev) => (
                <tr key={ev.id}>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {formatTime(ev.created_at)}
                  </td>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    {ev.username}
                  </td>
                  <td>
                    <ActionBadge action={ev.action} status={ev.status} />
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: '0.82rem' }}>
                    {ev.resource || '—'}
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', maxWidth: '200px' }}>
                    {ev.details && Object.keys(ev.details).length > 0
                      ? Object.entries(ev.details).map(([k, v]) => `${k}: ${v}`).join(', ')
                      : '—'
                    }
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {ev.status === 'success'
                      ? <CheckCircle size={16} color="var(--success)" />
                      : <AlertTriangle size={16} color="var(--error)" />
                    }
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                    {ev.ip_address || '—'}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                    {isLoading
                      ? <RefreshCw className="spin" size={32} style={{ margin: '0 auto' }} />
                      : <><ClipboardList size={40} style={{ marginBottom: '12px', opacity: 0.2, display: 'block', margin: '0 auto 12px' }} /><p style={{ margin: 0 }}>No audit events yet. Actions will appear here automatically.</p></>
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button className="btn btn-outline" onClick={() => setPage(0)} disabled={page === 0} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>First</button>
            <button className="btn btn-outline" onClick={() => setPage(p => p - 1)} disabled={page === 0} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Prev</button>
            <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 8px' }}>{page + 1} / {totalPages}</span>
            <button className="btn btn-outline" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Next</button>
            <button className="btn btn-outline" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Last</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLog;
