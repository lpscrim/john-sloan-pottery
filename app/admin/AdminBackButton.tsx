'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AdminBackButton() {
  const pathname = usePathname();
  if (pathname === '/admin') return null;
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Link
        href="/admin"
        className="text-sm px-4 py-2 rounded border border-muted bg-background hover:border-foreground transition-colors"
      >
        ← Admin
      </Link>
    </div>
  );
}
