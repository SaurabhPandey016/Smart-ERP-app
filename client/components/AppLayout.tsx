'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore, useCompanyStore } from '@/lib/store';
import ShortcutHandler from './ShortcutHandler';

// Pages that render without the sidebar/topbar
const PUBLIC_PATHS = ['/login', '/companies'];

interface NavItem {
  href: string;
  label: string;
  icon: string;
  shortcut: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard',   icon: '⊞', shortcut: 'CTRL+H' },
  { href: '/ledgers',   label: 'Ledgers',     icon: '☰', shortcut: 'ALT+L'  },
  { href: '/vouchers',  label: 'Vouchers',    icon: '⊟', shortcut: 'F8/F9'  },
  { href: '/stock',     label: 'Stock Items', icon: '◫', shortcut: 'ALT+S'  },
];

const BOTTOM_SHORTCUTS = [
  { key: 'F8',       label: 'Sales'     },
  { key: 'F9',       label: 'Purchase'  },
  { key: 'ALT+L',   label: 'New Ledger'},
  { key: 'ALT+S',   label: 'New Stock' },
  { key: 'CTRL+H',  label: 'Dashboard' },
  { key: 'CTRL+Q',  label: 'Logout'    },
  { key: 'ESC',     label: 'Back'      },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, logout }         = useAuthStore();
  const { selectedCompany }      = useCompanyStore();

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  // ── Public pages: full screen, no sidebar
  if (isPublic) {
    return <div className="auth-screen">{children}</div>;
  }

  // ── ERP pages: sidebar + topbar + shortcut bar
  return (
    <div className="erp-layout">
      <ShortcutHandler />

      {/* ── Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">S</div>
          <div>
            <div className="sidebar-logo-text">SmartERP</div>
            <div className="sidebar-logo-sub">Gateway</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Main Menu</div>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
                <span className="nav-shortcut">{item.shortcut}</span>
              </Link>
            );
          })}
        </nav>

        {/* ── User panel */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            marginTop: 'auto',
          }}
        >
          {user && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
                marginBottom: 8,
                lineHeight: 1.4,
              }}
            >
              <div style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                {user.name}
              </div>
              <div>{user.email}</div>
            </div>
          )}
          <button
            className="btn btn-ghost"
            style={{
              width: '100%',
              justifyContent: 'center',
              fontSize: 11,
              padding: '5px',
            }}
            onClick={() => {
              logout();
              router.push('/login');
            }}
          >
            Sign Out
            <span className="nav-shortcut" style={{ marginLeft: 'auto' }}>
              CTRL+Q
            </span>
          </button>
        </div>
      </aside>

      {/* ── Main area */}
      <main className="erp-main">
        {/* Topbar */}
        <div className="topbar">
          <button
            className="topbar-company"
            onClick={() => router.push('/companies')}
            title="Switch Company (F1)"
          >
            <span style={{ fontSize: 14 }}>🏢</span>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {selectedCompany?.name ?? 'Select Company'}
            </span>
            {selectedCompany && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontWeight: 400,
                  marginLeft: 4,
                }}
              >
                FY {selectedCompany.financialYear}
              </span>
            )}
            <span className="nav-shortcut">F1</span>
          </button>

          <div className="topbar-right">
            {selectedCompany?.gstNumber && (
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  padding: '3px 8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                }}
              >
                GSTIN: {selectedCompany.gstNumber}
              </span>
            )}
          </div>
        </div>

        {/* Page content */}
        <div className="erp-content">{children}</div>
      </main>

      {/* ── Bottom shortcut bar */}
      <div className="shortcut-bar" role="navigation" aria-label="Keyboard shortcuts">
        {BOTTOM_SHORTCUTS.map((s, i) => (
          <div key={i} className="shortcut-item">
            <div className="shortcut-key">{s.key}</div>
            <div className="shortcut-label">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
