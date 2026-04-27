"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabase } from "@/app/_lib/supabaseBrowser";
import type { Session } from "@supabase/supabase-js";

interface AdminAuthGateProps {
  children: React.ReactNode;
}

async function syncAdminCookie(token: string | null) {
  if (!token) {
    await fetch("/api/admin/session", { method: "DELETE" });
    return { ok: true } as const;
  }

  const res = await fetch("/api/admin/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken: token }),
  });

  if (!res.ok) {
    const data = await res
      .json()
      .catch(() => ({ error: "Authorization failed." }));
    return { ok: false, error: data.error ?? "Authorization failed." } as const;
  }

  return { ok: true } as const;
}

function ChangePasswordForm({ supabase }: { supabase: ReturnType<typeof createBrowserSupabase> }) {
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (newPassword.length < 8) {
      setMsg({ ok: false, text: "Password must be at least 8 characters." });
      return;
    }
    if (newPassword !== confirm) {
      setMsg({ ok: false, text: "Passwords do not match." });
      return;
    }
    setPending(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPending(false);
    if (error) {
      setMsg({ ok: false, text: error.message });
    } else {
      setMsg({ ok: true, text: "Password changed." });
      setNewPassword("");
      setConfirm("");
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Change password
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-wrap">
      <input
        type="password"
        placeholder="New password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        minLength={8}
        className="rounded-md border border-muted bg-background px-2 py-1 text-sm w-36 focus:outline-none focus:border-foreground"
      />
      <input
        type="password"
        placeholder="Confirm"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        required
        className="rounded-md border border-muted bg-background px-2 py-1 text-sm w-28 focus:outline-none focus:border-foreground"
      />
      <button
        type="submit"
        disabled={pending}
        className="text-sm text-foreground hover:opacity-70 transition-opacity disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      <button
        type="button"
        onClick={() => { setOpen(false); setMsg(null); }}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        Cancel
      </button>
      {msg && (
        <span className={`text-sm ${msg.ok ? "text-green-700" : "text-red-600"}`}>
          {msg.text}
        </span>
      )}
    </form>
  );
}

export default function AdminAuthGate({ children }: AdminAuthGateProps) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let initialized = false;

    async function init() {
      // getSession can return a stale/expired token from localStorage.
      // Attempt a refresh first so the access token we sync is valid.
      const { data: refreshed } = await supabase.auth.refreshSession();
      const currentSession = refreshed.session;

      if (!active) return;

      if (!currentSession) {
        // No valid session at all — clear cookie and show login
        await syncAdminCookie(null);
        setSession(null);
        setLoading(false);
        initialized = true;
        return;
      }

      setSession(currentSession);
      const result = await syncAdminCookie(currentSession.access_token);
      if (!active) return;

      if (!result.ok) {
        setError(result.error);
        await supabase.auth.signOut();
        setSession(null);
      }
      setLoading(false);
      initialized = true;
    }

    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, nextSession) => {
        if (!initialized) return;
        setSession(nextSession);
        const result = await syncAdminCookie(nextSession?.access_token ?? null);
        if (!result.ok) {
          setError(result.error);
          await supabase.auth.signOut();
          setSession(null);
        }
        setLoading(false);
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    await syncAdminCookie(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-32">
        <div className="max-w-md mx-auto text-lg text-muted-foreground">
          Loading…
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 py-16">
        <div className="max-w-md mx-auto space-y-6">
          <div>
            <h1 className="text-3xl tracking-tight">ADMIN LOGIN</h1>
            <p className="text-sm text-muted-foreground">
              Sign in to access admin tools.
            </p>
          </div>

          {error && (
            <div className="rounded-md border border-red-400 bg-red-50 px-4 py-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSignIn}>
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-muted bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              className="w-full rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Sign in
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background text-foreground flex py-4 pt-16 flex-col">
      <div className="flex items-center justify-between gap-4 flex-wrap px-6 text-base text-muted-foreground">
        <span>Signed in as {session.user.email}</span>
        <div className="flex items-center gap-4 flex-wrap">
          <ChangePasswordForm supabase={supabase} />
          <button
            type="button"
            onClick={handleSignOut}
            className="text-foreground hover:text-muted-foreground transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}
