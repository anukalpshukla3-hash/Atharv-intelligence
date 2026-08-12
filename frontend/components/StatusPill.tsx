'use client';

export function StatusPill({ connected }: { connected: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest ${
        connected
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-line bg-white/5 text-slate-400'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          connected ? 'bg-emerald-400 shadow-glow' : 'animate-pulse bg-slate-500'
        }`}
      />
      {connected ? 'interface online' : 'connecting'}
    </div>
  );
}
