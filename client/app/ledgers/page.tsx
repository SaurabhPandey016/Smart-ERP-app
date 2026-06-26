'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { ledgerAPI } from '@/lib/api';
import { useUIStore } from '@/lib/store';
import { formatCurrency, formatDate, LEDGER_TYPES } from '@/lib/utils';
import { useProtectedPage } from '@/lib/useProtectedPage';

// ── Types ──────────────────────────────────────────────────────────────────

interface Ledger {
  id: string;
  name: string;
  type: string;
  balance: number;
  openingBalance: number;
  phone?: string;
  email?: string;
  address?: string;
  gstNumber?: string;
}

interface StatementVoucher {
  id: string;
  number: string;
  type: string;
  date: string;
  netAmount: number;
}

interface StatementData {
  ledger: Ledger;
  vouchers: StatementVoucher[];
}

interface LedgerFormValues {
  name: string;
  type: string;
  openingBalance: number;
  phone: string;
  email: string;
  address: string;
  gstNumber: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

const TABS = [
  { key: 'CUSTOMER', label: 'Customers', icon: '👥' },
  { key: 'SUPPLIER', label: 'Suppliers', icon: '🏭' },
  { key: '',         label: 'All',       icon: '☰'  },
] as const;

const TYPE_BADGE: Record<string, string> = {
  CUSTOMER: 'badge-info',
  SUPPLIER: 'badge-warning',
  EXPENSE:  'badge-danger',
  INCOME:   'badge-success',
  BANK:     'badge-accent',
  CASH:     'badge-muted',
};

const VOUCHER_DEBIT_TYPES = new Set(['SALES', 'DEBIT_NOTE']);

// ── Component ──────────────────────────────────────────────────────────────

export default function LedgersPage() {
  const router = useRouter();
  const { ready, selectedCompany } = useProtectedPage();
  const { ledgerModalOpen, closeLedgerModal } = useUIStore();

  const [ledgers, setLedgers]           = useState<Ledger[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState<string | null>(null);
  const [activeTab, setActiveTab]       = useState<string>('CUSTOMER');
  const [search, setSearch]             = useState('');
  const [showModal, setShowModal]       = useState(false);
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null);
  const [statement, setStatement]       = useState<StatementData | null>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);
  const [focusedIdx, setFocusedIdx]     = useState(0);
  const searchRef                       = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LedgerFormValues>({
    defaultValues: { name: '', type: 'CUSTOMER', openingBalance: 0, phone: '', email: '', address: '', gstNumber: '' },
  });

