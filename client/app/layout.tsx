import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import ShortcutHandler from '@/components/ShortcutHandler';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SmartERP — Business Management System',
  description: 'Tally-inspired ERP for managing ledgers, vouchers, inventory, and billing',
  keywords: ['ERP', 'accounting', 'inventory', 'GST', 'billing', 'ledger'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <div className="erp-layout">
          <ShortcutHandler />
          <aside className="sidebar">
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">S</div>
              <div>
                <div className="sidebar-logo-text">SmartERP</div>
                <div className="sidebar-logo-sub">Gateway</div>
              </div>
            </div>
            <nav className="sidebar-nav">
              <div className="nav-section-label">Main</div>
              <a href="/dashboard" className="nav-item">
                <span className="nav-icon">🏠</span>
                Dashboard
                <span className="nav-shortcut">CTRL+H</span>
              </a>
              <a href="/ledgers" className="nav-item">
                <span className="nav-icon">📒</span>
                Ledgers
                <span className="nav-shortcut">ALT+L</span>
              </a>
              <a href="/vouchers" className="nav-item">
                <span className="nav-icon">🧾</span>
                Vouchers
                <span className="nav-shortcut">F8</span>
              </a>
              <a href="/stock" className="nav-item">
                <span className="nav-icon">📦</span>
                Stock
                <span className="nav-shortcut">CTRL+N</span>
              </a>
            </nav>
          </aside>
          <main className="erp-main">
            <div className="topbar">
              <div className="topbar-company">Select Company</div>
              <div className="topbar-right">&nbsp;</div>
            </div>
            <div className="erp-content">{children}</div>
          </main>
          <div className="shortcut-bar" role="navigation" aria-label="Shortcuts">
            <div className="shortcut-item"><div className="shortcut-key">F8</div><div className="shortcut-label">New Invoice</div></div>
            <div className="shortcut-item"><div className="shortcut-key">ALT+L</div><div className="shortcut-label">New Ledger</div></div>
            <div className="shortcut-item"><div className="shortcut-key">CTRL+N</div><div className="shortcut-label">New Item</div></div>
            <div className="shortcut-item"><div className="shortcut-key">CTRL+P</div><div className="shortcut-label">Print</div></div>
          </div>
        </div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            },
          }}
          richColors
        />
      </body>
    </html>
  );
}
