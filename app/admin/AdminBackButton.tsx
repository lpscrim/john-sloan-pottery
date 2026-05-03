'use client';
import { usePathname, useRouter } from 'next/navigation';
import Button from '@/app/_components/UI/Layout/Button';

export function AdminBackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === '/admin') return null;
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <Button size="sm" onClick={() => router.push('/admin')}>
        ← Admin
      </Button>
    </div>
  );
}
