'use client';

import { formatTime } from '@/lib/media';
import type { ChatMessage } from '@/lib/types';
import { CheckIcon, SpinnerIcon } from './icons';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isVisitor = message.sender === 'visitor';
  const isPending = message.status === 'sending';
  const isError = message.status === 'error';

  return (
    <div className={`flex w-full animate-fade-up ${isVisitor ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[86%] flex-col sm:max-w-[72%] ${isVisitor ? 'items-end' : 'items-start'}`}>
        <div
          className={`relative rounded-2xl px-4 py-3 text-[15px] leading-relaxed backdrop-blur-md ${
            isVisitor
              ? 'border border-accent/35 bg-gradient-to-br from-accent/20 via-white/[0.07] to-white/[0.03] text-slate-100 rounded-br-md shadow-glow'
              : 'glass text-slate-100 rounded-bl-md'
          } ${isPending ? 'opacity-60' : ''} ${isError ? 'border-red-500/40 shadow-none' : ''}`}
        >
          {message.kind === 'image' && message.media_url && (
            <img
              src={message.media_url}
              alt="Shared image"
              className="max-w-xs rounded-lg border border-line"
            />
          )}
          {message.kind === 'voice' && message.media_url && (
            <div className="flex items-center gap-3 py-1">
              <audio src={message.media_url} controls className="h-10 w-56 sm:w-64" />
            </div>
          )}
          {message.kind === 'text' && message.content && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
          {isError && (
            <p className="mt-1 font-mono text-xs text-red-400">delivery failed</p>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5 px-1 font-mono text-[10px] uppercase tracking-wider text-slate-500">
          <span>{formatTime(message.created_at)}</span>
          {isVisitor && !message.temp && !isError && <CheckIcon className="h-3 w-3 text-accent" />}
          {isPending && <SpinnerIcon className="h-3 w-3 animate-spin text-accent" />}
        </div>
      </div>
    </div>
  );
}
