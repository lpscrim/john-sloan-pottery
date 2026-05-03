'use client';
import { useTransition, useState } from 'react';
import { setDispatched } from './actions';

interface Props {
  sessionId: string;
  dispatched: boolean;
  dispatchedAt: string | null;
}

export function DispatchButton({ sessionId, dispatched, dispatchedAt }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await setDispatched(sessionId, !dispatched);
      } catch {
        setError('Failed to update');
      }
    });
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={`text-base px-3 py-1.5 rounded border transition-colors disabled:opacity-50 ${
          dispatched
            ? 'border-foreground bg-foreground text-background hover:bg-transparent hover:text-foreground'
            : 'border-muted hover:border-foreground'
        }`}
      >
        {isPending ? '…' : dispatched ? '✓ Dispatched' : 'Mark dispatched'}
      </button>
      {dispatched && dispatchedAt && (
        <span className="text-base text-muted-foreground">
          {new Date(dispatchedAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      )}
      {error && <span className="text-base text-red-500">{error}</span>}
    </div>
  );
}
