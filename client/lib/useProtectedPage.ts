'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, useCompanyStore } from '@/lib/store';

/**
 * useProtectedPage — ensures the user is authenticated and a company is selected
 * before the page renders.
 *
 * Returns { ready: boolean } — render children only when ready === true.
 *
 * Uses a mounted check to wait for Zustand cookie hydration (SSR safe).
 */
export function useProtectedPage(requireCompany = true) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Read state lazily after mount so cookie hydration has completed
  const token           = useAuthStore((s) => s.token);
  const selectedCompany = useCompanyStore((s) => s.selectedCompany);

  useEffect(() => {
    // Give Zustand a tick to hydrate from cookies before checking
    const tid = setTimeout(() => {
      if (!token) {
        router.replace('/login');
        return;
      }
      if (requireCompany && !selectedCompany) {
        router.replace('/companies');
        return;
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(tid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedCompany]);

  return { ready, token, selectedCompany };
}
