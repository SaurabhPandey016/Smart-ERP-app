'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
        if (typeof window !== 'undefined') {
          localStorage.setItem('smarterp_token', token);
          localStorage.setItem('smarterp_user', JSON.stringify(user));
        }
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('smarterp_token');
          localStorage.removeItem('smarterp_user');
          localStorage.removeItem('smarterp_company');
        }
      },

      getToken: () => get().token,
    }),
    {
      name: 'smarterp-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
);

export const useCompanyStore = create(
  persist(
    (set, get) => ({
      selectedCompany: null,

      selectCompany: (company) => set({ selectedCompany: company }),
      clearCompany: () => set({ selectedCompany: null }),
      getCompanyId: () => get().selectedCompany?.id,
    }),
    {
      name: 'smarterp-company',
      partialize: (state) => ({ selectedCompany: state.selectedCompany }),
    },
  ),
);
