import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import AppLayout from '@/components/AppLayout';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'SmartERP — Business Management System',
  description: 'Tally-inspired ERP for managing ledgers, vouchers, inventory, and GST billing',
  keywords: ['ERP', 'accounting', 'inventory', 'GST', 'billing', 'ledger'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* AppLayout conditionally renders sidebar or full-screen based on pathname */}
        <AppLayout>{children}</AppLayout>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontSize: '13px',
            },
          }}
          richColors
        />
      </body>
    </html>
  );
}
