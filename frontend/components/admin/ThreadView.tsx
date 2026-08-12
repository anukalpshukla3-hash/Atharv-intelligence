'use client';

import { useEffect, useRef } from 'react';
import type { Conversation, Message } from '@/lib/types';
import { MessageBubble } from '../MessageBubble';
import { Composer } from '../Composer';
import { TypingIndicator } from '../TypingIndicator';
import { BackIcon, CloseIcon, TrashIcon } from '../icons';

interface ThreadViewProps {
  conversation: Conversation | null;
  messages: Message[];
  isTyping: boolean;
  uploading: boolean;
  onReplyText: (text: string) => void;
  onReplyMedia: (file: File) => void;
  onReplyVoice: (blob: Blob) => void;
  onTypingChange: (isTyping: boolean) => void;
  onClear: () => void;
  onClose: () => void;
  onRestore: () => void;
  onBack: () => void;
}

export function ThreadView({
  conversation,
  messages,
  isTyping,
  uploading,
  onReplyText,
  onReplyMedia,
  onReplyVoice,
  onTypingChange,
  onClear,
  onClose,
  onRestore,
  onBack,
}: ThreadViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages.length, isTyping]);

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-600">
          Select a conversation to reply
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-800">
          queue, thread, reply
        </p>
      </div>
    );
  }

  const archived = conversation.status === 'closed';

  return (
    <section className="flex h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="rounded-lg border border-line p-1.5 text-slate-400 transition hover:text-slate-200 md:hidden"
            aria-label="Back to queue"
          >
            <BackIcon className="h-4 w-4" />
          </button>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-100">{conversation.visitor_label}</p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
              {conversation.visitor_id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest ${
              archived
                ? 'border-line bg-white/5 text-slate-500'
                : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
            }`}
          >
            {archived ? 'archived' : 'open'}
          </span>
          {archived ? (
            <button
              type="button"
              onClick={onRestore}
              className="rounded-lg border border-line px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-300"
              title="Move back to the active queue"
            >
              Restore
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClear}
                className="rounded-lg border border-line p-1.5 text-slate-400 transition hover:border-red-400/40 hover:text-red-400"
                aria-label="End and archive conversation"
                title="End and archive conversation"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-line p-1.5 text-slate-400 transition hover:border-red-400/40 hover:text-red-400"
                aria-label="End and archive conversation"
                title="End and archive conversation"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {!archived && isTyping && <TypingIndicator dots label="visitor is typing..." />}
        {archived && messages.length === 0 && (
          <p className="pt-10 text-center font-mono text-xs text-slate-600">
            No messages in this archived chat.
          </p>
        )}
      </div>

      <div className="border-t border-line-soft px-4 py-3">
        {archived ? (
          <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600">
            archived — restore to reply
          </p>
        ) : (
          <Composer
            onSendText={onReplyText}
            onSendMedia={onReplyMedia}
            onSendVoice={onReplyVoice}
            onTypingChange={onTypingChange}
            placeholder="Reply as Atharv Intelligence..."
            disabled={!conversation || uploading}
          />
        )}
      </div>
    </section>
  );
}
