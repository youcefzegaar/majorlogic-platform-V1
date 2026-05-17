import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Mail,
  Download,
  RefreshCw,
  CheckCircle,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Clock
} from 'lucide-react';
import { adminService } from '../../api/apiClient';

const PAGE_SIZE = 50;

const LEAD_TYPES = ['email_capture', 'comparison_share', 'affiliate_click', 'newsletter'];

const Badge = ({ children, color = 'var(--accent-primary)' }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', padding: '2px 10px',
    borderRadius: '99px', fontSize: '0.78rem', fontWeight: 600,
    background: `${color}18`, color, border: `1px solid ${color}40`
  }}>{children}</span>
);

const GrowthLeads = () => {
  const [filters, setFilters] = useState({ type: '', opted_in: '', search: '', from: '', to: '' });
  const [applied, setApplied] = useState({});
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const offset = page * PAGE_SIZE;

  const { data: statsData } = useQuery({
    queryKey: ['growth-stats'],
    queryFn: adminService.getGrowthStats,
    staleTime: 30000,
  });

  const { data: leadsData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['leads', applied, offset],
    queryFn: () => adminService.getLeads({ ...applied, limit: PAGE_SIZE, offset }),
    keepPreviousData: true,
  });

  const stats = statsData?.stats || [];
  const leads = leadsData?.leads || [];
  const total = leadsData?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const totalLeads = stats.reduce((acc, s) => acc + parseInt(s.total || 0), 0);

  const applyFilters = () => {
    const clean = {};
    if (filters.type) clean.type = filters.type;
    if (filters.opted_in !== '') clean.opted_in = filters.opted_in;
    if (filters.search.trim()) clean.search = filters.search.trim();
    if (filters.from) clean.from = filters.from;
    if (filters.to) clean.to = filters.to;
    setApplied(clean);
    setPage(0);
  };

  const clearFilters = () => {
    setFilters({ type: '', opted_in: '', search: '', from: '', to: '' });
    setApplied({});
    setPage(0);
  };

  const activeFilterCount = Object.keys(applied).length;

  const exportUrl = `/admin/export-trigger/laptop-student-us`;

  return (
    <div className="page-content">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Growth <span className="text-gradient">Intelligence</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Lead capture performance across ethical acquisition channels.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-outline" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={18} className={isFetching ? 'spin' : ''} /> Refresh
          </button>
          <a href={exportUrl} className="btn btn-primary" target="_blank" rel="noopener noreferrer">
            <Download size={18} /> Export CSV
          </a>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-3" style={{ marginBottom: '24px' }}>
        <div className="card metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            <span>Total Leads</span>
            <Users size={20} color="var(--accent-primary)" />
          </div>
          <div className="metric-value">{totalLeads.toLocaleString()}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>All segments combined</div>
        </div>
        {stats.slice(0, 2).map((s, i) => (
          <div key={i} className="card metric-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.85rem' }}>{s.lead_type.replace(/_/g, ' ')}</span>
              <Mail size={20} color="var(--success)" />
            </div>
            <div className="metric-value">{parseInt(s.total).toLocaleString()}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '8px' }}>
              {s.total > 0 ? Math.round((s.opted_in_count / s.total) * 100) : 0}% opted-in
            </div>
          </div>
        ))}
      </div>

      {/* Filter Panel */}
      <div className="card" style={{ marginBottom: '20px' }}>
        {/* Search Bar + Filter Toggle */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
            <input
              className="input-field"
              placeholder="Search by email..."
              value={filters.search}
              onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              style={{ paddingLeft: '38px' }}
            />
          </div>
          <button
            className="btn btn-outline"
            onClick={() => setShowFilters(v => !v)}
            style={{ position: 'relative' }}
          >
            <Filter size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{
                position: 'absolute', top: '-6px', right: '-6px',
                background: 'var(--accent-primary)', color: '#fff',
                borderRadius: '50%', width: '18px', height: '18px',
                fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{activeFilterCount}</span>
            )}
          </button>
          <button className="btn btn-primary" onClick={applyFilters}>Apply</button>
          {activeFilterCount > 0 && (
            <button className="btn btn-outline" onClick={clearFilters} style={{ padding: '8px 12px' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Lead Type</label>
              <select className="input-field" value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}>
                <option value="">All Types</option>
                {LEAD_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                {stats.filter(s => !LEAD_TYPES.includes(s.lead_type)).map(s => (
                  <option key={s.lead_type} value={s.lead_type}>{s.lead_type.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>Marketing Opt-in</label>
              <select className="input-field" value={filters.opted_in} onChange={(e) => setFilters(f => ({ ...f, opted_in: e.target.value }))}>
                <option value="">All</option>
                <option value="true">Opted In</option>
                <option value="false">Not Opted In</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>From Date</label>
              <input type="date" className="input-field" value={filters.from} onChange={(e) => setFilters(f => ({ ...f, from: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '6px' }}>To Date</label>
              <input type="date" className="input-field" value={filters.to} onChange={(e) => setFilters(f => ({ ...f, to: e.target.value }))} />
            </div>
          </div>
        )}

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
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
                  onClick={() => {
                    const next = { ...applied };
                    delete next[k];
                    setApplied(next);
                    setFilters(f => ({ ...f, [k]: k === 'opted_in' ? '' : '' }));
                    setPage(0);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
            <Clock size={18} color="var(--accent-secondary)" />
            {isLoading ? 'Loading...' : `${total.toLocaleString()} leads`}
            {isFetching && !isLoading && <RefreshCw size={14} className="spin" style={{ color: 'var(--text-tertiary)' }} />}
          </h3>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ background: 'transparent', border: 'none', cursor: page === 0 ? 'not-allowed' : 'pointer', color: page === 0 ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}>
                <ChevronLeft size={20} />
              </button>
              <span>Page {page + 1} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ background: 'transparent', border: 'none', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', color: page >= totalPages - 1 ? 'var(--text-tertiary)' : 'var(--accent-primary)' }}>
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="table-container" style={{ margin: 0 }}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Type</th>
                <th style={{ textAlign: 'center' }}>Marketing Opt-in</th>
                <th>Major / Context</th>
                <th>Captured</th>
              </tr>
            </thead>
            <tbody>
              {leads.length > 0 ? leads.map((lead) => (
                <tr key={lead.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{lead.email}</td>
                  <td>
                    <Badge color="var(--accent-primary)">{lead.lead_type.replace(/_/g, ' ')}</Badge>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {lead.opted_in
                      ? <CheckCircle size={16} color="var(--success)" />
                      : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>—</span>
                    }
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lead.metadata?.major || lead.metadata?.context || '—'}
                  </td>
                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                    {new Date(lead.created_at).toLocaleString()}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-tertiary)' }}>
                    {isLoading ? (
                      <RefreshCw className="spin" size={32} style={{ margin: '0 auto' }} />
                    ) : (
                      <>
                        <Users size={40} style={{ marginBottom: '12px', opacity: 0.2, display: 'block', margin: '0 auto 12px' }} />
                        <p style={{ margin: 0 }}>No leads match your filters.</p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <button className="btn btn-outline" onClick={() => setPage(0)} disabled={page === 0} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>First</button>
            <button className="btn btn-outline" onClick={() => setPage(p => p - 1)} disabled={page === 0} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Prev</button>
            <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)', padding: '0 8px' }}>
              {page + 1} / {totalPages}
            </span>
            <button className="btn btn-outline" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Next</button>
            <button className="btn btn-outline" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Last</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GrowthLeads;
