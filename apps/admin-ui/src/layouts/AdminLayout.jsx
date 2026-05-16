import React from 'react';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import { useAppStore } from '../stores/appStore';

const AdminLayout = ({ children }) => {
  const { currentPath, setCurrentPath } = useAppStore();

  return (
    <div className="app-container">
      <Sidebar currentPath={currentPath} setCurrentPath={setCurrentPath} />
      <main className="main-content">
        <Topbar />
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
