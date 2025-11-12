'use client';

import { AdminShell } from '@/components/AdminShell';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Don't show AdminShell on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Auth check is handled by middleware
  return <AdminShell>{children}</AdminShell>;
}
