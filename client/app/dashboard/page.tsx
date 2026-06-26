'use client';
import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyStore, useUIStore } from '@/lib/store';
import { inventoryAPI, ledgerAPI, voucherAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useState } from 'react';
import { useProtectedPage } from '@/lib/useProtectedPage';

interface Stats {
  customers: number;
  suppliers: number;
  stockItems: number;
  totalStockValue: number;
  lowStockItems: number;
  outOfStock: number;
  totalVouchers: number;
}

interface RecentVoucher {
  id: string;
  number: string;
  type: string;
  date: string;
  netAmount: number;
  status: string;
  partyLedger?: { name: string } | null;
}

const TYPE_COLORS: Record<string, string> = {
  SALES: 'var(--success)',
  PURCHASE: 'var(--info)',
  RECEIPT: 'var(--success)',
  PAYMENT: 'var(--warning)',
  CREDIT_NOTE: 'var(--warning)',
  DEBIT_NOTE: 'var(--warning)',
};

const TYPE_LABELS: Record<string, string> = {
  SALES: 'Sale',
  PURCHASE: 'Purchase',
  RECEIPT: 'Receipt',
  PAYMENT: 'Payment',
  CONTRA: 'Contra',
  CREDIT_NOTE: 'Credit Note',
  DEBIT_NOTE: 'Debit Note',
};

