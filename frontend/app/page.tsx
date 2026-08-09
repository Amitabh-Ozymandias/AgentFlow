// Root page — redirects to login or dashboard
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

export default function Home() {
  const { state } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (state.isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
  }, [state.isAuthenticated, router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div className="spinner spinner-lg" />
    </div>
  );
}
