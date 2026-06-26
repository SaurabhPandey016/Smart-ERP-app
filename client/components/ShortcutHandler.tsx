'use client';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, useUIStore } from '@/lib/store';

/**
 * ShortcutHandler — global keyboard shortcut listener.
 * Renders nothing. Mounted once at the app-layout level.
 *
 * Global shortcuts (always active):
 *   CTRL+H       → Dashboard
 *   CTRL+Q       → Logout
 *
 * Navigation shortcuts (skipped when typing in input/textarea/select):
 *   F8           → Vouchers — Sales
 *   F9           → Vouchers — Purchase
 *   ALT+L        → Open Create Ledger modal
 *   ALT+S        → Open Create Stock Item modal
 *   CTRL+N       → Open Create Stock Item modal
 *   CTRL+B       → Open Create Sales Voucher modal
 *   ALT+F8       → Open Create Sales Voucher modal
 *   ALT+F9       → Open Create Purchase Voucher modal
 *   CTRL+P       → PDF download (page handles this)
 *   ESC          → Go back
 */
export default function ShortcutHandler() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuthStore();
  const { openLedgerModal, openStockModal, openVoucherModal } = useUIStore();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName ?? '';
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      // ── Always-active global shortcuts
      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        router.push('/dashboard');
        return;
      }

      if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        logout();
        router.push('/login');
        return;
      }

      // ── Skip rest when user is typing
      if (isTyping) return;

      // ── Voucher navigation
      if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'F8') {
        e.preventDefault();
        openVoucherModal('SALES');
        router.push('/vouchers');
        return;
      }

      if (!e.ctrlKey && !e.altKey && !e.shiftKey && e.key === 'F9') {
        e.preventDefault();
        openVoucherModal('PURCHASE');
        router.push('/vouchers');
        return;
      }

      // ── ALT combos
      if (e.altKey && !e.ctrlKey) {
        if (e.key.toLowerCase() === 'l') {
          e.preventDefault();
          openLedgerModal();
          router.push('/ledgers');
          return;
        }
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          openStockModal();
          router.push('/stock');
          return;
        }
        if (e.key.toLowerCase() === 'm' && e.altKey) {
          e.preventDefault();
          const sidebarItems = Array.from(document.querySelectorAll('.sidebar-nav .nav-item')) as HTMLElement[];
          const activeItem = document.querySelector('.sidebar-nav .nav-item.active') as HTMLElement;
          if (activeItem) {
            activeItem.focus();
          } else if (sidebarItems.length > 0) {
            sidebarItems[0].focus();
          }
          return;
        }
        if (e.key === 'F8') {
          e.preventDefault();
          openVoucherModal('SALES');
          router.push('/vouchers');
          return;
        }
        if (e.key === 'F9') {
          e.preventDefault();
          openVoucherModal('PURCHASE');
          router.push('/vouchers');
          return;
        }
      }

      // ── CTRL combos
      if (e.ctrlKey && !e.altKey) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          openStockModal();
          router.push('/stock');
          return;
        }
        if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          openVoucherModal('SALES');
          router.push('/vouchers');
          return;
        }
      }

      // ── Escape — go back
      if (e.key === 'Escape') {
        router.back();
        return;
      }

      // ── Sidebar focus routing via Arrow keys (when not typing or in a modal)
      const isModalOpen = !!document.querySelector('.modal-overlay');
      if (isTyping || isModalOpen) return;

      const activeClass = document.activeElement?.className || '';
      const isTab = activeClass.includes('tab-btn');

      // ArrowLeft focuses the sidebar
      if (e.key === 'ArrowLeft' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const isSidebarFocused = !!document.activeElement?.closest('.sidebar');
        if (!isSidebarFocused && !isTab) {
          e.preventDefault();
          const activeItem = document.querySelector('.sidebar-nav .nav-item.active') as HTMLElement;
          if (activeItem) {
            activeItem.focus();
          } else {
            const firstItem = document.querySelector('.sidebar-nav .nav-item') as HTMLElement;
            firstItem?.focus();
          }
        }
        return;
      }

      // ArrowRight focuses the main content from sidebar
      if (e.key === 'ArrowRight' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const isSidebarFocused = !!document.activeElement?.closest('.sidebar');
        if (isSidebarFocused) {
          e.preventDefault();
          const firstContentEl = document.querySelector('.erp-content input, .erp-content select, .erp-content textarea, .erp-content button, .erp-content a, .erp-content [tabindex="0"]') as HTMLElement;
          if (firstContentEl) {
            firstContentEl.focus();
          }
        }
        return;
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, pathname, logout, openLedgerModal, openStockModal, openVoucherModal]);

  return null;
}
