'use client';

import { useEffect, useState } from 'react';

export function EtsyClient() {
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-dismiss messages after 5 s
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/etsy/poll', { method: 'POST' });
      const data = await res.json() as { synced?: number; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setSuccessMsg(data.message ?? 'Stock sync triggered — Etsy stock will update shortly.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  const handleImportFromEtsy = async () => {
    setImporting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/etsy/trigger-import', { method: 'POST' });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Import trigger failed');
      setSuccessMsg(data.message ?? 'Import triggered — new listings will appear shortly.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Import all active Etsy listings onto the website, or sync stock levels now.
        Already-imported listings are skipped automatically.
      </p>

      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleImportFromEtsy}
          disabled={importing}
          className="rounded-md border border-foreground bg-foreground text-background px-4 py-2 text-base font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {importing ? 'Importing…' : 'Import from Etsy'}
        </button>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="rounded-md border border-muted bg-background text-foreground px-4 py-2 text-base font-medium hover:border-foreground transition-colors disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync stock now'}
        </button>
      </div>

      {error && (
        <p className="text-base text-red-500 border border-red-200 rounded-md px-3 py-2 bg-red-50">
          {decodeURIComponent(error)}
        </p>
      )}
      {successMsg && (
        <p className="text-base text-green-700 border border-green-200 rounded-md px-3 py-2 bg-green-50">
          {successMsg}
        </p>
      )}
    </div>
  );
}
