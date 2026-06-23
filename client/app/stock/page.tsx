'use client';
import { useEffect, useState } from 'react';
import { stockAPI } from '@/lib/api';
import { useCompanyStore, useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function StockPage() {
  const router = useRouter();
  const { selectedCompany } = useCompanyStore();
  const { token } = useAuthStore();

  const [items, setItems] = useState([]);

  useEffect(() => {
    if (!token) router.push('/login');
    if (!selectedCompany) router.push('/companies');
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, token]);

  async function fetchItems() {
    if (!selectedCompany) return;
    try {
      const res = await stockAPI(selectedCompany.id).listItems();
      setItems(res.data.data || []);
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="erp-content">
      <div className="card">
        <div className="card-header"><div className="card-title">Stock Items</div></div>
        <div>
          {items.length === 0 ? (
            <div style={{ padding: 16, color: 'var(--text-muted)' }}>No stock items found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Name</th>
                  <th>SKU</th>
                  <th>Current Stock</th>
                  <th>Selling Price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>{i.name}</td>
                    <td style={{ width: 140 }}>{i.sku || '-'}</td>
                    <td style={{ width: 140 }}>{Number(i.currentStock || 0)}</td>
                    <td style={{ width: 140 }}>₹{Number(i.sellingPrice || 0).toFixed(2)}</td>
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
