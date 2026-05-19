import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAppStore } from '../stores/appStore';

const AdminLayout = ({ children }) => {
  const { currentPath, setCurrentPath } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavigate = (path) => {
    setCurrentPath(path);
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  return (
    <div className={`app-container${sidebarOpen ? ' sidebar-open' : ''}`}>
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <Sidebar currentPath={currentPath} setCurrentPath={handleNavigate} />
      <main className="main-content">
        <Topbar onMenuClick={() => setSidebarOpen(s => !s)} />
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
