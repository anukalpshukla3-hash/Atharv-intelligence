import { Router, type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { db, authClient, publicUrl } from './db.js';
import { signAdminToken, verifyAdminToken, type AdminPayload } from './auth.js';

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
};

function mimeToExt(mime: string): string {
  return EXTENSIONS[mime.toLowerCase()] ?? 'bin';
}

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyAdminToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  (req as Request & { admin?: AdminPayload }).admin = payload;
  next();
}

export function registerRoutes(app: Router): void {
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'atharv-intelligence-backend', ts: Date.now() });
  });

  app.get('/insta', (_req, res) => {
    res.redirect(302, 'https://www.instagram.com/nowimchalant/?utm_source=ig_web_button_share_sheet');
  });

  app.post('/api/admin/sign-in', async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }
    const { data, error } = await authClient.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }
    const { data: admin } = await db
      .from('admin_users')
      .select('id, display_name')
      .eq('id', data.user.id)
      .maybeSingle();
    if (!admin) {
      res.status(403).json({ error: 'This account does not have admin access.' });
      return;
    }
    const token = signAdminToken({ sub: admin.id, name: admin.display_name });
    res.json({ token, user: { id: admin.id, name: admin.display_name } });
  });

  app.get('/api/admin/me', requireAdmin, (req, res) => {
    const admin = (req as Request & { admin?: AdminPayload }).admin!;
    res.json({ id: admin.sub, name: admin.name });
  });

  app.get('/api/admin/conversations', requireAdmin, async (req, res) => {
    const scope = req.query.scope === 'history' ? 'closed' : 'open';
    const { data: conversations, error } = await db
      .from('conversations')
      .select('*')
      .eq('status', scope)
      .order('last_message_at', { ascending: false })
      .limit(100);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    const ids = conversations.map((c) => c.id as string);
    const unreadQuery =
      ids.length > 0
        ? await db
            .from('messages')
            .select('conversation_id')
            .eq('sender', 'visitor')
            .is('read_at', null)
            .in('conversation_id', ids)
        : null;

    const unreadRows = unreadQuery?.data ?? [];

    const unreadMap = new Map<string, number>();
    for (const row of unreadRows ?? []) {
      unreadMap.set(row.conversation_id as string, (unreadMap.get(row.conversation_id as string) ?? 0) + 1);
    }

    res.json(
      conversations.map((c) => ({
        ...c,
        unread: unreadMap.get(c.id as string) ?? 0,
      })),
    );
  });

  app.get('/api/admin/conversations/:id/messages', requireAdmin, async (req, res) => {
    const { data, error } = await db
      .from('messages')
      .select('*')
      .eq('conversation_id', req.params.id)
      .order('created_at', { ascending: true });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json(data);
  });

  app.post('/api/admin/conversations/:id/read', requireAdmin, async (req, res) => {
    await db
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', req.params.id)
      .eq('sender', 'visitor')
      .is('read_at', null);
    res.json({ ok: true });
  });

  app.post('/api/admin/conversations/:id/restore', requireAdmin, async (req, res) => {
    const { data, error } = await db
      .from('conversations')
      .update({ status: 'open', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('status', 'closed')
      .select()
      .single();
    if (error || !data) {
      res.status(404).json({ error: 'Conversation not found or not archived.' });
      return;
    }
    res.json(data);
  });

  app.get('/api/conversations/:visitorId/messages', async (req, res) => {
    const { data: conversation } = await db
      .from('conversations')
      .select('*')
      .eq('visitor_id', req.params.visitorId)
      .neq('status', 'closed')
      .maybeSingle();
    if (!conversation) {
      res.json({ conversation: null, messages: [] });
      return;
    }
    const { data: messages, error } = await db
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id as string)
      .order('created_at', { ascending: true });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ conversation, messages });
  });

  app.post('/api/upload-url', async (req, res) => {
    const { folder, mimeType } = req.body ?? {};
    if (typeof mimeType !== 'string' || !mimeType) {
      res.status(400).json({ error: 'mimeType is required.' });
      return;
    }
    const safeFolder = typeof folder === 'string' && folder.match(/^[a-z0-9_-]+$/i) ? folder : 'user';
    const path = `${safeFolder}/${Date.now()}-${uuidv4()}.${mimeToExt(mimeType)}`;
    const { data, error } = await db.storage.from(config.storageBucket).createSignedUploadUrl(path);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ url: data.signedUrl, path: data.path, publicUrl: publicUrl(data.path) });
  });
}
