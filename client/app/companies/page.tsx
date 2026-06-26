'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { companyAPI } from '@/lib/api';
import { useAuthStore, useCompanyStore } from '@/lib/store';
import { INDIAN_STATES } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────────────────────

interface Company {
  id: string;
  name: string;
  address?: string;
  gstNumber?: string;
  financialYear: string;
  state?: string;
  phone?: string;
  email?: string;
}

interface CompanyFormValues {
  name: string;
  address: string;
  gstNumber: string;
  financialYear: string;
  state: string;
  phone: string;
  email: string;
}

const FINANCIAL_YEARS = ['2022-23', '2023-24', '2024-25', '2025-26', '2026-27'];

// ── Component ──────────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const router = useRouter();
  const { token, user, logout } = useAuthStore();
  const { selectCompany } = useCompanyStore();

  const [companies, setCompanies]   = useState<Company[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);
  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const cardRefs                    = useRef<(HTMLDivElement | null)[]>([]);

  const { register, handleSubmit, reset, formState: { errors } } =
    useForm<CompanyFormValues>({
      defaultValues: {
        name: '', address: '', gstNumber: '',
        financialYear: '2024-25', state: '', phone: '', email: '',
      },
    });

  // ── Auth guard ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetchCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Keyboard navigation ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return;
      if (showModal) return;

      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, companies.length - 1));
      }
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter' && companies[focusedIdx]) {
        handleSelect(companies[focusedIdx]);
      }
      if ((e.key === 'n' || e.key === 'N') && companies.length < 5) {
        openCreate();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies, focusedIdx, showModal]);

  // Move DOM focus to focused card
  useEffect(() => {
    cardRefs.current[focusedIdx]?.focus({ preventScroll: false });
  }, [focusedIdx]);

  // ── Fetch ───────────────────────────────────────────────────────────────
  async function fetchCompanies() {
    setLoading(true);
    try {
      const res = await companyAPI.list();
      setCompanies(res.data.data || []);
    } catch {
      toast.error('Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  // ── Modal helpers ───────────────────────────────────────────────────────
  function openCreate() {
    setEditingId(null);
    reset({ name: '', address: '', gstNumber: '', financialYear: '2024-25', state: '', phone: '', email: '' });
    setShowModal(true);
  }

  function openEdit(c: Company, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingId(c.id);
    reset({
      name: c.name, address: c.address ?? '', gstNumber: c.gstNumber ?? '',
      financialYear: c.financialYear, state: c.state ?? '',
      phone: c.phone ?? '', email: c.email ?? '',
    });
    setShowModal(true);
  }

  // ── CRUD ────────────────────────────────────────────────────────────────
  const onSubmit: SubmitHandler<CompanyFormValues> = async (data) => {
    setSaving(true);
    try {
      if (editingId) {
        await companyAPI.update(editingId, data);
        toast.success('Company updated');
      } else {
        await companyAPI.create(data);
        toast.success('Company created');
      }
      setShowModal(false);
      await fetchCompanies();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this company? All data will be permanently removed.')) return;
    setDeleting(id);
    try {
      await companyAPI.delete(id);
      toast.success('Company deleted');
      await fetchCompanies();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete';
      toast.error(msg);
    } finally {
      setDeleting(null);
    }
  }

  function handleSelect(c: Company) {
    selectCompany(c);
    toast.success(`Opened: ${c.name}`);
    router.push('/dashboard');
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen w-full bg-[var(--bg-primary)] overflow-auto">

      {/* ── Left panel — branding ─────────────────────────────────────────── */}
      <div
        className="flex flex-col sticky top-0 h-screen shrink-0"
        style={{
          width: 300,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          padding: '36px 28px',
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <div
            className="flex items-center justify-center shrink-0 font-extrabold text-white rounded-xl"
            style={{
              width: 40, height: 40, fontSize: 18,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
              boxShadow: '0 0 20px rgba(99,102,241,0.35)',
            }}
          >
            S
          </div>
          <div>
            <div className="font-bold text-[15px]" style={{ color: 'var(--text-primary)' }}>SmartERP</div>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Gateway</div>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-auto">
          <h1
            className="font-bold leading-tight mb-3"
            style={{ fontSize: 22, color: 'var(--text-primary)' }}
          >
            Select your<br />
            <span style={{ color: 'var(--accent-light)' }}>Company</span>
          </h1>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Choose a company to open, or create a new one. Each company has its own ledgers, vouchers and stock.
          </p>

          {/* Keyboard hints */}
          <div
            className="mt-7 rounded-lg p-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div
              className="text-[10px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: 'var(--text-muted)' }}
            >
              ⌨ Keyboard shortcuts
            </div>
            {[
              ['↑ ↓', 'Navigate companies'],
              ['ENTER', 'Open selected'],
              ['N', 'New company'],
              ['ESC', 'Close modal'],
            ].map(([key, label]) => (
              <div key={key} className="flex justify-between items-center mb-2">
                <span
                  className="mono text-[10px] px-1.5 py-0.5 rounded"
                  style={{
                    color: 'var(--accent-light)',
                    background: 'var(--bg-active)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  {key}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* User info + logout */}
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="text-[11px] mb-1" style={{ color: 'var(--text-muted)' }}>Signed in as</div>
          <div className="font-semibold text-[13px] mb-3" style={{ color: 'var(--text-primary)' }}>
            {user?.name}
            <span className="font-normal ml-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {user?.email}
            </span>
          </div>
          <button
            className="btn btn-ghost w-full justify-center text-[12px]"
            onClick={() => { logout(); router.push('/login'); }}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Right panel — company list ────────────────────────────────────── */}
      <div className="flex-1 p-10 overflow-y-auto">

        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="font-bold text-[17px]" style={{ color: 'var(--text-primary)' }}>
              Your Companies
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {loading ? 'Loading…' : `${companies.length} / 5 companies`}
            </div>
          </div>
          {companies.length < 5 && (
            <button className="btn btn-primary" onClick={openCreate} title="Press N">
              + New Company
              <span
                className="mono text-[10px] ml-2 px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)' }}
              >
                N
              </span>
            </button>
          )}
        </div>

        {/* Max warning */}
        {companies.length >= 5 && (
          <div
            className="flex items-center gap-2 rounded-lg px-4 py-2.5 mb-5 text-[12px]"
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              color: 'var(--warning)',
            }}
          >
            ⚠ Maximum 5 companies per account. Delete one to create a new company.
          </div>
        )}

        {/* Skeletons */}
        {loading && (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton rounded-xl" style={{ height: 88 }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && companies.length === 0 && (
          <div
            className="flex flex-col items-center justify-center text-center rounded-xl py-16"
            style={{ border: '2px dashed var(--border)' }}
          >
            <div className="text-5xl mb-4 opacity-30">🏢</div>
            <div className="font-semibold text-[16px] mb-2" style={{ color: 'var(--text-secondary)' }}>
              No companies yet
            </div>
            <div className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
              Create your first company to start using SmartERP
            </div>
            <button className="btn btn-primary" onClick={openCreate}>
              + Create Company
            </button>
          </div>
        )}

        {/* Company cards ── NOTE: outer is a <div role="button">, NOT a <button> */}
        {!loading && companies.length > 0 && (
          <div className="flex flex-col gap-3">
            {companies.map((c, idx) => {
              const isFocused = focusedIdx === idx;
              return (
                <div
                  key={c.id}
                  ref={(el) => { cardRefs.current[idx] = el; }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open company ${c.name}`}
                  onClick={() => handleSelect(c)}
                  onFocus={() => setFocusedIdx(idx)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelect(c);
                    }
                  }}
                  className="flex items-center gap-4 rounded-xl cursor-pointer outline-none transition-all"
                  style={{
                    padding: '14px 18px',
                    background: isFocused ? 'var(--accent-glow)' : 'var(--bg-card)',
                    border: `1px solid ${isFocused ? 'var(--accent)' : 'var(--border)'}`,
                    boxShadow: isFocused ? '0 0 0 3px rgba(99,102,241,0.15)' : 'none',
                    userSelect: 'none',
                  }}
                >
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center shrink-0 rounded-xl text-lg transition-all"
                    style={{
                      width: 46, height: 46,
                      background: isFocused
                        ? 'linear-gradient(135deg, var(--accent), var(--accent-dark))'
                        : 'var(--bg-hover)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    🏢
                  </div>

                  {/* Company info */}
                  <div className="flex-1 min-w-0">
                    <div
                      className="font-bold text-[14px] mb-1 truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {c.name}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <span
                        className="mono text-[10px] px-1.5 py-0.5 rounded"
                        style={{
                          background: 'var(--bg-hover)',
                          border: '1px solid var(--border)',
                          color: 'var(--accent-light)',
                        }}
                      >
                        FY {c.financialYear}
                      </span>
                      {c.gstNumber && <span>GSTIN: {c.gstNumber}</span>}
                      {c.state && <span>📍 {c.state}</span>}
                      {c.phone && <span>📞 {c.phone}</span>}
                    </div>
                  </div>

                  {/* Action buttons — these are NOT inside a <button>, so nesting is valid */}
                  <div
                    className="flex gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => openEdit(c, e)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={(e) => handleDelete(c.id, e)}
                      disabled={deleting === c.id}
                    >
                      {deleting === c.id ? '…' : 'Delete'}
                    </button>
                  </div>

                  {/* Arrow */}
                  <div
                    className="shrink-0 text-lg transition-colors"
                    style={{ color: isFocused ? 'var(--accent-light)' : 'var(--text-muted)' }}
                  >
                    →
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingId ? '✏️ Edit Company' : '🏢 Create Company'}
              </div>
              <button
                className="btn btn-ghost"
                onClick={() => setShowModal(false)}
                style={{ padding: '4px 10px', fontSize: 20 }}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                  {/* Full-width name */}
                  <div className="form-group col-span-1 md:col-span-2">
                    <label className="form-label">Company Name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Rahul Traders Pvt. Ltd."
                      autoFocus
                      {...register('name', { required: 'Company name is required' })}
                    />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">GST Number</label>
                    <input className="input" placeholder="27AABCU9603R1ZM" {...register('gstNumber')} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Financial Year</label>
                    <select className="input select" {...register('financialYear')}>
                      {FINANCIAL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">State</label>
                    <select className="input select" {...register('state')}>
                      <option value="">— Select State —</option>
                      {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="input" placeholder="+91 98765 43210" {...register('phone')} />
                  </div>

                  <div className="form-group col-span-1 md:col-span-2">
                    <label className="form-label">Email</label>
                    <input className="input" type="email" placeholder="business@company.com" {...register('email')} />
                  </div>

                  <div className="form-group col-span-1 md:col-span-2">
                    <label className="form-label">Address</label>
                    <textarea
                      className="input textarea"
                      rows={2}
                      placeholder="Street, City, State, PIN"
                      {...register('address')}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editingId ? 'Update Company' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
