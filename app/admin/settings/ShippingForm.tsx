'use client';
import { useState } from 'react';
import {
  updateGbShippingRate,
  updateEuShippingRate,
  updateIntShippingRate,
} from './actions';
import type { ShippingRates } from '@/app/_lib/shippingSettings';

function RateField({
  label,
  initialPence,
  onSave,
}: {
  label: string;
  initialPence: number;
  onSave: (pence: number) => Promise<void>;
}) {
  const [pounds, setPounds] = useState((initialPence / 100).toFixed(2));
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const val = parseFloat(pounds);
    if (isNaN(val) || val < 0) {
      setError('Enter a valid amount (0 for free)');
      return;
    }
    setPending(true);
    try {
      await onSave(Math.round(val * 100));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <label className="flex-1 block">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="relative mt-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-base">£</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={pounds}
            onChange={(e) => { setPounds(e.target.value); setSaved(false); }}
            className="block w-full rounded-md border border-muted bg-background pl-7 pr-3 py-2 text-base focus:border-foreground focus:outline-none"
          />
        </div>
      </label>
      <div className="flex flex-col items-start gap-1 pb-0.5">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded border border-foreground bg-foreground text-background text-base transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {error && <p className="text-xs text-red-500 whitespace-nowrap">{error}</p>}
        {saved && <p className="text-xs text-green-600">Saved.</p>}
      </div>
    </form>
  );
}

function RegionSection({
  title,
  description,
  rate,
  onSave,
}: {
  title: string;
  description: string;
  rate: number;
  onSave: (pence: number) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-base font-medium">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <RateField label="Shipping rate" initialPence={rate} onSave={onSave} />
    </div>
  );
}

export function ShippingForm({ rates }: { rates: ShippingRates }) {
  return (
    <div className="space-y-8">
      <RegionSection
        title="UK"
        description="Applied for orders shipping within the UK. Also shown in the cart before the customer's country is known."
        rate={rates.gbRate}
        onSave={updateGbShippingRate}
      />
      <div className="border-t border-muted/50 pt-6">
        <RegionSection
          title="EU / EEA"
          description="Applied when the customer's shipping country is within the EU or EEA (Austria, France, Germany, etc.)."
          rate={rates.euRate}
          onSave={updateEuShippingRate}
        />
      </div>
      <div className="border-t border-muted/50 pt-6">
        <RegionSection
          title="International"
          description="Applied for all other countries (US, Canada, Australia, Japan, etc.)."
          rate={rates.intRate}
          onSave={updateIntShippingRate}
        />
      </div>
    </div>
  );
}
