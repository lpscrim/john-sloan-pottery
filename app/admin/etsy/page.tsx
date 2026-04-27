import { isEtsyConnected } from '@/app/_lib/etsy';
import { EtsyClient } from './EtsyClient';

export default async function EtsyAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const params = await searchParams;
  let connected = false;
  try {
    connected = await isEtsyConnected();
  } catch {
    connected = false;
  }

  return (
    <div className="bg-background text-foreground px-6 pt-16 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl tracking-tight">ETSY SYNC</h1>
        <EtsyClient
          connected={connected}
          initialError={params.error}
          justConnected={params.connected === '1'}
        />
      </div>
    </div>
  );
}
