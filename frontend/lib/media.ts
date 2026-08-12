'use client';

import { env } from './env';

export async function uploadMedia(
  file: File,
  folder: string,
): Promise<{ url: string; mimeType: string }> {
  const res = await fetch(`${env.apiUrl}/api/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folder, mimeType: file.type || 'application/octet-stream' }),
  });
  if (!res.ok) throw new Error('Could not prepare upload.');
  const data = await res.json();

  const put = await fetch(data.url, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });
  if (!put.ok) throw new Error('Upload failed.');

  return { url: data.publicUrl, mimeType: file.type || 'application/octet-stream' };
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
