'use client';

import { AdminShell } from '@/components/AdminShell';
import { usePathname } from 'next/navigation';
import { PUBLIC_ADMIN_PAGES } from '@/lib/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Pas de menu admin sur les pages sans session complète (login, mot de passe oublié, code MFA…)
  if (PUBLIC_ADMIN_PAGES.includes(pathname) || pathname === '/admin/mfa') {
    return <>{children}</>;
  }

  // Auth check is handled by middleware
  return <AdminShell>{children}</AdminShell>;
}
