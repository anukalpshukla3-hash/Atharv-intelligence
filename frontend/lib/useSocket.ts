'use client';

import { useEffect, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { env } from './env';

export function useSocket(auth: Record<string, string> | null): Socket | null {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!auth) return;
    const s = io(env.socketUrl, {
      auth,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
    });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, [auth]);

  return socket;
}
