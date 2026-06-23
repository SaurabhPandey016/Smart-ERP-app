'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCompanyStore, useAuthStore } from '@/lib/store';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedCompany } = useCompanyStore();
  const { token } = useAuthStore();

  useEffect(() => {
    if (!token) router.push('/login');
    if (!selectedCompany) router.push('/companies');
  }, [token, selectedCompany, router]);

  if (!selectedCompany) return null;

  return (
    <div className="erp-content">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20 }}>
        <div className="card">
          <div className="card-header"><div className="card-title">Gateway of SmartERP</div></div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => router.push('/ledgers')}>Ledgers</button>
            <button className="btn btn-primary" onClick={() => router.push('/vouchers')}>Vouchers</button>
            <button className="btn btn-primary" onClick={() => router.push('/stock')}>Stock</button>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Company</div></div>
          <div style={{ padding: 8 }}>
            <div style={{ fontWeight: 700 }}>{selectedCompany.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{selectedCompany.address}</div>
            <div style={{ marginTop: 12 }}>
              <div>Financial Year: {selectedCompany.financialYear || '2024-25'}</div>
              <div>GST: {selectedCompany.gstNumber || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
