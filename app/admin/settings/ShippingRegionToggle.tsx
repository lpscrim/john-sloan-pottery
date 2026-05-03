'use client';
import { useState } from 'react';
import { updateShippingRegion } from './actions';
import type { ShippingRegion } from '@/app/_lib/shippingSettings';

const OPTIONS: { value: ShippingRegion; label: string; description: string }[] = [
  { value: 'gb', label: 'UK only', description: 'Shipping addresses restricted to Great Britain' },
  { value: 'eu', label: 'UK + EU', description: 'GB plus all EU/EEA countries' },
  { value: 'international', label: 'International', description: 'UK, EU, US, Canada, Australia and more' },
];

export function ShippingRegionToggle({ current }: { current: ShippingRegion }) {
  const [selected, setSelected] = useState<ShippingRegion>(current);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(value: ShippingRegion) {
    if (value === selected) return;
    setSelected(value);
    setSaved(false);
    setError(null);
    setPending(true);
    try {
      await updateShippingRegion(value);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => handleChange(opt.value)}
          disabled={pending}
          className={`w-full text-left px-4 py-3 rounded-md border transition-colors disabled:opacity-50 ${
            selected === opt.value
              ? 'border-foreground bg-foreground/5'
              : 'border-muted hover:border-foreground/50'
          }`}
        >
          <span className="flex items-center gap-3">
            <span
              className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 ${
                selected === opt.value ? 'border-foreground bg-foreground' : 'border-muted-foreground'
              }`}
            />
            <span>
              <span className="text-base font-medium">{opt.label}</span>
              <span className="block text-base text-muted-foreground mt-0.5">{opt.description}</span>
            </span>
          </span>
        </button>
      ))}
      {error && <p className="text-base text-red-500">{error}</p>}
      {saved && <p className="text-base text-green-600">Saved.</p>}
    </div>
  );
}
