import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw, Database, CheckCircle, XCircle, Loader } from 'lucide-react';
import { adminService } from '../../api/apiClient';

// ── RebuildPanel ──────────────────────────────────────────────────────────────
function RebuildPanel({ domain, onClose }) {
  const [jobId, setJobId]     = useState(null);
  const [job, setJob]         = useState(null);
  const [starting, setStart]  = useState(false);
  const [error, setError]     = useState(null);
  const logRef                = useRef(null);
  const pollRef               = useRef(null);

  const startRebuild = async () => {
    setStart(true);
    setError(null);
    try {
      const res = await adminService.rebuildCatalog(domain.slug);
      setJobId(res.jobId);
    } catch (e) {
      const msg = e?.response?.data?.error;
      if (msg === 'rebuild_running') {
        setError('تحديث جارٍ بالفعل لهذا الـ domain.');
      } else {
        setError(e?.response?.data?.message ?? 'فشل بدء التحديث.');
      }
    } finally {
      setStart(false);
    }
  };

  // Poll every 2s while running
  useEffect(() => {
    if (!jobId) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await adminService.getCatalogRebuildStatus(jobId);
        setJob(res);
        if (res.status !== 'running') clearInterval(pollRef.current);
      } catch { clearInterval(pollRef.current); }
    }, 2000);
    return () => clearInterval(pollRef.current);
  }, [jobId]);

  // Auto-scroll logs
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [job?.logs?.length]);

  const statusIcon = !job ? null
    : job.status === 'running' ? <Loader size={16} className="spin" style={{ color: 'var(--accent-warning)' }} />
    : job.status === 'done'    ? <CheckCircle size={16} style={{ color: 'var(--accent-success)' }} />
    :                            <XCircle size={16} style={{ color: 'var(--accent-danger)' }} />;

  const statusLabel = !job ? '' : job.status === 'running' ? 'جارٍ التحديث…' : job.status === 'done' ? 'اكتمل بنجاح' : 'فشل التحديث';

  const elapsed = job?.startedAt
    ? job.finishedAt
      ? `${((job.finishedAt - job.startedAt) / 1000).toFixed(1)}s`
      : `${((Date.now() - job.startedAt) / 1000).toFixed(0)}s…`
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div className="card" style={{ width: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>تحديث الكتالوج</h3>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{domain.slug}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {/* Description */}
        {!job && (
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            سيقوم هذا الإجراء بتشغيل pipeline الكتالوج الكامل:<br />
            <strong>1.</strong> استيراد البيانات الخام &nbsp;→&nbsp;
            <strong>2.</strong> نشر الكتالوج &nbsp;→&nbsp;
            <strong>3.</strong> توليد صفحات SEO
          </p>
        )}

        {/* Status bar */}
        {job && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            background: 'var(--surface-elevated)', borderRadius: 8,
            border: `1px solid ${job.status === 'done' ? 'var(--accent-success)' : job.status === 'error' ? 'var(--accent-danger)' : 'var(--accent-warning)'}`
          }}>
            {statusIcon}
            <span style={{ fontSize: 13, fontWeight: 600 }}>{statusLabel}</span>
            {elapsed && <span style={{ marginRight: 'auto', fontSize: 12, color: 'var(--text-secondary)' }}>{elapsed}</span>}
          </div>
        )}

        {/* Logs */}
        {job?.logs?.length > 0 && (
          <div ref={logRef} style={{
            flex: 1, overflowY: 'auto', background: '#0d1117', borderRadius: 8,
            padding: '12px 14px', fontFamily: 'monospace', fontSize: 12,
            lineHeight: 1.6, color: '#c9d1d9', maxHeight: 320, minHeight: 120
          }}>
            {job.logs.filter(l => l.trim()).map((line, i) => (
              <div key={i} style={{
                color: line.includes('✅') || line.includes('successfully') ? '#3fb950'
                     : line.includes('❌') || line.includes('failed') || line.includes('Error') ? '#f85149'
                     : line.includes('[') ? '#79c0ff'
                     : '#c9d1d9'
              }}>{line}</div>
            ))}
            {job.status === 'running' && (
              <div style={{ color: '#ffa657', marginTop: 4 }}>▋</div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(248,81,73,0.1)', border: '1px solid var(--accent-danger)', borderRadius: 8, fontSize: 13, color: 'var(--accent-danger)' }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={onClose}>
            {job?.status === 'done' ? 'إغلاق' : 'إلغاء'}
          </button>
          {!job && (
            <button className="btn btn-primary" onClick={startRebuild} disabled={starting}>
              {starting ? <><Loader size={14} className="spin" /> جارٍ البدء…</> : <><RefreshCw size={14} /> ابدأ التحديث</>}
            </button>
          )}
          {job?.status === 'error' && (
            <button className="btn btn-primary" onClick={() => { setJob(null); setJobId(null); startRebuild(); }}>
              <RefreshCw size={14} /> إعادة المحاولة
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DomainsPage ───────────────────────────────────────────────────────────────
const DomainsPage = ({ onEdit }) => {
  const { data: domainsData, isLoading, refetch } = useQuery({
    queryKey: ['domains-list'],
    queryFn: adminService.getDomains
  });
  const [rebuildDomain, setRebuildDomain] = useState(null);

  const domains = domainsData?.domains || [];

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Cognitive <span className="text-gradient">Domains</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage decision boundaries, constraint maps, and intent topologies.</p>
        </div>
        <button className="btn btn-primary"><Plus size={18} /> Create Domain</button>
      </div>

      {isLoading ? (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', gap: 8 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                  Updated: {new Date(domain.updated_at).toLocaleDateString()}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => setRebuildDomain(domain)}
                    title="تحديث الكتالوج"
                  >
                    <Database size={13} /> تحديث
                  </button>
                  <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => onEdit(domain)}>
                    Edit Logic
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rebuildDomain && (
        <RebuildPanel
          domain={rebuildDomain}
          onClose={() => { setRebuildDomain(null); refetch(); }}
        />
      )}
    </div>
  );
};

export default DomainsPage;
