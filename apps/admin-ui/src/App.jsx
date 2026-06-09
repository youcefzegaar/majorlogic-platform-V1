import React, { Suspense, lazy } from 'react';
import AdminLayout from './layouts/AdminLayout';
import DashboardHome from './features/dashboard/DashboardHome';
import { useAppStore } from './stores/appStore';
import './index.css';

// Lazy-loaded feature pages — split into separate chunks to reduce initial bundle
const CognitiveCommandCenter = lazy(() => import('./features/dashboard/CognitiveCommandCenter'));
const DomainsPage             = lazy(() => import('./features/domains/DomainsPage'));
const DomainEditor            = lazy(() => import('./features/domains/DomainEditor'));
const DecisionTraceView       = lazy(() => import('./features/forensics/DecisionTraceView'));
const DecisionTopologyView    = lazy(() => import('./features/forensics/DecisionTopologyView'));
const ShadowRunner            = lazy(() => import('./features/shadow-runner/ShadowRunner'));
const InterventionFeed        = lazy(() => import('./features/governance/InterventionFeed'));
const GrowthLeads             = lazy(() => import('./features/growth/GrowthLeads'));
const AffiliateManager        = lazy(() => import('./features/affiliate/AffiliateManager'));
const LogicLab                = lazy(() => import('./features/governance/LogicLab'));
const CommercialIntegrity     = lazy(() => import('./features/governance/CommercialIntegrity'));
const SacrificeVector         = lazy(() => import('./features/governance/SacrificeVector'));
const AuditLog                = lazy(() => import('./features/governance/AuditLog'));
const IntegrationsPage        = lazy(() => import('./features/integrations/IntegrationsPage'));
const SettingsPage            = lazy(() => import('./features/dashboard/SettingsPage'));
const GuidePage               = lazy(() => import('./features/guide/GuidePage'));

const App = () => {
  const { currentPath, navigate, editingDomain } = useAppStore();

  const renderContent = () => {
    switch (currentPath) {
      case 'dashboard':
        return <CognitiveCommandCenter />;
      case 'domains':
        return <DomainsPage onEdit={(domain) => navigate('domain_editor', { domain })} />;
      case 'domain_editor':
        return <DomainEditor domain={editingDomain} onBack={() => navigate('domains')} />;
      case 'decision_trace':
        return <DecisionTraceView traceId={editingDomain} onBack={() => navigate('dashboard')} />;
      case 'decision_topology':
        return <DecisionTopologyView config={editingDomain?.config || {}} onBack={() => navigate('domain_editor', { domain: editingDomain })} />;
      case 'shadow_runner':
        return <ShadowRunner domain={editingDomain} onBack={() => navigate('domain_editor', { domain: editingDomain })} />;
      case 'telemetry':
        return <InterventionFeed />;
      case 'ab_tests':
        return <CommercialIntegrity />;
      case 'sacrifice_vector':
        return <SacrificeVector />;
      case 'leads':
        return <GrowthLeads />;
      case 'affiliate':
        return <AffiliateManager />;
      case 'logic_lab':
        return <LogicLab />;
      case 'audit_log':
        return <AuditLog />;
      case 'integrations':
        return <IntegrationsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'guide':
        return <GuidePage />;
      default:
        return <DashboardHome />;
    }
  };

  return (
    <AdminLayout>
      <Suspense fallback={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--text-muted, #9ca3af)', fontSize: 14 }}>
          Loading…
        </div>
      }>
        {renderContent()}
      </Suspense>
    </AdminLayout>
  );
};

const PlaceholderPage = ({ title, icon }) => (
  <div className="page-content">
    <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>{title}</h1>
    <div className="card" style={{ marginTop: '32px', textAlign: 'center', padding: '100px', border: '1px dashed var(--border-subtle)' }}>
      <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🧠</div>
      <p style={{ color: 'var(--text-secondary)' }}>
        This module is being migrated to the <strong>Enterprise Cognitive Control Plane (V2)</strong>.
      </p>
    </div>
  </div>
);

export default App;
