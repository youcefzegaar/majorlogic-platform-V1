import { create } from 'zustand';

export const useAppStore = create((set) => ({
  currentPath: 'dashboard',
  setCurrentPath: (path) => set({ currentPath: path }),
  
  editingDomain: null,
  setEditingDomain: (domain) => set({ editingDomain: domain }),
  
  // System status
  isSystemConnected: true,
  lastSync: new Date().toISOString(),
  
  // Navigation helper
  navigate: (path, params = {}) => {
    set({ currentPath: path });
    if (params.domain) {
      set({ editingDomain: params.domain });
    }
  }
}));
