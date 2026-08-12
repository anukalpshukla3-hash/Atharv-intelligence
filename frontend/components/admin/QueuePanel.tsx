'use client';

import type { Conversation } from '@/lib/types';
import { formatTime } from '@/lib/media';
import { ChevronIcon } from '../icons';

interface QueuePanelProps {
  conversations: Conversation[];
  selectedId: string | null;
  typing: Record<string, boolean>;
  snippets: Record<string, string>;
  connected: boolean;
  historyMode: boolean;
  onToggleHistory: () => void;
  onSelect: (id: string) => void;
}

export function QueuePanel({
  conversations,
  selectedId,
  typing,
  snippets,
  connected,
  historyMode,
  onToggleHistory,
  onSelect,
}: QueuePanelProps) {
  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread ?? 0), 0);

  return (
    <aside className="flex h-full w-full flex-col md:w-80 md:border-r md:border-line-soft">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-400">
          {historyMode ? 'History' : 'Incoming queue'}
        </h2>
        {!historyMode && totalUnread > 0 && (
          <span className="rounded-full border border-mag/40 bg-mag/15 px-2 py-0.5 font-mono text-[10px] text-mag">
            {totalUnread}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 px-2 pb-2">
        <button
          type="button"
          onClick={() => !historyMode && onToggleHistory()}
          className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest transition ${
            !historyMode
              ? 'bg-accent/20 text-accent-bright'
              : 'border border-line text-slate-500 hover:text-slate-300'
          }`}
        >
          Active
        </button>
        <button
          type="button"
          onClick={() => historyMode && onToggleHistory()}
          className={`flex-1 rounded-lg px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest transition ${
            historyMode
              ? 'bg-mag/20 text-mag'
              : 'border border-line text-slate-500 hover:text-slate-300'
          }`}
        >
          History
        </button>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto px-2 pb-4">
        {conversations.length === 0 ? (
          <p className="px-3 py-10 text-center font-mono text-xs leading-relaxed text-slate-600">
            {historyMode
              ? 'No archived chats yet.\nEnded conversations land here.'
              : connected
                ? 'No conversations yet.\nIncoming messages will appear here.'
                : 'Connecting to socket…'}
          </p>
        ) : (
          conversations.map((c) => {
            const active = c.id === selectedId;
            const unread = c.unread ?? 0;
            const snippet = snippets[c.id];
            const archived = c.status === 'closed';
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(c.id)}
                className={`group w-full rounded-2xl border px-3 py-2.5 text-left transition ${
                  active
                    ? 'border-accent/40 bg-ink-800 shadow-glow'
                    : 'border-transparent bg-white/[0.02] hover:border-line hover:bg-white/[0.04]'
                } ${archived ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        archived
                          ? 'bg-slate-500'
                          : c.status === 'open'
                            ? 'bg-emerald-400'
                            : 'bg-slate-600'
                      }`}
                    />
                    <span className="truncate text-sm font-medium text-slate-100">
                      {c.visitor_label}
                    </span>
                    {unread > 0 && (
                      <span className="rounded-full bg-accent px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white">
                        {unread}
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-slate-600">
                    {formatTime(c.last_message_at)}
                  </span>
                </div>

                <div className="mt-1 flex items-center justify-between gap-2 pl-4">
                  {!archived && typing[c.id] ? (
                    <span className="typing-dots flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    </span>
                  ) : (
                    <span className="truncate font-mono text-[11px] text-slate-500">
                      {archived
                        ? 'archived'
                        : snippet ?? `${kindLabel(c)} · no message yet`}
                    </span>
                  )}
                  <ChevronIcon
                    className={`h-3.5 w-3.5 shrink-0 text-slate-600 transition ${
                      active ? 'rotate-90 text-accent' : ''
                    }`}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}

function kindLabel(c: Conversation): string {
  return c.status === 'closed' ? 'closed' : 'open';
}
