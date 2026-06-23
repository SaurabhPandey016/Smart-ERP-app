'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ShortcutHandler() {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        router.push('/dashboard');
      }
      if (e.altKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        router.push('/ledgers');
      }
      if (!e.altKey && !e.ctrlKey && e.key === 'F8') {
        e.preventDefault();
        router.push('/vouchers');
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        router.push('/stock');
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return null;
}
