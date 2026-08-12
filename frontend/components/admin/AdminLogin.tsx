'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { env } from '@/lib/env';
import { adminSession } from '@/lib/admin';
import { LockIcon, LogoIcon, SpinnerIcon } from '../icons';

export function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${env.apiUrl}/api/admin/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Sign-in failed.');
      adminSession.set(data.token);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed.');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-dvh items-center justify-center overflow-hidden bg-ink-950 px-4">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="bg-vignette pointer-events-none absolute inset-0" />

      <div className="glass relative w-full max-w-sm rounded-3xl p-8 shadow-panel animate-fade-up">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/30 bg-ink-800 shadow-glow">
            <LogoIcon className="h-8 w-8" />
          </div>
          <h1 className="text-lg font-semibold text-slate-100">Command Center</h1>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
            restricted access · authorized operators only
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line bg-ink-900 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent/50"
              placeholder="atharv@atharvintelligence.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line bg-ink-900 px-3.5 py-2.5 text-sm text-slate-100 outline-none transition focus:border-accent/50"
              placeholder="••••••••••"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-medium text-white shadow-glow transition hover:bg-accent-bright disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? (
              <>
                <SpinnerIcon className="h-4 w-4 animate-spin" /> Verifying…
              </>
            ) : (
              <>
                <LockIcon className="h-4 w-4" /> Sign in
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-slate-700">
          atharvintelligence.com / command
        </p>
      </div>
    </div>
  );
}
