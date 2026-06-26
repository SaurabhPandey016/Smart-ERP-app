'use client';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { stockAPI } from '@/lib/api';
import { useUIStore } from '@/lib/store';
import { formatCurrency, GST_RATES } from '@/lib/utils';
import { useProtectedPage } from '@/lib/useProtectedPage';

// ── Types ──────────────────────────────────────────────────────────────────

interface Unit {
  id: string;
  name: string;
  symbol: string;
}

interface StockItem {
  id: string;
  name: string;
  sku?: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  gstPercent: number;
  unitId?: string;
  unit?: Unit;
}

interface StockFormValues {
  name: string;
  sku: string;
  unitId: string;
  purchasePrice: number;
  sellingPrice: number;
  currentStock: number;
  gstPercent: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function stockBadge(qty: number): { label: string; cls: string } {
  if (qty <= 0)  return { label: 'Out of Stock', cls: 'badge-danger'  };
  if (qty <= 5)  return { label: 'Low Stock',    cls: 'badge-warning' };
  return               { label: 'In Stock',      cls: 'badge-success' };
}

// ── Component ──────────────────────────────────────────────────────────────

export default function StockPage() {
  const router = useRouter();
  const { ready, selectedCompany } = useProtectedPage();
  const { stockModalOpen, closeStockModal } = useUIStore();

  const [items, setItems]     = useState<StockItem[]>([]);
  const [units, setUnits]     = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [focusedIdx, setFocusedIdx]     = useState(0);
  const searchRef                       = useRef<HTMLInputElement>(null);

  // Unit creation
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [unitName, setUnitName]   = useState('');
  const [unitSymbol, setUnitSymbol] = useState('');
  const [savingUnit, setSavingUnit] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<StockFormValues>({
    defaultValues: { name: '', sku: '', unitId: '', purchasePrice: 0, sellingPrice: 0, currentStock: 0, gstPercent: 0 },
  });

  // ── Sync UIStore ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (stockModalOpen) {
      openCreate();
      closeStockModal();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stockModalOpen]);

  // ── Fetch on ready ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (ready) fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!selectedCompany) return;
    setLoading(true);
    try {
      const [itemsRes, unitsRes] = await Promise.all([
        stockAPI(selectedCompany.id).listItems(),
        stockAPI(selectedCompany.id).listUnits(),
      ]);
      setItems(itemsRes.data.data || []);
      setUnits(unitsRes.data.data || []);
    } catch {
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  }, [selectedCompany]);

  // ── Filtered ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || (i.sku ?? '').toLowerCase().includes(q),
    );
  }, [items, search]);

  // ── Modal helpers ───────────────────────────────────────────────────────
  function openCreate() {
    setEditingItem(null);
    reset({ name: '', sku: '', unitId: '', purchasePrice: 0, sellingPrice: 0, currentStock: 0, gstPercent: 0 });
    setShowModal(true);
  }

  function openEdit(item: StockItem) {
    setEditingItem(item);
    reset({
      name:          item.name,
      sku:           item.sku ?? '',
      unitId:        item.unitId ?? '',
      purchasePrice: Number(item.purchasePrice),
      sellingPrice:  Number(item.sellingPrice),
      currentStock:  Number(item.currentStock),
      gstPercent:    Number(item.gstPercent),
    });
    setShowModal(true);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────
  const onSubmit: SubmitHandler<StockFormValues> = async (data) => {
    if (!selectedCompany) return;
    setSaving(true);
    try {
      const payload = {
        ...data,
        purchasePrice: Number(data.purchasePrice) || 0,
        sellingPrice:  Number(data.sellingPrice)  || 0,
        currentStock:  Number(data.currentStock)  || 0,
        gstPercent:    Number(data.gstPercent)    || 0,
        unitId:        data.unitId || undefined,
        sku:           data.sku   || undefined,
      };
      if (editingItem) {
        await stockAPI(selectedCompany.id).updateItem(editingItem.id, payload);
        toast.success('Stock item updated');
      } else {
        await stockAPI(selectedCompany.id).createItem(payload);
        toast.success('Stock item created');
      }
      setShowModal(false);
      fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save stock item';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  async function handleDelete(id: string) {
    if (!selectedCompany) return;
    if (!confirm('Delete this item? It cannot be deleted if used in vouchers.')) return;
    setDeleting(id);
    try {
      await stockAPI(selectedCompany.id).deleteItem(id);
      toast.success('Stock item deleted');
      fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Cannot delete — item may be in use';
      toast.error(msg);
    } finally {
      setDeleting(null);
    }
  }

  async function handleAddUnit() {
    if (!selectedCompany || !unitName || !unitSymbol) return;
    setSavingUnit(true);
    try {
      await stockAPI(selectedCompany.id).createUnit({ name: unitName, symbol: unitSymbol.toUpperCase() });
      toast.success(`Unit "${unitSymbol.toUpperCase()}" created`);
      setUnitName('');
      setUnitSymbol('');
      fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to create unit';
      toast.error(msg);
    } finally {
      setSavingUnit(false);
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
        } else if (showUnitForm) {
          setShowUnitForm(false);
          e.stopPropagation();
        } else if (isTyping) {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      if (isTyping) return;
      if (showModal || showUnitForm) return;

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
          openEdit(item);
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
  }, [filtered, focusedIdx, showModal, showUnitForm]);

  if (!ready || !selectedCompany) return null;

  const summary = {
    total:      items.length,
    outOfStock: items.filter(i => Number(i.currentStock) <= 0).length,
    low:        items.filter(i => Number(i.currentStock) > 0 && Number(i.currentStock) <= 5).length,
    value:      items.reduce((s, i) => s + Number(i.currentStock) * Number(i.purchasePrice), 0),
  };

  return (
    <div className="animate-fade-in">
      {/* ── Page header */}
      <div className="page-header">
        <div>
          <div className="page-title">📦 Stock Items</div>
          <div className="page-subtitle">
            {summary.total} items · {summary.low} low · {summary.outOfStock} out · Value: {formatCurrency(summary.value)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={openCreate} title="ALT+S or CTRL+N">
            + New Item
            <span className="nav-shortcut">ALT+S</span>
          </button>
        </div>
      </div>

      {/* ── Search */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div className="search-bar" style={{ maxWidth: 320 }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>🔍</span>
          <input
            ref={searchRef}
            placeholder="Search by name or SKU... (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16 }}>
              ×
            </button>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {filtered.length} of {items.length} items
        </span>
      </div>

      {/* Keyboard navigation helper banner */}
      <div style={{ marginBottom: 16, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <span>💡 <strong>Keyboard Shortcuts:</strong></span>
        <span>Use <kbd className="shortcut-key">Arrow Up</kbd> / <kbd className="shortcut-key">Arrow Down</kbd> to navigate items</span>
        <span>•</span>
        <span>Press <kbd className="shortcut-key">Enter</kbd> or <kbd className="shortcut-key">E</kbd> to edit</span>
        <span>•</span>
        <span>Press <kbd className="shortcut-key">D</kbd> to delete item</span>
      </div>

      {/* ── Stats row */}
      <div className="grid-4" style={{ marginBottom: 16 }}>
        {[
          { label: 'Total Items',    value: summary.total,                     icon: '📦', color: 'var(--accent-light)' },
          { label: 'Out of Stock',   value: summary.outOfStock,                icon: '⚠',  color: 'var(--danger)'       },
          { label: 'Low Stock',      value: summary.low,                       icon: '📉', color: 'var(--warning)'      },
          { label: 'Inventory Value',value: formatCurrency(summary.value),     icon: '₹',  color: 'var(--success)'      },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ color: s.color }}>{s.icon}</div>
            <div className="stat-value" style={{ fontSize: 18 }}>{String(s.value)}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Items Table */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 46, borderRadius: 6 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📦</div>
          <div className="empty-state-title">No stock items found</div>
          <div className="empty-state-desc">
            {search ? 'No items match your search.' : 'Add your first stock item to start tracking inventory.'}
          </div>
          <button className="btn btn-primary" onClick={openCreate}>+ New Stock Item (ALT+S)</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name / SKU</th>
                <th>Unit</th>
                <th style={{ textAlign: 'right' }}>Purchase Price</th>
                <th style={{ textAlign: 'right' }}>Selling Price</th>
                <th style={{ textAlign: 'center' }}>GST %</th>
                <th style={{ textAlign: 'right' }}>Stock</th>
                <th>Status</th>
                <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, index) => {
                const qty    = Number(item.currentStock);
                const badge  = stockBadge(qty);
                const profit = Number(item.sellingPrice) - Number(item.purchasePrice);
                return (
                  <tr key={item.id} className={focusedIdx === index ? 'focused-row' : ''}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{item.name}</div>
                      {item.sku && (
                        <div className="mono" style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                          {item.sku}
                        </div>
                      )}
                    </td>
                    <td>
                      {item.unit ? (
                        <span className="badge badge-muted">{item.unit.symbol}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(item.purchasePrice)}
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <div>{formatCurrency(item.sellingPrice)}</div>
                      {profit > 0 && (
                        <div style={{ fontSize: 10, color: 'var(--success)' }}>
                          +{formatCurrency(profit)}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge badge-muted">{Number(item.gstPercent)}%</span>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                      {qty.toLocaleString('en-IN')}
                    </td>
                    <td>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleting === item.id}
                        >
                          {deleting === item.id ? '...' : 'Del'}
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

      {/* ── Units section */}
      <div className="card" style={{ marginTop: 20 }}>
        <div
          className="card-header"
          style={{ cursor: 'pointer' }}
          onClick={() => setShowUnitForm(!showUnitForm)}
        >
          <div className="card-title">⚖ Units of Measure</div>
          <button className="btn btn-ghost btn-sm">
            {showUnitForm ? '▲ Hide' : '▼ Manage'}
          </button>
        </div>

        {showUnitForm && (
          <div style={{ padding: '8px 0' }}>
            {/* Existing units */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {units.map((u) => (
                <span
                  key={u.id}
                  className="badge badge-accent"
                  style={{ fontSize: 12, padding: '4px 10px' }}
                  title={u.name}
                >
                  {u.symbol}
                </span>
              ))}
              {units.length === 0 && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>No units yet</span>
              )}
            </div>

            {/* Add unit form */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Unit Name</label>
                <input
                  className="input"
                  placeholder="e.g. Pieces"
                  value={unitName}
                  onChange={(e) => setUnitName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Symbol</label>
                <input
                  className="input"
                  placeholder="e.g. PCS"
                  value={unitSymbol}
                  onChange={(e) => setUnitSymbol(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAddUnit}
                disabled={savingUnit || !unitName || !unitSymbol}
                style={{ flexShrink: 0 }}
              >
                {savingUnit ? '...' : '+ Add Unit'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">
                {editingItem ? '✏️ Edit Stock Item' : '📦 New Stock Item'}
              </div>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ padding: '4px 8px', fontSize: 18 }}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Item Name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Laptop Dell XPS 15"
                      autoFocus
                      {...register('name', { required: 'Name is required' })}
                    />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">SKU (optional)</label>
                    <input
                      className="input"
                      placeholder="e.g. LAP-001"
                      {...register('sku')}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unit</label>
                    <select className="input select" {...register('unitId')}>
                      <option value="">— Select Unit —</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Purchase Price (₹)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register('purchasePrice', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Selling Price (₹)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register('sellingPrice', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Opening Stock (Qty)</label>
                    <input
                      className="input"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="0"
                      {...register('currentStock', { valueAsNumber: true })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">GST %</label>
                    <select className="input select" {...register('gstPercent', { valueAsNumber: true })}>
                      {GST_RATES.map((r) => (
                        <option key={r} value={r}>{r}%</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
