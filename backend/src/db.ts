import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config.js';

export const db: SupabaseClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export const authClient: SupabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

export function publicUrl(path: string): string {
  return `${config.supabaseUrl}/storage/v1/object/public/${config.storageBucket}/${path}`;
}
