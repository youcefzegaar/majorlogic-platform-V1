import { useQuery } from '@tanstack/react-query';
import { Plus, RefreshCw } from 'lucide-react';
import { adminService } from '../../api/apiClient';

const DomainsPage = ({ onEdit }) => {
  const { data: domainsData, isLoading, refetch } = useQuery({
    queryKey: ['domains-list'],
    queryFn: adminService.getDomains
  });

  const domains = domainsData?.domains || [];
  const loading = isLoading;

  return (
    <div className="page-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Cognitive <span className="text-gradient">Domains</span></h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage decision boundaries, constraint maps, and intent topologies.</p>
        </div>
        <button className="btn btn-primary"><Plus size={18} /> Create Domain</button>
      </div>

      {loading ? (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>Updated: {new Date(domain.updated_at).toLocaleDateString()}</span>
                <button className="btn btn-outline" style={{ padding: '6px 12px' }} onClick={() => onEdit(domain)}>Edit Logic</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DomainsPage;
