'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { nanoid } from 'nanoid';
import { useSocket } from '@/lib/useSocket';
import { env } from '@/lib/env';
import { uploadMedia } from '@/lib/media';
import { adminSession } from '@/lib/admin';
import type { Conversation, Message } from '@/lib/types';
import { QueuePanel } from './QueuePanel';
import { ThreadView } from './ThreadView';
import { LogoIcon, LogoutIcon } from '../icons';

function snippetFor(message: Message): string {
  if (message.kind === 'image') return 'image attachment';
  if (message.kind === 'voice') return 'voice note';
  return message.content ?? '';
}

export function AdminDashboard() {
  const router = useRouter();
  const [token] = useState<string | null>(() => adminSession.get());
  const adminAuth = useMemo(() => (token ? { role: 'admin' as const, token } : null), [token]);
  const socket = useSocket(adminAuth);

  const [adminName, setAdminName] = useState('Operator');
  const [connected, setConnected] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [snippets, setSnippets] = useState<Record<string, string>>({});
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingReply, setUploadingReply] = useState(false);
  const [historyMode, setHistoryMode] = useState(false);

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    if (!token) {
      router.replace('/login');
      return;
    }
    void refreshConversations();
    fetch(`${env.apiUrl}/api/admin/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.name) setAdminName(data.name);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    if (!token) return;
    setSelectedId(null);
    setMessages([]);
    void refreshConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyMode]);

  async function refreshConversations() {
    if (!token) return;
    try {
      const res = await fetch(
        `${env.apiUrl}/api/admin/conversations${historyMode ? '?scope=history' : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.status === 401) {
        adminSession.clear();
        router.replace('/login');
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch {
      /* ignore transient network errors */
    } finally {
      setLoading(false);
    }
  }

  function markRead(id: string) {
    if (!token) return;
    fetch(`${env.apiUrl}/api/admin/conversations/${id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  }

  function selectConversation(id: string) {
    setSelectedId(id);
    setMessages([]);
    if (!token) return;
    fetch(`${env.apiUrl}/api/admin/conversations/${id}/messages`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setMessages(data);
      })
      .catch(() => undefined);
    markRead(id);
    setConversations((cs) =>
      cs.map((c) => (c.id === id ? { ...c, unread: 0 } : c)),
    );
  }

  function upsertConversation(conversation: Conversation) {
    setConversations((cs) => [
      conversation,
      ...cs.filter((c) => c.id !== conversation.id),
    ]);
  }

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    const onNewMessage = ({
      conversation,
      message,
    }: {
      conversation: Conversation;
      message: Message;
    }) => {
      const isSelected = selectedIdRef.current === conversation.id;
      setConversations((cs) => {
        const existing = cs.find((c) => c.id === conversation.id);
        const unread = isSelected ? 0 : (existing?.unread ?? 0) + 1;
        return [{ ...conversation, unread }, ...cs.filter((c) => c.id !== conversation.id)];
      });
      setSnippets((s) => ({ ...s, [conversation.id]: snippetFor(message) }));
      if (isSelected) {
        setMessages((m) => [...m, message]);
        markRead(conversation.id);
      }
    };

    const onUpdate = ({
      conversation,
      message,
      closed,
      conversationId,
    }: {
      conversation?: Conversation;
      message?: Message;
      closed?: boolean;
      conversationId?: string;
    }) => {
      if (conversation) {
        setConversations((cs) => {
          const existing = cs.find((c) => c.id === conversation.id);
          return [
            { ...conversation, unread: existing?.unread ?? 0 },
            ...cs.filter((c) => c.id !== conversation.id),
          ];
        });
        if (message) {
          setSnippets((s) => ({ ...s, [conversation.id]: snippetFor(message) }));
          if (selectedIdRef.current === conversation.id) {
            setMessages((m) => [...m, message]);
          }
        }
      } else if (conversationId && closed) {
        setConversations((cs) => cs.filter((c) => c.id !== conversationId));
      }
    };

    const onTyping = ({
      conversationId,
      isTyping,
    }: {
      conversationId: string;
      isTyping: boolean;
    }) => setTyping((t) => ({ ...t, [conversationId]: isTyping }));

    const onCleared = ({ conversationId }: { conversationId: string }) => {
      setConversations((cs) => cs.filter((c) => c.id !== conversationId));
      setSnippets((s) => {
        const next = { ...s };
        delete next[conversationId];
        return next;
      });
      setTyping((t) => {
        const next = { ...t };
        delete next[conversationId];
        return next;
      });
      if (selectedIdRef.current === conversationId) {
        setSelectedId(null);
        setMessages([]);
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('admin:newMessage', onNewMessage);
    socket.on('admin:update', onUpdate);
    socket.on('admin:typing', onTyping);
    socket.on('admin:conversationCleared', onCleared);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('admin:newMessage', onNewMessage);
      socket.off('admin:update', onUpdate);
      socket.off('admin:typing', onTyping);
      socket.off('admin:conversationCleared', onCleared);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  function sendReply(payload: {
    kind?: Message['kind'];
    content?: string;
    mediaUrl?: string;
    mimeType?: string;
  }) {
    if (!selectedId || !socket) return;
    const temp: Message = {
      id: `temp-${nanoid(8)}`,
      conversation_id: selectedId,
      sender: 'admin',
      kind: payload.kind ?? 'text',
      content: payload.content ?? null,
      media_url: payload.mediaUrl ?? null,
      mime_type: payload.mimeType ?? null,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((m) => [...m, temp]);
    socket.emit('admin:reply', { conversationId: selectedId, ...payload });
  }

  async function handleReplyMedia(file: File) {
    setUploadingReply(true);
    try {
      const { url, mimeType } = await uploadMedia(file, 'admin');
      sendReply({ kind: 'image', mediaUrl: url, mimeType });
    } catch {
      /* noop */
    } finally {
      setUploadingReply(false);
    }
  }

  async function handleReplyVoice(blob: Blob) {
    setUploadingReply(true);
    try {
      const file = new File([blob], `admin-voice-${Date.now()}.webm`, {
        type: blob.type || 'audio/webm',
      });
      const { url, mimeType } = await uploadMedia(file, 'voice');
      sendReply({ kind: 'voice', mediaUrl: url, mimeType });
    } catch {
      /* noop */
    } finally {
      setUploadingReply(false);
    }
  }

  function handleTypingChange(isTyping: boolean) {
    if (selectedId) socket?.emit('typing', { conversationId: selectedId, isTyping });
  }

  function closeConversation() {
    if (!selectedId || !socket) return;
    socket.emit('admin:close', { conversationId: selectedId });
    setConversations((cs) =>
      cs.map((c) => (c.id === selectedId ? { ...c, status: 'closed' } : c)),
    );
  }

  function clearConversation() {
    if (!selectedId || !socket) return;
    if (!window.confirm('End this chat and move it to history (messages are kept for the admin)?')) return;
    socket.emit('admin:clear', { conversationId: selectedId });
  }

  async function restoreConversation() {
    if (!selectedId || !token) return;
    await fetch(`${env.apiUrl}/api/admin/conversations/${selectedId}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
    setSelectedId(null);
    setMessages([]);
    void refreshConversations();
  }

  function logout() {
    adminSession.clear();
    router.replace('/login');
  }

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-ink-950">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-slate-600">
          loading command center…
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-ink-950">
      <div className="bg-grid pointer-events-none absolute inset-0" />
      <div className="bg-vignette pointer-events-none absolute inset-0" />
      <div className="orb animate-float h-96 w-96 bg-accent/20" style={{ top: '-10rem', left: '6%' }} />
      <div
        className="orb animate-float h-80 w-80 bg-mag/20"
        style={{ bottom: '-7rem', right: '5%', animationDelay: '-9s' }}
      />

      <header className="relative z-10 flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="glass flex h-9 w-9 items-center justify-center rounded-lg">
            <LogoIcon className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-100">Command Center</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
              operator · {adminName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${
              connected
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                : 'border-line bg-white/5 text-slate-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                connected ? 'bg-emerald-400' : 'animate-pulse bg-slate-500'
              }`}
            />
            {connected ? 'live' : 'offline'}
          </span>
          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-2 rounded-lg border border-line px-3 py-1.5 text-xs text-slate-300 transition hover:border-red-400/40 hover:text-red-300"
          >
            <LogoutIcon className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 overflow-hidden">
        <div className={selectedId ? 'hidden md:flex' : 'flex'}>
          <QueuePanel
            conversations={conversations}
            selectedId={selectedId}
            typing={typing}
            snippets={snippets}
            connected={connected}
            historyMode={historyMode}
            onToggleHistory={() => setHistoryMode((h) => !h)}
            onSelect={selectConversation}
          />
        </div>

        {selectedId && (
          <div className="flex min-w-0 flex-1 flex-col">
            <ThreadView
              conversation={selected}
              messages={messages}
              isTyping={selectedId ? !!typing[selectedId] : false}
              uploading={uploadingReply}
              onReplyText={(text) => sendReply({ kind: 'text', content: text })}
              onReplyMedia={handleReplyMedia}
              onReplyVoice={handleReplyVoice}
              onTypingChange={handleTypingChange}
              onClear={clearConversation}
              onClose={closeConversation}
              onRestore={restoreConversation}
              onBack={() => setSelectedId(null)}
            />
          </div>
        )}
      </main>
    </div>
  );
}
