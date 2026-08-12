'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';import { nanoid } from 'nanoid';
import { useSocket } from '@/lib/useSocket';
import { uploadMedia } from '@/lib/media';
import { env } from '@/lib/env';
import type { ChatMessage } from '@/lib/types';
import { Composer } from './Composer';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { StatusPill } from './StatusPill';
import { LogoIcon, TrashIcon, InstagramIcon } from './icons';

const VISITOR_KEY = 'atharv_visitor_id';

function getVisitorId(): string {
  let id = localStorage.getItem(VISITOR_KEY);
  if (!id) {
    id = nanoid(16);
    localStorage.setItem(VISITOR_KEY, id);
  }
  return id;
}

const SUGGESTIONS = [
  'What can you do?',
  'Help me plan my day',
  'Explain quantum computing simply',
  'Give me a creative story idea',
];

export function ChatApp() {
  const [visitorId] = useState<string>(() =>
    typeof window === 'undefined' ? '' : getVisitorId(),
  );
  const visitorAuth = useMemo(
    () => (visitorId ? { role: 'visitor' as const, visitorId } : null),
    [visitorId],
  );
  const socket = useSocket(visitorAuth);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshHistory = useCallback(() => {
    if (!visitorId) return;
    fetch(`${env.apiUrl}/api/conversations/${visitorId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (data.conversation) setConversationId(data.conversation.id);
        if (Array.isArray(data.messages)) setMessages(data.messages);
      })
      .catch(() => undefined);
  }, [visitorId]);

  useEffect(() => {
    if (!visitorId) return;
    fetch(`${env.apiUrl}/api/conversations/${visitorId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        if (data.conversation) setConversationId(data.conversation.id);
        if (Array.isArray(data.messages)) setMessages(data.messages);
      })
      .catch(() => setNotice('Could not load previous messages.'));
  }, [visitorId]);

  useEffect(() => {
    if (!socket) return;

    const poll = setInterval(() => refreshHistory(), 15000);
    const onConnect = () => {
      setConnected(true);
      refreshHistory();
    };
    const onDisconnect = () => setConnected(false);
    const onAck = ({ message }: { message: ChatMessage }) => {
      setPending((p) => p.slice(1));
      setMessages((m) => [...m, message]);
      setConversationId(message.conversation_id);
    };
    const onUserMessage = ({ message }: { message: ChatMessage }) => {
      setMessages((m) => [...m, message]);
      setAdminTyping(false);
    };
    const onTyping = ({ isTyping }: { isTyping: boolean }) => setAdminTyping(isTyping);
    const onError = ({ message }: { message: string }) => {
      setPending((p) =>
        p.map((m, i) => (i === p.length - 1 ? { ...m, status: 'error' } : m)),
      );
      setNotice(message);
    };
    const onCleared = () => {
      setMessages([]);
      setPending([]);
      setConversationId(null);
    };
    const onClosed = onCleared;

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('user:ack', onAck);
    socket.on('user:message', onUserMessage);
    socket.on('user:typing', onTyping);
    socket.on('user:error', onError);
    socket.on('user:cleared', onCleared);
    socket.on('user:closed', onClosed);

    return () => {
      clearInterval(poll);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('user:ack', onAck);
      socket.off('user:message', onUserMessage);
      socket.off('user:typing', onTyping);
      socket.off('user:error', onError);
      socket.off('user:cleared', onCleared);
      socket.off('user:closed', onClosed);
    };
  }, [socket, refreshHistory]);

  useEffect(() => {
    if (!notice) return;
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 4000);
    return () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, [notice]);

  const combined = useMemo(() => [...messages, ...pending], [messages, pending]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [combined.length, adminTyping, uploading]);

  const lastSender = combined.length > 0 ? combined[combined.length - 1].sender : null;
  const awaitingReply = lastSender === 'visitor';
  const showHero = combined.length === 0 && !uploading;

  function sendMessage(payload: {
    kind?: ChatMessage['kind'];
    content?: string;
    mediaUrl?: string;
    mimeType?: string;
  }) {
    if (!socket) {
      setNotice('Connection is not ready yet. Please retry.');
      return;
    }
    const temp: ChatMessage = {
      id: `temp-${nanoid(8)}`,
      conversation_id: conversationId ?? '',
      sender: 'visitor',
      kind: payload.kind ?? 'text',
      content: payload.content ?? null,
      media_url: payload.mediaUrl ?? null,
      mime_type: payload.mimeType ?? null,
      created_at: new Date().toISOString(),
      read_at: null,
      temp: true,
      status: 'sending',
    };
    setPending((p) => [...p, temp]);
    socket.emit('user:send', payload);
  }

  function handleSendText(text: string) {
    sendMessage({ kind: 'text', content: text });
  }

  async function handleSendMedia(file: File) {
    setUploading(true);
    try {
      const { url, mimeType } = await uploadMedia(file, env.uploadFolder);
      sendMessage({ kind: 'image', mediaUrl: url, mimeType });
    } catch {
      setNotice('Image upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSendVoice(blob: Blob) {
    setUploading(true);
    try {
      const file = new File([blob], `voice-${Date.now()}.webm`, { type: blob.type || 'audio/webm' });
      const { url, mimeType } = await uploadMedia(file, 'voice');
      sendMessage({ kind: 'voice', mediaUrl: url, mimeType });
    } catch {
      setNotice('Voice upload failed.');
    } finally {
      setUploading(false);
    }
  }

  function handleTypingChange(isTyping: boolean) {
    socket?.emit('typing', { conversationId, isTyping });
  }

  function clearConversation() {
    if (!socket) return;
    if (!window.confirm('Clear this chat? The admin keeps a copy in history.')) return;
    socket.emit('visitor:clear');
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-ink-950">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="bg-vignette pointer-events-none absolute inset-0" />
      <div className="orb animate-float h-96 w-96 bg-accent/25" style={{ top: '-10rem', left: '8%' }} />
      <div
        className="orb animate-float h-80 w-80 bg-mag/20"
        style={{ bottom: '-7rem', right: '6%', animationDelay: '-9s' }}
      />

      <header className="glass relative z-10 mx-auto mt-4 flex w-full max-w-4xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5 animate-fade-up sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <LogoIcon className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-slate-100">
              Atharv Intelligence
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
              reasoning interface
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://www.instagram.com/nowimchalant/?utm_source=ig_web_button_share_sheet"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-line p-1.5 text-slate-400 transition hover:border-emerald-400/40 hover:text-emerald-400"
            aria-label="Instagram"
            title="Follow on Instagram"
          >
            <InstagramIcon className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={clearConversation}
            disabled={!connected}
            className="rounded-lg border border-line p-1.5 text-slate-400 transition hover:border-red-400/40 hover:text-red-400 disabled:opacity-40 disabled:hover:border-line disabled:hover:text-slate-400"
            aria-label="Clear chat"
            title="Clear chat"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
          <StatusPill connected={connected} />
        </div>
      </header>

      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col overflow-hidden px-4 sm:px-6">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4 pt-2">
          {showHero && (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="glass flex flex-col items-center rounded-3xl p-8 text-center shadow-panel animate-fade-up">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-ink-800 shadow-glow">
                  <LogoIcon className="h-9 w-9" />
                </div>
                <h1 className="text-xl font-semibold tracking-wide text-slate-100">
                  Atharv Intelligence
                </h1>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.25em] text-slate-500">
                  how can I help you?
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSendText(s)}
                      className="rounded-full border border-line bg-white/5 px-3.5 py-1.5 text-xs text-slate-300 transition hover:border-accent/40 hover:text-accent-bright"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <p className="max-w-sm text-center font-mono text-[11px] leading-relaxed text-slate-600">
                text · image · voice
                <br />
                real-time reasoning with a personal touch
              </p>
            </div>
          )}

          {!showHero &&
            combined.map((m) => <MessageBubble key={m.id} message={m} />)}

          {uploading && !showHero && (
            <TypingIndicator label="uploading attachment…" />
          )}

          {awaitingReply && !adminTyping && (
            <TypingIndicator label="Atharv Intelligence is processing…" />
          )}

          {adminTyping && (
            <TypingIndicator dots label="Atharv Intelligence is typing…" />
          )}
        </div>

        {notice && (
          <div className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-xs text-red-300">
            {notice}
          </div>
        )}

        <div className="pb-4 pt-2">
          <Composer
            onSendText={handleSendText}
            onSendMedia={handleSendMedia}
            onSendVoice={handleSendVoice}
            onTypingChange={handleTypingChange}
            disabled={!connected || uploading}
          />
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-slate-700">
            Atharv Intelligence · responses are human-reviewed in real time
          </p>
        </div>
      </main>
    </div>
  );
}
