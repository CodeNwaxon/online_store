'use client';

import { useAdmin } from '@/hooks/useAdmin';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Loading from '@/app/loading';

interface AdminGuardProps {
  children: React.ReactNode;
  requireCEO?: boolean;
}

export default function AdminGuard({ children, requireCEO = false }: AdminGuardProps) {
  const { adminData, loading, isCEO } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!adminData) {
        router.push('/');
      } else if (requireCEO && !isCEO) {
        router.push('/admin');
      }
    }
  }, [adminData, loading, isCEO, requireCEO, router]);

  if (loading) return <Loading />;
  
  if (!adminData) return null;
  if (requireCEO && !isCEO) return null;

  return <>{children}</>;
}
