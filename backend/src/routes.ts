import { Router, type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import { db, authClient, publicUrl } from './db.js';
import { signAdminToken, verifyAdminToken, isAdminUser, type AdminPayload } from './auth.js';

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

function createRateLimiter(windowMs: number, maxRequests: number) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (buckets.size > 5000) {
      for (const [ip, item] of buckets) {
        if (item.resetAt <= now) buckets.delete(ip);
      }
    }
    if (bucket.count > maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please wait and try again.' });
      return;
    }
    next();
  };
}

const signInRateLimit = createRateLimiter(15 * 60 * 1000, 10);
const uploadRateLimit = createRateLimiter(60 * 1000, 20);
const visitorHistoryRateLimit = createRateLimiter(60 * 1000, 90);

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = token ? verifyAdminToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  void isAdminUser(payload.sub).then((isAdmin) => {
    if (!isAdmin) {
      res.status(401).json({ error: 'Admin access has been revoked.' });
      return;
    }
    (req as Request & { admin?: AdminPayload }).admin = payload;
    next();
  }).catch(() => {
    res.status(503).json({ error: 'Could not verify admin access. Please retry.' });
  });
}

export function registerRoutes(app: Router): void {
  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'atharv-intelligence-backend', ts: Date.now() });
  });

  app.get('/insta', (_req, res) => {
    res.redirect(302, 'https://www.instagram.com/jsahumbleguy/?utm_source=ig_web_button_share_sheet');
  });

  app.post('/api/admin/sign-in', signInRateLimit, async (req, res) => {
    const { email, password } = req.body ?? {};
    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      email.trim().length === 0 ||
      email.length > 254 ||
      password.length === 0 ||
      password.length > 1024
    ) {
      res.status(400).json({ error: 'A valid email and password are required.' });
      return;
    }
    const { data, error } = await authClient.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
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

  // Visitor IDs are bearer credentials. Keep them out of the URL so they aren't
  // copied into URL-based logs, browser history, or referrer metadata.
  app.get('/api/conversations/me/messages', visitorHistoryRateLimit, async (req, res) => {
    const header = req.headers.authorization ?? '';
    const visitorId = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!/^[A-Za-z0-9_-]{16,64}$/.test(visitorId)) {
      res.status(401).json({ error: 'A valid visitor session is required.' });
      return;
    }
    const { data: conversation } = await db
      .from('conversations')
      .select('*')
      .eq('visitor_id', visitorId)
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
      res.status(500).json({ error: 'Could not load conversation history.' });
      return;
    }
    res.json({ conversation, messages });
  });

  app.post('/api/upload-url', uploadRateLimit, async (req, res) => {
    const { folder, mimeType } = req.body ?? {};
    if (typeof mimeType !== 'string' || !mimeType.trim()) {
      res.status(400).json({ error: 'mimeType is required.' });
      return;
    }
    const normalizedMime = mimeType.toLowerCase().trim();
    if (!Object.prototype.hasOwnProperty.call(EXTENSIONS, normalizedMime)) {
      res.status(400).json({ error: 'Unsupported attachment type.' });
      return;
    }
    const allowedFolders = new Set(['user', 'voice', 'admin']);
    const safeFolder = typeof folder === 'string' && allowedFolders.has(folder) ? folder : 'user';
    if (safeFolder === 'admin') {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : null;
      const payload = token ? verifyAdminToken(token) : null;
      if (!payload || !(await isAdminUser(payload.sub))) {
        res.status(401).json({ error: 'Admin authorization is required for operator uploads.' });
        return;
      }
    }
    const path = `${safeFolder}/${Date.now()}-${uuidv4()}.${mimeToExt(normalizedMime)}`;
    const { data, error } = await db.storage.from(config.storageBucket).createSignedUploadUrl(path);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    res.json({ url: data.signedUrl, path: data.path, publicUrl: publicUrl(data.path) });
  });
}
