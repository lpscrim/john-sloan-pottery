'use client';

import { useCallback, useEffect, useState } from 'react';

interface CachedListing {
  listing_id: number;
  title: string;
  description: string;
  quantity: number;
  price_pence: number;
  image_url: string | null;
  image_urls: string[];
  etsy_url: string;
  already_imported: boolean;
}

export function EtsyClient() {
  const [listings, setListings] = useState<CachedListing[]>([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState<Record<number, boolean>>({});
  const [imported, setImported] = useState<Record<number, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!successMsg) return;
    const t = setTimeout(() => setSuccessMsg(null), 6000);
    return () => clearTimeout(t);
  }, [successMsg]);

  const fetchCachedListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await fetch('/api/etsy/cached-listings');
      const data = await res.json() as { listings?: CachedListing[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load listings');
      setListings(data.listings ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => { fetchCachedListings(); }, [fetchCachedListings]);

  const handleRefreshFromEtsy = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/etsy/trigger-import', { method: 'POST' });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Refresh failed');
      setSuccessMsg('Etsy listings refreshing — reload this page in ~15 minutes to see updates.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/etsy/poll', { method: 'POST' });
      const data = await res.json() as { message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Sync failed');
      setSuccessMsg(data.message ?? 'Stock sync triggered — Etsy stock will update shortly.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSyncing(false);
    }
  };

  const handleImport = async (listing: CachedListing) => {
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
          image_urls: listing.image_urls,
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

  const notYetImported = listings.filter(
    (l) => !l.already_imported && !imported[l.listing_id],
  );
  const alreadyLinked = listings.filter(
    (l) => l.already_imported || imported[l.listing_id],
  );

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={handleRefreshFromEtsy}
          disabled={refreshing}
          className="rounded-md border border-foreground bg-foreground text-background px-4 py-2 text-base font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
        >
          {refreshing ? 'Triggering…' : 'Refresh Etsy Listings'}
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
          {error}
        </p>
      )}
      {successMsg && (
        <p className="text-base text-green-700 border border-green-200 rounded-md px-3 py-2 bg-green-50">
          {successMsg}
        </p>
      )}

      {/* Listings */}
      {loadingListings ? (
        <p className="text-muted-foreground text-base">Loading cached listings…</p>
      ) : listings.length === 0 ? (
        <p className="text-muted-foreground text-base">
          No cached listings yet. Click <strong>Refresh Etsy Listings</strong> to fetch them from Etsy (takes ~15 minutes on the free Make.com plan).
        </p>
      ) : (
        <div className="space-y-6">
          {notYetImported.length > 0 && (
            <div>
              <h2 className="text-base font-medium mb-2">
                Not on website ({notYetImported.length})
              </h2>
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
              <h2 className="text-base font-medium mb-2 text-muted-foreground">
                Already on website ({alreadyLinked.length})
              </h2>
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
  listings: CachedListing[];
  importing: Record<number, boolean>;
  onImport: (listing: CachedListing) => void;
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
              £{(listing.price_pence / 100).toFixed(2)} · Stock: {listing.quantity}
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
                {importing[listing.listing_id] ? 'Importing…' : 'Add to website'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

