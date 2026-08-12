import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { db } from './db.js';

export interface AdminPayload {
  sub: string;
  name: string;
  role: 'admin';
}

export function signAdminToken(payload: { sub: string; name: string }): string {
  return jwt.sign({ ...payload, role: 'admin' }, config.adminJwtSecret, { expiresIn: '12h' });
}

export function verifyAdminToken(token: string): AdminPayload | null {
  try {
    const payload = jwt.verify(token, config.adminJwtSecret) as AdminPayload;
    return payload.role === 'admin' ? payload : null;
  } catch {
    return null;
  }
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const { data } = await db
    .from('admin_users')
    .select('id')
    .eq('id', userId)
    .maybeSingle();
  return !!data;
}
