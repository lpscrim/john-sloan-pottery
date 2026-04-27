'use client';
import { useState } from 'react';
import { updateCategoriesVisible } from './actions';

export function CategoriesToggle({ current }: { current: boolean }) {
  const [visible, setVisible] = useState(current);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setPending(true);
    setSaved(false);
    setError(null);
    const next = !visible;
    try {
      await updateCategoriesVisible(next);
      setVisible(next);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          role="switch"
          aria-checked={visible}
          className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-colors disabled:opacity-50 ${
            visible ? 'bg-foreground border-foreground' : 'bg-muted border-muted'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-background transition-transform ${
              visible ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-base">{visible ? 'Visible' : 'Hidden'}</span>
      </div>
      {error && <p className="text-base text-red-500">{error}</p>}
      {saved && <p className="text-base text-green-600">Saved.</p>}
    </div>
  );
}
