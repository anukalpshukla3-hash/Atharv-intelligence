'use client';

import { SpinnerIcon } from './icons';

export function TypingIndicator({
  label,
  dots,
}: {
  label: string;
  dots?: boolean;
}) {
  return (
    <div className="flex animate-fade-up items-center gap-3">
      <div className="glass rounded-2xl rounded-bl-md px-4 py-3">
        {dots ? (
          <span className="typing-dots flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="h-2 w-2 rounded-full bg-accent" />
          </span>
        ) : (
          <SpinnerIcon className="h-4 w-4 animate-spin text-accent" />
        )}
      </div>
      <span className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
        {label}
      </span>
    </div>
  );
}
