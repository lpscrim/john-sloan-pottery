'use client';

import { useRouter } from 'next/navigation';
import Button from '@/app/_components/UI/Layout/Button';

export default function AdminHomePage() {
  const router = useRouter();
  return (
    <div className="bg-background text-foreground px-6 pt-16">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-3xl tracking-tight">ADMIN</h1>
        <p className="text-lg text-muted-foreground">
          Choose a task to continue.
        </p>
        <div className="grid gap-4 text-base">
          <Button size="base" onClick={() => router.push('/admin/add-product')}>Add product</Button>
          <Button size="base" onClick={() => router.push('/admin/edit-product')}>Edit products</Button>
          <Button size="base" onClick={() => router.push('/admin/orders')}>Orders</Button>
          <Button size="base" onClick={() => router.push('/admin/about')}>About page</Button>
          <Button size="base" onClick={() => router.push('/admin/home-about')}>Home about section</Button>
          <Button size="base" onClick={() => router.push('/admin/custom-mug')}>Custom mug builder</Button>
          <Button size="base" onClick={() => router.push('/admin/settings')}>Settings</Button>
          <Button size="base" onClick={() => router.push('/admin/etsy')}>Etsy sync</Button>
        </div>
      </div>
    </div>
  );
}