export default function DashboardPage() {
  const router = useRouter();
  const { ready, selectedCompany } = useProtectedPage();
  const { openLedgerModal, openStockModal, openVoucherModal } = useUIStore();

  const [stats, setStats]     = useState<Stats | null>(null);
  const [recent, setRecent]   = useState<RecentVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedIdx, setFocusedIdx] = useState(-1);

  const load = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const cid = selectedCompany.id;
      const [invRes, custRes, suppRes, voucRes] = await Promise.all([
        inventoryAPI(cid).dashboard(),
        ledgerAPI(cid).list('CUSTOMER'),
        ledgerAPI(cid).list('SUPPLIER'),
        voucherAPI(cid).list(),
      ]);
      const inv   = invRes.data.data;
      const custs = custRes.data.data || [];
      const supps = suppRes.data.data || [];
      const vcs   = voucRes.data.data || [];
      setStats({
        customers:       custs.length,
        suppliers:       supps.length,
        stockItems:      inv.summary.totalItems,
        totalStockValue: inv.summary.totalStockValue,
        lowStockItems:   inv.summary.lowStockItems,
        outOfStock:      inv.summary.outOfStock,
        totalVouchers:   vcs.length,
      });
      setRecent(vcs.slice(0, 8));
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  // F5 to refresh
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'F5') { e.preventDefault(); load(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [load]);

  // Bounds check focusedIdx when recent changes
  useEffect(() => {
    setFocusedIdx(-1);
  }, [recent.length]);

  // Keyboard navigation for all dashboard items
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);
      if (isTyping) return;

      const navigables = Array.from(document.querySelectorAll('.db-navigable')) as HTMLElement[];
      if (navigables.length === 0) return;

      const activeEl = document.activeElement as HTMLElement;
      let currentIndex = navigables.indexOf(activeEl);

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = currentIndex === -1 || currentIndex === navigables.length - 1 ? 0 : currentIndex + 1;
        navigables[nextIndex].focus();
        
        const parentTable = navigables[nextIndex].closest('tbody');
        if (parentTable) {
          const rows = Array.from(parentTable.querySelectorAll('tr.db-navigable'));
          const rIdx = rows.indexOf(navigables[nextIndex]);
          setFocusedIdx(rIdx);
        } else {
          setFocusedIdx(-1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        // Let left arrow on the first element escape to focus the sidebar
        if ((currentIndex === 0 || currentIndex === -1) && e.key === 'ArrowLeft') {
          return;
        }
        e.preventDefault();
        const prevIndex = currentIndex === -1 || currentIndex === 0 ? navigables.length - 1 : currentIndex - 1;
        navigables[prevIndex].focus();

        const parentTable = navigables[prevIndex].closest('tbody');
        if (parentTable) {
          const rows = Array.from(parentTable.querySelectorAll('tr.db-navigable'));
          const rIdx = rows.indexOf(navigables[prevIndex]);
          setFocusedIdx(rIdx);
        } else {
          setFocusedIdx(-1);
        }
      } else if (e.key === 'Enter') {
        if (currentIndex !== -1) {
          e.preventDefault();
          activeEl.click();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [recent, focusedIdx, router]);

  if (!ready || !selectedCompany) return null;

  const statCards = stats
    ? [
        { label: 'Total Customers',  value: stats.customers,                  icon: '👥', color: 'var(--info)',    sub: 'Ledger accounts' },
        { label: 'Total Suppliers',   value: stats.suppliers,                  icon: '🏭', color: 'var(--warning)', sub: 'Vendor accounts' },
        { label: 'Stock Items',       value: stats.stockItems,                 icon: '📦', color: 'var(--success)', sub: `${stats.lowStockItems} low · ${stats.outOfStock} out` },
        { label: 'Inventory Value',   value: formatCurrency(stats.totalStockValue), icon: '₹', color: 'var(--accent-light)', sub: 'At purchase price', isMoney: true },
      ]
    : [];

  const quickActions = [
    { label: 'Sales Voucher',   icon: '🧾', shortcut: 'F8',    action: () => { openVoucherModal('SALES');    router.push('/vouchers'); } },
    { label: 'Purchase Voucher',icon: '🛒', shortcut: 'F9',    action: () => { openVoucherModal('PURCHASE'); router.push('/vouchers'); } },
    { label: 'New Ledger',      icon: '📒', shortcut: 'ALT+L', action: () => { openLedgerModal();            router.push('/ledgers');  } },
    { label: 'New Stock Item',  icon: '📦', shortcut: 'ALT+S', action: () => { openStockModal();             router.push('/stock');    } },
  ];

  return (
    <div className="animate-fade-in">
      {/* ── Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">
            ⊞ Gateway of SmartERP
          </div>
          <div className="page-subtitle">{selectedCompany.name} · FY {selectedCompany.financialYear}</div>
        </div>
        <button className="btn btn-secondary" onClick={load} title="Refresh (F5)">
          ↻ Refresh
        </button>
      </div>

      {/* ── Stats grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="skeleton" style={{ height: 90, borderRadius: 10 }} />
          ))}
        </div>
      ) : (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          {statCards.map((s) => (
            <div key={s.label} className="stat-card db-navigable" tabIndex={0}>
              <div className="stat-icon" style={{ color: s.color }}>{s.icon}</div>
              <div className="stat-value" style={{ color: s.isMoney ? s.color : undefined }}>
                {String(s.value)}
              </div>
              <div className="stat-label">{s.label}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Main content grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16 }}>
        {/* Recent Vouchers */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">🧾 Recent Vouchers</div>
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/vouchers')}>
              View All
            </button>
          </div>
          {loading ? (
            <div style={{ padding: 16, color: 'var(--text-muted)' }}>Loading...</div>
          ) : recent.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🧾</div>
              <div className="empty-state-title">No vouchers yet</div>
              <div className="empty-state-desc">Create your first Sales or Purchase voucher</div>
              <button className="btn btn-primary" onClick={() => { openVoucherModal('SALES'); router.push('/vouchers'); }}>
                + New Voucher (F8)
              </button>
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Party</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((v, index) => (
                    <tr
                      key={v.id}
                      onClick={() => router.push('/vouchers')}
                      style={{ cursor: 'pointer' }}
                      className={`db-navigable ${focusedIdx === index ? 'focused-row' : ''}`}
                      tabIndex={0}
                    >
                      <td>
                        <span className="mono" style={{ fontSize: 12, color: 'var(--accent-light)' }}>
                          {v.number}
                        </span>
                      </td>
                      <td>{formatDate(v.date)}</td>
                      <td>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: TYPE_COLORS[v.type] ?? 'var(--text-muted)',
                            padding: '2px 6px',
                            background: 'var(--bg-hover)',
                            borderRadius: 4,
                          }}
                        >
                          {TYPE_LABELS[v.type] ?? v.type}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        {v.partyLedger?.name ?? '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {formatCurrency(v.netAmount)}
                      </td>
                      <td>
                        <span
                          className={`badge ${v.status === 'POSTED' ? 'badge-success' : v.status === 'CANCELLED' ? 'badge-danger' : 'badge-muted'}`}
                        >
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">⚡ Quick Actions</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  className="btn btn-secondary db-navigable"
                  onClick={a.action}
                  style={{ justifyContent: 'flex-start', gap: 10 }}
                >
                  <span style={{ fontSize: 16 }}>{a.icon}</span>
                  <span style={{ flex: 1, textAlign: 'left' }}>{a.label}</span>
                  <span className="nav-shortcut">{a.shortcut}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Company Info */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">🏢 Company Info</div>
              <button
                className="btn btn-ghost btn-sm db-navigable"
                onClick={() => router.push('/companies')}
                title="F1 — Switch Company"
              >
                Switch
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company</div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{selectedCompany.name}</div>
              </div>
              {selectedCompany.gstNumber && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>GSTIN</div>
                  <div className="mono" style={{ fontSize: 12 }}>{selectedCompany.gstNumber}</div>
                </div>
              )}
              {selectedCompany.address && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Address</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{selectedCompany.address}</div>
                </div>
              )}
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financial Year</div>
                <div style={{ fontWeight: 600 }}>{selectedCompany.financialYear}</div>
              </div>
              {selectedCompany.state && (
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>State</div>
                  <div>{selectedCompany.state}</div>
                </div>
              )}
            </div>
          </div>

          {/* Keyboard shortcuts reference */}
          <div className="card" style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
              ⌨ Keyboard Shortcuts
            </div>
            {[
              ['F8', 'New Sales Voucher'],
              ['F9', 'New Purchase Voucher'],
              ['ALT+L', 'New Ledger'],
              ['ALT+S', 'New Stock Item'],
              ['CTRL+H', 'Dashboard'],
              ['CTRL+Q', 'Logout'],
            ].map(([key, label]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span className="shortcut-key mono">{key}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
