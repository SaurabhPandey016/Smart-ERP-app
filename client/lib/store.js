'use client';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ── Cookie-based storage (survives refresh, no httpOnly — client-accessible) ──
const cookieStorage = {
  getItem: (name) => {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    if (!match) return null;
    try { return decodeURIComponent(match[1]); } catch { return null; }
  },
  setItem: (name, value) => {
    if (typeof document === 'undefined') return;
    // 7-day expiry, SameSite=Lax for security
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  },
  removeItem: (name) => {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  },
};

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: (user, token) => {
        set({ user, token, isAuthenticated: true });
        // Also write raw token cookie so API interceptor can read it
        cookieStorage.setItem('smarterp_token', token);
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        cookieStorage.removeItem('smarterp_token');
        cookieStorage.removeItem('smarterp-auth');
        cookieStorage.removeItem('smarterp-company');
      },

      getToken: () => get().token,
    }),
    {
      name: 'smarterp-auth',
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
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
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({ selectedCompany: state.selectedCompany }),
    },
  ),
);

// ── UI Store — controls which modals are open (driven by ShortcutHandler) ──
export const useUIStore = create((set) => ({
  ledgerModalOpen: false,
  stockModalOpen: false,
  voucherModalOpen: false,
  voucherModalTab: 'SALES',

  openLedgerModal: () => set({ ledgerModalOpen: true }),
  closeLedgerModal: () => set({ ledgerModalOpen: false }),

  openStockModal: () => set({ stockModalOpen: true }),
  closeStockModal: () => set({ stockModalOpen: false }),

  openVoucherModal: (tab) => set({ voucherModalOpen: true, voucherModalTab: tab || 'SALES' }),
  closeVoucherModal: () => set({ voucherModalOpen: false }),
}));
