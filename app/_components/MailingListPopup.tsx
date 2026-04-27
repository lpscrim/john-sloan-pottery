'use client';

import { useEffect, useState } from 'react';
import Button from '@/app/_components/UI/Layout/Button';

const STORAGE_KEY = 'mailing_list_dismissed';
const DELAY_MS = 5000;

export default function MailingListPopup() {
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function open() {
    setStatus('idle');
    setEmail('');
    setErrorMsg('');
    setVisible(true);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = () => open();
    window.addEventListener('open-mailing-list', handler);
    return () => window.removeEventListener('open-mailing-list', handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong');
      setStatus('success');
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
    >
      <div
        className="relative rounded-xs w-full max-w-lg bg-background text-foreground p-8 md:p-12 overflow-y-auto max-h-[90svh]"
        style={{ border: '1px solid var(--border)' }}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          className="absolute top-4 right-5 text-muted-foreground hover:text-foreground transition-colors text-2xl leading-none cursor-crosshair"
        >
          ×
        </button>

        {status === 'success' ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-2xl" style={{ fontFamily: 'EB Garamond, serif' }}>Thank you for signing up</p>
            <p className="text-muted-foreground text-sm">You&apos;ll hear from us when inspiration strikes.</p>
            <div className="pt-4">
              <Button size="sm" onClick={dismiss}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl md:text-3xl mb-4" style={{ fontFamily: 'EB Garamond, serif' }}>
                {/* TODO: Replace with your newsletter title */}
                Newsletter
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                <p>
                  Sign up to receive news about exhibitions, new paintings and prints
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label htmlFor="popup-email" className="block text-xs text-muted-foreground mb-2 tracking-wide uppercase">
                  Email address
                </label>
                <input
                  id="popup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-transparent border-b border-foreground/30 focus:border-foreground outline-none py-1.5 text-base placeholder:text-muted-foreground transition-colors"
                />
              </div>

              {status === 'error' && (
                <p className="text-xs text-destructive">{errorMsg}</p>
              )}

              <div className="flex items-center justify-between pt-2">
                <Button size="sm" disabled={status === 'loading'}>
                  {status === 'loading' ? 'Subscribing…' : 'Subscribe'}
                </Button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-sm text-muted-foreground underline underline-offset-2 cursor-crosshair hover:text-foreground transition-colors"
                >
                  No thanks
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
