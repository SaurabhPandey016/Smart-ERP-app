'use client';
import { useEffect, useState } from 'react';
import { ledgerAPI } from '@/lib/api';
import { useCompanyStore, useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

export default function LedgersPage() {
  const router = useRouter();
  const { selectedCompany } = useCompanyStore();
  const { token } = useAuthStore();

  const [ledgers, setLedgers] = useState([]);
  const [creating, setCreating] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  async function handleCreate(data) {
    if (!selectedCompany) return;
    setCreating(true);
    try {
      if (data.id) {
        // update existing
        await ledgerAPI(selectedCompany.id).update(data.id, { name: data.name, type: data.type });
        toast.success('Ledger updated');
      } else {
        await ledgerAPI(selectedCompany.id).create({ name: data.name, type: data.type });
        toast.success('Ledger created');
      }
      reset();
      fetchLedgers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to save ledger');
    } finally {
      setCreating(false);
    }
  }

  function editLedger(l) {
    reset({ id: l.id, name: l.name, type: l.type });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteLedger(id) {
    if (!selectedCompany) return;
    if (!confirm('Delete this ledger? This cannot be undone.')) return;
    try {
      await ledgerAPI(selectedCompany.id).delete(id);
      toast.success('Ledger deleted');
      fetchLedgers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete ledger');
    }
  }

  useEffect(() => {
    if (!token) router.push('/login');
    if (!selectedCompany) router.push('/companies');
    fetchLedgers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, token]);

  async function fetchLedgers() {
    if (!selectedCompany) return;
    try {
      const res = await ledgerAPI(selectedCompany.id).list();
      setLedgers(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="erp-content">
      <div className="card">
        <div className="card-header"><div className="card-title">Ledgers</div></div>
        <div style={{ padding: 12 }}>
          <form onSubmit={handleSubmit(handleCreate)} style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="hidden" {...register('id')} />
            <input className="input" placeholder="Ledger name" {...register('name', { required: true })} />
            <select className="input" {...register('type')} defaultValue="CUSTOMER">
              <option value="CUSTOMER">Customer</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="EXPENSE">Expense</option>
              <option value="INCOME">Income</option>
              <option value="BANK">Bank</option>
              <option value="CASH">Cash</option>
            </select>
            <button className="btn btn-primary" type="submit" disabled={creating}>{creating ? 'Adding...' : 'Add'}</button>
          </form>

          <div>
          {ledgers.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text-muted)' }}>No ledgers found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Name</th>
                  <th>Type</th>
                  <th>Balance</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ledgers.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{l.name}</td>
                    <td style={{ width: 140 }}>{l.type}</td>
                    <td style={{ width: 140 }}>₹{Number(l.balance || 0).toFixed(2)}</td>
                    <td style={{ width: 220 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" className="btn btn-secondary" onClick={() => editLedger(l)}>Edit</button>
                        <button type="button" className="btn btn-danger" onClick={() => deleteLedger(l.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
