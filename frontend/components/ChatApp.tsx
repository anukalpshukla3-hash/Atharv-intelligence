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
  'I need help with a question',
  'Can you explain a concept?',
  'I want to share an idea',
  'I need help troubleshooting something',
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
    fetch(`${env.apiUrl}/api/conversations/me/messages`, { headers: { Authorization: `Bearer ${visitorId}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.conversation) setConversationId(data.conversation.id);
        if (Array.isArray(data.messages)) setMessages(data.messages);
      })
      .catch(() => undefined);
  }, [visitorId]);

  useEffect(() => {
    if (!visitorId) return;
    fetch(`${env.apiUrl}/api/conversations/me/messages`, { headers: { Authorization: `Bearer ${visitorId}` } })
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
    const onConnectError = () => {
      setConnected(false);
      setNotice('Live support is temporarily unreachable. Check your connection and retry.');
    };
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
    socket.on('connect_error', onConnectError);
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
      socket.off('connect_error', onConnectError);
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

      <header className="glass relative z-10 mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-7xl items-center justify-between gap-3 rounded-2xl px-4 py-3 animate-fade-up sm:w-[calc(100%-2.5rem)] sm:px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <LogoIcon className="h-6 w-6" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-wide text-slate-100">
              Atharv Intelligence
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400">
              human support · real time
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="https://www.instagram.com/jsahumbleguy/?utm_source=ig_web_button_share_sheet"
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

      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 gap-5 overflow-hidden px-3 py-3 sm:px-5 sm:py-4">
        <aside className="hidden w-56 shrink-0 flex-col gap-3 py-4 xl:flex">
          <div className="glass-strong rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'bg-amber-400'}`} />
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                {connected ? 'Live connection' : 'Reconnecting'}
              </p>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-100">Human support</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              Your messages go directly to the Atharv Intelligence operator.
            </p>
          </div>
          <div className="glass-strong rounded-2xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Session overview</p>
            <div className="mt-4 flex items-end justify-between">
              <span className="text-3xl font-semibold tracking-tight text-white">{messages.length}</span>
              <span className="pb-1 font-mono text-[10px] uppercase tracking-widest text-slate-500">messages</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-accent via-sky-400 to-mag transition-all duration-500" style={{ width: `${Math.min(messages.length * 8, 100)}%` }} />
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-600">This chat syncs with your saved conversation.</p>
          </div>
          <div className="glass-strong rounded-2xl p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Quick guide</p>
            <ul className="mt-3 space-y-3 text-xs text-slate-400">
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" /><span>Text, images and voice notes are supported.</span></li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-mag" /><span>Keep this tab open for live replies.</span></li>
              <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" /><span>Replies are sent by a human operator.</span></li>
            </ul>
          </div>
          <div className="mt-auto px-2 pb-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-slate-700">Atharv Intelligence / live workspace</p>
          </div>
        </aside>
        <section className="support-panel flex min-w-0 flex-1 flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto pb-4 pt-2">
          {showHero && (
            <div className="flex h-full flex-col items-center justify-center gap-6">
              <div className="glass flex flex-col items-center rounded-3xl p-8 text-center shadow-panel animate-fade-up">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-ink-800 shadow-glow">
                  <LogoIcon className="h-9 w-9" />
                </div>
                <span className="mb-4 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-3 py-1 font-mono text-[9px] uppercase tracking-[0.22em] text-emerald-300">
                  Human-operated support
                </span>
                <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  What can we help with?
                </h1>
                <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                  Send a message, image, or voice note. A human operator will reply right here.
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
              <p className="max-w-sm text-center font-mono text-[10px] uppercase tracking-[0.2em] leading-relaxed text-slate-600">
                Text · images · voice notes · live replies
              </p>
            </div>
          )}

          {!showHero &&
            combined.map((m) => <MessageBubble key={m.id} message={m} />)}

          {uploading && !showHero && (
            <TypingIndicator label="uploading attachment…" />
          )}

          {awaitingReply && !adminTyping && (
            <TypingIndicator label="Waiting for a human operator reply…" />
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
        </section>
      </main>
    </div>
  );
}
