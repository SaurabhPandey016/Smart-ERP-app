'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { toast } from 'sonner';
import { companyAPI } from '@/lib/api';
import { useAuthStore, useCompanyStore } from '@/lib/store';
import { INDIAN_STATES } from '@/lib/utils';

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

export default function CompaniesPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const { selectCompany, clearCompany } = useCompanyStore();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyFormValues>({
    defaultValues: { name: '', address: '', gstNumber: '', financialYear: '2024-25', state: '', phone: '', email: '' },
  });

  useEffect(() => {
    if (!token) { router.push('/login'); return; }
    fetchCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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

  function openCreate() {
    setEditingId(null);
    reset({ name: '', address: '', gstNumber: '', financialYear: '2024-25', state: '', phone: '', email: '' });
    setShowModal(true);
  }

  function openEdit(c: Company) {
    setEditingId(c.id);
    reset({
      name: c.name,
      address: c.address ?? '',
      gstNumber: c.gstNumber ?? '',
      financialYear: c.financialYear,
      state: c.state ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
    });
    setShowModal(true);
  }

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
      fetchCompanies();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save company';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  async function handleDelete(id: string) {
    if (!confirm('Delete this company? All its data will be permanently removed.')) return;
    setDeleting(id);
    try {
      await companyAPI.delete(id);
      toast.success('Company deleted');
      fetchCompanies();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to delete company';
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

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div
          style={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-dark))',
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 800,
            color: 'white',
            margin: '0 auto 16px',
            boxShadow: '0 0 24px rgba(99,102,241,0.4)',
          }}
        >
          S
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
          Gateway of SmartERP
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Welcome, <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{user?.name}</span>. Select or create a company to continue.
        </p>
      </div>

      {/* Company list + create */}
      <div style={{ width: '100%', maxWidth: 680 }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
              {companies.length}/5 companies
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {companies.length < 5 && (
              <button className="btn btn-primary" onClick={openCreate}>
                + New Company
              </button>
            )}
            <button
              className="btn btn-ghost"
              style={{ fontSize: 12 }}
              onClick={() => {
                clearCompany();
                useAuthStore.getState().logout();
                router.push('/login');
              }}
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Max limit warning */}
        {companies.length >= 5 && (
          <div
            style={{
              padding: '10px 14px',
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 8,
              fontSize: 12,
              color: 'var(--warning)',
              marginBottom: 16,
            }}
          >
            ⚠ Maximum 5 companies allowed per account. Delete one to create a new company.
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⟳</div>
            Loading companies...
          </div>
        ) : companies.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 48 }}>
            <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.3 }}>🏢</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              No companies yet
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
              Create your first company to get started with SmartERP
            </div>
            <button className="btn btn-primary" onClick={openCreate}>
              + Create Company
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {companies.map((c) => (
              <div
                key={c.id}
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '14px 18px',
                  transition: 'border-color 0.2s',
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: 'var(--accent-glow)',
                    border: '1px solid var(--accent)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  🏢
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {c.address && <span>📍 {c.address}</span>}
                    {c.gstNumber && <span>🔖 GSTIN: {c.gstNumber}</span>}
                    <span>📅 FY {c.financialYear}</span>
                    {c.state && <span>🗺 {c.state}</span>}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleSelect(c)}
                  >
                    Open
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => openEdit(c)}
                    style={{ padding: '7px 10px' }}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(c.id)}
                    disabled={deleting === c.id}
                    style={{ padding: '7px 10px' }}
                  >
                    {deleting === c.id ? '...' : 'Del'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div className="modal-title">
                {editingId ? '✏️ Edit Company' : '🏢 Create Company'}
              </div>
              <button
                className="btn btn-ghost btn-icon"
                onClick={() => setShowModal(false)}
                style={{ padding: '4px 8px', fontSize: 18 }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Company Name *</label>
                    <input
                      className="input"
                      placeholder="e.g. Rahul Traders Pvt. Ltd."
                      {...register('name', { required: 'Company name is required' })}
                    />
                    {errors.name && <span className="form-error">{errors.name.message}</span>}
                  </div>

                  <div className="form-group">
                    <label className="form-label">GST Number</label>
                    <input
                      className="input"
                      placeholder="e.g. 27AABCU9603R1ZM"
                      {...register('gstNumber')}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Financial Year</label>
                    <select className="input select" {...register('financialYear')}>
                      {FINANCIAL_YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">State</label>
                    <select className="input select" {...register('state')}>
                      <option value="">— Select State —</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input
                      className="input"
                      placeholder="e.g. +91 98765 43210"
                      {...register('phone')}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Email</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="business@company.com"
                      {...register('email')}
                    />
                  </div>

                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editingId ? 'Update Company' : 'Create Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
