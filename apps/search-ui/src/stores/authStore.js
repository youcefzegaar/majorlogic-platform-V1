import { create } from 'zustand';

const apiUrl = import.meta.env.VITE_API_URL || 'https://majorlogicapi-production.up.railway.app';

function getCsrfToken() {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthLoading: true,
  authError: null,
  showAuthModal: false,
  authModalMode: 'login',

  setUser: (user) => set({ user }),
  setAuthError: (authError) => set({ authError }),
  setShowAuthModal: (showAuthModal) => set({ showAuthModal }),
  setAuthModalMode: (authModalMode) => set({ authModalMode }),

  checkSession: async () => {
    try {
      const res = await fetch(`${apiUrl}/auth/me`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user ?? data, isAuthLoading: false });
      } else {
        set({ user: null, isAuthLoading: false });
      }
    } catch {
      set({ user: null, isAuthLoading: false });
    }
  },

  login: async ({ email, password }) => {
    set({ authError: null });
    // checkSession already ran on mount and set the CSRF cookie
    const csrf = getCsrfToken();
    try {
      const res = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ user: data.user ?? data, showAuthModal: false });
        return { success: true };
      } else {
        const error = data.error || data.message || 'Login failed';
        set({ authError: error });
        return { success: false, error };
      }
    } catch (err) {
      const error = err.message || 'Network error';
      set({ authError: error });
      return { success: false, error };
    }
  },

  register: async ({ email, password, displayName }) => {
    set({ authError: null });
    const csrf = getCsrfToken();
    try {
      const res = await fetch(`${apiUrl}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ user: data.user ?? data, showAuthModal: false });
        return { success: true };
      } else {
        const error = data.error || data.message || 'Registration failed';
        set({ authError: error });
        return { success: false, error };
      }
    } catch (err) {
      const error = err.message || 'Network error';
      set({ authError: error });
      return { success: false, error };
    }
  },

  updateAccount: async ({ currentPassword, newPassword, displayName, locale }) => {
    const csrf = getCsrfToken();
    try {
      const res = await fetch(`${apiUrl}/auth/account`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
        body: JSON.stringify({ currentPassword, newPassword, displayName, locale }),
      });
      const data = await res.json();
      if (res.ok) {
        set({ user: data.user });
        return { success: true };
      }
      return { success: false, error: data.message || data.error || 'Update failed' };
    } catch (err) {
      return { success: false, error: err.message || 'Network error' };
    }
  },

  logout: async () => {
    try {
      await fetch(`${apiUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // best-effort
    }
    set({ user: null });
  },
}));