  // ── Sync UIStore modal trigger ──────────────────────────────────────────
  useEffect(() => {
    if (ledgerModalOpen) {
      openCreate();
      closeLedgerModal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledgerModalOpen]);

  // ── Fetch on ready ─────────────────────────────────────────────────────
  useEffect(() => {
    if (ready) fetchLedgers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchLedgers = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const res = await ledgerAPI(selectedCompany.id).list();
      setLedgers(res.data.data || []);
    } catch {
      toast.error('Failed to load ledgers');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  // ── Filtered list ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return ledgers.filter((l) => {
      const matchTab  = !activeTab || l.type === activeTab;
      const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase());
      return matchTab && matchSearch;
    });
  }, [ledgers, activeTab, search]);

  // ── Tab counts ──────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    CUSTOMER: ledgers.filter(l => l.type === 'CUSTOMER').length,
    SUPPLIER: ledgers.filter(l => l.type === 'SUPPLIER').length,
    '':       ledgers.length,
  }), [ledgers]);

  // ── Modal helpers ───────────────────────────────────────────────────────
  function openCreate() {
    setEditingLedger(null);
    reset({ name: '', type: activeTab || 'CUSTOMER', openingBalance: 0, phone: '', email: '', address: '', gstNumber: '' });
    setShowModal(true);
  }

  function openEdit(l: Ledger) {
    setEditingLedger(l);
    reset({
      name:           l.name,
      type:           l.type,
      openingBalance: Number(l.openingBalance),
      phone:          l.phone  ?? '',
      email:          l.email  ?? '',
      address:        l.address ?? '',
      gstNumber:      l.gstNumber ?? '',
    });
    setShowModal(true);
  }

  async function openStatement(l: Ledger) {
    if (!selectedCompany) return;
    setStatement(null);
    setLoadingStatement(true);
    try {
      const res = await ledgerAPI(selectedCompany.id).statement(l.id);
      setStatement(res.data.data);
    } catch {
      toast.error('Failed to load ledger statement');
    } finally {
      setLoadingStatement(false);
    }
  }

  // Bounds check focusedIdx when filtered changes
  useEffect(() => {
    setFocusedIdx(0);
  }, [filtered.length]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      const isTyping = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      // Slash to search
      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }

      // Escape to unfocus or close modals
      if (e.key === 'Escape') {
        if (showModal) {
          setShowModal(false);
          e.stopPropagation();
        } else if (statement) {
          setStatement(null);
          e.stopPropagation();
        } else if (isTyping) {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      // Ctrl+Enter to submit modal forms while typing
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (showModal) {
          e.preventDefault();
          document.getElementById('ledger-form-submit-btn')?.click();
          return;
        }
      }

      if (isTyping) return;
      if (showModal || statement || loadingStatement) return;

      const activeEl = document.activeElement as HTMLElement;
      const isTabFocused = activeEl?.classList.contains('ledger-tab-btn');

      if (isTabFocused) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const tabButtons = Array.from(document.querySelectorAll('.ledger-tab-btn')) as HTMLElement[];
          const idx = tabButtons.indexOf(activeEl);
          const nextIdx = (idx + 1) % tabButtons.length;
          tabButtons[nextIdx].focus();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const tabButtons = Array.from(document.querySelectorAll('.ledger-tab-btn')) as HTMLElement[];
          const idx = tabButtons.indexOf(activeEl);
          const prevIdx = (idx - 1 + tabButtons.length) % tabButtons.length;
          tabButtons[prevIdx].focus();
          return;
        }
      }

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        const item = filtered[focusedIdx];
        if (item) {
          e.preventDefault();
          openStatement(item);
        }
      }
      if (e.key.toLowerCase() === 'e') {
        const item = filtered[focusedIdx];
        if (item) {
          e.preventDefault();
          openEdit(item);
        }
      }
      if (e.key.toLowerCase() === 'd') {
        const item = filtered[focusedIdx];
        if (item) {
          e.preventDefault();
          handleDelete(item.id);
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, focusedIdx, showModal, statement, loadingStatement]);

  // ── CRUD ────────────────────────────────────────────────────────────────
  const onSubmit: SubmitHandler<LedgerFormValues> = async (data) => {
    if (!selectedCompany) return;
    setSaving(true);
    try {
      const payload = {
        ...data,
        openingBalance: Number(data.openingBalance) || 0,
      };
      if (editingLedger) {
        await ledgerAPI(selectedCompany.id).update(editingLedger.id, payload);
        toast.success('Ledger updated');
      } else {
        await ledgerAPI(selectedCompany.id).create(payload);
        toast.success('Ledger created');
      }
      setShowModal(false);
      fetchLedgers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save ledger';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  async function handleDelete(id: string) {
    if (!selectedCompany) return;
    if (!confirm('Delete this ledger? It cannot be deleted if used in vouchers.')) return;
    setDeleting(id);
    try {
      await ledgerAPI(selectedCompany.id).delete(id);
      toast.success('Ledger deleted');
      fetchLedgers();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Cannot delete — ledger may be in use';
      toast.error(msg);
    } finally {
      setDeleting(null);
    }
  }

  // ── Statement running balance ────────────────────────────────────────────
  function computeStatementRows(data: StatementData) {
    let balance = Number(data.ledger.openingBalance);
    return data.vouchers.map((v) => {
      const isDebit = VOUCHER_DEBIT_TYPES.has(v.type);
      const amt     = Number(v.netAmount);
      balance = isDebit ? balance + amt : balance - amt;
      return { ...v, runningBalance: balance, isDebit };
    });
  }

  if (!ready || !selectedCompany) return null;

  return (
    <div className="animate-fade-in">
      {/* ── Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">☰ Ledgers</div>
          <div className="page-subtitle">
            {counts.CUSTOMER} customers · {counts.SUPPLIER} suppliers · {counts['']} total
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={openCreate}
            title="ALT+L"
          >
            + New Ledger
            <span className="nav-shortcut">ALT+L</span>
          </button>
        </div>
      </div>

      {/* ── Tabs + Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 2 }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="ledger-tab-btn"
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                background: activeTab === tab.key ? 'var(--accent)' : 'var(--bg-card)',
                color: activeTab === tab.key ? 'white' : 'var(--text-secondary)',
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                gap: 6,
                alignItems: 'center',
              }}
            >
              {tab.icon} {tab.label}
              <span
                style={{
                  fontSize: 10,
                  background: activeTab === tab.key ? 'rgba(255,255,255,0.2)' : 'var(--bg-hover)',
                  padding: '1px 5px',
                  borderRadius: 10,
                }}
              >
                {counts[tab.key as keyof typeof counts] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="search-bar" style={{ flex: 1, maxWidth: 300 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
          <input
            ref={searchRef}
            placeholder="Search ledger name... (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Keyboard navigation helper banner */}
      <div style={{ marginBottom: 16, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>💡 <strong>Keyboard Shortcuts:</strong></span>
        <span>Use <kbd className="shortcut-key">TAB</kbd> to focus tabs/buttons</span>
        <span>•</span>
        <span>Use <kbd className="shortcut-key">Arrow Up</kbd> / <kbd className="shortcut-key">Arrow Down</kbd> to navigate ledger list</span>
        <span>•</span>
        <span>Press <kbd className="shortcut-key">Enter</kbd> to view statement</span>
        <span>•</span>
        <span>Press <kbd className="shortcut-key">E</kbd> to edit ledger</span>
        <span>•</span>
        <span>Press <kbd className="shortcut-key">D</kbd> to delete ledger</span>
      </div>

      {/* ── Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: 46, borderRadius: 6 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📒</div>
          <div className="empty-state-title">No ledgers found</div>
          <div className="empty-state-desc">
            {search ? 'No ledgers match your search.' : `Create your first ${activeTab ? activeTab.toLowerCase() : ''} ledger.`}
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + New Ledger (ALT+L)
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Opening Balance</th>
                <th style={{ textAlign: 'right' }}>Current Balance</th>
                <th style={{ width: 200 }}>Contact</th>
                <th style={{ width: 220, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, index) => {
                const bal = Number(l.balance);
                const isDr = bal >= 0;
                return (
                  <tr key={l.id} className={focusedIdx === index ? 'focused-row' : ''}>
                    <td>
                      <button
                        onClick={() => openStatement(l)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--accent-light)',
                          cursor: 'pointer',
                          fontWeight: 600,
                          fontSize: 13,
                          padding: 0,
                          textDecoration: 'underline',
                          textDecorationStyle: 'dotted',
                        }}
                        title="Click to view statement"
                      >
                        {l.name}
                      </button>
                      {l.gstNumber && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          GSTIN: {l.gstNumber}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${TYPE_BADGE[l.type] ?? 'badge-muted'}`}>
                        {l.type}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(l.openingBalance)}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ fontWeight: 600, color: isDr ? 'var(--success)' : 'var(--danger)' }}>
                        {formatCurrency(Math.abs(bal))}
                      </span>
                      <span style={{ fontSize: 10, marginLeft: 4, color: 'var(--text-muted)' }}>
                        {isDr ? 'Dr' : 'Cr'}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {l.phone && <div>📞 {l.phone}</div>}
                      {l.email && <div>✉ {l.email}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openStatement(l)}
                          title="View Statement"
                        >
                          Statement
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(l)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(l.id)}
                          disabled={deleting === l.id}
                        >
                          {deleting === l.id ? '...' : 'Del'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-ledger">
            <div className="modal-header">
              <div className="modal-title">
                {editingLedger ? '✏️ Edit Ledger' : '📒 Create Ledger'}
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => setShowModal(false)}
                style={{ padding: '4px 8px', fontSize: 18 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Rahul Traders"
                      autoFocus
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select className="input select" {...register('type', { required: true })}>
                      {LEDGER_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Opening Balance (₹)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register('openingBalance', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      className="input"
                      placeholder="+91 98765 43210"
                      {...register('phone')}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="party@email.com"
                      {...register('email')}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GST Number</label>
                    <input
                      className="input"
                      placeholder="e.g. 27AABCU9603R1ZM"
                      {...register('gstNumber')}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Address</label>
                    <textarea
                      className="input textarea"
                      rows={2}
                      placeholder="Street, City, State"
                      {...register('address')}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  <kbd className="shortcut-key">Ctrl+Enter</kbd> to save · <kbd className="shortcut-key">Esc</kbd> to close
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" id="ledger-form-submit-btn" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editingLedger ? 'Update' : 'Create Ledger'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Statement Modal */}
      {(statement || loadingStatement) && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setStatement(null)}>
          <div className="modal" style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <div className="modal-title">
                📊 Ledger Statement
                {statement && (
                  <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
                    — {statement.ledger.name}
                  </span>
                )}
              </div>
              <button className="btn btn-ghost" onClick={() => setStatement(null)} style={{ padding: '4px 8px', fontSize: 18 }}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {loadingStatement ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>
                  Loading statement...
                </div>
              ) : statement ? (
                <>
                  {/* Summary */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
                    {[
                      { label: 'Opening Balance', value: formatCurrency(statement.ledger.openingBalance) },
                      { label: 'Transactions',    value: statement.vouchers.length },
                      { label: 'Closing Balance', value: formatCurrency(statement.ledger.balance), highlight: true },
                    ].map((s) => (
                      <div key={s.label} className="stat-card" style={{ padding: '10px 12px' }}>
                        <div className="stat-label">{s.label}</div>
                        <div
                          className="stat-value"
                          style={{ fontSize: 16, color: s.highlight ? 'var(--accent-light)' : undefined }}
                        >
                          {String(s.value)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Voucher table */}
                  {statement.vouchers.length === 0 ? (
                    <div className="empty-state" style={{ padding: 24 }}>
                      <div className="empty-state-icon">📄</div>
                      <div className="empty-state-title">No transactions</div>
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Voucher No</th>
                            <th>Type</th>
                            <th style={{ textAlign: 'right' }}>Amount</th>
                            <th style={{ textAlign: 'right' }}>Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Opening row */}
                          <tr style={{ background: 'var(--bg-hover)' }}>
                            <td colSpan={3} style={{ color: 'var(--text-muted)', fontSize: 11 }}>Opening Balance</td>
                            <td />
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {formatCurrency(statement.ledger.openingBalance)}
                            </td>
                          </tr>
                          {computeStatementRows(statement).map((row) => (
                            <tr key={row.id}>
                              <td>{formatDate(row.date)}</td>
                              <td className="mono" style={{ fontSize: 12, color: 'var(--accent-light)' }}>
                                {row.number}
                              </td>
                              <td>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: row.isDebit ? 'var(--success)' : 'var(--info)',
                                  }}
                                >
                                  {row.type.replace('_', ' ')}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                                <span style={{ color: row.isDebit ? 'var(--success)' : 'var(--info)' }}>
                                  {row.isDebit ? '+' : '−'}{formatCurrency(row.netAmount)}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                                {formatCurrency(Math.abs(row.runningBalance))}
                                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 4 }}>
                                  {row.runningBalance >= 0 ? 'Dr' : 'Cr'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
