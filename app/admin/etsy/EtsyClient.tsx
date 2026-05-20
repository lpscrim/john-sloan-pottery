'use client';

import { useEffect, useState } from 'react';

interface EtsyListing {
  listing_id: number;
  title: string;
  description: string;
  price_pence: number;
  quantity: number;
  image_url: string | null;
  etsy_url: string;
  already_imported: boolean;
}

interface Props {
  connected: boolean;
  initialError?: string;
  justConnected?: boolean;
}

export function EtsyClient({ connected, initialError, justConnected }: Props) {
  const [listings, setListings] = useState<EtsyListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [importing, setImporting] = useState<Record<number, boolean>>({});
  const [imported, setImported] = useState<Record<number, boolean>>({});
  const [syncing, setSyncing] = useState(false);
  const [importingAll, setImportingAll] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [successMsg, setSuccessMsg] = useState<string | null>(
    justConnected ? 'Etsy connected successfully.' : null,
  );

  // Auto-dismiss messages after 5 s
  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 5000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const handlePull = async () => {
    setLoadingListings(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/listings');
      const data = await res.json() as { listings?: EtsyListing[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to fetch listings');
      setListings(data.listings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingListings(false);
    }
  };

  const handleImport = async (listing: EtsyListing) => {
    setImporting((prev) => ({ ...prev, [listing.listing_id]: true }));
    setError(null);
    try {
      const res = await fetch('/api/etsy/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listing.listing_id,
          title: listing.title,
          description: listing.description,
          price_pence: listing.price_pence,
          quantity: listing.quantity,
          image_url: listing.image_url,
        }),
      });
      const data = await res.json() as { success?: boolean; warning?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Import failed');
      setImported((prev) => ({ ...prev, [listing.listing_id]: true }));
      if (data.warning) setError(data.warning);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setImporting((prev) => ({ ...prev, [listing.listing_id]: false }));
    }
  };

  const handleImportAll = async () => {
    setImportingAll(true);
    setError(null);
    try {
      const toImport = listings.filter((l) => !l.already_imported && !imported[l.listing_id]);
      await Promise.all(toImport.map((l) => handleImport(l)));
    } finally {
      setImportingAll(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/etsy/poll');
      const data = await res.json() as { synced?: number; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setSuccessMsg(data.message ?? `Stock sync triggered — Etsy stock will update shortly.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  if (!connected) {
    return (
      <div className="space-y-4">
        {error && (
          <p className="text-base text-red-500 border border-red-200 rounded-md px-3 py-2 bg-red-50">
            {decodeURIComponent(error)}
          </p>
        )}
        <p className="text-muted-foreground">
          Etsy is not connected. Connect your Etsy account to enable two-way stock sync and
          product import.
        </p>
        <a
          href="/api/etsy/auth"
          className="inline-block rounded-md border border-foreground bg-foreground text-background px-4 py-2 text-base font-medium hover:opacity-80 transition-opacity"
        >
          Connect Etsy
        </a>
      </div>
    );
  }

  const notYetImported = listings.filter(
    (l) => !l.already_imported && !imported[l.listing_id],
  );
  const alreadyLinked = listings.filter(
    (l) => l.already_imported || imported[l.listing_id],
  );

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="text-base font-medium text-green-600">● Etsy connected</span>
        <a
          href="/api/etsy/auth"
          className="text-base text-muted-foreground underline hover:text-foreground"
        >
          Reconnect
        </a>
      </div>

      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handlePull}
          disabled={loadingListings}
          className="rounded-md border border-foreground bg-foreground text-background px-4 py-2 text-base font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {loadingListings ? 'Loading…' : 'Pull from Etsy'}
        </button>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          className="rounded-md border border-muted bg-background text-foreground px-4 py-2 text-base font-medium hover:border-foreground transition-colors disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync stock now'}
        </button>
      </div>

      {/* Messages */}
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

      {/* Listings */}
      {listings.length > 0 && (
        <div className="space-y-4">
          <p className="text-base text-muted-foreground">
            {listings.length} active listing{listings.length !== 1 ? 's' : ''} on Etsy
            {notYetImported.length > 0 && ` · ${notYetImported.length} not yet imported`}
          </p>

          {notYetImported.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-medium">Not imported</h2>
                <button
                  onClick={handleImportAll}
                  disabled={importingAll || notYetImported.every((l) => importing[l.listing_id])}
                  className="rounded-md border border-foreground bg-foreground text-background px-3 py-1.5 text-base font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
                >
                  {importingAll ? 'Importing…' : 'Import All'}
                </button>
              </div>
              <ListingTable
                listings={notYetImported}
                importing={importing}
                onImport={handleImport}
                showImportButton
              />
            </div>
          )}

          {alreadyLinked.length > 0 && (
            <div>
              <h2 className="text-base font-medium mb-2 text-muted-foreground">Already imported</h2>
              <ListingTable
                listings={alreadyLinked}
                importing={importing}
                onImport={handleImport}
                showImportButton={false}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ListingTable({
  listings,
  importing,
  onImport,
  showImportButton,
}: {
  listings: EtsyListing[];
  importing: Record<number, boolean>;
  onImport: (listing: EtsyListing) => void;
  showImportButton: boolean;
}) {
  return (
    <div className="divide-y divide-muted border border-muted rounded-md">
      {listings.map((listing) => (
        <div key={listing.listing_id} className="flex items-center gap-4 p-4">
          {listing.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.image_url}
              alt={listing.title}
              className="w-14 h-14 object-cover rounded-md shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{listing.title}</p>
            <p className="text-base text-muted-foreground">
              £{(listing.price_pence / 100).toFixed(2)} &middot; Stock: {listing.quantity}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a
              href={listing.etsy_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-muted-foreground underline hover:text-foreground"
            >
              View
            </a>
            {showImportButton && (
              <button
                onClick={() => onImport(listing)}
                disabled={importing[listing.listing_id]}
                className="rounded-md border border-foreground bg-background text-foreground px-3 py-1.5 text-base hover:bg-foreground hover:text-background transition-colors disabled:opacity-50"
              >
                {importing[listing.listing_id] ? 'Importing…' : 'Import'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
