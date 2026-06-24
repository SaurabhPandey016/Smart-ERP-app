'use client';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray, useWatch, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { voucherAPI, ledgerAPI, stockAPI } from '@/lib/api';
import { useAuthStore, useCompanyStore, useUIStore } from '@/lib/store';
import { formatCurrency, formatDate, downloadBlob } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface Ledger {
  id: string;
  name: string;
  type: string;
}

interface StockItem {
  id: string;
  name: string;
  sku?: string;
  sellingPrice: number;
  purchasePrice: number;
  gstPercent: number;
  currentStock: number;
  unit?: { symbol: string };
}

interface VoucherItem {
  id: string;
  stockItemId?: string;
  description?: string;
  quantity: number;
  rate: number;
  gstPercent: number;
  amount: number;
  gstAmount: number;
  totalAmount: number;
  stockItem?: { name: string; sku?: string };
}

interface Voucher {
  id: string;
  number: string;
  type: string;
  date: string;
  status: string;
  totalAmount: number;
  taxAmount: number;
  netAmount: number;
  partyLedger?: { name: string } | null;
  items: VoucherItem[];
}

interface VoucherLineItem {
  stockItemId: string;
  description: string;
  quantity: number;
  rate: number;
  gstPercent: number;
}

interface VoucherFormValues {
  partyLedgerId: string;
  date: string;
  notes: string;
  items: VoucherLineItem[];
}

// ── Constants ──────────────────────────────────────────────────────────────

type VoucherTab = 'SALES' | 'PURCHASE' | 'ALL';

const TABS: { key: VoucherTab; label: string; icon: string; shortcut: string }[] = [
  { key: 'SALES',    label: 'Sales',    icon: '🧾', shortcut: 'F8' },
  { key: 'PURCHASE', label: 'Purchase', icon: '🛒', shortcut: 'F9' },
  { key: 'ALL',      label: 'All',      icon: '☰',  shortcut: ''   },
];

const TYPE_COLORS: Record<string, string> = {
  SALES:       'var(--success)',
  PURCHASE:    'var(--info)',
  RECEIPT:     'var(--success)',
  PAYMENT:     'var(--warning)',
  CREDIT_NOTE: 'var(--warning)',
  DEBIT_NOTE:  'var(--warning)',
};

const TYPE_LABELS: Record<string, string> = {
  SALES:       'Sales',
  PURCHASE:    'Purchase',
  RECEIPT:     'Receipt',
  PAYMENT:     'Payment',
  CONTRA:      'Contra',
  CREDIT_NOTE: 'Credit Note',
  DEBIT_NOTE:  'Debit Note',
};

const DEFAULT_ITEM: VoucherLineItem = {
  stockItemId: '',
  description: '',
  quantity: 1,
  rate: 0,
  gstPercent: 0,
};

// ── Component ──────────────────────────────────────────────────────────────

