'use client';

import { AdminShell } from '@/components/AdminShell';
import { usePathname } from 'next/navigation';
import { PUBLIC_ADMIN_PAGES } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pas de menu admin sur les pages accessibles sans session (login, mot de passe oublié…)
  if (PUBLIC_ADMIN_PAGES.includes(pathname)) {
    return <>{children}</>;
  }

  // Auth check is handled by middleware
  return <AdminShell>{children}</AdminShell>;
}
