import { EtsyClient } from './EtsyClient';

export default function EtsyAdminPage() {
  return (
    <div className="bg-background text-foreground px-6 pt-16 pb-24">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl tracking-tight">ETSY SYNC</h1>
        <EtsyClient />
      </div>
    </div>
  );
}
