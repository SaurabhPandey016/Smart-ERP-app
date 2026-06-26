'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
        if (e.key.toLowerCase() === 'm') {
          e.preventDefault();
          const sidebarItems = Array.from(document.querySelectorAll('.sidebar-nav .nav-item')) as HTMLElement[];
          if (sidebarItems.length > 0) {
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
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router, logout, openLedgerModal, openStockModal, openVoucherModal]);

  return null;
}
