import { Server, Socket } from 'socket.io';
import { db, publicUrl } from './db.js';
import { verifyAdminToken, isAdminUser, type AdminPayload } from './auth.js';
import type { Message, Conversation, SendPayload } from './types.js';

const visitorSockets = new Map<string, Socket>();
const adminSockets = new Set<Socket>();

const visitorRate = new Map<string, number[]>();

function rateLimited(visitorId: string, max = 6, windowMs = 10_000): boolean {
  const now = Date.now();
  const hits = (visitorRate.get(visitorId) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    visitorRate.set(visitorId, hits);
    return true;
  }
  hits.push(now);
  visitorRate.set(visitorId, hits);
  return false;
}

async function getConversation(id: string): Promise<Conversation | null> {
  const { data } = await db.from('conversations').select('*').eq('id', id).maybeSingle();
  return (data as Conversation | null) ?? null;
}

async function getOrCreateConversation(visitorId: string): Promise<Conversation> {
  const { data: existing } = await db
    .from('conversations')
    .select('*')
    .eq('visitor_id', visitorId)
    .neq('status', 'closed')
    .maybeSingle();
  if (existing) return existing as Conversation;

  const { data, error } = await db
    .from('conversations')
    .insert({
      visitor_id: visitorId,
      visitor_label: `Visitor ${visitorId.slice(0, 4).toUpperCase()}`,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Conversation;
}

async function insertMessage(  conversationId: string,
  sender: 'visitor' | 'admin',
  payload: SendPayload,
): Promise<Message> {
  const kind = payload.kind ?? (payload.content ? 'text' : 'image');
  const { data, error } = await db
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender,
      kind,
      content: payload.content ?? null,
      media_url: payload.mediaUrl ?? null,
      mime_type: payload.mimeType ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  await db
    .from('conversations')
    .update({ last_message_at: (data as Message).created_at, updated_at: new Date().toISOString() })
    .eq('id', conversationId);
  return data as Message;
}

async function handleUserSend(socket: Socket, payload: SendPayload): Promise<void> {
  const visitorId = socket.data.visitorId as string | undefined;
  if (!visitorId) return;
  if (rateLimited(visitorId)) {
    socket.emit('user:error', { message: 'You are sending messages too quickly. Please wait a moment.' });
    return;
  }
  try {
    const conversation = await getOrCreateConversation(visitorId);
    const message = await insertMessage(conversation.id, 'visitor', payload);
    socket.emit('user:ack', { message });
    const fresh = await getConversation(conversation.id);
    for (const admin of adminSockets) {
      admin.emit('admin:newMessage', { conversation: fresh ?? conversation, message });
    }
  } catch (err) {
    console.error('user:send failed', err);
    socket.emit('user:error', { message: 'Could not deliver your message. Try again.' });
  }
}

async function handleAdminReply(socket: Socket, payload: SendPayload & { conversationId: string }): Promise<void> {
  const admin = socket.data.admin as AdminPayload | undefined;
  if (!admin) return;
  try {
    const conversation = await getConversation(payload.conversationId);
    if (!conversation) return;
    const message = await insertMessage(conversation.id, 'admin', payload);
    const fresh = await getConversation(conversation.id);

    for (const other of adminSockets) {
      if (other !== socket) other.emit('admin:update', { conversation: fresh ?? conversation, message });
    }

    const visitor = visitorSockets.get(conversation.visitor_id);
    if (visitor) {
      visitor.emit('user:message', { message });
      visitor.emit('user:typing', { isTyping: false });
    }
  } catch (err) {
    console.error('admin:reply failed', err);
    socket.emit('admin:error', { message: 'Could not send the reply.' });
  }
}

async function handleTyping(socket: Socket, payload: { conversationId?: string; isTyping: boolean }): Promise<void> {
  try {
    const admin = socket.data.admin as AdminPayload | undefined;
    if (admin) {
      if (!payload.conversationId) return;
      const conversation = await getConversation(payload.conversationId);
      if (!conversation) return;
      const visitor = visitorSockets.get(conversation.visitor_id);
      if (visitor) visitor.emit('user:typing', { isTyping: payload.isTyping });
      return;
    }

    const visitorId = socket.data.visitorId as string | undefined;
    if (!visitorId) return;
    const conversation = payload.conversationId
      ? await getConversation(payload.conversationId)
      : await getOrCreateConversation(visitorId);
    if (!conversation) return;
    for (const admin of adminSockets) {
      admin.emit('admin:typing', {
        conversationId: conversation.id,
        visitorId,
        isTyping: payload.isTyping,
      });
    }
  } catch (err) {
    console.error('typing failed', err);
  }
}

async function handleAdminClose(socket: Socket, payload: { conversationId: string }): Promise<void> {
  const admin = socket.data.admin as AdminPayload | undefined;
  if (!admin || !payload || typeof payload.conversationId !== 'string') return;
  try {
    const conversation = await getConversation(payload.conversationId);
    if (!conversation || conversation.status === 'closed') return;
    await db.from('conversations').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', conversation.id);
    for (const other of adminSockets) other.emit('admin:update', { conversationId: conversation.id, closed: true });
    const visitor = visitorSockets.get(conversation.visitor_id);
    if (visitor) visitor.emit('user:closed', {});
  } catch (err) {
    console.error('admin:close failed', err);
    socket.emit('admin:error', { message: 'Could not close the conversation.' });
  }
}

async function archiveConversation(conversationId: string): Promise<void> {
  await db
    .from('conversations')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', conversationId);
}

async function handleVisitorClear(socket: Socket): Promise<void> {
  const visitorId = socket.data.visitorId as string | undefined;
  if (!visitorId) return;
  try {
    const { data: conversation } = await db
      .from('conversations')
      .select('id')
      .eq('visitor_id', visitorId)
      .neq('status', 'closed')
      .maybeSingle();
    if (conversation) {
      await archiveConversation(conversation.id);
      for (const admin of adminSockets) {
        admin.emit('admin:conversationCleared', { conversationId: conversation.id });
      }
    }
    socket.emit('user:cleared', {});
  } catch (err) {
    console.error('visitor:clear failed', err);
    socket.emit('user:error', { message: 'Could not clear the conversation.' });
  }
}

async function handleAdminClear(socket: Socket, payload: { conversationId: string }): Promise<void> {
  const admin = socket.data.admin as AdminPayload | undefined;
  if (!admin || !payload || typeof payload.conversationId !== 'string') return;
  try {
    const conversation = await getConversation(payload.conversationId);
    if (!conversation || conversation.status === 'closed') return;
    await archiveConversation(conversation.id);
    for (const other of adminSockets) {
      other.emit('admin:conversationCleared', { conversationId: conversation.id });
    }
    const visitor = visitorSockets.get(conversation.visitor_id);
    if (visitor) visitor.emit('user:cleared', {});
  } catch (err) {
    console.error('admin:clear failed', err);
    socket.emit('admin:error', { message: 'Could not clear the conversation.' });
  }
}

export function registerSocketHandlers(io: Server): void {
  io.use(async (socket, next) => {
    const auth = socket.handshake.auth ?? {};
    try {
      if (auth.role === 'admin' && typeof auth.token === 'string') {
        const payload = verifyAdminToken(auth.token);
        if (!payload || !(await isAdminUser(payload.sub))) return next(new Error('Unauthorized'));
        socket.data.admin = payload;
        return next();
      }
      if (auth.role === 'visitor' && typeof auth.visitorId === 'string' && auth.visitorId.length >= 8) {
        socket.data.visitorId = auth.visitorId;
        return next();
      }
    } catch {
      return next(new Error('Unauthorized'));
    }
    next(new Error('Unauthorized'));
  });

  io.on('connection', (socket) => {
    if (socket.data.admin) {
      adminSockets.add(socket);
      socket.on('disconnect', () => adminSockets.delete(socket));
    } else if (socket.data.visitorId) {
      const visitorId = socket.data.visitorId as string;
      visitorSockets.set(visitorId, socket);
      socket.on('disconnect', () => {
        if (visitorSockets.get(visitorId) === socket) visitorSockets.delete(visitorId);
      });
    }

    socket.on('user:send', (payload: SendPayload) => {
      void handleUserSend(socket, payload);
    });
    socket.on('admin:reply', (payload: SendPayload & { conversationId: string }) => {
      void handleAdminReply(socket, payload);
    });
    socket.on('typing', (payload: { conversationId?: string; isTyping: boolean }) => {
      void handleTyping(socket, payload);
    });
    socket.on('admin:close', (payload: { conversationId: string }) => {
      void handleAdminClose(socket, payload);
    });
    socket.on('visitor:clear', () => {
      void handleVisitorClear(socket);
    });
    socket.on('admin:clear', (payload: { conversationId: string }) => {
      void handleAdminClear(socket, payload);
    });
  });
}

export { publicUrl };
