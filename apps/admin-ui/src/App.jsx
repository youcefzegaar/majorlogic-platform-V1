import React from 'react';
import AdminLayout from './layouts/AdminLayout';
import CognitiveCommandCenter from './features/dashboard/CognitiveCommandCenter';
import DomainsPage from './features/domains/DomainsPage';
import DomainEditor from './features/domains/DomainEditor';
import DecisionTraceView from './features/forensics/DecisionTraceView';
import DecisionTopologyView from './features/forensics/DecisionTopologyView';
import ShadowRunner from './features/shadow-runner/ShadowRunner';
import DashboardHome from './features/dashboard/DashboardHome';
import InterventionFeed from './features/governance/InterventionFeed';
import GrowthLeads from './features/growth/GrowthLeads';
import AffiliateManager from './features/affiliate/AffiliateManager';
import LogicLab from './features/governance/LogicLab';
import CommercialIntegrity from './features/governance/CommercialIntegrity';
import AuditLog from './features/governance/AuditLog';
import IntegrationsPage from './features/integrations/IntegrationsPage';
import SettingsPage from './features/dashboard/SettingsPage';
import GuidePage from './features/guide/GuidePage';
import { useAppStore } from './stores/appStore';
import './index.css';

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
      {renderContent()}
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
