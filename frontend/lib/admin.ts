'use client';

const KEY = 'atharv_admin_token';

export const adminSession = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(KEY);
  },
  set(token: string) {
    localStorage.setItem(KEY, token);
  },
  clear() {
    localStorage.removeItem(KEY);
  },
};