export default function VouchersPage() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { selectedCompany } = useCompanyStore();
  const { voucherModalOpen, voucherModalTab, closeVoucherModal } = useUIStore();

  const [vouchers, setVouchers]     = useState<Voucher[]>([]);
  const [customers, setCustomers]   = useState<Ledger[]>([]);
  const [suppliers, setSuppliers]   = useState<Ledger[]>([]);
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  const [activeTab, setActiveTab]   = useState<VoucherTab>('SALES');
  const [showModal, setShowModal]   = useState(false);
  const [modalType, setModalType]   = useState<'SALES' | 'PURCHASE'>('SALES');

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } =
    useForm<VoucherFormValues>({
      defaultValues: {
        partyLedgerId: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        items: [{ ...DEFAULT_ITEM }],
      },
    });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const watchedItems = useWatch({ control, name: 'items' });

  // ── Derived totals (real-time) ───────────────────────────────────────────
  const totals = useMemo(() => {
    return (watchedItems || []).reduce(
      (acc, item) => {
        const qty    = Number(item.quantity) || 0;
        const rate   = Number(item.rate)     || 0;
        const gst    = Number(item.gstPercent) || 0;
        const amount = qty * rate;
        const gstAmt = (amount * gst) / 100;
        return {
          subtotal:   acc.subtotal   + amount,
          gstTotal:   acc.gstTotal   + gstAmt,
          grandTotal: acc.grandTotal + amount + gstAmt,
        };
      },
      { subtotal: 0, gstTotal: 0, grandTotal: 0 },
    );
  }, [watchedItems]);

  // ── UIStore modal trigger ────────────────────────────────────────────────
  useEffect(() => {
    if (voucherModalOpen) {
      openModal(voucherModalTab as 'SALES' | 'PURCHASE');
      closeVoucherModal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voucherModalOpen]);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token)           { router.push('/login');     return; }
    if (!selectedCompany) { router.push('/companies'); return; }
    fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, token]);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const cid = selectedCompany.id;
      const [vRes, custRes, suppRes, stockRes] = await Promise.all([
        voucherAPI(cid).list(),
        ledgerAPI(cid).list('CUSTOMER'),
        ledgerAPI(cid).list('SUPPLIER'),
        stockAPI(cid).listItems(),
      ]);
      setVouchers(vRes.data.data || []);
      setCustomers(custRes.data.data || []);
      setSuppliers(suppRes.data.data || []);
      setStockItems(stockRes.data.data || []);
    } catch {
      toast.error('Failed to load voucher data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  // ── Filtered vouchers ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return vouchers;
    return vouchers.filter((v) => v.type === activeTab);
  }, [vouchers, activeTab]);

  // ── Tab counts ──────────────────────────────────────────────────────────
  const counts = useMemo(() => ({
    SALES:    vouchers.filter(v => v.type === 'SALES').length,
    PURCHASE: vouchers.filter(v => v.type === 'PURCHASE').length,
    ALL:      vouchers.length,
  }), [vouchers]);

  // ── Party list based on modal type ─────────────────────────────────────
  const partyList = modalType === 'SALES' ? customers : suppliers;

  // ── Open/close modal ───────────────────────────────────────────────────
  function openModal(type: 'SALES' | 'PURCHASE') {
    setModalType(type);
    reset({
      partyLedgerId: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
      items: [{ ...DEFAULT_ITEM }],
    });
    setShowModal(true);
  }

  // ── When user selects a stock item — auto-fill rate and GST ────────────
  function handleItemSelect(idx: number, stockItemId: string) {
    if (!stockItemId) return;
    const item = stockItems.find((i) => i.id === stockItemId);
    if (!item) return;

    const rate = modalType === 'SALES'
      ? Number(item.sellingPrice)
      : Number(item.purchasePrice);

    setValue(`items.${idx}.rate`,       rate);
    setValue(`items.${idx}.gstPercent`, Number(item.gstPercent));
  }

  // ── Submit voucher ─────────────────────────────────────────────────────
  const onSubmit: SubmitHandler<VoucherFormValues> = async (data) => {
    if (!selectedCompany) return;
    setSaving(true);
    try {
      const payload = {
        type:          modalType,
        date:          new Date(data.date).toISOString(),
        partyLedgerId: data.partyLedgerId || undefined,
        notes:         data.notes         || undefined,
        items: data.items.map((item) => ({
          stockItemId: item.stockItemId || undefined,
          description: item.description || undefined,
          quantity:    Number(item.quantity) || 1,
          rate:        Number(item.rate)     || 0,
          gstPercent:  Number(item.gstPercent) || 0,
        })),
      };

      await voucherAPI(selectedCompany.id).create(payload);
      toast.success(`${TYPE_LABELS[modalType]} voucher created`);
      setShowModal(false);
      fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to create voucher';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // ── Cancel voucher ─────────────────────────────────────────────────────
  async function handleCancel(id: string) {
    if (!selectedCompany) return;
    if (!confirm('Cancel this voucher? This will reverse the inventory and ledger effects.')) return;
    setCancelling(id);
    try {
      await voucherAPI(selectedCompany.id).cancel(id);
      toast.success('Voucher cancelled');
      fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to cancel voucher';
      toast.error(msg);
    } finally {
      setCancelling(null);
    }
  }

  // ── Download PDF ───────────────────────────────────────────────────────
  async function handleDownloadPDF(v: Voucher) {
    if (!selectedCompany) return;
    setDownloading(v.id);
    try {
      const res = await voucherAPI(selectedCompany.id).downloadPDF(v.id);
      downloadBlob(res.data, `${v.number}.pdf`);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(null);
    }
  }

  if (!selectedCompany) return null;

  return (
    <div className="animate-fade-in">
      {/* ── Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">🧾 Vouchers</div>
          <div className="page-subtitle">
            {counts.SALES} sales · {counts.PURCHASE} purchases · {counts.ALL} total
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-primary"
            onClick={() => openModal('SALES')}
            title="F8 — New Sales Voucher"
          >
            + Sales Voucher
            <span className="nav-shortcut">F8</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => openModal('PURCHASE')}
            title="F9 — New Purchase Voucher"
          >
            + Purchase Voucher
            <span className="nav-shortcut">F9</span>
          </button>
        </div>
      </div>

      {/* ── Tab bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 16px',
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
              {counts[tab.key]}
            </span>
            {tab.shortcut && (
              <span className="nav-shortcut" style={{ marginLeft: 2 }}>{tab.shortcut}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Vouchers table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 50, borderRadius: 6 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🧾</div>
          <div className="empty-state-title">No vouchers found</div>
          <div className="empty-state-desc">
            {activeTab === 'SALES'
              ? 'Create a Sales voucher to record a customer sale. Stock decreases automatically.'
              : activeTab === 'PURCHASE'
              ? 'Create a Purchase voucher to record a supplier purchase. Stock increases automatically.'
              : 'No vouchers created yet.'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={() => openModal('SALES')}>
              + Sales (F8)
            </button>
            <button className="btn btn-secondary" onClick={() => openModal('PURCHASE')}>
              + Purchase (F9)
            </button>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Voucher No</th>
                <th>Date</th>
                <th>Type</th>
                <th>Party</th>
                <th>Items</th>
                <th style={{ textAlign: 'right' }}>Subtotal</th>
                <th style={{ textAlign: 'right' }}>GST</th>
                <th style={{ textAlign: 'right' }}>Net Amount</th>
                <th>Status</th>
                <th style={{ width: 160, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className="mono" style={{ fontSize: 12, color: 'var(--accent-light)', fontWeight: 600 }}>
                      {v.number}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{formatDate(v.date)}</td>
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
                  <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {v.partyLedger?.name ?? '—'}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {v.items.length} item{v.items.length !== 1 ? 's' : ''}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>
                    {formatCurrency(v.totalAmount)}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: 'var(--text-muted)' }}>
                    {formatCurrency(v.taxAmount)}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {formatCurrency(v.netAmount)}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        v.status === 'POSTED'
                          ? 'badge-success'
                          : v.status === 'CANCELLED'
                          ? 'badge-danger'
                          : 'badge-muted'
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                      {/* PDF download */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleDownloadPDF(v)}
                        disabled={downloading === v.id}
                        title="Download PDF (CTRL+P)"
                      >
                        {downloading === v.id ? '...' : '⬇ PDF'}
                      </button>

                      {/* Cancel */}
                      {v.status === 'POSTED' && (
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancel(v.id)}
                          disabled={cancelling === v.id}
                        >
                          {cancelling === v.id ? '...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Create Voucher Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: 820, width: '95vw' }}
          >
            {/* Header */}
            <div className="modal-header">
              <div className="modal-title">
                <span
                  style={{
                    fontSize: 12,
                    padding: '2px 8px',
                    borderRadius: 4,
                    background: modalType === 'SALES' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)',
                    color: modalType === 'SALES' ? 'var(--success)' : 'var(--info)',
                    marginRight: 8,
                    fontWeight: 600,
                  }}
                >
                  {modalType === 'SALES' ? '↑ SALES' : '↓ PURCHASE'}
                </span>
                New {TYPE_LABELS[modalType]} Voucher
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {/* Toggle Sales/Purchase */}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setModalType(modalType === 'SALES' ? 'PURCHASE' : 'SALES')}
                  title="Switch type"
                >
                  Switch to {modalType === 'SALES' ? 'Purchase' : 'Sales'}
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '4px 8px', fontSize: 18 }}
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body" style={{ paddingBottom: 8 }}>
                {/* ── Top row: party + date + notes ── */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 1fr', gap: 12, marginBottom: 16 }}>
                  <div className="form-group">
                    <label className="form-label">
                      {modalType === 'SALES' ? '👥 Customer' : '🏭 Supplier'} (Party)
                    </label>
                    <select
                      className="input select"
                      {...register('partyLedgerId')}
                    >
                      <option value="">— Select {modalType === 'SALES' ? 'Customer' : 'Supplier'} —</option>
                      {partyList.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    {partyList.length === 0 && (
                      <span style={{ fontSize: 11, color: 'var(--warning)' }}>
                        ⚠ No {modalType === 'SALES' ? 'customer' : 'supplier'} ledgers found.
                        <button
                          type="button"
                          onClick={() => { setShowModal(false); router.push('/ledgers'); }}
                          style={{ color: 'var(--accent-light)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, marginLeft: 4 }}
                        >
                          Create one →
                        </button>
                      </span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">📅 Date</label>
                    <input
                      className="input"
                      type="date"
                      {...register('date', { required: 'Date is required' })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">📝 Notes (optional)</label>
                    <input
                      className="input"
                      placeholder="e.g. Cash sale, credit 30 days..."
                      {...register('notes')}
                    />
                  </div>
                </div>

                {/* ── Line items ── */}
                <div style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: 6,
                    }}
                  >
                    Line Items
                    {modalType === 'SALES' && (
                      <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', color: 'var(--info)' }}>
                        — Rate auto-filled from Selling Price
                      </span>
                    )}
                    {modalType === 'PURCHASE' && (
                      <span style={{ marginLeft: 8, fontWeight: 400, textTransform: 'none', color: 'var(--info)' }}>
                        — Rate auto-filled from Purchase Price
                      </span>
                    )}
                  </div>

                  <div className="line-items-table">
                    {/* Header */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2.5fr 1fr 1fr 0.8fr auto',
                        gap: 6,
                        padding: '8px 10px',
                        background: 'var(--bg-secondary)',
                        borderBottom: '1px solid var(--border)',
                        fontSize: 10,
                        fontWeight: 600,
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      <span>Item / Description</span>
                      <span>Qty</span>
                      <span>Rate (₹)</span>
                      <span>GST %</span>
                      <span />
                    </div>

                    {/* Rows */}
                    {fields.map((field, idx) => {
                      const qty  = Number(watchedItems?.[idx]?.quantity) || 0;
                      const rate = Number(watchedItems?.[idx]?.rate)     || 0;
                      const gst  = Number(watchedItems?.[idx]?.gstPercent) || 0;
                      const amt  = qty * rate;
                      const gstAmt = (amt * gst) / 100;
                      const total  = amt + gstAmt;

                      return (
                        <div
                          key={field.id}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '2.5fr 1fr 1fr 0.8fr auto',
                            gap: 6,
                            padding: '6px 10px',
                            borderBottom: '1px solid var(--border)',
                            alignItems: 'center',
                          }}
                        >
                          {/* Item / Description */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <select
                              className="input"
                              style={{ fontSize: 12, padding: '5px 8px' }}
                              {...register(`items.${idx}.stockItemId`)}
                              onChange={(e) => {
                                register(`items.${idx}.stockItemId`).onChange(e);
                                handleItemSelect(idx, e.target.value);
                              }}
                            >
                              <option value="">— Select Item (optional) —</option>
                              {stockItems.map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.name}{s.sku ? ` (${s.sku})` : ''} — Stock: {Number(s.currentStock)}
                                </option>
                              ))}
                            </select>
                            <input
                              className="input"
                              placeholder="Or type description..."
                              style={{ fontSize: 11, padding: '4px 8px' }}
                              {...register(`items.${idx}.description`)}
                            />
                          </div>

                          {/* Qty */}
                          <input
                            className="input"
                            type="number"
                            step="0.001"
                            min="0.001"
                            placeholder="1"
                            style={{ fontSize: 12, padding: '5px 8px', textAlign: 'right' }}
                            {...register(`items.${idx}.quantity`, { valueAsNumber: true })}
                          />

                          {/* Rate */}
                          <div>
                            <input
                              className="input"
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              style={{ fontSize: 12, padding: '5px 8px', textAlign: 'right' }}
                              {...register(`items.${idx}.rate`, { valueAsNumber: true })}
                            />
                            {amt > 0 && (
                              <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>
                                Amt: {formatCurrency(amt)}
                              </div>
                            )}
                          </div>

                          {/* GST % */}
                          <div>
                            <select
                              className="input select"
                              style={{ fontSize: 12, padding: '5px 8px' }}
                              {...register(`items.${idx}.gstPercent`, { valueAsNumber: true })}
                            >
                              {[0, 5, 12, 18, 28].map((r) => (
                                <option key={r} value={r}>{r}%</option>
                              ))}
                            </select>
                            {gstAmt > 0 && (
                              <div style={{ fontSize: 10, color: 'var(--warning)', textAlign: 'right', marginTop: 2 }}>
                                GST: {formatCurrency(gstAmt)}
                              </div>
                            )}
                          </div>

                          {/* Remove */}
                          <button
                            type="button"
                            className="btn btn-danger btn-icon"
                            onClick={() => fields.length > 1 && remove(idx)}
                            disabled={fields.length === 1}
                            style={{ padding: '5px 8px', fontSize: 14 }}
                            title="Remove line"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}

                    {/* Add row */}
                    <div style={{ padding: '8px 10px' }}>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => append({ ...DEFAULT_ITEM })}
                        style={{ fontSize: 12 }}
                      >
                        + Add Line Item
                      </button>
                    </div>
                  </div>
                </div>

                {/* ── Totals summary ── */}
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 240 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)' }}>
                      <span>Subtotal</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--warning)' }}>
                      <span>GST Total</span>
                      <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totals.gstTotal)}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 16,
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        borderTop: '1px solid var(--border)',
                        paddingTop: 8,
                        marginTop: 2,
                      }}
                    >
                      <span>Grand Total</span>
                      <span
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          color: modalType === 'SALES' ? 'var(--success)' : 'var(--info)',
                        }}
                      >
                        {formatCurrency(totals.grandTotal)}
                      </span>
                    </div>
                    {modalType === 'SALES' && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                        ↓ Stock will decrease on save
                      </div>
                    )}
                    {modalType === 'PURCHASE' && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
                        ↑ Stock will increase on save
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {fields.length} line item{fields.length !== 1 ? 's' : ''} · 
                  Grand Total: <strong style={{ color: 'var(--text-primary)' }}>{formatCurrency(totals.grandTotal)}</strong>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Creating...' : `Create ${TYPE_LABELS[modalType]} Voucher`}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
