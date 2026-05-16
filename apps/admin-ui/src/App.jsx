import React from 'react';
import AdminLayout from './layouts/AdminLayout';
import DomainsPage from './pages/DomainsPage';
import DomainEditor from './pages/DomainEditor';
import DecisionTraceView from './pages/DecisionTraceView';
import DecisionTopologyView from './pages/DecisionTopologyView';
import CognitiveCommandCenter from './pages/CognitiveCommandCenter';
import ShadowRunner from './pages/ShadowRunner';
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
        return <PlaceholderPage title="Telemetry" icon="Activity" />;
      case 'ab_tests':
        return <PlaceholderPage title="A/B Testing" icon="GitMerge" />;
      case 'leads':
        return <PlaceholderPage title="Growth & Leads" icon="Users" />;
      case 'affiliate':
        return <PlaceholderPage title="Affiliate Tags" icon="Tag" />;
      case 'settings':
        return <PlaceholderPage title="Settings" icon="Settings" />;
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
