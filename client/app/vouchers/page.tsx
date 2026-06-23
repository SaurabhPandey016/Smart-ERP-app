'use client';
import { useEffect, useState } from 'react';
import { voucherAPI } from '@/lib/api';
import { useCompanyStore, useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'sonner';
import { ledgerAPI } from '@/lib/api';

export default function VouchersPage() {
  const router = useRouter();
  const { selectedCompany } = useCompanyStore();
  const { token } = useAuthStore();

  const [vouchers, setVouchers] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const { register, control, handleSubmit, reset } = useForm({ defaultValues: { items: [{ description: '', quantity: 1, rate: 0, gstPercent: 0 }] } });
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (selectedCompany) fetchLedgers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany]);

  async function fetchLedgers() {
    try {
      const res = await ledgerAPI(selectedCompany.id).list('CUSTOMER');
      setLedgers(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function onCreate(data) {
    if (!selectedCompany) return;
    try {
      if (editingId) {
        await voucherAPI(selectedCompany.id).update(editingId, { type: data.type, date: new Date().toISOString(), partyLedgerId: data.partyLedgerId || null, items: data.items });
        toast.success('Voucher updated');
        setEditingId(null);
      } else {
        await voucherAPI(selectedCompany.id).create({ type: data.type, date: new Date().toISOString(), partyLedgerId: data.partyLedgerId || null, items: data.items });
        toast.success('Voucher created');
      }
      reset();
      fetchVouchers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create voucher');
    }
  }

  useEffect(() => {
    if (!token) router.push('/login');
    if (!selectedCompany) router.push('/companies');
    fetchVouchers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, token]);

  async function fetchVouchers() {
    if (!selectedCompany) return;
    try {
      const res = await voucherAPI(selectedCompany.id).list();
      setVouchers(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleCancel(id) {
    if (!selectedCompany) return;
    if (!confirm('Cancel this voucher?')) return;
    try {
      await voucherAPI(selectedCompany.id).cancel(id);
      toast.success('Voucher cancelled');
      fetchVouchers();
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel voucher');
    }
  }

  async function handleDownload(id, num) {
    if (!selectedCompany) return;
    try {
      const res = await voucherAPI(selectedCompany.id).downloadPDF(id);
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `INV-${num}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error('Failed to download PDF');
    }
  }

  return (
    <div className="erp-content">
      <div className="card p-4 md:p-6">
        <div className="card-header"><div className="card-title">Vouchers</div></div>
        <div className="p-3 md:p-4">
          <form onSubmit={handleSubmit(onCreate)} style={{ marginBottom: 12 }}>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3 mb-3">
              <select className="input md:w-48" {...register('type')} defaultValue="SALES">
                <option value="SALES">Sales</option>
                <option value="PURCHASE">Purchase</option>
                <option value="RECEIPT">Receipt</option>
                <option value="PAYMENT">Payment</option>
              </select>
              <select className="input md:flex-1" {...register('partyLedgerId')}>
                <option value="">-- Select Party --</option>
                {ledgers.map((l) => (<option key={l.id} value={l.id}>{l.name}</option>))}
              </select>
              <button className="btn btn-primary md:ml-2" type="submit">{editingId ? 'Update' : 'Create'}</button>
            </div>
            <div className="grid gap-2">
              {fields.map((f, idx) => (
                <div key={f.id} className="flex gap-2">
                  <input className="input flex-1" placeholder="Description" {...register(`items.${idx}.description`)} />
                  <input className="input w-24" type="number" step="0.001" placeholder="Qty" {...register(`items.${idx}.quantity`)} />
                  <input className="input w-28" type="number" step="0.01" placeholder="Rate" {...register(`items.${idx}.rate`)} />
                  <input className="input w-20" type="number" step="0.01" placeholder="GST%" {...register(`items.${idx}.gstPercent`)} />
                  <button type="button" className="btn btn-danger" onClick={() => remove(idx)}>Del</button>
                </div>
              ))}
              <div>
                <button type="button" className="btn btn-secondary" onClick={() => append({ description: '', quantity: 1, rate: 0, gstPercent: 0 })}>Add Item</button>
              </div>
            </div>
          </form>

          <div>
          {vouchers.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text-muted)' }}>No vouchers found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Number</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Net</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((v) => (
                  <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{v.number}</td>
                    <td>{new Date(v.date).toLocaleDateString()}</td>
                    <td>{v.type}</td>
                    <td>₹{Number(v.netAmount || 0).toFixed(2)}</td>
                    <td style={{ width: 240 }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary" onClick={async () => {
                          // load for edit
                          try {
                            const res = await voucherAPI(selectedCompany.id).getById(v.id);
                            const d = res.data.data;
                            // map items
                            const items = (d.items || []).map((it) => ({ description: it.description || '', quantity: it.quantity, rate: it.rate, gstPercent: it.gstPercent || 0, stockItemId: it.stockItemId }));
                            reset({ type: d.type, partyLedgerId: d.partyLedgerId, items });
                            setEditingId(d.id);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          } catch (e) { console.error(e); toast.error('Failed to load voucher for edit'); }
                        }}>Edit</button>
                        <button className="btn btn-secondary" onClick={() => handleDownload(v.id, v.number)}>PDF</button>
                        {v.status !== 'CANCELLED' && (
                          <button className="btn btn-danger" onClick={() => handleCancel(v.id)}>Cancel</button>
                        )}
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
  </div>
  );
}
