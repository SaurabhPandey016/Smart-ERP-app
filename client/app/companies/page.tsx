'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { companyAPI } from '@/lib/api';
import { useAuthStore, useCompanyStore } from '@/lib/store';

export default function CompaniesPage() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { selectedCompany, selectCompany } = useCompanyStore();

  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', gstNumber: '' });

  useEffect(() => {
    if (!token) return router.push('/login');
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchList() {
    setLoading(true);
    try {
      const res = await companyAPI.list();
      setCompanies(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await companyAPI.create(form);
      setForm({ name: '', address: '', gstNumber: '' });
      fetchList();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  function handleSelect(c) {
    selectCompany(c);
    router.push('/dashboard');
  }

  return (
    <div className="erp-content">
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ flex: 1 }} className="card">
          <div className="card-header"><div className="card-title">Select Company</div></div>
          <div>
            {loading ? (
              <div>Loading companies...</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {companies.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{c.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.address || ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary" onClick={() => handleSelect(c)}>Open</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ width: 360 }} className="card">
          <div className="card-header"><div className="card-title">Create Company</div></div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input className="input" placeholder="Company name" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} required />
            <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} />
            <input className="input" placeholder="GST Number" value={form.gstNumber} onChange={(e) => setForm((s) => ({ ...s, gstNumber: e.target.value }))} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
