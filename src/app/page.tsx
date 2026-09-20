'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (token) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
